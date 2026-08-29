import 'dart:convert';

import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:shabooagri_mobile/core/network/api_client.dart';
import 'package:shabooagri_mobile/features/dashboard/data/dashboard_summary.dart';
import 'package:shabooagri_mobile/features/dashboard/presentation/dashboard_screen.dart';

// Regression coverage for the production Dashboard-loading failure.
//
// Root cause: GET /dashboard/summary returns a *narrow* (driver / non-company)
// payload where `kpis`, `machineStatus` and `pendingPayments` are all `null`.
// The old client cast `json['kpis'] as Map<String, dynamic>` unconditionally,
// which threw `type 'Null' is not a subtype of type 'Map<String, dynamic>'`.
// That TypeError is not a DioException, so the UI fell through to the generic
// "Could not load dashboard: Something went wrong. Please try again."
//
// These tests lock in that the client tolerates both scopes.

const _companyJson = '''
{
  "scope": "company",
  "kpis": {
    "todayRevenue": { "current": 0, "previous": 0, "delta": 0, "deltaPercent": null },
    "monthRevenue": { "current": 12673, "previous": 0, "delta": 12673, "deltaPercent": null },
    "pendingCollection": { "current": 1836, "previous": 1836, "delta": 0, "deltaPercent": null },
    "machinesWorking": { "working": 0, "activeUsable": 4, "total": 4, "percent": 0, "delta": null, "deltaPercent": null },
    "driversActive": { "current": 0, "previous": 0, "delta": 0, "deltaPercent": null },
    "jobsCompleted": { "current": 0, "previous": 0, "delta": 0, "deltaPercent": null }
  },
  "machineStatus": { "WORKING": 0, "AVAILABLE": 4, "REPAIR": 0, "OFFLINE": 0, "total": 4, "activeUsable": 4 },
  "todaysJobs": [],
  "pendingPayments": [
    {
      "customerId": "c1",
      "customerName": "Farmer A",
      "villageName": "Mukulishi",
      "villageId": "v1",
      "totalOutstanding": 1800,
      "invoices": [
        { "invoiceId": "i1", "invoiceNumber": "INV-000689", "totalAmount": 1800, "paidAmount": 0,
          "balanceAmount": 1800, "status": "UNPAID", "invoiceDate": "2026-08-19", "dueDate": null, "daysOutstanding": 10 }
      ]
    }
  ]
}
''';

// Exactly what the backend returns for scope=driver: every company-only field null.
const _driverJson = '''
{ "scope": "driver", "todaysJobs": [], "kpis": null, "machineStatus": null, "pendingPayments": null }
''';

Dio _mockDio(String body) {
  final dio = Dio();
  dio.interceptors.add(InterceptorsWrapper(
    onRequest: (options, handler) {
      handler.resolve(Response(
        requestOptions: options,
        statusCode: 200,
        data: jsonDecode(body),
      ));
    },
  ));
  return dio;
}

void main() {
  group('DashboardSummary.fromJson', () {
    test('parses the company-scope payload with populated KPIs', () {
      final s = DashboardSummary.fromJson(jsonDecode(_companyJson) as Map<String, dynamic>);
      expect(s.kpis, isNotNull);
      expect(s.kpis!.monthRevenue.current, 12673);
      expect(s.kpis!.pendingCollection.current, 1836);
      expect(s.pendingPayments, isNotNull);
      expect(s.pendingPayments!.single.totalOutstanding, 1800);
    });

    test('parses the driver-scope payload (null kpis) without throwing', () {
      // This is the exact call that used to throw a TypeError in production.
      final s = DashboardSummary.fromJson(jsonDecode(_driverJson) as Map<String, dynamic>);
      expect(s.kpis, isNull);
      expect(s.pendingPayments, isNull);
      expect(s.todaysJobs, isEmpty);
    });
  });

  group('DashboardScreen', () {
    testWidgets('renders the driver-scope response instead of the error state',
        (tester) async {
      await tester.pumpWidget(ProviderScope(
        overrides: [apiClientProvider.overrideWithValue(_mockDio(_driverJson))],
        child: const MaterialApp(home: DashboardScreen()),
      ));
      await tester.pumpAndSettle();

      expect(find.textContaining('Could not load dashboard'), findsNothing);
      expect(find.textContaining('Something went wrong'), findsNothing);
    });

    testWidgets('renders company KPI values', (tester) async {
      await tester.pumpWidget(ProviderScope(
        overrides: [apiClientProvider.overrideWithValue(_mockDio(_companyJson))],
        child: const MaterialApp(home: DashboardScreen()),
      ));
      await tester.pumpAndSettle();

      expect(find.textContaining('Could not load dashboard'), findsNothing);
      expect(find.text('Pending Collection'), findsOneWidget);
    });
  });
}
