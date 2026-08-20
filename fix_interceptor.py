import re

with open('mobile-app/lib/core/network/api_client.dart', 'r') as f:
    text = f.read()

# Replace the _AuthInterceptor completely
start_idx = text.find("class _AuthInterceptor extends Interceptor {")

new_interceptor = """class _AuthInterceptor extends Interceptor {
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
"""

text = text[:start_idx] + new_interceptor

with open('mobile-app/lib/core/network/api_client.dart', 'w') as f:
    f.write(text)
