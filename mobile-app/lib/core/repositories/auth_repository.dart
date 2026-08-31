import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/app_user.dart';
import '../network/api_client.dart';
import '../network/api_error.dart';
import '../providers/session_provider.dart';
import '../storage/local_storage.dart';

final authRepositoryProvider = Provider<AuthRepository>((ref) {
  return AuthRepository(ref);
});

class AuthException implements UserFacingError {
  @override
  final String message;
  AuthException(this.message);
  @override
  String toString() => message;
}

/// Real authentication against the operational backend — the SAME endpoints
/// and contracts the website uses (`frontend/src/lib/api.ts`). This client
/// carries no auth/authorization business rules of its own: it posts to the
/// authoritative API, persists the returned session, and surfaces the server's
/// errors. Tenant is the subdomain the Dio client already targets
/// (`https://{slug}.shabooagri.com`), resolved by the backend from the Host.
class AuthRepository {
  final Ref _ref;

  AuthRepository(this._ref);

  // Shared: persist the token pair + user from any login-shaped response
  // (password/PIN/OTP/accept-invite all return { user, accessToken, refreshToken }).
  Future<AppUser> _completeLogin(Map<String, dynamic> data) async {
    final user = AppUser.fromJson(data['user'] as Map<String, dynamic>);
    await AuthStorage.saveSession(
      accessToken: data['accessToken'] as String,
      refreshToken: data['refreshToken'] as String,
      user: data['user'] as Map<String, dynamic>,
    );
    // Prime PIN quick-login: remember who just authenticated so a later PIN
    // login on this device needs only the PIN. The backend still resolves the
    // user from this identifier + tenant subdomain and enforces isolation.
    await _rememberPinIdentifier(user);
    _ref.read(currentUserProvider.notifier).state = user;
    return user;
  }

  // Stores the user's email (or phone) as the remembered PIN-login identifier.
  Future<void> _rememberPinIdentifier(AppUser user) async {
    final identifier = (user.email != null && user.email!.isNotEmpty)
        ? user.email!
        : (user.mobileNumber ?? '');
    if (identifier.isNotEmpty) {
      await PinLoginStorage.setIdentifier(identifier);
    }
  }

  // Maps backend auth errors to safe, user-facing messages. `on401` lets each
  // flow phrase its own "bad credentials/code/token" case; 429 surfaces the
  // server's rate-limit message (P1-4); everything else is a generic failure.
  Never _mapError(DioException e, String on401, {String? on400}) {
    final status = e.response?.statusCode;
    final data = e.response?.data;
    final serverMsg = (data is Map && data['error'] is String) ? data['error'] as String : null;
    if (status == 401) throw AuthException(on401);
    if (status == 400) throw AuthException(on400 ?? serverMsg ?? 'Invalid request.');
    if (status == 404) throw AuthException(serverMsg ?? on401);
    if (status == 429) {
      throw AuthException(serverMsg ?? 'Too many attempts. Please wait a few minutes and try again.');
    }
    // 502/503 (e.g. SMS provider unconfigured) and everything else.
    throw AuthException(serverMsg ?? 'Could not reach the server. Check your connection and try again.');
  }

  Future<AppUser> login(String identifier, String password) async {
    final dio = _ref.read(apiClientProvider);
    try {
      final response = await dio.post('/auth/login/password', data: {
        'identifier': identifier,
        'password': password,
      });
      return await _completeLogin(response.data as Map<String, dynamic>);
    } on DioException catch (e) {
      _mapError(e, 'Incorrect email/phone or password.');
    }
  }

  /// PIN login — POST /auth/login/pin { identifier, pin } (pin is 4-6 digits,
  /// validated server-side). Same session contract as password login.
  Future<AppUser> loginWithPin(String identifier, String pin) async {
    final dio = _ref.read(apiClientProvider);
    try {
      final response = await dio.post('/auth/login/pin', data: {
        'identifier': identifier,
        'pin': pin,
      });
      return await _completeLogin(response.data as Map<String, dynamic>);
    } on DioException catch (e) {
      _mapError(e, 'Incorrect PIN.');
    }
  }

  /// Create or reset the caller's own PIN — POST /auth/set-pin { pin }.
  /// Requires an authenticated session: the Create-PIN / Forgot-PIN wizard
  /// reaches here immediately after an OTP login, so identity is already proven
  /// and no old PIN is needed. The server hashes and stores the PIN; the raw
  /// PIN is never persisted or returned. On success we (re)remember this user's
  /// identifier so the very next quick-login needs only the PIN.
  Future<void> setPin(String pin) async {
    final dio = _ref.read(apiClientProvider);
    try {
      final response = await dio.post('/auth/set-pin', data: {'pin': pin});
      // The backend returns the updated public user (hasPin=true, no PIN hash).
      // Reflect that authoritative state into the live session so any UI reading
      // `hasPin` updates immediately, and re-remember the identifier.
      final data = response.data as Map<String, dynamic>;
      final userJson = data['user'] as Map<String, dynamic>?;
      if (userJson != null) {
        final updated = AppUser.fromJson(userJson);
        _ref.read(currentUserProvider.notifier).state = updated;
        final cached = await AuthStorage.getUser();
        if (cached != null) {
          await AuthStorage.updateUser({...cached, ...userJson});
        }
        await _rememberPinIdentifier(updated);
      } else {
        final user = _ref.read(currentUserProvider);
        if (user != null) await _rememberPinIdentifier(user);
      }
    } on DioException catch (e) {
      _mapError(e, 'Could not save your PIN. Please sign in again and retry.');
    }
  }

  /// Request an OTP — POST /auth/otp/request { identifier }. Email identifiers
  /// are delivered by SMTP; mobile identifiers by the configured SMS provider
  /// (returns 503 in production if none is configured — surfaced to the user).
  Future<void> requestOtp(String identifier) async {
    final dio = _ref.read(apiClientProvider);
    try {
      await dio.post('/auth/otp/request', data: {'identifier': identifier});
    } on DioException catch (e) {
      _mapError(e, 'No account found for this email/phone.');
    }
  }

  /// Verify OTP + login — POST /auth/otp/verify { identifier, code } (6 digits).
  Future<AppUser> verifyOtp(String identifier, String code) async {
    final dio = _ref.read(apiClientProvider);
    try {
      final response = await dio.post('/auth/otp/verify', data: {
        'identifier': identifier,
        'code': code,
      });
      return await _completeLogin(response.data as Map<String, dynamic>);
    } on DioException catch (e) {
      _mapError(e, 'Incorrect or expired code.');
    }
  }

  /// Request a password-reset email — POST /auth/password-reset/request { email }.
  /// Always resolves without revealing whether the account exists (backend rule).
  Future<void> requestPasswordReset(String email) async {
    final dio = _ref.read(apiClientProvider);
    try {
      await dio.post('/auth/password-reset/request', data: {'email': email});
    } on DioException catch (e) {
      _mapError(e, 'Could not send reset link. Please try again.');
    }
  }

  /// Confirm a password reset — POST /auth/password-reset/confirm
  /// { email, token, newPassword }. Token comes from the emailed link.
  Future<void> confirmPasswordReset(String email, String token, String newPassword) async {
    final dio = _ref.read(apiClientProvider);
    try {
      await dio.post('/auth/password-reset/confirm', data: {
        'email': email,
        'token': token,
        'newPassword': newPassword,
      });
    } on DioException catch (e) {
      _mapError(e, 'Invalid or expired reset link.', on400: 'Invalid or expired reset link.');
    }
  }

  /// Verify a staff/farmer invite token — POST /auth/invite/verify-token
  /// { token } → invite details (e.g. name) for the activation screen.
  Future<Map<String, dynamic>> verifyInviteToken(String token) async {
    final dio = _ref.read(apiClientProvider);
    try {
      final response = await dio.post('/auth/invite/verify-token', data: {'token': token});
      return (response.data as Map<String, dynamic>);
    } on DioException catch (e) {
      _mapError(e, 'This invite link is invalid or has expired.', on400: 'This invite link is invalid or has expired.');
    }
  }

  /// Accept an invite (self-onboard) — POST /auth/invite/accept
  /// { token, password }. Returns a login-shaped session (activates + logs in).
  Future<AppUser> acceptInvite(String token, String password) async {
    final dio = _ref.read(apiClientProvider);
    try {
      final response = await dio.post('/auth/invite/accept', data: {
        'token': token,
        'password': password,
      });
      return await _completeLogin(response.data as Map<String, dynamic>);
    } on DioException catch (e) {
      _mapError(e, 'This invite link is invalid or has expired.', on400: 'This invite link is invalid or has expired.');
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
