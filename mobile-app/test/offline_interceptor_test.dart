import 'dart:typed_data';

import 'package:dio/dio.dart';
import 'package:drift/native.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shabooagri_mobile/core/database/database.dart';
import 'package:shabooagri_mobile/core/network/api_error.dart';
import 'package:shabooagri_mobile/core/providers/database_provider.dart';
import 'package:shabooagri_mobile/core/sync/offline_interceptor.dart';
import 'package:shabooagri_mobile/core/sync/outbox.dart';

/// Adapter that flips between online (returns the given body/status) and
/// offline (throws a connection error like a dropped link).
class _FakeAdapter implements HttpClientAdapter {
  bool online = true;
  int status = 200;
  String body = '{"ok":true}';

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
      );
    }
    return ResponseBody.fromString(
      body,
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
  late Dio dio; // client under test — carries the OfflineInterceptor
  late Dio rawDio; // what the outbox replays with — NO offline interceptor
  late ProviderContainer container;

  setUp(() {
    db = AppDatabase.forTesting(NativeDatabase.memory());
    adapter = _FakeAdapter();
    dio = Dio(BaseOptions(baseUrl: 'https://demo.shabooagri.com'))
      ..httpClientAdapter = adapter;
    // Separate instance so an outbox replay can't recurse back into the offline
    // interceptor and re-enqueue itself — exactly why production uses the raw
    // client. Shares the adapter so online/offline flips affect both.
    rawDio = Dio(BaseOptions(baseUrl: 'https://demo.shabooagri.com'))
      ..httpClientAdapter = adapter;
    container = ProviderContainer(overrides: [
      databaseProvider.overrideWithValue(db),
      // Give the outbox a Ref without the connectivity listener (no platform
      // channel in a unit test), and the raw Dio instead of the real client.
      outboxServiceProvider.overrideWith((ref) => OutboxService(db, rawDio, ref)),
    ]);
    final interceptor = container.read(Provider((ref) => OfflineInterceptor(ref)));
    dio.interceptors.add(interceptor);
  });

  tearDown(() async {
    final svc = container.read(outboxServiceProvider);
    svc.disposeForTest();
    await svc.idle; // let any background drain kicked by enqueue settle first
    container.dispose();
    await db.close();
  });

  Future<int> pending() =>
      (db.select(db.outboxOps)..where((t) => t.status.equals('pending'))).get().then((r) => r.length);

  test('a successful GET is cached, then served when offline', () async {
    adapter.online = true;
    adapter.body = '[{"id":"c1","name":"Asha"}]';
    final live = await dio.get('/customers');
    expect(live.data, isA<List>());

    // Go offline: the same GET is served from cache as a synthetic 200.
    adapter.online = false;
    final cached = await dio.get('/customers');
    expect(cached.statusCode, 200);
    expect(cached.headers.value('x-offline-cache'), 'true');
    expect((cached.data as List).first['name'], 'Asha');
  });

  test('an offline GET with nothing cached surfaces a tagged OfflineNoData (not a raw error)', () async {
    adapter.online = false;
    try {
      await dio.get('/villages');
      fail('expected a DioException');
    } on DioException catch (e) {
      // Tagged so the shared error UX shows "not downloaded yet", never a raw
      // SocketException / DioException string.
      expect(e.error, isA<OfflineNoData>());
      expect(apiErrorMessage(e).toLowerCase(), contains('downloaded'));
    }
  });

  test('an offline write is queued and returns an optimistic success', () async {
    adapter.online = false;
    final resp = await dio.post('/payments', data: {'amount': 250, 'invoiceId': 'inv-9'});

    // Caller sees an immediate success (the transaction is recorded locally).
    expect(resp.statusCode, 200);
    expect(resp.headers.value('x-offline-queued'), 'true');
    expect(resp.data['offlinePending'], true);
    expect(resp.data['amount'], 250);

    // And it's durably queued for sync with a stable idempotency key.
    expect(await pending(), 1);
    final op = await db.select(db.outboxOps).getSingle();
    expect(op.method, 'POST');
    expect(op.path, '/payments');
    expect(op.idempotencyKey, isNotEmpty);
    expect(op.entities, contains('payment'));
  });

  test('an offline create optimistically appears in the cached list', () async {
    // Prime the list cache while online.
    adapter.online = true;
    adapter.body = '[{"id":"c1","name":"Asha"}]';
    await dio.get('/customers');

    // Create offline.
    adapter.online = false;
    await dio.post('/customers', data: {'name': 'Bhola', 'villageId': 'v1'});

    // Reading the list again offline now shows both the old and the new row.
    final list = await dio.get('/customers');
    final names = (list.data as List).map((e) => e['name']).toList();
    expect(names, containsAll(['Asha', 'Bhola']));
  });

  test('a real server error (not offline) is NOT queued — it propagates', () async {
    adapter.online = true;
    adapter.status = 400;
    adapter.body = '{"error":"bad request"}';
    await expectLater(
      dio.post('/bookings', data: {'bad': true}),
      throwsA(isA<DioException>()),
    );
    expect(await pending(), 0, reason: 'a 4xx is a real result, must not be silently queued');
  });

  test('online mutations are stamped with an idempotency key', () async {
    adapter.online = true;
    adapter.status = 201;
    adapter.body = '{"id":"x1"}';
    final resp = await dio.post('/jobs', data: {'bookingId': 'b1'});
    expect(resp.requestOptions.headers['Idempotency-Key'], isNotEmpty);
  });
}
