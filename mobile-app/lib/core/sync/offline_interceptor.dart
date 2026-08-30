import 'dart:convert';

import 'package:dio/dio.dart';
import 'package:drift/drift.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:uuid/uuid.dart';

import '../database/database.dart';
import '../providers/database_provider.dart';
import 'data_sync.dart';
import 'outbox.dart';

/// The offline-first HTTP layer. One interceptor on the shared tenant client
/// gives the *entire* app genuine offline reads and writes with no per-screen
/// wiring — every list, detail, create, edit and transaction keeps working with
/// no connectivity, then reconciles to authoritative backend data on reconnect.
///
/// Reads:  every successful GET body is cached (keyed by full path+query). When
/// a GET later fails purely because the device is offline, the last cached body
/// is served as a synthetic 200, so screens show the most recent known data
/// instead of a network error.
///
/// Writes: a mutation that fails purely because the device is offline is NOT an
/// error — it is captured verbatim into the durable [OutboxOps] queue (survives
/// restart) and the caller gets an *optimistic* success immediately, so the UI
/// records the transaction locally without waiting for the cloud. The local read
/// cache is patched optimistically (append on create, merge on edit, remove on
/// delete) so the new/changed row shows up in lists at once, and the real-time
/// bus is bumped so every open screen reflects it. On reconnect the outbox
/// replays each op with its stable `Idempotency-Key`, so a lost acknowledgement
/// can never double-charge or duplicate a record.
///
/// Financial safety keystone: [onRequest] stamps every mutation with a stable
/// idempotency key *before* it is first sent. If that online attempt is later
/// re-queued (ambiguous timeout), the replay reuses the same key — so the
/// backend dedupe middleware collapses the two into one committed transaction.
class OfflineInterceptor extends Interceptor {
  final Ref _ref;
  OfflineInterceptor(this._ref);

  AppDatabase get _db => _ref.read(databaseProvider);

  static const _mutations = {'POST', 'PUT', 'PATCH', 'DELETE'};

  bool _isMutation(String method) => _mutations.contains(method.toUpperCase());

  // Auth flows can't be performed offline and must never be silently "queued"
  // (a queued login would give a false sense of being signed in). Let their
  // errors surface normally.
  bool _isAuthPath(String path) => path.contains('/auth/');

  /// A failure that means "no network path reached the server" — as opposed to
  /// the server responding with an error. Only the former is handled offline;
  /// a real 4xx/5xx is a genuine result and must propagate.
  bool _isOffline(DioException e) {
    if (e.response != null) return false;
    switch (e.type) {
      case DioExceptionType.connectionError:
      case DioExceptionType.connectionTimeout:
      case DioExceptionType.sendTimeout:
      case DioExceptionType.receiveTimeout:
      case DioExceptionType.unknown:
        return true;
      default:
        return false;
    }
  }

  /// Full request key including query string, used both as the cache key and as
  /// the replay path stored in the outbox.
  String _key(RequestOptions o) {
    final base = o.path.split('?').first;
    final q = o.uri.query;
    return q.isEmpty ? base : '$base?$q';
  }

  @override
  void onRequest(RequestOptions options, RequestInterceptorHandler handler) {
    // Stamp a stable idempotency key on every mutation up front so the online
    // attempt and any later offline replay share one key (dedupe safety).
    if (_isMutation(options.method) &&
        !_isAuthPath(options.path) &&
        !options.headers.containsKey('Idempotency-Key')) {
      options.headers['Idempotency-Key'] = const Uuid().v4();
    }
    handler.next(options);
  }

  @override
  void onResponse(Response response, ResponseInterceptorHandler handler) {
    final o = response.requestOptions;
    final status = response.statusCode ?? 0;
    if (o.method.toUpperCase() == 'GET' && status >= 200 && status < 300) {
      // Best-effort — a cache write must never break a real response.
      _cacheGet(_key(o), response.data);
    }
    handler.next(response);
  }

  @override
  void onError(DioException err, ErrorInterceptorHandler handler) async {
    final o = err.requestOptions;
    final method = o.method.toUpperCase();

    if (!_isOffline(err) || _isAuthPath(o.path)) {
      handler.next(err);
      return;
    }

    // ---- Offline GET: serve the last cached body -------------------------
    if (method == 'GET') {
      final cached = await _readCache(_key(o));
      if (cached != null) {
        handler.resolve(Response(
          requestOptions: o,
          statusCode: 200,
          statusMessage: 'OK (offline cache)',
          data: cached,
          headers: Headers.fromMap({
            'x-offline-cache': ['true'],
          }),
        ));
        return;
      }
      // Nothing cached yet — let the caller see the offline error.
      handler.next(err);
      return;
    }

    // ---- Offline mutation: queue it and optimistically succeed -----------
    if (_isMutation(method)) {
      try {
        final key = (o.headers['Idempotency-Key'] as String?) ?? const Uuid().v4();
        final entities = entitiesForPath(o.path);
        final body = _decodeBody(o.data);

        await _ref.read(outboxServiceProvider).enqueue(OutboxRequest(
              method: method,
              path: _key(o),
              body: body,
              entities: entities,
              label: _label(method, o.path),
              idempotencyKey: key,
            ));

        final optimistic = _optimisticBody(method, body);
        // Reflect the change in local lists/detail immediately.
        await _patchCache(method, o.path, optimistic);
        // Refresh every open screen that shows the affected entities.
        try {
          _ref.read(dataSyncProvider.notifier).bump(entities);
        } catch (_) {}

        handler.resolve(Response(
          requestOptions: o,
          statusCode: 200,
          statusMessage: 'OK (offline, queued for sync)',
          data: optimistic,
          headers: Headers.fromMap({
            'x-offline-queued': ['true'],
          }),
        ));
        return;
      } catch (_) {
        // If we somehow can't queue, do NOT swallow the write — surface the
        // error so the user knows it didn't go through (never lose a payment).
        handler.next(err);
        return;
      }
    }

    handler.next(err);
  }

  // ------------------------------------------------------------------ cache

  Future<void> _cacheGet(String key, dynamic data) async {
    try {
      await _db.into(_db.httpCache).insertOnConflictUpdate(
            HttpCacheCompanion.insert(
              path: key,
              bodyJson: jsonEncode(data),
            ),
          );
    } catch (_) {}
  }

  Future<dynamic> _readCache(String key) async {
    try {
      final row = await (_db.select(_db.httpCache)..where((t) => t.path.equals(key)))
          .getSingleOrNull();
      if (row == null) return null;
      return jsonDecode(row.bodyJson);
    } catch (_) {
      return null;
    }
  }

  /// Optimistically fold an offline write into the cached collection so the UI
  /// updates before sync. Best-effort and heavily guarded: if the cached shape
  /// isn't one we confidently recognize, we leave it — the row still appears
  /// after reconnect+sync. Handles the two shapes this backend returns: a bare
  /// JSON array, or `{ "data": [...] }`.
  Future<void> _patchCache(String method, String path, dynamic optimistic) async {
    try {
      final clean = path.split('?').first;
      final segments = clean.split('/').where((s) => s.isNotEmpty).toList();
      if (segments.isEmpty) return;

      // Collection path is everything up to the last id segment. For
      // /customers -> collection is /customers; for /customers/123 ->
      // collection is /customers.
      final isItemPath = segments.length >= 2;
      final collectionPath = '/${segments.take(isItemPath ? segments.length - 1 : segments.length).join('/')}';
      final id = isItemPath ? segments.last : null;

      // Patch any cached variants of the collection (with/without query).
      final rows = await (_db.select(_db.httpCache)
            ..where((t) =>
                t.path.equals(collectionPath) | t.path.like('$collectionPath?%')))
          .get();

      for (final row in rows) {
        final decoded = jsonDecode(row.bodyJson);
        final patched = _patchCollection(decoded, method, id, optimistic);
        if (patched == null) continue;
        await (_db.update(_db.httpCache)..where((t) => t.path.equals(row.path)))
            .write(HttpCacheCompanion(bodyJson: Value(jsonEncode(patched))));
      }

      // For edits/deletes also patch a cached detail document at the item path.
      if (isItemPath) {
        final detailKey = clean;
        if (method == 'DELETE') {
          await (_db.delete(_db.httpCache)..where((t) => t.path.equals(detailKey))).go();
        } else {
          final detail = await _readCache(detailKey);
          if (detail is Map && optimistic is Map) {
            final merged = Map<String, dynamic>.from(detail)
              ..addAll(Map<String, dynamic>.from(optimistic));
            await _cacheGet(detailKey, merged);
          }
        }
      }
    } catch (_) {
      // Never let optimistic UI patching break the queued write.
    }
  }

  /// Returns the patched collection, or null if the shape wasn't recognized.
  dynamic _patchCollection(dynamic decoded, String method, String? id, dynamic optimistic) {
    List list;
    bool wrapped;
    if (decoded is List) {
      list = List.from(decoded);
      wrapped = false;
    } else if (decoded is Map && decoded['data'] is List) {
      list = List.from(decoded['data'] as List);
      wrapped = true;
    } else {
      return null;
    }

    if (method == 'POST') {
      list.add(optimistic);
    } else if (method == 'DELETE' && id != null) {
      list.removeWhere((e) => e is Map && '${e['id']}' == id);
    } else if ((method == 'PATCH' || method == 'PUT') && id != null && optimistic is Map) {
      for (var i = 0; i < list.length; i++) {
        final e = list[i];
        if (e is Map && '${e['id']}' == id) {
          list[i] = Map<String, dynamic>.from(e)..addAll(Map<String, dynamic>.from(optimistic));
        }
      }
    } else {
      return null;
    }

    if (wrapped) {
      final m = Map<String, dynamic>.from(decoded as Map);
      m['data'] = list;
      return m;
    }
    return list;
  }

  // ------------------------------------------------------------- synthesis

  Object? _decodeBody(dynamic data) {
    if (data == null) return null;
    if (data is String) {
      if (data.isEmpty) return null;
      try {
        return jsonDecode(data);
      } catch (_) {
        return data;
      }
    }
    return data;
  }

  /// The body handed back to the caller (and appended to lists) for an offline
  /// write. Echoes the request payload with a temporary client id and an
  /// `offlinePending` marker so screens can badge unsynced rows if they wish.
  dynamic _optimisticBody(String method, Object? body) {
    if (method == 'DELETE') {
      return {'success': true, 'offlinePending': true};
    }
    final map = body is Map
        ? Map<String, dynamic>.from(body)
        : <String, dynamic>{};
    map['id'] ??= 'offline-${const Uuid().v4()}';
    map['offlinePending'] = true;
    return map;
  }

  String _label(String method, String path) {
    final entities = entitiesForPath(path);
    final noun = entities.isEmpty ? 'change' : entities.first.name;
    switch (method) {
      case 'POST':
        return 'Create $noun';
      case 'DELETE':
        return 'Delete $noun';
      default:
        return 'Update $noun';
    }
  }
}
