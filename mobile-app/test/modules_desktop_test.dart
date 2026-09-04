import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:shabooagri_mobile/core/models/app_user.dart';
import 'package:shabooagri_mobile/core/models/company_profile.dart';
import 'package:shabooagri_mobile/core/providers/company_profile_provider.dart';
import 'package:shabooagri_mobile/core/providers/session_provider.dart';
import 'package:shabooagri_mobile/core/theme/app_theme.dart';
import 'package:shabooagri_mobile/core/widgets/desktop_sidebar.dart';
import 'package:shabooagri_mobile/core/widgets/desktop_table.dart';

import 'package:shabooagri_mobile/features/jobs/presentation/job_list_screen.dart';
import 'package:shabooagri_mobile/features/jobs/data/job_detail.dart';
import 'package:shabooagri_mobile/features/machines/presentation/machine_list_screen.dart';
import 'package:shabooagri_mobile/features/employees/presentation/employee_list_screen.dart';
import 'package:shabooagri_mobile/features/expenses/presentation/expense_list_screen.dart';

/// Flutter-desktop-layout proxy for the operational modules migrated to the
/// desktop shell in this milestone. Each test renders the *real* screen with
/// stubbed data at desktop window size(s) and asserts it uses the desktop
/// presentation (persistent sidebar + data grid) with no RenderFlex overflow —
/// the same widget tree Windows runs. This is NOT a Windows install test.

const _owner = AppUser(
  id: 'u1',
  companyId: 'c1',
  fullName: 'Test Owner',
  email: 'owner@example.com',
  mobileNumber: null,
  roleSystemKey: 'owner',
  roleName: 'Owner',
);

Future<void> _pumpScreen(
  WidgetTester tester,
  Widget screen,
  List<Override> overrides, {
  Size size = const Size(1366, 768),
}) async {
  tester.view.devicePixelRatio = 1.0;
  tester.view.physicalSize = size;
  addTearDown(tester.view.resetPhysicalSize);
  addTearDown(tester.view.resetDevicePixelRatio);

  await tester.pumpWidget(
    ProviderScope(
      overrides: [
        currentUserProvider.overrideWith((ref) => _owner),
        ...overrides,
      ],
      child: MaterialApp(theme: AppTheme.themeData, home: screen),
    ),
  );
  // NB: some status badges (e.g. an active "WORKING" job) run a repeating pulse
  // animation, so pumpAndSettle would never settle. Pump twice instead: once to
  // build, once (with a small delta) to let the overridden futures resolve.
  await tester.pump();
  await tester.pump(const Duration(milliseconds: 100));
}

JobDetail _job(String id, String number, String customer, String status,
        {String? machine, String? driver}) =>
    JobDetail.fromJson({
      'id': id,
      'bookingId': 'b-$id',
      'status': status,
      'booking': {
        'bookingNumber': number,
        'customer': {'name': customer, 'village': 'Anandpur'},
      },
      if (machine != null) 'machine': {'registrationNumber': machine},
      if (driver != null)
        'driver': {
          'employee': {'name': driver}
        },
    });

MachineSummary _machine(String id, String reg, String status) => MachineSummary.fromJson({
      'id': id,
      'registrationNumber': reg,
      'brand': 'John Deere',
      'model': '5050D',
      'status': status,
      'hourMeterReading': '120',
    });


EmployeeSummary _employee(String id, String name, String status) =>
    EmployeeSummary.fromJson({'id': id, 'name': name, 'roleTitle': 'Field Staff', 'employmentStatus': status});

ExpenseSummary _expense(String id, String category, double amount) => ExpenseSummary.fromJson({
      'id': id,
      'amount': amount,
      'description': 'Test',
      'expenseDate': '2026-08-20T00:00:00.000Z',
      'category': {'id': 'cat-1', 'name': category},
    });

void main() {
  testWidgets('Jobs uses the desktop data grid + sidebar (owner) at 1366', (tester) async {
    // Golden data deliberately avoids the animated "WORKING" badge so the
    // captured image is deterministic across runs/machines.
    await _pumpScreen(tester, const JobListScreen(), [
      jobsListProvider.overrideWith((ref) async => [
            _job('1', 'BK-001', 'Ramesh', 'NOT_STARTED', machine: 'PB01AB1234', driver: 'Sohan'),
            _job('2', 'BK-002', 'Sita', 'NOT_STARTED'),
            _job('3', 'BK-003', 'Mohan', 'COMPLETED', machine: 'PB01CD5678', driver: 'Gita'),
          ]),
    ]);

    expect(find.byType(DesktopSidebar), findsOneWidget);
    expect(find.byType(DesktopTable), findsOneWidget);
    expect(find.byType(DataTable), findsOneWidget);
    expect(find.text('BK-001'), findsOneWidget);
    expect(tester.takeException(), isNull);

    await expectLater(
      find.byType(JobListScreen),
      matchesGoldenFile('goldens/jobs_desktop_1366.png'),
    );
  });

  testWidgets('Machines uses the desktop data grid at 1366', (tester) async {
    await _pumpScreen(tester, const MachineListScreen(), [
      machinesListProvider.overrideWith((ref) async => [
            _machine('1', 'PB01AB1234', 'AVAILABLE'),
            _machine('2', 'PB01CD5678', 'WORKING'),
          ]),
      // Keep company profile in a loading state so the screen falls back to its
      // default alert thresholds (no network in tests).
      companyProfileProvider.overrideWith((ref) => Completer<CompanyProfile>().future),
    ]);

    expect(find.byType(DesktopSidebar), findsOneWidget);
    expect(find.byType(DesktopTable), findsOneWidget);
    expect(find.text('PB01AB1234'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  testWidgets('Employees uses the desktop data grid at 1366', (tester) async {
    await _pumpScreen(tester, const EmployeeListScreen(), [
      employeesListProvider.overrideWith((ref) async => [
            _employee('1', 'Ravi', 'ACTIVE'),
            _employee('2', 'Anil', 'INACTIVE'),
          ]),
    ]);

    expect(find.byType(DesktopTable), findsOneWidget);
    expect(find.text('Ravi'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  testWidgets('Expenses uses the desktop data grid at 1366', (tester) async {
    await _pumpScreen(tester, const ExpenseListScreen(), [
      expensesListProvider.overrideWith((ref) async => [
            _expense('1', 'Diesel', 1200),
            _expense('2', 'Repairs', 800),
          ]),
    ]);

    expect(find.byType(DesktopTable), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  testWidgets('Jobs desktop grid has no overflow at a small desktop window (900x700)',
      (tester) async {
    await _pumpScreen(
      tester,
      const JobListScreen(),
      [
        jobsListProvider.overrideWith((ref) async => [
              _job('1', 'BK-001', 'Ramesh', 'WORKING', machine: 'PB01AB1234', driver: 'Sohan'),
            ]),
      ],
      size: const Size(900, 700),
    );

    // 900px is below the 1000px desktop breakpoint, so this exercises the
    // medium/phone layout path — verify it adapts without overflow.
    expect(tester.takeException(), isNull);
  });

  testWidgets('Jobs desktop grid has no overflow at 1920x1080', (tester) async {
    await _pumpScreen(
      tester,
      const JobListScreen(),
      [
        jobsListProvider.overrideWith((ref) async => [
              _job('1', 'BK-001', 'Ramesh', 'WORKING', machine: 'PB01AB1234', driver: 'Sohan'),
              _job('2', 'BK-002', 'Sita', 'NOT_STARTED'),
            ]),
      ],
      size: const Size(1920, 1080),
    );

    expect(find.byType(DesktopSidebar), findsOneWidget);
    expect(find.byType(DesktopTable), findsOneWidget);
    expect(tester.takeException(), isNull);
  });
}
