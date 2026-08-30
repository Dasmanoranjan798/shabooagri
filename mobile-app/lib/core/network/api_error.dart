import 'dart:io' show SocketException;

import 'package:dio/dio.dart';

/// Sentinel attached by the offline interceptor to a GET that failed because the
/// device is offline AND nothing was ever cached for that screen (first-run /
/// never-synced). Lets [apiErrorMessage] show the right professional copy —
/// "not downloaded yet" — instead of a generic connectivity message.
class OfflineNoData implements Exception {
  const OfflineNoData();
}

/// True when [error] represents a loss of connectivity (as opposed to the
/// server actively responding with an error). Covers every Dio connectivity
/// failure type plus the raw platform errors that leak through as
/// "Failed host lookup" / "No address associated with hostname".
bool isOfflineError(Object? error) {
  if (error is OfflineNoData) return true;
  if (error is SocketException) return true;
  if (error is DioException) {
    if (error.error is OfflineNoData || error.error is SocketException) return true;
    switch (error.type) {
      case DioExceptionType.connectionError:
      case DioExceptionType.connectionTimeout:
      case DioExceptionType.sendTimeout:
      case DioExceptionType.receiveTimeout:
        // A genuine offline drop has no server response.
        return error.response == null;
      case DioExceptionType.unknown:
        final msg = error.message ?? error.error?.toString() ?? '';
        return error.response == null &&
            (error.error is SocketException ||
                msg.contains('Failed host lookup') ||
                msg.contains('No address associated with hostname') ||
                msg.contains('Network is unreachable') ||
                msg.contains('Connection refused'));
      default:
        return false;
    }
  }
  return false;
}

/// Turns any thrown error into a clear, professional, user-facing message.
///
/// A normal user must NEVER see `DioException`, `SocketException`,
/// "Failed host lookup", "OS Error", or similar developer-level text — every
/// connectivity failure is translated to plain language. Genuine server errors
/// still surface the backend's real `{ "error": "…" }` message (see
/// `backend/src/middleware/error.middleware.ts`) so validation feedback stays
/// specific.
///
/// [forRead] tailors the offline copy: a read that has no local data yet says
/// "not downloaded", while a failed action says "saved and will retry".
String apiErrorMessage(Object error, {bool forRead = true}) {
  // Offline, and this screen has never been synced to the device.
  if (error is OfflineNoData ||
      (error is DioException && error.error is OfflineNoData)) {
    return "You're offline and this hasn't been downloaded to this device yet. "
        'Connect to the internet once to sync it.';
  }

  // Any other loss of connectivity.
  if (isOfflineError(error)) {
    return forRead
        ? "You're offline. Showing the latest data saved on this device."
        : "You're offline. Your change is saved on this device and will sync "
            'automatically when your connection returns.';
  }

  // The server actively responded — surface its real message.
  if (error is DioException) {
    final data = error.response?.data;
    if (data is Map && data['error'] is String) {
      return data['error'] as String;
    }
    if (data is Map && data['message'] is String) {
      return data['message'] as String;
    }
    final code = error.response?.statusCode;
    if (code != null) {
      if (code == 401 || code == 403) {
        return 'You don\'t have permission to do that, or your session expired.';
      }
      if (code == 404) return 'That item could not be found.';
      if (code >= 500) return 'The server had a problem. Please try again shortly.';
    }
  }
  return 'Something went wrong. Please try again.';
}
