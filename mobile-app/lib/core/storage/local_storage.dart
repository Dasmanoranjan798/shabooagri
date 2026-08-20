import 'dart:convert';
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
class AuthStorage {
  static const _accessTokenKey = 'access_token';
  static const _refreshTokenKey = 'refresh_token';
  static const _userKey = 'current_user';

  static Future<void> saveSession({
    required String accessToken,
    required String refreshToken,
    required Map<String, dynamic> user,
  }) async {
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
    await Future.wait([
      _storage.write(key: _accessTokenKey, value: accessToken),
      _storage.write(key: _refreshTokenKey, value: refreshToken),
    ]);
  }

  static Future<String?> getAccessToken() => _storage.read(key: _accessTokenKey);

  static Future<String?> getRefreshToken() => _storage.read(key: _refreshTokenKey);

  static Future<Map<String, dynamic>?> getUser() async {
    final raw = await _storage.read(key: _userKey);
    if (raw == null) return null;
    return jsonDecode(raw) as Map<String, dynamic>;
  }

  static Future<void> clear() async {
    await Future.wait([
      _storage.delete(key: _accessTokenKey),
      _storage.delete(key: _refreshTokenKey),
      _storage.delete(key: _userKey),
    ]);
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
