import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:shabooagri_mobile/core/layout/responsive.dart';
import 'package:shabooagri_mobile/core/models/app_user.dart';
import 'package:shabooagri_mobile/core/providers/session_provider.dart';
import 'package:shabooagri_mobile/core/theme/app_theme.dart';
import 'package:shabooagri_mobile/core/widgets/desktop_sidebar.dart';
import 'package:shabooagri_mobile/core/widgets/desktop_table.dart';
import 'package:shabooagri_mobile/core/widgets/role_shell.dart';

import 'package:shabooagri_mobile/features/jobs/presentation/job_list_screen.dart';
import 'package:shabooagri_mobile/features/jobs/data/job_detail.dart';
import 'package:shabooagri_mobile/features/customers/presentation/customer_form_screen.dart';
import 'package:shabooagri_mobile/features/villages/presentation/village_list_screen.dart';
import 'package:shabooagri_mobile/features/payments/presentation/payment_list_screen.dart';
import 'package:shabooagri_mobile/features/payments/presentation/payment_list_screen_provider.dart';
import 'package:shabooagri_mobile/features/payments/presentation/widgets/payment_filters_dialog.dart';
import 'package:shabooagri_mobile/features/payments/presentation/widgets/payment_filters_desktop_dialog.dart';
import 'package:shabooagri_mobile/features/payments/data/invoice_analysis.dart';

/// Verifies the FINAL Windows desktop-polish milestone: a genuine
/// compact-desktop tier at 900×700 (rail + top bar + desktop grids/forms, not
/// the phone UI) that is gated on a *desktop OS*, the Payments desktop filter
/// dialog, and the Driver/Farmer desktop rail at the compact size. These are
/// Linux desktop-layout proxies (the same widget tree Windows runs), NOT a
/// physical Windows install test.

const _owner = AppUser(
  id: 'u1',
  companyId: 'c1',
  fullName: 'Test Owner',
  email: 'owner@example.com',
  mobileNumber: null,
  roleSystemKey: 'owner',
  roleName: 'Owner',
);

JobDetail _job(String id, String number, String customer, String status,
        {String? machine, String? driver}) =>
    JobDetail.fromJson({
      'id': id,
      'bookingId': 'b-$id',
      'status': status,
      'booking': {
        'bookingNumber': number,
        'customer': {'name': customer},
        'village': {'name': 'Anandpur'},
      },
      if (machine != null) 'machine': {'registrationNumber': machine},
      if (driver != null)
        'driver': {
          'employee': {'name': driver}
        },
    });

VillageSummary _village(String id, String name) =>
    VillageSummary.fromJson({'id': id, 'name': name, 'isActive': true});

Future<void> _pump(
  WidgetTester tester,
  Widget screen,
  List<Override> overrides, {
  Size size = const Size(900, 700),
  TargetPlatform platform = TargetPlatform.windows,
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
      // Platform is driven via the theme (Responsive reads Theme.of().platform),
      // so we can simulate a desktop OS vs a phone without a global debug flag.
      child: MaterialApp(theme: AppTheme.themeData.copyWith(platform: platform), home: screen),
    ),
  );
  await tester.pump();
  await tester.pump(const Duration(milliseconds: 100));
}

Widget _driverRail(int index) => RoleShell(
      brandTitle: 'ShabooAgri',
      brandSubtitle: 'Driver',
      index: index,
      onSelect: (_) {},
      onLogout: () {},
      tabs: const [
        RoleTab(icon: Icons.home_outlined, selectedIcon: Icons.home, label: 'Home'),
        RoleTab(icon: Icons.work_outline, selectedIcon: Icons.work, label: 'Job Cards'),
        RoleTab(icon: Icons.person_outline, selectedIcon: Icons.person, label: 'Profile'),
      ],
      children: const [
        Scaffold(body: Center(child: Text('Home tab'))),
        Scaffold(body: Center(child: Text('Jobs tab'))),
        Scaffold(body: Center(child: Text('Profile tab'))),
      ],
    );

void main() {
  // ---- Phase 1: the platform-aware breakpoint semantics (pure logic) ----
  group('Responsive tier semantics', () {
    test('a desktop OS keeps the desktop shell down to the compact tier', () {
      const win900 = Responsive(900, platform: TargetPlatform.windows);
      expect(win900.isDesktop, isTrue);
      expect(win900.isDesktopCompact, isTrue);
      expect(win900.isCompact, isFalse);

      const win1366 = Responsive(1366, platform: TargetPlatform.windows);
      expect(win1366.isDesktop, isTrue);
      expect(win1366.isDesktopCompact, isFalse); // full desktop

      const win1920 = Responsive(1920, platform: TargetPlatform.macOS);
      expect(win1920.isDesktop, isTrue);
      expect(win1920.isDesktopCompact, isFalse);
    });

    test('a phone platform is unaffected below the 1000px breakpoint', () {
      const android900 = Responsive(900, platform: TargetPlatform.android);
      expect(android900.isDesktop, isFalse); // stays phone/medium, not desktop
      expect(android900.isDesktopCompact, isFalse);

      const android390 = Responsive(390, platform: TargetPlatform.android);
      expect(android390.isCompact, isTrue);

      // A phone/tablet still crosses into the full desktop shell at >= 1000.
      const android1200 = Responsive(1200, platform: TargetPlatform.iOS);
      expect(android1200.isDesktop, isTrue);
    });

    test('a very small desktop window falls back to phone below compactDesktop', () {
      const win500 = Responsive(500, platform: TargetPlatform.windows);
      expect(win500.isDesktop, isFalse);
      expect(win500.isCompact, isTrue);
    });
  });

  // ---- Phase 1/5: owner compact desktop at 900×700 on Windows ----
  testWidgets('Owner Jobs at 900x700 on Windows is a compact desktop (rail + grid, no phone nav, no overflow)',
      (tester) async {
    await _pump(
      tester,
      const JobListScreen(),
      [
        jobsListProvider.overrideWith((ref) async => [
              _job('1', 'BK-001', 'Ramesh', 'NOT_STARTED', machine: 'PB01AB1234', driver: 'Sohan'),
              _job('2', 'BK-002', 'Sita', 'COMPLETED'),
            ]),
      ],
      size: const Size(900, 700),
    );

    expect(find.byType(DesktopSidebar), findsOneWidget); // desktop rail retained
    expect(find.byType(DesktopTable), findsOneWidget); // desktop data grid, not phone cards
    expect(find.byType(NavigationBar), findsNothing); // no accidental phone bottom nav
    expect(tester.takeException(), isNull);

    await expectLater(find.byType(JobListScreen), matchesGoldenFile('goldens/jobs_compact_desktop_900_windows.png'));
  });

  testWidgets('Owner Jobs at 900x700 on Android stays the phone layout (no desktop sidebar)', (tester) async {
    await _pump(
      tester,
      const JobListScreen(),
      [
        jobsListProvider.overrideWith((ref) async => [
              _job('1', 'BK-001', 'Ramesh', 'NOT_STARTED'),
            ]),
      ],
      size: const Size(900, 700),
      platform: TargetPlatform.android,
    );

    // Same 900px width, but a phone OS must NOT get the desktop shell — this is
    // the Windows-desktop-compact vs Android-phone distinction.
    expect(find.byType(DesktopSidebar), findsNothing);
    expect(find.byType(DesktopTable), findsNothing);
    expect(tester.takeException(), isNull);
  });

  testWidgets('Owner create form at 900x700 on Windows uses the desktop shell with no overflow', (tester) async {
    await _pump(
      tester,
      const CustomerFormScreen(),
      [villagesListProvider.overrideWith((ref) async => [_village('v1', 'Anandpur')])],
      size: const Size(900, 700),
    );

    expect(find.byType(DesktopSidebar), findsOneWidget);
    expect(find.text('Create Customer'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  // ---- Phase 3/4: Driver + Farmer desktop rail at the compact size ----
  testWidgets('Driver role shell at 900x700 on Windows keeps the rail (no bottom nav, no owner sidebar)',
      (tester) async {
    await _pump(tester, _driverRail(0), const [], size: const Size(900, 700));

    expect(find.text('Job Cards'), findsOneWidget); // rail labels visible
    expect(find.text('Logout'), findsOneWidget);
    expect(find.byType(NavigationBar), findsNothing); // NOT the phone bottom nav
    expect(find.byType(DesktopSidebar), findsNothing); // never the owner sidebar
    expect(tester.takeException(), isNull);
  });

  testWidgets('Driver role shell on Android at 900 keeps the phone bottom nav (unchanged mobile)', (tester) async {
    await _pump(tester, _driverRail(0), const [], size: const Size(900, 700), platform: TargetPlatform.android);

    expect(find.byType(NavigationBar), findsOneWidget); // phone bottom nav preserved
    expect(find.byType(DesktopSidebar), findsNothing);
    expect(tester.takeException(), isNull);
  });

  // ---- Phase 2: Payments desktop filter dialog ----
  testWidgets('Payments desktop filter dialog offers the same filters and applies to the provider', (tester) async {
    late ProviderContainer container;
    await tester.pumpWidget(
      ProviderScope(
        child: Consumer(
          builder: (context, ref, _) {
            container = ProviderScope.containerOf(context);
            return const MaterialApp(home: Scaffold(body: PaymentFiltersDesktopDialog()));
          },
        ),
      ),
    );
    await tester.pump();

    // Same filters as the mobile bottom sheet.
    expect(find.text('Advanced Filters'), findsOneWidget);
    expect(find.text('Status'), findsOneWidget);
    expect(find.text('Date Filter'), findsOneWidget);
    expect(find.text('Outstanding Age (Days Overdue)'), findsOneWidget);
    expect(find.text('Apply Filters'), findsOneWidget);
    expect(find.text('Clear Filters'), findsOneWidget);

    // Select a status, apply, and confirm it lands in the shared provider.
    await tester.tap(find.widgetWithText(FilterChip, 'UNPAID'));
    await tester.pump();
    await tester.tap(find.text('Apply Filters'));
    await tester.pump();

    expect(container.read(paymentFilterProvider).status, contains('UNPAID'));
  });

  testWidgets('Payments screen opens the desktop dialog (not the bottom sheet) on a desktop window', (tester) async {
    await _pump(
      tester,
      const PaymentListScreen(),
      [
        // Keep the body in its loading state so the test doesn't need a full
        // analysis payload; the top-bar filter action is always present.
        invoicesAnalysisProvider.overrideWith((ref) => Completer<InvoiceAnalysisResponse>().future),
        advancesListProvider.overrideWith((ref) => Completer<List<AdvanceSummary>>().future),
      ],
      size: const Size(1366, 768),
    );

    await tester.tap(find.byTooltip('Advanced Filters'));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 100));

    expect(find.byType(PaymentFiltersDesktopDialog), findsOneWidget); // desktop dialog
    expect(find.byType(PaymentFiltersDialog), findsNothing); // NOT the phone bottom sheet
    expect(tester.takeException(), isNull);
  });
}
