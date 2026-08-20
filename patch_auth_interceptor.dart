  final Dio _dio;
  final Ref _ref;
  bool _isRefreshing = false;
  final List<RequestOptions> _failedRequests = [];

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
      // If a refresh is already in progress, wait for it to complete
      // by returning a retry future.
      _failedRequests.add(err.requestOptions);
      handler.resolve(await _retry(err.requestOptions));
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
      final refreshResponse = await Dio(BaseOptions(baseUrl: _dio.options.baseUrl)).post(
        '/auth/refresh',
        data: {'refreshToken': refreshToken},
      );
      final newAccessToken = refreshResponse.data['accessToken'] as String;
      final newRefreshToken = refreshResponse.data['refreshToken'] as String;
      await AuthStorage.saveTokens(accessToken: newAccessToken, refreshToken: newRefreshToken);

      final retryOptions = err.requestOptions;
      retryOptions.headers['Authorization'] = 'Bearer $newAccessToken';
      final retryResponse = await _dio.fetch(retryOptions);
      
      // Retry all other failed requests
      for (final req in _failedRequests) {
        req.headers['Authorization'] = 'Bearer $newAccessToken';
        _dio.fetch(req).catchError((_) => Response(requestOptions: req));
      }
      _failedRequests.clear();

      handler.resolve(retryResponse);
    } catch (_) {
      // Refresh token is invalid/expired too
      _failedRequests.clear();
      await AuthStorage.clear();
      _ref.read(currentUserProvider.notifier).state = null;
      rootNavigatorKey.currentContext?.go('/login');
      handler.next(err);
    } finally {
      _isRefreshing = false;
    }
  }

  Future<Response<dynamic>> _retry(RequestOptions requestOptions) async {
    final token = await AuthStorage.getAccessToken();
    requestOptions.headers['Authorization'] = 'Bearer $token';
    return _dio.fetch(requestOptions);
  }
