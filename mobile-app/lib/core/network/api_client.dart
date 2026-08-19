import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../providers/session_provider.dart';
import '../storage/local_storage.dart';
import 'package:go_router/go_router.dart';
import '../router/app_router.dart';

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

  dio.interceptors.add(LogInterceptor(
    request: true,
    requestHeader: true,
    requestBody: true,
    responseHeader: true,
    responseBody: true,
    error: true,
  ));

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

    if (err.response?.statusCode != 401 || isAuthEndpoint || _isRefreshing) {
      handler.next(err);
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

      final retryOptions = err.requestOptions;
      retryOptions.headers['Authorization'] = 'Bearer $newAccessToken';
      final retryResponse = await _dio.fetch(retryOptions);
      handler.resolve(retryResponse);
    } catch (_) {
      // Refresh token is invalid/expired too — surface the original 401 so
      // the caller can route the user back to login.
      await AuthStorage.clear();
      _ref.read(currentUserProvider.notifier).state = null;
      rootNavigatorKey.currentContext?.go('/login');
      handler.next(err);
    } finally {
      _isRefreshing = false;
    }
  }
}
