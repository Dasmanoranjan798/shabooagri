import 'dart:io' show SocketException;

import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shabooagri_mobile/core/network/api_error.dart';

RequestOptions _ro() => RequestOptions(path: '/customers');

/// Stands in for AuthException without importing the auth layer: any
/// UserFacingError must have its message surfaced verbatim.
class _FakeAuthError implements UserFacingError {
  @override
  final String message;
  _FakeAuthError(this.message);
}

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

  group('UserFacingError — deliberate messages are surfaced verbatim', () {
    // A regression guard: auth flows throw AuthException (a UserFacingError)
    // rather than a DioException, and its message is composed for the user
    // ("Incorrect email/phone or password."). apiErrorMessage must NOT collapse
    // that into the generic fallback — doing so masked the real login failure.
    test('surfaces the message of a UserFacingError, not the generic fallback', () {
      final e = _FakeAuthError('Incorrect email/phone or password.');
      expect(apiErrorMessage(e, forRead: false), 'Incorrect email/phone or password.');
      expect(apiErrorMessage(e), isNot(contains('Something went wrong')));
    });

    test('a bare Exception (not user-facing) still gets the generic fallback', () {
      expect(apiErrorMessage(Exception('boom')), 'Something went wrong. Please try again.');
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

  group('isJobStateConflict — another device changed the job first', () {
    DioException conflict(String message) => DioException(
          requestOptions: _ro(),
          response: Response(requestOptions: _ro(), statusCode: 400, data: {'error': message}),
          type: DioExceptionType.badResponse,
        );

    test('true for the backend assertStatus rejection of a stale action', () {
      // Manager acts on WORKING (v12) after Owner already completed it (v13):
      // the backend's status state-machine safely rejects the stale mutation.
      expect(isJobStateConflict(conflict('Cannot stop a job that is currently COMPLETED')), isTrue);
      expect(isJobStateConflict(conflict('Cannot pause a job that is currently STOPPED')), isTrue);
      expect(isJobStateConflict(conflict('Cannot resume a job that is currently WORKING')), isTrue);
    });

    test('false for an unrelated validation error (still shows its real copy)', () {
      expect(isJobStateConflict(conflict('Assign a machine and driver before starting this job')), isFalse);
      expect(isJobStateConflict(conflict('Phone number already exists')), isFalse);
    });

    test('false for a non-400 and for non-Dio errors', () {
      final notFound = DioException(
        requestOptions: _ro(),
        response: Response(requestOptions: _ro(), statusCode: 404, data: {'error': 'a job that is currently gone'}),
        type: DioExceptionType.badResponse,
      );
      expect(isJobStateConflict(notFound), isFalse);
      expect(isJobStateConflict(Exception('a job that is currently WORKING')), isFalse);
      expect(isJobStateConflict(const OfflineNoData()), isFalse);
    });
  });
}
