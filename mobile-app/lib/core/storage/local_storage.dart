import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

const _storage = FlutterSecureStorage();

/// Persists which company (tenant slug) this device is set up for, so the
/// one-time Company Setup screen never has to run twice on the same device.
class TenantStorage {
  static const _slugKey = 'tenant_slug';

  static Future<String?> getSlug() => _storage.read(key: _slugKey);

  static Future<void> setSlug(String slug) => _storage.write(key: _slugKey, value: slug);

  static Future<void> clear() => _storage.delete(key: _slugKey);
}

/// Persists the logged-in session: JWT access/refresh tokens plus the last
/// known user profile (so the app can restore a role-appropriate home
/// screen on cold start without waiting on a network round trip).
///
/// The tokens are kept in an in-memory cache that is the source of truth for
/// the running session; `flutter_secure_storage` is the durable backing store
/// written through on every mutation and read exactly once (at cold start) to
/// hydrate the cache. This mirrors the web app, which holds the access token
/// in memory and only persists the refresh side.
///
/// Why the cache matters: the Dio auth interceptor asks for the access token
/// on every request and the refresh token on every 401. On desktop
/// (Windows/`flutter_secure_storage_windows`), concurrent DPAPI-backed reads
/// — which the dashboard triggers immediately by firing several authenticated
/// requests at once — can return `null` even though the value was written,
/// dropping the `Authorization` header and bouncing the user back to login a
/// few seconds after a successful sign-in. Reading from memory instead of the
/// disk on each request removes that failure mode entirely, without changing
/// what is persisted, the auth contract, or mobile behaviour.
class AuthStorage {
  static const _accessTokenKey = 'access_token';
  static const _refreshTokenKey = 'refresh_token';
  static const _userKey = 'current_user';

  // In-memory session cache (source of truth while the process is alive).
  static String? _accessToken;
  static String? _refreshToken;
  static Map<String, dynamic>? _user;
  // Whether the cache reflects disk state. Set once we've either read disk at
  // cold start, written a session, or cleared it — after which we never read
  // disk again for the life of the process (so a flaky desktop read can't
  // resurrect a stale value or null out a live session).
  static bool _hydrated = false;

  /// Loads the persisted session from disk into the cache, at most once.
  /// Called lazily by the getters and eagerly by [hydrate] at startup.
  static Future<void> _ensureHydrated() async {
    if (_hydrated) return;
    _hydrated = true;
    _accessToken = await _storage.read(key: _accessTokenKey);
    _refreshToken = await _storage.read(key: _refreshTokenKey);
    final raw = await _storage.read(key: _userKey);
    _user = raw == null ? null : jsonDecode(raw) as Map<String, dynamic>;
  }

  /// Eagerly warms the in-memory cache from disk. Call once at app startup
  /// (main.dart) so every later read is served from memory.
  static Future<void> hydrate() => _ensureHydrated();

  static Future<void> saveSession({
    required String accessToken,
    required String refreshToken,
    required Map<String, dynamic> user,
  }) async {
    _accessToken = accessToken;
    _refreshToken = refreshToken;
    _user = user;
    _hydrated = true;
    await Future.wait([
      _storage.write(key: _accessTokenKey, value: accessToken),
      _storage.write(key: _refreshTokenKey, value: refreshToken),
      _storage.write(key: _userKey, value: jsonEncode(user)),
    ]);
  }

  static Future<void> saveTokens({
    required String accessToken,
    required String refreshToken,
  }) async {
    _accessToken = accessToken;
    _refreshToken = refreshToken;
    _hydrated = true;
    await Future.wait([
      _storage.write(key: _accessTokenKey, value: accessToken),
      _storage.write(key: _refreshTokenKey, value: refreshToken),
    ]);
  }

  static Future<String?> getAccessToken() async {
    await _ensureHydrated();
    return _accessToken;
  }

  static Future<String?> getRefreshToken() async {
    await _ensureHydrated();
    return _refreshToken;
  }

  static Future<Map<String, dynamic>?> getUser() async {
    await _ensureHydrated();
    return _user;
  }

  static Future<void> clear() async {
    // Authoritatively empty in memory; mark hydrated so a subsequent read
    // never falls back to a (possibly flaky) disk read of just-deleted keys.
    _accessToken = null;
    _refreshToken = null;
    _user = null;
    _hydrated = true;
    await Future.wait([
      _storage.delete(key: _accessTokenKey),
      _storage.delete(key: _refreshTokenKey),
      _storage.delete(key: _userKey),
    ]);
  }

  /// Resets the in-memory cache so a test starts from a cold, un-hydrated
  /// process. Not used in production.
  @visibleForTesting
  static void debugReset() {
    _accessToken = null;
    _refreshToken = null;
    _user = null;
    _hydrated = false;
  }
}

/// Mirrors `DashboardPage.tsx`'s `OPS_WARNING_DISMISS_KEY` — the "Hide for
/// 24 hours" dismissal is stored as an epoch-ms "dismissed until" timestamp,
/// same mechanism as the website's `localStorage` key (device-local, not
/// synced to the server; reused `flutter_secure_storage` rather than
/// adding a new `shared_preferences` dependency for a single small flag).
class DashboardStorage {
  static const _opsWarningDismissedUntilKey = 'ops_warning_dismissed_until';

  static Future<void> dismissOpsWarningFor24h() =>
      _storage.write(key: _opsWarningDismissedUntilKey, value: (DateTime.now().millisecondsSinceEpoch + 24 * 60 * 60 * 1000).toString());

  static Future<bool> isOpsWarningDismissed() async {
    final raw = await _storage.read(key: _opsWarningDismissedUntilKey);
    final dismissedUntil = int.tryParse(raw ?? '') ?? 0;
    return DateTime.now().millisecondsSinceEpoch < dismissedUntil;
  }
}

class ProfileStorage {
  static const _profileImagePathKey = 'profile_image_path';

  static Future<String?> getProfileImagePath() => _storage.read(key: _profileImagePathKey);

  static Future<void> setProfileImagePath(String path) => _storage.write(key: _profileImagePathKey, value: path);
}
