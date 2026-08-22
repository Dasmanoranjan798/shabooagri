import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/app_user.dart';
import '../network/api_client.dart';
import '../providers/session_provider.dart';
import '../storage/local_storage.dart';

final authRepositoryProvider = Provider<AuthRepository>((ref) {
  return AuthRepository(ref);
});

class AuthException implements Exception {
  final String message;
  AuthException(this.message);
  @override
  String toString() => message;
}

/// Real authentication against the operational backend's
/// `POST /auth/login/password` — the same endpoint and contract the
/// website uses (`frontend/src/lib/api.ts`'s `login()`), just without the
/// PIN/OTP paths (deferred, see the mobile app plan).
class AuthRepository {
  final Ref _ref;

  AuthRepository(this._ref);

  Future<AppUser> login(String identifier, String password) async {
    final dio = _ref.read(apiClientProvider);
    try {
      final response = await dio.post('/auth/login/password', data: {
        'identifier': identifier,
        'password': password,
      });
      final data = response.data as Map<String, dynamic>;
      final user = AppUser.fromJson(data['user'] as Map<String, dynamic>);

      await AuthStorage.saveSession(
        accessToken: data['accessToken'] as String,
        refreshToken: data['refreshToken'] as String,
        user: data['user'] as Map<String, dynamic>,
      );

      _ref.read(currentUserProvider.notifier).state = user;
      return user;
    } on DioException catch (e) {
      if (e.response?.statusCode == 401) {
        throw AuthException('Incorrect email/phone or password.');
      }
      if (e.response?.statusCode == 429) {
        // Rate-limited by the backend's brute-force protection (P1-4). Surface
        // the server's own wait message rather than the generic connectivity
        // error below — otherwise a throttled user is wrongly told their
        // connection failed and just keeps retrying.
        final data = e.response?.data;
        final serverMsg = (data is Map && data['error'] is String) ? data['error'] as String : null;
        throw AuthException(serverMsg ?? 'Too many login attempts. Please wait a few minutes and try again.');
      }
      throw AuthException('Could not reach the server. Check your connection and try again.');
    }
  }

  /// Restores a session already persisted on this device (e.g. app was
  /// force-closed and reopened) without a network round trip, so the user
  /// isn't asked to log in again every launch.
  Future<AppUser?> restoreSession() async {
    final token = await AuthStorage.getAccessToken();
    final cachedUser = await AuthStorage.getUser();
    if (token == null || cachedUser == null) return null;

    final user = AppUser.fromJson(cachedUser);
    _ref.read(currentUserProvider.notifier).state = user;
    return user;
  }

  Future<void> logout() async {
    await AuthStorage.clear();
    _ref.read(currentUserProvider.notifier).state = null;
  }
}
