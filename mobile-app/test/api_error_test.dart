import 'dart:io' show SocketException;

import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shabooagri_mobile/core/network/api_error.dart';

RequestOptions _ro() => RequestOptions(path: '/customers');

void main() {
  group('apiErrorMessage — no raw technical exceptions ever leak', () {
    test('a Failed host lookup (offline) becomes professional copy', () {
      final e = DioException(
        requestOptions: _ro(),
        type: DioExceptionType.unknown,
        error: const SocketException('Failed host lookup: pilot.shabooagri.com'),
        message: 'SocketException: Failed host lookup: pilot.shabooagri.com',
      );
      final msg = apiErrorMessage(e);
      expect(msg, isNot(contains('SocketException')));
      expect(msg, isNot(contains('Failed host lookup')));
      expect(msg, isNot(contains('DioException')));
      expect(msg.toLowerCase(), contains('offline'));
    });

    test('a raw connectionError becomes professional copy', () {
      final e = DioException(requestOptions: _ro(), type: DioExceptionType.connectionError);
      expect(apiErrorMessage(e).toLowerCase(), contains('offline'));
    });

    test('offline-no-data (first run) gets the "not downloaded" message', () {
      final e = DioException(
        requestOptions: _ro(),
        type: DioExceptionType.connectionError,
        error: const OfflineNoData(),
      );
      expect(apiErrorMessage(e).toLowerCase(), contains('downloaded'));
    });

    test('a real server error surfaces the backend message, not a generic one', () {
      final e = DioException(
        requestOptions: _ro(),
        response: Response(
          requestOptions: _ro(),
          statusCode: 400,
          data: {'error': 'Phone number already exists'},
        ),
        type: DioExceptionType.badResponse,
      );
      expect(apiErrorMessage(e), 'Phone number already exists');
    });

    test('a 500 with no body is professional, not a stack trace', () {
      final e = DioException(
        requestOptions: _ro(),
        response: Response(requestOptions: _ro(), statusCode: 500),
        type: DioExceptionType.badResponse,
      );
      final msg = apiErrorMessage(e);
      expect(msg, isNot(contains('500')));
      expect(msg.toLowerCase(), contains('server'));
    });

    test('forRead:false gives the "saved and will sync" copy for a failed action', () {
      final e = DioException(requestOptions: _ro(), type: DioExceptionType.connectionError);
      expect(apiErrorMessage(e, forRead: false).toLowerCase(), contains('sync'));
    });
  });

  group('isOfflineError', () {
    test('true for connectivity failures and host lookup', () {
      expect(isOfflineError(const SocketException('x')), isTrue);
      expect(isOfflineError(const OfflineNoData()), isTrue);
      expect(
        isOfflineError(DioException(requestOptions: _ro(), type: DioExceptionType.connectionError)),
        isTrue,
      );
    });

    test('false for a real server response', () {
      final e = DioException(
        requestOptions: _ro(),
        response: Response(requestOptions: _ro(), statusCode: 400, data: {'error': 'bad'}),
        type: DioExceptionType.badResponse,
      );
      expect(isOfflineError(e), isFalse);
    });
  });
}
