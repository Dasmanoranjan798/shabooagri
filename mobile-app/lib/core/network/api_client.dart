import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart' show kDebugMode;
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../providers/session_provider.dart';
import '../storage/local_storage.dart';
import 'package:go_router/go_router.dart';
import '../router/app_router.dart';
import '../sync/data_sync.dart';

/// Dio instance scoped to the current tenant. Rebuilds (cheap) whenever the
/// company slug changes, e.g. right after the Company Setup screen saves it.
/// Base URL is `https://{slug}.shabooagri.com`, matching the wildcard
/// subdomain -> tenantResolver middleware the web app already relies on —
/// no backend changes needed to support this.
final apiClientProvider = Provider<Dio>((ref) {
  final slug = ref.watch(tenantSlugProvider);

  final dio = Dio(
    BaseOptions(
      baseUrl: slug != null ? 'https://$slug.shabooagri.com' : 'https://shabooagri.com',
      connectTimeout: const Duration(seconds: 10),
      receiveTimeout: const Duration(seconds: 10),
      headers: {
        'Content-Type': 'application/json',
      },
    ),
  );

  dio.interceptors.add(_AuthInterceptor(dio, ref));

  // Global real-time sync: every successful mutation bumps the affected
  // entities' revisions, so all open screens that show related data refetch
  // authoritative results from the backend — no manual per-screen refresh.
  dio.interceptors.add(DataSyncInterceptor(ref));

  // Full request/response logging (headers + bodies) prints the Bearer token
  // and login/OTP payloads to the platform log. That is a development aid only
  // — it must never run in a production/release build (it would leak
  // credentials to logcat). Gate it to debug builds.
  if (kDebugMode) {
    dio.interceptors.add(LogInterceptor(
      request: true,
      requestHeader: true,
      requestBody: true,
      responseHeader: true,
      responseBody: true,
      error: true,
    ));
  }

  return dio;
});

/// Attaches the stored access token to every request, and on a 401
/// transparently refreshes the session once (via `/auth/refresh`) and
/// retries the original request — mirroring the same pattern already used
/// by the website (`frontend/src/lib/api.ts`), since the access token is
/// short-lived (15 minutes) and field sessions need to outlast that.
class _AuthInterceptor extends Interceptor {
  final Dio _dio;
  final Ref _ref;
  bool _isRefreshing = false;
  final _retryQueue = <RequestOptions>[];

  _AuthInterceptor(this._dio, this._ref);

  @override
  Future<void> onRequest(RequestOptions options, RequestInterceptorHandler handler) async {
    final token = await AuthStorage.getAccessToken();
    if (token != null) {
      options.headers['Authorization'] = 'Bearer $token';
    }
    handler.next(options);
  }

  @override
  Future<void> onError(DioException err, ErrorInterceptorHandler handler) async {
    final isAuthEndpoint = err.requestOptions.path.contains('/auth/login') ||
        err.requestOptions.path.contains('/auth/refresh');

    if (err.response?.statusCode != 401 || isAuthEndpoint) {
      handler.next(err);
      return;
    }

    if (_isRefreshing) {
      // Queue the failed request to be retried after refresh
      _retryQueue.add(err.requestOptions);
      // We don't resolve/reject here yet, we need to wait.
      // But Dio ErrorInterceptorHandler doesn't easily let us wait without a future.
      // A common pattern is to just resolve it with a retry Future:
      try {
         final response = await _retryLater(err.requestOptions);
         handler.resolve(response);
      } catch (e) {
         handler.next(err);
      }
      return;
    }

    final refreshToken = await AuthStorage.getRefreshToken();
    if (refreshToken == null) {
      await AuthStorage.clear();
      _ref.read(currentUserProvider.notifier).state = null;
      rootNavigatorKey.currentContext?.go('/login');
      handler.next(err);
      return;
    }

    _isRefreshing = true;
    try {
      final refreshResponse = await _dio.post(
        '/auth/refresh',
        data: {'refreshToken': refreshToken},
      );
      final newAccessToken = refreshResponse.data['accessToken'] as String;
      final newRefreshToken = refreshResponse.data['refreshToken'] as String;
      await AuthStorage.saveTokens(accessToken: newAccessToken, refreshToken: newRefreshToken);

      // Retry original failed request
      final retryOptions = err.requestOptions;
      retryOptions.headers['Authorization'] = 'Bearer $newAccessToken';
      final retryResponse = await _dio.fetch(retryOptions);
      handler.resolve(retryResponse);
    } catch (_) {
      await AuthStorage.clear();
      _ref.read(currentUserProvider.notifier).state = null;
      rootNavigatorKey.currentContext?.go('/login');
      handler.next(err);
    } finally {
      _isRefreshing = false;
    }
  }

  Future<Response> _retryLater(RequestOptions options) async {
    // Wait until refreshing is done
    while (_isRefreshing) {
      await Future.delayed(const Duration(milliseconds: 100));
    }
    final token = await AuthStorage.getAccessToken();
    options.headers['Authorization'] = 'Bearer $token';
    return _dio.fetch(options);
  }
}
