import 'dart:convert';
import 'dart:io';
import 'dart:typed_data';

import 'package:dio/dio.dart';
import 'package:drift/drift.dart' show driftRuntimeOptions;
import 'package:drift/native.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:path/path.dart' as p;
import 'package:shabooagri_mobile/core/database/database.dart';
import 'package:shabooagri_mobile/core/network/api_client.dart';
import 'package:shabooagri_mobile/core/providers/database_provider.dart';
import 'package:shabooagri_mobile/core/storage/local_storage.dart';
import 'package:shabooagri_mobile/core/sync/offline_interceptor.dart';
import 'package:shabooagri_mobile/core/sync/outbox.dart';
import 'package:shabooagri_mobile/core/sync/sync_pull.dart';

/// A stateful in-memory stand-in for the ShabooAgri backend that reproduces the
/// three behaviors multi-user convergence depends on (all independently
/// verified against the REAL deployed backend elsewhere in this suite):
///   * honours a client-provided UUID `id` on create (client-authoritative id);
///   * allocates booking numbers atomically server-side (`BK-000001`, …) — the
///     client never mints them;
///   * dedupes replays by `Idempotency-Key` (no double record / double payment).
class FakeBackend {
  final Map<String, List<Map<String, dynamic>>> tables = {};
  final Map<String, Map<String, dynamic>> _idem = {}; // key -> stored response
  int _bookingSeq = 0;

  List<Map<String, dynamic>> _table(String path) => tables.putIfAbsent(path, () => []);

  Map<String, dynamic> handle(RequestOptions o) {
    final method = o.method.toUpperCase();
    final key = o.headers['Idempotency-Key'] as String?;
    if (method != 'GET' && key != null && _idem.containsKey(key)) {
      return _idem[key]!; // replay — the side effect already happened once
    }
    final path = o.path.split('?').first;
    final collection = '/${path.split('/').where((s) => s.isNotEmpty).first}';
    late Map<String, dynamic> response;

    if (method == 'POST') {
      final body = _decode(o.data);
      final rec = <String, dynamic>{...body};
      rec['id'] ??= 'srv-${_table(collection).length}-${DateTime.now().microsecondsSinceEpoch}';
      // The real backend stamps companyId from the authenticated token; mirror
      // that so the pull's repository parsers (which require it) succeed.
      rec['companyId'] ??= 'co1';
      if (collection == '/bookings') {
        // Atomic server allocation — the crux of "no number collision".
        rec['bookingNumber'] = 'BK-${(++_bookingSeq).toString().padLeft(6, '0')}';
        rec['status'] ??= 'PENDING';
      }
      _table(collection).add(rec);
      response = rec;
    } else if (method == 'GET') {
      // A collection GET returns the whole table.
      response = {'__list__': _table(collection)};
    } else if (method == 'PATCH') {
      final id = path.split('/').last;
      final row = _table(collection).firstWhere((r) => r['id'] == id, orElse: () => {});
      row.addAll(_decode(o.data));
      response = row;
    } else {
      response = {'ok': true};
    }
    if (key != null) _idem[key] = response;
    return response;
  }

  static Map<String, dynamic> _decode(dynamic data) {
    if (data == null) return {};
    if (data is String) return data.isEmpty ? {} : Map<String, dynamic>.from(jsonDecode(data));
    return Map<String, dynamic>.from(data as Map);
  }
}

/// A per-device network adapter that shares one [FakeBackend] but has its own
/// connectivity flag, so Device A can be offline while Device B is online.
class DeviceAdapter implements HttpClientAdapter {
  final FakeBackend backend;
  bool online;
  DeviceAdapter(this.backend, {this.online = true});

  @override
  Future<ResponseBody> fetch(RequestOptions o, Stream<Uint8List>? s, Future<void>? c) async {
    if (!online) {
      throw DioException.connectionError(
        requestOptions: o,
        reason: 'offline',
        error: const SocketException('Failed host lookup'),
      );
    }
    final result = backend.handle(o);
    final body = result.containsKey('__list__') ? result['__list__'] : result;
    return ResponseBody.fromString(jsonEncode(body), 200,
        headers: {Headers.contentTypeHeader: [Headers.jsonContentType]});
  }

  @override
  void close({bool force = false}) {}
}

/// One simulated device: its own SQLite (optionally file-backed for restart),
/// its own intercepted client + outbox + pull, all pointed at [backend].
class SimDevice {
  final AppDatabase db;
  final ProviderContainer container;
  final Dio dio;
  final DeviceAdapter adapter;

  SimDevice._(this.db, this.container, this.dio, this.adapter);

  factory SimDevice(FakeBackend backend, {bool online = true, File? file}) {
    final db = AppDatabase.forTesting(file == null ? NativeDatabase.memory() : NativeDatabase(file));
    final adapter = DeviceAdapter(backend, online: online);
    final raw = Dio(BaseOptions(baseUrl: 'https://demo.shabooagri.com'))..httpClientAdapter = adapter;
    final container = ProviderContainer(overrides: [
      databaseProvider.overrideWithValue(db),
      apiClientProvider.overrideWith((ref) {
        final d = Dio(BaseOptions(baseUrl: 'https://demo.shabooagri.com'))..httpClientAdapter = adapter;
        d.interceptors.add(OfflineInterceptor(ref));
        return d;
      }),
      outboxServiceProvider.overrideWith((ref) => OutboxService(db, raw, ref)),
    ]);
    // The screens use apiClientProvider; make our test `dio` the same instance.
    final intercepted = container.read(apiClientProvider);
    return SimDevice._(db, container, intercepted, adapter);
  }

  OutboxService get outbox => container.read(outboxServiceProvider);
  SyncPullService get pull => container.read(Provider((ref) => SyncPullService(ref)));

  Future<void> dispose() async {
    outbox.disposeForTest();
    await outbox.idle;
    container.dispose();
    await db.close();
  }
}

void main() {
  driftRuntimeOptions.dontWarnAboutMultipleDatabases = true;

  // These simulate signed-in devices; satisfy pullAll()'s session gate (the
  // signed-out no-op is covered in sync_pull_test).
  setUp(() => AuthStorage.debugSetSession(accessToken: 'test-token'));
  tearDown(AuthStorage.debugReset);

  test('MOST IMPORTANT: two-device offline/online convergence, no loss/overwrite/dup', () async {
    final backend = FakeBackend();
    // Seed the cloud with a pre-existing customer both devices already know.
    backend.tables['/customers'] = [
      {'id': 'existing-cust', 'companyId': 'co1', 'name': 'Existing Farmer', 'villageId': 'v0'},
    ];

    final dir = await Directory.systemTemp.createTemp('sha_multiuser');
    final fileA = File(p.join(dir.path, 'deviceA.sqlite'));

    // ── Device B: online throughout ──
    final b = SimDevice(backend, online: true);
    addTearDown(() => b.dispose());

    // ── Device A: starts online, syncs, then goes offline ──
    var a = SimDevice(backend, online: true, file: fileA);
    await a.pull.pullAll(); // A has the existing customer locally
    expect((await a.db.select(a.db.customers).get()).length, 1);

    a.adapter.online = false; // A drops offline

    // ── Device A works offline: create customer, booking, and a payment ──
    await a.dio.post('/customers', data: {'name': 'A Farmer', 'villageId': 'v1'});
    await a.dio.post('/bookings', data: {'customerId': 'existing-cust', 'villageId': 'v0', 'workDescription': 'A ploughing'});
    await a.dio.post('/payments', data: {'amount': 5000, 'invoiceId': 'inv-A'});
    await a.outbox.idle;
    // All three are durably queued on A.
    expect((await (a.db.select(a.db.outboxOps)..where((t) => t.status.equals('pending'))).get()).length, 3);

    // ── Device B works online at the same time ──
    await b.dio.post('/bookings', data: {'customerId': 'existing-cust', 'villageId': 'v0', 'workDescription': 'B ploughing'});
    await b.dio.post('/customers', data: {'name': 'B Farmer', 'villageId': 'v2'});

    // ── Device A restarts while still offline (process kill) ──
    await a.dispose();
    a = SimDevice(backend, online: false, file: fileA);
    addTearDown(() => a.dispose());
    // Pending ops survived the restart.
    expect((await (a.db.select(a.db.outboxOps)..where((t) => t.status.equals('pending'))).get()).length, 3,
        reason: 'durable outbox survived restart');

    // ── Device A reconnects → outbox flushes, then pull converges ──
    a.adapter.online = true;
    await a.pull.pullAfterDrain();

    // ── Convergence assertions ──
    final serverBookings = backend.tables['/bookings']!;
    expect(serverBookings.length, 2, reason: 'both A and B bookings survive — neither overwritten');
    final numbers = serverBookings.map((b) => b['bookingNumber']).toSet();
    expect(numbers, {'BK-000001', 'BK-000002'}, reason: 'unique server-authoritative booking numbers, no collision');

    final serverCustomers = backend.tables['/customers']!;
    // existing + A Farmer + B Farmer = 3, none lost.
    expect(serverCustomers.map((c) => c['name']).toSet(),
        {'Existing Farmer', 'A Farmer', 'B Farmer'});

    // Payment recorded exactly once despite drain + any replay.
    expect(backend.tables['/payments']!.length, 1, reason: 'no duplicate financial transaction');

    // A's outbox is empty (everything synced) and A converged locally.
    expect((await (a.db.select(a.db.outboxOps)..where((t) => t.status.equals('pending'))).get()), isEmpty);
    expect((await a.db.select(a.db.customers).get()).length, 3,
        reason: 'A pulled B\'s customer + its own — local converges to cloud');

    // ── Repeat sync is safe (idempotent) ──
    await a.pull.pullAfterDrain();
    expect(backend.tables['/payments']!.length, 1, reason: 'repeated sync creates no duplicates');
    expect(backend.tables['/bookings']!.length, 2);

    await Directory(dir.path).delete(recursive: true);
  });

  test('(#3 field-level merge) independent field edits on the same record both survive', () async {
    final backend = FakeBackend();
    backend.tables['/customers'] = [
      {'id': 'cust-x', 'companyId': 'co1', 'name': 'Original', 'phone': '111', 'villageId': 'v1'},
    ];

    final a = SimDevice(backend, online: true);
    final b = SimDevice(backend, online: true);
    addTearDown(() => a.dispose());
    addTearDown(() => b.dispose());

    // Device A goes offline and edits ONLY the phone (a partial PATCH).
    a.adapter.online = false;
    await a.dio.patch('/customers/cust-x', data: {'phone': '999'});
    await a.outbox.idle;

    // Device B, online, edits ONLY the name of the same record.
    await b.dio.patch('/customers/cust-x', data: {'name': 'Renamed'});

    // A reconnects and flushes.
    a.adapter.online = true;
    await a.outbox.flush(immediate: true);

    // Both independent changes survived — neither overwrote the other, because
    // each device sent only the field it changed (partial PATCH merge).
    final row = backend.tables['/customers']!.single;
    expect(row['name'], 'Renamed', reason: "B's field preserved");
    expect(row['phone'], '999', reason: "A's field preserved");
    expect(row['id'], 'cust-x', reason: 'same record, no duplicate');
    expect(backend.tables['/customers']!.length, 1);
  });
}
