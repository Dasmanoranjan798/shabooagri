import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:shabooagri_mobile/core/layout/responsive_form.dart';
import 'package:shabooagri_mobile/core/models/app_user.dart';
import 'package:shabooagri_mobile/core/providers/session_provider.dart';
import 'package:shabooagri_mobile/core/theme/app_theme.dart';
import 'package:shabooagri_mobile/core/widgets/desktop_sidebar.dart';

import 'package:shabooagri_mobile/features/customers/presentation/customer_detail_screen.dart';
import 'package:shabooagri_mobile/features/customers/presentation/customer_form_screen.dart';
import 'package:shabooagri_mobile/features/villages/presentation/village_list_screen.dart';
import 'package:shabooagri_mobile/features/customers/presentation/customer_list_screen.dart';
import 'package:shabooagri_mobile/features/payments/presentation/record_advance_screen.dart';
import 'package:shabooagri_mobile/features/payments/presentation/new_invoice_screen.dart';
import 'package:shabooagri_mobile/features/maintenance/presentation/maintenance_record_form_screen.dart';
import 'package:shabooagri_mobile/features/machines/presentation/machine_list_screen.dart';

/// Flutter-desktop-layout proxy for the detail / create / edit / workflow
/// screens migrated to the desktop shell in this milestone. Each renders the
/// real screen at desktop width and asserts it uses the desktop shell
/// (persistent sidebar + back affordance) and, for forms, the multi-column
/// [ResponsiveFormGrid] — with no RenderFlex overflow. NOT a Windows install
/// test. All screens are exercised at desktop widths only (>=1000): the mobile
/// shell path reads GoRouter's canPop() during build, which isn't wired here.

const _owner = AppUser(
  id: 'u1',
  companyId: 'c1',
  fullName: 'Test Owner',
  email: 'owner@example.com',
  mobileNumber: null,
  roleSystemKey: 'owner',
  roleName: 'Owner',
);

VillageSummary _village(String id, String name) =>
    VillageSummary.fromJson({'id': id, 'name': name, 'isActive': true});

CustomerSummary _customer(String id, String name) => CustomerSummary.fromJson({
      'id': id,
      'name': name,
      'phone': '9876543210',
      'address': null,
      'village': {'name': 'Anandpur'},
      'userId': null,
    });

MachineSummary _machine(String id, String reg) => MachineSummary.fromJson({
      'id': id,
      'registrationNumber': reg,
      'status': 'AVAILABLE',
    });

Future<void> _pump(
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
  await tester.pump();
  await tester.pump(const Duration(milliseconds: 100));
}

void main() {
  testWidgets('Customer detail renders in the desktop shell with a back button', (tester) async {
    await _pump(
      tester,
      const CustomerDetailScreen(customerId: 'c1'),
      [
        customerDetailProvider('c1').overrideWith((ref) async => {
              'id': 'c1',
              'name': 'Ramesh Kumar',
              'phone': '9876543210',
              'address': 'Main Road',
              'isActive': true,
              'village': {'name': 'Anandpur'},
            }),
        customerInvoicesProvider('c1').overrideWith((ref) async => []),
        customerBookingsProvider('c1').overrideWith((ref) async => []),
      ],
    );

    expect(find.byType(DesktopSidebar), findsOneWidget);
    expect(find.byIcon(Icons.arrow_back), findsWidgets); // top-bar back affordance
    expect(find.text('Ramesh Kumar'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  testWidgets('Customer create form uses the desktop shell + multi-column grid', (tester) async {
    await _pump(
      tester,
      const CustomerFormScreen(),
      [villagesListProvider.overrideWith((ref) async => [_village('v1', 'Anandpur')])],
    );

    expect(find.byType(DesktopSidebar), findsOneWidget);
    expect(find.byType(ResponsiveFormGrid), findsWidgets);
    expect(find.text('Create Customer'), findsOneWidget);
    expect(tester.takeException(), isNull);

    await expectLater(
      find.byType(CustomerFormScreen),
      matchesGoldenFile('goldens/customer_form_desktop_1366.png'),
    );
  });

  testWidgets('Customer create form has no overflow at 1920x1080', (tester) async {
    await _pump(
      tester,
      const CustomerFormScreen(),
      [villagesListProvider.overrideWith((ref) async => [_village('v1', 'Anandpur')])],
      size: const Size(1920, 1080),
    );
    expect(find.byType(DesktopSidebar), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  testWidgets('Record Advance payment workflow uses the desktop shell', (tester) async {
    await _pump(
      tester,
      const RecordAdvanceScreen(),
      [customersListProvider.overrideWith((ref) async => [_customer('c1', 'Ramesh Kumar')])],
    );
    expect(find.byType(DesktopSidebar), findsOneWidget);
    expect(find.byType(ResponsiveFormGrid), findsWidgets);
    expect(tester.takeException(), isNull);
  });

  testWidgets('New Invoice workflow uses the desktop shell', (tester) async {
    await _pump(
      tester,
      const NewInvoiceScreen(),
      [customersListProvider.overrideWith((ref) async => [_customer('c1', 'Ramesh Kumar')])],
    );
    expect(find.byType(DesktopSidebar), findsOneWidget);
    expect(find.byType(ResponsiveFormGrid), findsWidgets);
    expect(tester.takeException(), isNull);
  });

  testWidgets('Maintenance service-record form uses the desktop shell', (tester) async {
    await _pump(
      tester,
      const MaintenanceRecordFormScreen(),
      [machinesListProvider.overrideWith((ref) async => [_machine('m1', 'PB01AB1234')])],
    );
    expect(find.byType(DesktopSidebar), findsOneWidget);
    expect(find.byType(ResponsiveFormGrid), findsWidgets);
    expect(tester.takeException(), isNull);
  });
}
