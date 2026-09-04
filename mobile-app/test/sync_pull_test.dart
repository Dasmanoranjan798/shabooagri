import 'dart:convert';
import 'dart:typed_data';

import 'package:dio/dio.dart';
import 'package:drift/native.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shabooagri_mobile/core/database/database.dart';
import 'package:shabooagri_mobile/core/network/api_client.dart';
import 'package:shabooagri_mobile/core/providers/database_provider.dart';
import 'package:shabooagri_mobile/core/storage/local_storage.dart';
import 'package:shabooagri_mobile/core/sync/offline_interceptor.dart';
import 'package:shabooagri_mobile/core/sync/outbox.dart';
import 'package:shabooagri_mobile/core/sync/sync_pull.dart';

/// A fake cloud that returns realistic per-endpoint JSON, so the mirror
/// repositories' parsers populate the local SQLite tables. Mutable so we can
/// simulate "another user changed something" between pulls.
class FakePullServer implements HttpClientAdapter {
  bool online = true;
  String customerName = 'Asha';

  Map<String, dynamic> get _bodies => {
        '/customers': [
          {'id': 'c1', 'companyId': 'co1', 'name': customerName, 'phone': '999', 'village': 'Rampur'},
        ],
        '/machines': [
          {'id': 'm1', 'companyId': 'co1', 'registrationNumber': 'TR-1', 'status': 'AVAILABLE', 'hourMeterReading': 12.5},
        ],
        '/drivers': [
          {'id': 'd1', 'companyId': 'co1', 'employeeId': 'e1', 'availabilityStatus': 'AVAILABLE', 'employee': {'name': 'Ravi', 'phone': '888'}},
        ],
        '/jobs': [
          {'id': 'j1', 'companyId': 'co1', 'bookingId': 'b1', 'status': 'NOT_STARTED'},
        ],
        '/bookings': [
          {'id': 'b1', 'companyId': 'co1', 'bookingNumber': 'BK-000001', 'customerId': 'c1', 'location': 'Rampur', 'status': 'PENDING'},
        ],
        '/employees': [
          {'id': 'e1', 'companyId': 'co1', 'name': 'Ravi'},
        ],
        '/pricing-methods': [],
        '/machine-types': [],
      };

  @override
  Future<ResponseBody> fetch(RequestOptions options, Stream<Uint8List>? s, Future<void>? c) async {
    if (!online) {
      throw DioException.connectionError(requestOptions: options, reason: 'offline');
    }
    final body = _bodies[options.path] ?? [];
    return ResponseBody.fromString(
      jsonEncode(body),
      200,
      headers: {Headers.contentTypeHeader: [Headers.jsonContentType]},
    );
  }

  @override
  void close({bool force = false}) {}
}

/// Counts every request that reaches the wire, so a test can assert that a
/// signed-out pull sends nothing at all. Any request would return 401 in
/// production (the very thing that triggered the redirect bug).
class _CountingServer implements HttpClientAdapter {
  final void Function() onRequest;
  _CountingServer(this.onRequest);

  @override
  Future<ResponseBody> fetch(RequestOptions options, Stream<Uint8List>? s, Future<void>? c) async {
    onRequest();
    return ResponseBody.fromString('[]', 200, headers: {
      Headers.contentTypeHeader: [Headers.jsonContentType],
    });
  }

  @override
  void close({bool force = false}) {}
}

void main() {
  late AppDatabase db;
  late FakePullServer server;
  late ProviderContainer container;
  late SyncPullService pull;

  setUp(() {
    // Cloud→device pull runs only for a signed-in device; represent one so the
    // token gate in pullAll() is satisfied (fresh-install/no-session behaviour
    // is covered by its own test below).
    AuthStorage.debugSetSession(accessToken: 'test-token');
    db = AppDatabase.forTesting(NativeDatabase.memory());
    server = FakePullServer();
    final rawDio = Dio(BaseOptions(baseUrl: 'https://demo.shabooagri.com'))..httpClientAdapter = server;
    container = ProviderContainer(overrides: [
      databaseProvider.overrideWithValue(db),
      // The shared client, carrying the offline interceptor so pulls also warm
      // the read cache — built via overrideWith so it gets a real Ref.
      apiClientProvider.overrideWith((ref) {
        final d = Dio(BaseOptions(baseUrl: 'https://demo.shabooagri.com'))..httpClientAdapter = server;
        d.interceptors.add(OfflineInterceptor(ref));
        return d;
      }),
      outboxServiceProvider.overrideWith((ref) => OutboxService(db, rawDio, ref)),
    ]);
    pull = container.read(Provider((ref) => SyncPullService(ref)));
  });

  tearDown(() async {
    final o = container.read(outboxServiceProvider);
    o.disposeForTest();
    await o.idle;
    container.dispose();
    await db.close();
    AuthStorage.debugReset();
  });

  test('(#1 #6) pullAll populates the local SQLite mirror for every core entity', () async {
    // Fresh DB: nothing local yet.
    expect((await db.select(db.customers).get()), isEmpty);

    await pull.pullAll();

    // Cloud → device: the local database now holds the authoritative snapshot.
    expect((await db.select(db.customers).get()).single.name, 'Asha');
    expect((await db.select(db.customers).get()).single.village, 'Rampur');
    expect((await db.select(db.machines).get()).single.registrationNumber, 'TR-1');
    expect((await db.select(db.drivers).get()).single.name, 'Ravi');
    expect((await db.select(db.jobs).get()).single.id, 'j1');
    expect((await db.select(db.bookings).get()).single.bookingNumber, 'BK-000001');
  });

  test('(#1) after a pull the data is readable OFFLINE from the local cache', () async {
    await pull.pullAll();

    // Extra collections (no mirror) were cached by the interceptor during pull.
    server.online = false;
    final dio = container.read(apiClientProvider);
    final employees = await dio.get('/employees');
    expect(employees.statusCode, 200);
    expect(employees.headers.value('x-offline-cache'), 'true');
    expect((employees.data as List).first['name'], 'Ravi');
  });

  test('(#6 convergence) a re-pull applies another user\'s change (server-authoritative)', () async {
    await pull.pullAll();
    expect((await db.select(db.customers).get()).single.name, 'Asha');

    // Another user renames the customer in the cloud; this device re-pulls.
    server.customerName = 'Asha Devi';
    await pull.pullAll();

    expect((await db.select(db.customers).get()).single.name, 'Asha Devi',
        reason: 'local DB converges toward authoritative cloud state');
  });

  test('(ordering) pullAfterDrain flushes pending local writes before pulling', () async {
    // Queue an offline write, then reconnect-pull: the outbox must drain first.
    server.online = false;
    await container.read(outboxServiceProvider).enqueue(
          OutboxRequest(method: 'POST', path: '/customers', body: {'name': 'New'}),
        );
    expect(
      (await (db.select(db.outboxOps)..where((t) => t.status.equals('pending'))).get()).length,
      1,
    );

    server.online = true;
    await pull.pullAfterDrain();

    // The pending write was flushed (outbox empty) AND the pull ran.
    expect(
      (await (db.select(db.outboxOps)..where((t) => t.status.equals('pending'))).get()),
      isEmpty,
      reason: 'local write synced before the authoritative snapshot overwrote the cache',
    );
    expect((await db.select(db.customers).get()), isNotEmpty, reason: 'pull populated the mirror');
  });

  test('(fresh install) pullAll is a no-op with no session — fires ZERO requests', () async {
    // Regression: on a fresh install the reconnect listener fires pullAll at
    // launch while the user is still on Company Setup (no company, no token).
    // Those unauthenticated GETs returned 401, and the auth interceptor's
    // 401→/login redirect kicked the user off Setup to Sign In the instant the
    // launch pull's round-trip landed. pullAll must not run at all without a
    // session, so no such request (and no redirect) can happen.
    AuthStorage.debugSetSession(); // signed out
    var requests = 0;
    final countingServer = _CountingServer(() => requests++);
    final signedOutContainer = ProviderContainer(overrides: [
      databaseProvider.overrideWithValue(db),
      apiClientProvider.overrideWith((ref) {
        final d = Dio(BaseOptions(baseUrl: 'https://demo.shabooagri.com'))..httpClientAdapter = countingServer;
        d.interceptors.add(OfflineInterceptor(ref));
        return d;
      }),
      outboxServiceProvider.overrideWith((ref) => OutboxService(db, Dio()..httpClientAdapter = countingServer, ref)),
    ]);
    addTearDown(signedOutContainer.dispose);
    final signedOutPull = signedOutContainer.read(Provider((ref) => SyncPullService(ref)));

    await signedOutPull.pullAll();

    expect(requests, 0, reason: 'no authenticated pull traffic before login');
    expect((await db.select(db.customers).get()), isEmpty);
  });

  test('offline pullAll is a safe no-op (keeps last snapshot, never throws)', () async {
    await pull.pullAll(); // populate
    server.online = false;
    await pull.pullAll(); // offline: must not throw, must not wipe local data
    expect((await db.select(db.customers).get()), isNotEmpty);
  });
}
