import 'dart:async';
import 'dart:convert';
import 'dart:math';

import 'package:dio/dio.dart';
import 'package:drift/drift.dart';
import 'package:flutter/foundation.dart' show visibleForTesting;
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:uuid/uuid.dart';

import '../database/database.dart';
import '../providers/database_provider.dart';
import '../network/api_client.dart';
import 'connectivity.dart';
import 'data_sync.dart';

/// A write to replay later. Captured by the offline interceptor when a mutation
/// is made with no connectivity.
class OutboxRequest {
  final String method;
  final String path;
  final Object? body;
  final Set<SyncEntity> entities;
  final String? label;

  /// The stable idempotency key. When a write was first attempted *online* and
  /// failed with a lost/ambiguous acknowledgement (e.g. a receive timeout after
  /// the server may already have committed it), the key it carried on that first
  /// attempt MUST be reused for the replay — otherwise the backend can't dedupe
  /// the two and a payment/record is created twice. The offline interceptor
  /// passes that same key here; if null a fresh one is generated.
  final String? idempotencyKey;

  OutboxRequest({
    required this.method,
    required this.path,
    this.body,
    this.entities = const {},
    this.label,
    this.idempotencyKey,
  });
}

/// Durable offline-first sync engine.
///
/// Offline writes are appended to the [OutboxOps] SQLite table (survives app
/// restart) and drained FIFO when connectivity returns. Each op replays with a
/// stable `Idempotency-Key`, so a retry after a lost acknowledgement never
/// duplicates a record or a payment (the backend dedupes on it). Transient
/// failures back off and retry; a permanent (4xx) rejection is moved to a
/// `failed` dead-letter surfaced to the user, never silently dropped. On a
/// successful sync the affected entities are bumped on the real-time bus so
/// every open screen reconciles to authoritative backend data.
class OutboxService {
  final AppDatabase _db;
  final Dio _dio; // raw client: auth only, no offline/real-time interceptors
  final Ref _ref;

  bool _draining = false;
  Timer? _retryTimer;
  // Tracks the tail of the fire-and-forget drain chain purely so tests can
  // await it deterministically; production never awaits this (blocking enqueue
  // on a possibly-slow offline request would defeat the instant-local-write
  // guarantee). Kicks are chained so they serialize rather than collide.
  Future<void> _drainChain = Future<void>.value();

  // A server error (5xx/timeout) can retry this many times before we give up
  // and dead-letter it. Pure "device is offline" errors never count toward this
  // — they simply wait for connectivity.
  static const _maxServerRetries = 8;

  OutboxService(this._db, this._dio, this._ref);

  Future<int> pendingCount() =>
      (_db.select(_db.outboxOps)..where((t) => t.status.equals('pending'))).get().then((r) => r.length);

  /// Appends a write to the durable outbox and kicks a drain (a no-op if
  /// offline). Returns the generated idempotency key.
  Future<String> enqueue(OutboxRequest req) async {
    final key = req.idempotencyKey ?? const Uuid().v4();
    await _db.into(_db.outboxOps).insert(
          OutboxOpsCompanion.insert(
            idempotencyKey: key,
            method: req.method,
            path: req.path,
            bodyJson: Value(req.body == null ? null : jsonEncode(req.body)),
            entities: Value(req.entities.isEmpty ? null : req.entities.map((e) => e.name).join(',')),
            label: Value(req.label),
          ),
        );
    // Try immediately in case we're actually online (e.g. a flaky single
    // request failed but the link is back). Fire-and-forget — never awaited
    // here, so the caller (an offline write) returns instantly.
    _kickDrain();
    return key;
  }

  void _kickDrain() {
    _drainChain = _drainChain.then((_) => drain());
  }

  /// Awaits any in-flight/queued drain. For tests only — production code must
  /// never block on this.
  @visibleForTesting
  Future<void> get idle => _drainChain;

  /// Cancels the pending retry timer so a test's teardown doesn't fire a drain
  /// against a closed database. No-op in production (the provider is app-lived).
  @visibleForTesting
  void disposeForTest() {
    _retryTimer?.cancel();
    _retryTimer = null;
  }

  /// Processes pending ops in FIFO order. Stops at the first op that can't sync
  /// yet (still offline / backing off) to preserve ordering and avoid a hot
  /// loop; a permanently-rejected op is dead-lettered and draining continues.
  ///
  /// [immediate] ignores each op's backoff timestamp and attempts every pending
  /// op right now. It's used the moment connectivity is regained: a network
  /// change is new information, so a queued payment shouldn't sit out a backoff
  /// that was accrued while the link was down. It still pauses on the first
  /// transient failure, so it can't hot-loop.
  Future<void> drain({bool immediate = false}) async {
    if (_draining) return;
    _draining = true;
    try {
      while (true) {
        final now = DateTime.now();
        final op = await (_db.select(_db.outboxOps)
              ..where((t) {
                final isPending = t.status.equals('pending');
                if (immediate) return isPending;
                return isPending &
                    (t.nextAttemptAt.isSmallerOrEqualValue(now) | t.nextAttemptAt.isNull());
              })
              ..orderBy([(t) => OrderingTerm(expression: t.id)])
              ..limit(1))
            .getSingleOrNull();
        if (op == null) break;
        final keepGoing = await _sync(op);
        if (!keepGoing) break;
      }
    } finally {
      _draining = false;
    }
  }

  /// Returns true if draining should continue to the next op, false if it
  /// should pause (transient failure — wait for backoff/connectivity).
  Future<bool> _sync(OutboxOp op) async {
    try {
      final resp = await _dio.request(
        op.path,
        data: op.bodyJson == null ? null : jsonDecode(op.bodyJson!),
        options: Options(
          method: op.method,
          headers: {'Idempotency-Key': op.idempotencyKey},
        ),
      );
      final status = resp.statusCode ?? 0;
      if (status >= 200 && status < 300) {
        await (_db.delete(_db.outboxOps)..where((t) => t.id.equals(op.id))).go();
        _reconcile(op);
        return true;
      }
      // Non-2xx without throwing (unlikely with Dio defaults) — treat as
      // permanent so we don't loop.
      await _deadLetter(op, 'HTTP $status');
      return true;
    } on DioException catch (e) {
      final code = e.response?.statusCode;
      final isPermanent = code != null && code >= 400 && code < 500 && code != 408 && code != 429;
      if (isPermanent) {
        await _deadLetter(op, _message(e));
        return true; // a bad op must not block the queue
      }
      // Transient: network/offline, timeout, 5xx, 408, 429.
      final isServerError = code != null; // we got a response, just a bad one
      final nextRetry = op.retryCount + 1;
      if (isServerError && nextRetry >= _maxServerRetries) {
        await _deadLetter(op, 'Gave up after $nextRetry attempts: ${_message(e)}');
        return true;
      }
      final delay = _backoff(nextRetry);
      await (_db.update(_db.outboxOps)..where((t) => t.id.equals(op.id))).write(
        OutboxOpsCompanion(
          retryCount: Value(nextRetry),
          nextAttemptAt: Value(DateTime.now().add(delay)),
          lastError: Value(_message(e)),
        ),
      );
      _scheduleRetry(delay);
      return false; // pause; ordering preserved
    } catch (e) {
      // Unexpected local error — back off rather than dead-letter.
      final delay = _backoff(op.retryCount + 1);
      await (_db.update(_db.outboxOps)..where((t) => t.id.equals(op.id))).write(
        OutboxOpsCompanion(
          retryCount: Value(op.retryCount + 1),
          nextAttemptAt: Value(DateTime.now().add(delay)),
          lastError: Value(e.toString()),
        ),
      );
      _scheduleRetry(delay);
      return false;
    }
  }

  Future<void> _deadLetter(OutboxOp op, String error) async {
    await (_db.update(_db.outboxOps)..where((t) => t.id.equals(op.id)))
        .write(OutboxOpsCompanion(status: const Value('failed'), lastError: Value(error)));
    // Even a failed sync should let screens reconcile to server truth.
    _reconcile(op);
  }

  void _reconcile(OutboxOp op) {
    final entities = _parseEntities(op.entities);
    if (entities.isNotEmpty) {
      try {
        _ref.read(dataSyncProvider.notifier).bump(entities);
      } catch (_) {}
    }
  }

  /// Retry a dead-lettered op (user tapped "Retry" in the sync sheet).
  Future<void> retryFailed(int id) async {
    await (_db.update(_db.outboxOps)..where((t) => t.id.equals(id))).write(
      const OutboxOpsCompanion(status: Value('pending'), retryCount: Value(0), nextAttemptAt: Value(null)),
    );
    _kickDrain();
  }

  /// Discard a dead-lettered op the user chooses not to keep.
  Future<void> discardFailed(int id) =>
      (_db.delete(_db.outboxOps)..where((t) => t.id.equals(id))).go();

  void _scheduleRetry(Duration delay) {
    _retryTimer?.cancel();
    _retryTimer = Timer(delay, drain);
  }

  Duration _backoff(int attempt) {
    final seconds = min(pow(2, attempt).toInt(), 300); // cap at 5 min
    final jitterMs = Random().nextInt(1000);
    return Duration(seconds: seconds, milliseconds: jitterMs);
  }

  String _message(DioException e) {
    final data = e.response?.data;
    if (data is Map && data['error'] is String) return data['error'] as String;
    if (data is Map && data['message'] is String) return data['message'] as String;
    return e.message ?? e.type.name;
  }

  static Set<SyncEntity> _parseEntities(String? raw) {
    if (raw == null || raw.isEmpty) return {};
    final byName = {for (final e in SyncEntity.values) e.name: e};
    return raw.split(',').map((n) => byName[n]).whereType<SyncEntity>().toSet();
  }
}

final outboxServiceProvider = Provider<OutboxService>((ref) {
  final svc = OutboxService(
    ref.watch(databaseProvider),
    ref.watch(rawApiClientProvider),
    ref,
  );
  // Drain on startup (if already online) and every time connectivity returns.
  // `immediate` so a queued write attempts the instant the link is back, rather
  // than waiting out a backoff accrued while offline.
  ref.listen<bool>(isOnlineProvider, (prev, next) {
    if (next) svc.drain(immediate: true);
  }, fireImmediately: true);
  return svc;
});

/// Live count of pending (not-yet-synced) outbox ops, for the sync indicator.
final outboxPendingCountProvider = StreamProvider<int>((ref) {
  final db = ref.watch(databaseProvider);
  final q = db.select(db.outboxOps)..where((t) => t.status.equals('pending'));
  return q.watch().map((rows) => rows.length);
});

/// Live list of dead-lettered ops that need user attention.
final outboxFailedProvider = StreamProvider<List<OutboxOp>>((ref) {
  final db = ref.watch(databaseProvider);
  final q = db.select(db.outboxOps)
    ..where((t) => t.status.equals('failed'))
    ..orderBy([(t) => OrderingTerm(expression: t.id)]);
  return q.watch();
});
