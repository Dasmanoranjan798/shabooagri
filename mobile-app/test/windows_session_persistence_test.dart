import 'dart:convert';

import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shabooagri_mobile/core/storage/local_storage.dart';

/// Regression test for the real physical-Windows bug: a user logs in, the
/// dashboard flashes, then a token error bounces them back to login within
/// seconds.
///
/// Root cause reproduced here: on Windows the Dio auth interceptor asked
/// `flutter_secure_storage` for the access token on every request (and the
/// refresh token on every 401). The dashboard fires several authenticated
/// requests at once, and the desktop secure-storage backend returned `null`
/// for those concurrent reads even though the token had just been written —
/// so no Authorization header was attached, the backend answered 401, the
/// refresh path also read `null`, and the session was cleared.
///
/// The mock below models exactly that pathological platform: writes succeed
/// (values are kept), but every `read` returns `null`. [AuthStorage] must
/// still serve the live session from its in-memory cache. Before the fix this
/// test fails (getAccessToken/getRefreshToken return null → forced logout);
/// after the fix it passes. Android/iOS keystores return the value normally,
/// which the second test covers.
void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  const channel = MethodChannel('plugins.it_nomads.com/flutter_secure_storage');
  final messenger = TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger;
  final disk = <String, String>{};
  // When true, reads never return what was written — the Windows failure mode.
  var readsAreBlind = false;

  setUp(() {
    disk.clear();
    readsAreBlind = false;
    AuthStorage.debugReset();
    messenger.setMockMethodCallHandler(channel, (call) async {
      final args = (call.arguments as Map?)?.cast<String, dynamic>() ?? const {};
      switch (call.method) {
        case 'write':
          disk[args['key'] as String] = args['value'] as String;
          return null;
        case 'read':
          if (readsAreBlind) return null;
          return disk[args['key'] as String];
        case 'delete':
          disk.remove(args['key'] as String);
          return null;
        case 'readAll':
          return readsAreBlind ? <String, String>{} : Map<String, String>.from(disk);
        case 'deleteAll':
          disk.clear();
          return null;
        case 'containsKey':
          return !readsAreBlind && disk.containsKey(args['key'] as String);
      }
      return null;
    });
  });

  tearDown(() {
    messenger.setMockMethodCallHandler(channel, null);
  });

  test('session survives a login even when secure-storage reads return null (Windows failure mode)', () async {
    // Simulate the Windows platform: writes land, but reads are blind.
    readsAreBlind = true;

    await AuthStorage.saveSession(
      accessToken: 'access-abc',
      refreshToken: 'refresh-xyz',
      user: const {'id': 'u1', 'fullName': 'Owner One', 'role': {'systemKey': 'owner'}},
    );

    // The interceptor's per-request reads must NOT come back null — that was
    // the exact cause of the "logged out a few seconds after login" bug.
    expect(await AuthStorage.getAccessToken(), 'access-abc');
    expect(await AuthStorage.getRefreshToken(), 'refresh-xyz');
    expect((await AuthStorage.getUser())?['id'], 'u1');

    // A refreshed token pair (as the interceptor would save mid-session) is
    // likewise served from memory despite blind disk reads.
    await AuthStorage.saveTokens(accessToken: 'access-2', refreshToken: 'refresh-2');
    expect(await AuthStorage.getAccessToken(), 'access-2');
    expect(await AuthStorage.getRefreshToken(), 'refresh-2');
  });

  test('cold-start hydrate restores a persisted session from disk', () async {
    // Pre-seed disk as if a previous run had written a session.
    disk['access_token'] = 'stored-access';
    disk['refresh_token'] = 'stored-refresh';
    disk['current_user'] = jsonEncode({'id': 'u9', 'fullName': 'Returning Owner', 'role': {'systemKey': 'owner'}});

    // Fresh process (cold cache), reads work (mobile keystore behaviour).
    AuthStorage.debugReset();
    await AuthStorage.hydrate();

    expect(await AuthStorage.getAccessToken(), 'stored-access');
    expect(await AuthStorage.getRefreshToken(), 'stored-refresh');
    expect((await AuthStorage.getUser())?['id'], 'u9');
  });

  test('logout clears the session and does not resurrect it from a flaky read', () async {
    await AuthStorage.saveSession(
      accessToken: 'access-abc',
      refreshToken: 'refresh-xyz',
      user: const {'id': 'u1', 'fullName': 'Owner One', 'role': {'systemKey': 'owner'}},
    );
    expect(await AuthStorage.getAccessToken(), 'access-abc');

    await AuthStorage.clear();

    // Even if the platform delete was flaky and the value lingered on disk,
    // the in-memory state is authoritative: the user is logged out.
    disk['access_token'] = 'ghost-access';
    expect(await AuthStorage.getAccessToken(), isNull);
    expect(await AuthStorage.getRefreshToken(), isNull);
    expect(await AuthStorage.getUser(), isNull);
  });
}
