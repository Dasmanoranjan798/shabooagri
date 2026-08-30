import 'dart:async';
import 'dart:io';
import 'dart:typed_data';

import 'package:dio/dio.dart';
import 'package:drift/drift.dart' show driftRuntimeOptions;
import 'package:drift/native.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:path/path.dart' as p;
import 'package:shabooagri_mobile/core/database/database.dart';
import 'package:shabooagri_mobile/core/providers/database_provider.dart';
import 'package:shabooagri_mobile/core/sync/data_sync.dart';
import 'package:shabooagri_mobile/core/sync/offline_interceptor.dart';
import 'package:shabooagri_mobile/core/sync/outbox.dart';

/// A simulated backend shared across "devices". Records every request it
/// receives (path, method, idempotency key, body) so we can prove concurrent
/// devices' offline writes all arrive as distinct operations. `online` gates
/// connectivity for the whole simulated network.
class FakeServer implements HttpClientAdapter {
  bool online;
  final List<Map<String, dynamic>> received = [];
  FakeServer({this.online = true});

  @override
  Future<ResponseBody> fetch(
    RequestOptions options,
    Stream<Uint8List>? requestStream,
    Future<void>? cancelFuture,
  ) async {
    if (!online) {
      throw DioException.connectionError(
        requestOptions: options,
        reason: 'simulated offline',
        error: const SocketException('Failed host lookup: pilot.shabooagri.com'),
      );
    }
    received.add({
      'method': options.method,
      'path': options.path,
      'key': options.headers['Idempotency-Key'],
      'data': options.data,
    });
    return ResponseBody.fromString(
      '{"ok":true}',
      200,
      headers: {
        Headers.contentTypeHeader: [Headers.jsonContentType],
      },
    );
  }

  @override
  void close({bool force = false}) {}
}

/// Builds one "device": its own SQLite DB (optionally file-backed for restart
/// tests), its own intercepted Dio (offline-first) and raw Dio (outbox), both
/// sharing the given [server] so connectivity flips affect everything.
class Device {
  final AppDatabase db;
  final ProviderContainer container;
  final Dio dio; // client under test (offline interceptor)
  final OutboxService outbox;

  Device._(this.db, this.container, this.dio, this.outbox);

  factory Device(FakeServer server, {File? file}) {
    final db = AppDatabase.forTesting(
      file == null ? NativeDatabase.memory() : NativeDatabase(file),
    );
    final rawDio = Dio(BaseOptions(baseUrl: 'https://demo.shabooagri.com'))
      ..httpClientAdapter = server;
    final dio = Dio(BaseOptions(baseUrl: 'https://demo.shabooagri.com'))
      ..httpClientAdapter = server;
    final container = ProviderContainer(overrides: [
      databaseProvider.overrideWithValue(db),
      outboxServiceProvider.overrideWith((ref) => OutboxService(db, rawDio, ref)),
    ]);
    final outbox = container.read(outboxServiceProvider);
    dio.interceptors.add(container.read(Provider((ref) => OfflineInterceptor(ref))));
    return Device._(db, container, dio, outbox);
  }

  int get dataSyncTotal {
    final m = container.read(dataSyncProvider);
    return m.values.fold(0, (a, b) => a + b);
  }

  Future<int> pending() =>
      (db.select(db.outboxOps)..where((t) => t.status.equals('pending'))).get().then((r) => r.length);

  Future<void> dispose() async {
    outbox.disposeForTest();
    await outbox.idle;
    container.dispose();
    await db.close();
  }
}

void main() {
  // The multi-user tests intentionally open two AppDatabase instances (two
  // simulated devices), each with its own executor — the drift warning about
  // multiple databases doesn't apply here.
  driftRuntimeOptions.dontWarnAboutMultipleDatabases = true;

  // ═══════════════════════════════════════════════════════════════════
  // (C) create/update/delete work locally offline, through the shared layer
  // ═══════════════════════════════════════════════════════════════════
  group('Offline CRUD works locally for ANY module (shared interceptor)', () {
    late FakeServer server;
    late Device d;
    setUp(() {
      server = FakeServer(online: false);
      d = Device(server);
    });
    tearDown(() => d.dispose());

    // Deliberately span modules beyond the four screenshots to prove the
    // behavior is global, not module-specific.
    for (final path in const [
      '/customers',
      '/villages',
      '/machines',
      '/employees',
      '/bookings',
      '/jobs',
      '/payments',
      '/expenses',
      '/maintenance',
    ]) {
      test('CREATE offline on $path → queued + optimistic success', () async {
        final r = await d.dio.post(path, data: {'name': 'x', 'amount': 100});
        expect(r.statusCode, 200);
        expect(r.headers.value('x-offline-queued'), 'true');
        expect(r.data['offlinePending'], true);
        expect(await d.pending(), 1);
      });
    }

    test('UPDATE (PATCH) offline → queued', () async {
      final r = await d.dio.patch('/customers/abc', data: {'name': 'y'});
      expect(r.data['offlinePending'], true);
      expect(await d.pending(), 1);
      final op = await d.db.select(d.db.outboxOps).getSingle();
      expect(op.method, 'PATCH');
    });

    test('DELETE offline → queued', () async {
      final r = await d.dio.delete('/customers/abc');
      expect(r.statusCode, 200);
      expect(await d.pending(), 1);
      final op = await d.db.select(d.db.outboxOps).getSingle();
      expect(op.method, 'DELETE');
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // (B) cached data remains accessible offline
  // ═══════════════════════════════════════════════════════════════════
  test('(B) reads served from local cache when offline', () async {
    final server = FakeServer(online: true);
    final d = Device(server);
    addTearDown(() => d.dispose());
    server.received.clear();

    // Prime online, then go offline and read again.
    server.online = true;
    // The fake returns {"ok":true}; use a list-shaped body for realism.
    await d.dio.get('/customers'); // caches {"ok":true}
    server.online = false;
    final offline = await d.dio.get('/customers');
    expect(offline.statusCode, 200);
    expect(offline.headers.value('x-offline-cache'), 'true');
  });

  // ═══════════════════════════════════════════════════════════════════
  // (E) UI updates immediately without Refresh — the reactive bus fires
  // ═══════════════════════════════════════════════════════════════════
  test('(E) an offline write bumps the real-time bus (screens refetch, no manual refresh)', () async {
    final server = FakeServer(online: false);
    final d = Device(server);
    addTearDown(() => d.dispose());

    final before = d.dataSyncTotal;
    await d.dio.post('/payments', data: {'amount': 5000});
    final after = d.dataSyncTotal;
    expect(after, greaterThan(before),
        reason: 'payment write must invalidate payment/invoice/customer/dashboard revisions');
  });

  // ═══════════════════════════════════════════════════════════════════
  // (D)+(F) durable: a transaction persisted offline survives app RESTART
  // ═══════════════════════════════════════════════════════════════════
  test('(D+F) an offline payment survives an app restart and syncs on reconnect', () async {
    final dir = await Directory.systemTemp.createTemp('sha_e2e_restart');
    final file = File(p.join(dir.path, 'db.sqlite'));
    final server = FakeServer(online: false);

    // ── Session 1: user records a payment offline, then the app is killed ──
    final s1 = Device(server, file: file);
    await s1.dio.post('/payments', data: {'amount': 5000, 'invoiceId': 'inv-1'});
    expect(await s1.pending(), 1);
    final keyBefore = (await s1.db.select(s1.db.outboxOps).getSingle()).idempotencyKey;
    await s1.dispose(); // simulate process kill (DB file closed)

    // ── Session 2: cold start on the SAME database file ──
    final s2 = Device(server, file: file);
    addTearDown(() => s2.dispose());
    expect(await s2.pending(), 1, reason: 'pending payment must survive restart — no data loss');
    final keyAfter = (await s2.db.select(s2.db.outboxOps).getSingle()).idempotencyKey;
    expect(keyAfter, keyBefore, reason: 'stable idempotency key preserved across restart');

    // ── Connectivity returns → automatic drain ──
    server.online = true;
    await s2.outbox.drain(immediate: true);
    expect(await s2.pending(), 0, reason: 'reconnect auto-syncs the surviving payment');
    expect(server.received.length, 1);
    expect(server.received.single['key'], keyBefore, reason: 'replayed with the SAME key — no double charge');

    await Directory(dir.path).delete(recursive: true);
  });

  // ═══════════════════════════════════════════════════════════════════
  // (G) reconnect drains FIFO across many queued ops
  // ═══════════════════════════════════════════════════════════════════
  test('(G) many offline writes all sync automatically on reconnect, in order', () async {
    final server = FakeServer(online: false);
    final d = Device(server);
    addTearDown(() => d.dispose());

    for (var i = 0; i < 5; i++) {
      await d.dio.post('/bookings', data: {'seq': i});
    }
    await d.outbox.idle;
    expect(await d.pending(), 5);

    server.online = true;
    await d.outbox.drain(immediate: true);
    expect(await d.pending(), 0);
    expect(server.received.length, 5);
    // FIFO: bodies arrived in creation order.
    final seqs = server.received.map((r) {
      final data = r['data'];
      return data is String ? data : data.toString();
    }).toList();
    for (var i = 0; i < 5; i++) {
      expect(seqs[i], contains('$i'));
    }
  });

  // ═══════════════════════════════════════════════════════════════════
  // MULTI-USER / MULTI-DEVICE concurrency
  // ═══════════════════════════════════════════════════════════════════
  test('(multi-user) two devices working offline both sync as DISTINCT ops (no loss, no collision)', () async {
    final server = FakeServer(online: false);
    final deviceA = Device(server);
    final deviceB = Device(server);
    addTearDown(() => deviceA.dispose());
    addTearDown(() => deviceB.dispose());

    // Both create a customer while offline, independently.
    await deviceA.dio.post('/customers', data: {'name': 'From A'});
    await deviceB.dio.post('/customers', data: {'name': 'From B'});
    await deviceA.outbox.idle;
    await deviceB.outbox.idle;
    expect(await deviceA.pending(), 1);
    expect(await deviceB.pending(), 1);

    // Connectivity returns for both.
    server.online = true;
    await deviceA.outbox.drain(immediate: true);
    await deviceB.outbox.drain(immediate: true);

    // Both records reached the server, as two DISTINCT operations with two
    // DISTINCT idempotency keys — neither overwrote the other.
    expect(server.received.length, 2);
    final keys = server.received.map((r) => r['key']).toSet();
    expect(keys.length, 2, reason: 'distinct client identities → distinct records');
    expect(await deviceA.pending(), 0);
    expect(await deviceB.pending(), 0);
  });

  test('(idempotency) a device that retries after a lost ack does NOT double-send', () async {
    // Server is "online" but every response is a receive-timeout AFTER it has
    // recorded the request — the classic lost-acknowledgement that must not
    // create two payments.
    final server = _LostAckServer();
    final rawDio = Dio(BaseOptions(baseUrl: 'https://demo.shabooagri.com'))
      ..httpClientAdapter = server;
    final db = AppDatabase.forTesting(NativeDatabase.memory());
    final container = ProviderContainer(overrides: [databaseProvider.overrideWithValue(db)]);
    final outbox = container.read(Provider((ref) => OutboxService(db, rawDio, ref)));
    addTearDown(() async {
      outbox.disposeForTest();
      await outbox.idle;
      container.dispose();
      await db.close();
    });

    await outbox.enqueue(OutboxRequest(method: 'POST', path: '/payments', body: {'amount': 5000}));
    await outbox.idle; // first attempt: server records it, then "times out"

    server.failNext = false; // ack now succeeds
    await outbox.drain(immediate: true); // retry

    // Server saw the request twice, but BOTH carried the SAME idempotency key,
    // so a correct backend collapses them into one committed payment.
    expect(server.keysSeen.length, greaterThanOrEqualTo(2));
    expect(server.keysSeen.toSet().length, 1, reason: 'same key on retry → backend dedupes → no double charge');
  });
}

/// A server that records the request, then throws a receive timeout on the
/// first attempt (lost acknowledgement), succeeding thereafter.
class _LostAckServer implements HttpClientAdapter {
  bool failNext = true;
  final List<String> keysSeen = [];

  @override
  Future<ResponseBody> fetch(
    RequestOptions options,
    Stream<Uint8List>? requestStream,
    Future<void>? cancelFuture,
  ) async {
    keysSeen.add(options.headers['Idempotency-Key'] as String? ?? '');
    if (failNext) {
      throw DioException.receiveTimeout(
        timeout: const Duration(seconds: 1),
        requestOptions: options,
      );
    }
    return ResponseBody.fromString('{"ok":true}', 200, headers: {
      Headers.contentTypeHeader: [Headers.jsonContentType],
    });
  }

  @override
  void close({bool force = false}) {}
}
