import 'dart:typed_data';

import 'package:dio/dio.dart';
import 'package:drift/native.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shabooagri_mobile/core/database/database.dart';
import 'package:shabooagri_mobile/core/network/api_error.dart';
import 'package:shabooagri_mobile/core/providers/database_provider.dart';
import 'package:shabooagri_mobile/core/sync/data_sync.dart';
import 'package:shabooagri_mobile/core/sync/offline_interceptor.dart';
import 'package:shabooagri_mobile/core/sync/outbox.dart';

class _Adapter implements HttpClientAdapter {
  bool online = true;
  String body = '{"invoices":[],"summary":{}}';
  @override
  Future<ResponseBody> fetch(RequestOptions o, Stream<Uint8List>? s, Future<void>? c) async {
    if (!online) {
      throw DioException.connectionError(requestOptions: o, reason: 'offline');
    }
    return ResponseBody.fromString(body, 200,
        headers: {Headers.contentTypeHeader: [Headers.jsonContentType]});
  }

  @override
  void close({bool force = false}) {}
}

void main() {
  group('isReadOnlyRequest classification', () {
    test('query-POSTs are reads; real writes are not', () {
      expect(isReadOnlyRequest('POST', '/invoices/filter'), isTrue);
      expect(isReadOnlyRequest('POST', '/reports/income/summary'), isTrue);
      expect(isReadOnlyRequest('POST', '/customers/search'), isTrue);
      // Real mutations stay mutations.
      expect(isReadOnlyRequest('POST', '/payments'), isFalse);
      expect(isReadOnlyRequest('POST', '/bookings'), isFalse);
      expect(isReadOnlyRequest('POST', '/jobs/j1/start'), isFalse);
      expect(isReadOnlyRequest('PATCH', '/customers/c1'), isFalse);
      expect(isReadOnlyRequest('GET', '/invoices/filter'), isFalse);
    });
  });

  group('DataSyncInterceptor no longer loops on a query-POST', () {
    late _Adapter adapter;
    late ProviderContainer container;
    late Dio dio;

    setUp(() {
      adapter = _Adapter();
      container = ProviderContainer();
      dio = Dio(BaseOptions(baseUrl: 'https://demo.shabooagri.com'))..httpClientAdapter = adapter;
      dio.interceptors.add(DataSyncInterceptor(container.read(Provider((ref) => ref))));
    });
    tearDown(() => container.dispose());

    int busTotal() =>
        container.read(dataSyncProvider).values.fold(0, (a, b) => a + b);

    test('POST /invoices/filter does NOT bump the sync bus (no self-invalidation)', () async {
      final before = busTotal();
      await dio.post('/invoices/filter', data: {'status': ['ALL']});
      expect(busTotal(), before, reason: 'a query-POST must not invalidate — that caused the endless spinner');
    });

    test('a real mutation (POST /payments) STILL bumps the bus', () async {
      final before = busTotal();
      await dio.post('/payments', data: {'amount': 100});
      expect(busTotal(), greaterThan(before), reason: 'real writes must still refresh screens');
    });
  });

  group('OfflineInterceptor treats a query-POST as a read (cache, not a queued write)', () {
    late AppDatabase db;
    late _Adapter adapter;
    late Dio dio;
    late ProviderContainer container;

    setUp(() {
      db = AppDatabase.forTesting(NativeDatabase.memory());
      adapter = _Adapter();
      final raw = Dio(BaseOptions(baseUrl: 'https://demo.shabooagri.com'))..httpClientAdapter = adapter;
      dio = Dio(BaseOptions(baseUrl: 'https://demo.shabooagri.com'))..httpClientAdapter = adapter;
      container = ProviderContainer(overrides: [
        databaseProvider.overrideWithValue(db),
        outboxServiceProvider.overrideWith((ref) => OutboxService(db, raw, ref)),
      ]);
      dio.interceptors.add(container.read(Provider((ref) => OfflineInterceptor(ref))));
    });
    tearDown(() async {
      final o = container.read(outboxServiceProvider);
      o.disposeForTest();
      await o.idle;
      container.dispose();
      await db.close();
    });

    Future<int> pending() =>
        (db.select(db.outboxOps)..where((t) => t.status.equals('pending'))).get().then((r) => r.length);

    test('online query-POST is cached; offline it is SERVED (not queued)', () async {
      adapter.online = true;
      adapter.body = '{"invoices":[{"id":"i1"}],"summary":{}}';
      await dio.post('/invoices/filter', data: {'status': ['ALL']});

      adapter.online = false;
      final resp = await dio.post('/invoices/filter', data: {'status': ['ALL']});
      expect(resp.statusCode, 200);
      expect(resp.headers.value('x-offline-cache'), 'true');
      expect((resp.data['invoices'] as List).first['id'], 'i1');
      expect(await pending(), 0, reason: 'a query-POST must NEVER be queued as a write');
    });

    test('offline query-POST with a DIFFERENT filter body → OfflineNoData, still not queued', () async {
      adapter.online = false;
      try {
        await dio.post('/invoices/filter', data: {'status': ['PAID']});
        fail('expected offline error');
      } on DioException catch (e) {
        expect(e.error, isA<OfflineNoData>());
        expect(apiErrorMessage(e).toLowerCase(), contains('offline'));
      }
      expect(await pending(), 0, reason: 'never queued');
    });

    test('a real create is still queued offline (regression guard)', () async {
      adapter.online = false;
      await dio.post('/payments', data: {'amount': 500});
      expect(await pending(), 1, reason: 'real offline writes must still be durably queued');
    });
  });
}
