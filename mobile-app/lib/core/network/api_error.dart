import 'package:dio/dio.dart';

/// Backend error responses are always `{ "error": "message text" }`
/// (see `backend/src/middleware/error.middleware.ts`). Used across every
/// form/action screen to surface the real server message instead of a
/// generic "something went wrong".
String apiErrorMessage(Object error) {
  if (error is DioException) {
    final data = error.response?.data;
    if (data is Map && data['error'] is String) {
      return data['error'] as String;
    }
    if (error.type == DioExceptionType.connectionTimeout ||
        error.type == DioExceptionType.receiveTimeout ||
        error.type == DioExceptionType.connectionError) {
      return 'Could not reach the server. Check your connection and try again.';
    }
  }
  return 'Something went wrong. Please try again.';
}
