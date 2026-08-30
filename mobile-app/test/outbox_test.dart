import 'dart:typed_data';

import 'package:dio/dio.dart';
import 'package:drift/drift.dart' show OrderingTerm;
import 'package:drift/native.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shabooagri_mobile/core/database/database.dart';
import 'package:shabooagri_mobile/core/providers/database_provider.dart';
import 'package:shabooagri_mobile/core/sync/data_sync.dart';
import 'package:shabooagri_mobile/core/sync/outbox.dart';

/// A controllable HTTP layer: it can be "offline" (throws a connection error
/// like a real dropped link), return a success, or return a client error — and
/// it records the `Idempotency-Key` seen on every attempt so we can prove a
/// replay reuses the same key (the anti-double-payment guarantee).
class _FakeAdapter implements HttpClientAdapter {
  bool online = false;
  int status = 200;
  final List<String> keysSeen = [];
  int calls = 0;

  @override
  Future<ResponseBody> fetch(
    RequestOptions options,
    Stream<Uint8List>? requestStream,
    Future<void>? cancelFuture,
  ) async {
    calls++;
    keysSeen.add(options.headers['Idempotency-Key'] as String? ?? '');
    if (!online) {
      throw DioException.connectionError(
        requestOptions: options,
        reason: 'simulated offline',
      );
    }
    return ResponseBody.fromString(
      '{"ok":true}',
      status,
      headers: {
        Headers.contentTypeHeader: [Headers.jsonContentType],
      },
    );
  }

  @override
  void close({bool force = false}) {}
}

void main() {
  late AppDatabase db;
  late _FakeAdapter adapter;
  late Dio dio;
  late ProviderContainer container;
  late OutboxService svc;

  setUp(() {
    db = AppDatabase.forTesting(NativeDatabase.memory());
    adapter = _FakeAdapter();
    dio = Dio(BaseOptions(baseUrl: 'https://demo.shabooagri.com'))
      ..httpClientAdapter = adapter;
    // Build the service through a container so it gets a real Ref (for the
    // real-time reconcile bump) but WITHOUT the connectivity listener, which
    // would touch a platform channel unavailable in a unit test.
    container = ProviderContainer(overrides: [
      databaseProvider.overrideWithValue(db),
    ]);
    svc = container.read(Provider<OutboxService>((ref) => OutboxService(db, dio, ref)));
  });

  tearDown(() async {
    svc.disposeForTest();
    await svc.idle;
    container.dispose();
    await db.close();
  });

  Future<int> pending() =>
      (db.select(db.outboxOps)..where((t) => t.status.equals('pending'))).get().then((r) => r.length);
  Future<int> failed() =>
      (db.select(db.outboxOps)..where((t) => t.status.equals('failed'))).get().then((r) => r.length);

  test('a write made offline is durably queued (survives — not lost)', () async {
    adapter.online = false;
    await svc.enqueue(OutboxRequest(
      method: 'POST',
      path: '/payments',
      body: {'amount': 500, 'invoiceId': 'inv-1'},
      entities: {SyncEntity.payment},
      label: 'Record payment',
    ));
    await svc.idle;

    // Still offline: the op remains, and its body/idempotency key are persisted.
    expect(await pending(), 1);
    final op = await db.select(db.outboxOps).getSingle();
    expect(op.path, '/payments');
    expect(op.idempotencyKey, isNotEmpty);
    expect(op.retryCount, greaterThanOrEqualTo(1), reason: 'a failed drain backs off');
  });

  test('reconnect replays the SAME idempotency key (no double payment)', () async {
    adapter.online = false;
    final key = await svc.enqueue(OutboxRequest(
      method: 'POST',
      path: '/payments',
      body: {'amount': 500},
      entities: {SyncEntity.payment},
    ));
    await svc.idle;
    expect(await pending(), 1);
    final firstAttemptKey = adapter.keysSeen.first;

    // Connectivity returns; an immediate drain (as the reconnect listener does)
    // succeeds and clears the op.
    adapter.online = true;
    await svc.drain(immediate: true);

    expect(await pending(), 0, reason: 'synced op is removed from the queue');
    // Every attempt (offline failure + successful replay) used one stable key.
    expect(adapter.keysSeen.toSet(), {key},
        reason: 'a lost-ack replay must reuse the key so the backend dedupes it');
    expect(firstAttemptKey, key);
    expect(adapter.calls, greaterThanOrEqualTo(2));
  });

  test('a permanent 4xx rejection is dead-lettered, not retried forever', () async {
    adapter.online = true;
    adapter.status = 422; // e.g. validation error the server will never accept
    await svc.enqueue(OutboxRequest(
      method: 'POST',
      path: '/bookings',
      body: {'bad': true},
      label: 'Create booking',
    ));
    await svc.idle;

    expect(await pending(), 0);
    expect(await failed(), 1, reason: 'surfaced to the user, never silently dropped');
    final op = await db.select(db.outboxOps).getSingle();
    expect(op.status, 'failed');
  });

  test('FIFO order preserved — earlier op syncs before later', () async {
    adapter.online = false;
    await svc.enqueue(OutboxRequest(method: 'POST', path: '/customers', body: {'n': 1}));
    await svc.enqueue(OutboxRequest(method: 'POST', path: '/customers', body: {'n': 2}));
    await svc.idle;
    final ops = await (db.select(db.outboxOps)..orderBy([(t) => OrderingTerm(expression: t.id)])).get();
    expect(ops.length, 2);
    expect(ops.first.id, lessThan(ops.last.id));

    adapter.online = true;
    await svc.drain(immediate: true);
    expect(await pending(), 0);
  });

  test('retryFailed re-queues a dead-lettered op', () async {
    adapter.online = true;
    adapter.status = 400;
    await svc.enqueue(OutboxRequest(method: 'POST', path: '/jobs', body: {}));
    await svc.idle;
    expect(await failed(), 1);

    final op = await db.select(db.outboxOps).getSingle();
    adapter.status = 200; // server now accepts it
    await svc.retryFailed(op.id);
    await svc.idle;

    expect(await failed(), 0);
    expect(await pending(), 0, reason: 'retried op synced and cleared');
  });
}
