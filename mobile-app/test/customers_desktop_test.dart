import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:shabooagri_mobile/core/models/app_user.dart';
import 'package:shabooagri_mobile/core/providers/session_provider.dart';
import 'package:shabooagri_mobile/core/theme/app_theme.dart';
import 'package:shabooagri_mobile/core/widgets/desktop_table.dart';
import 'package:shabooagri_mobile/features/customers/presentation/customer_list_screen.dart';

/// Flutter-desktop-layout proxy for the migrated Customers module. Renders the
/// real screen with stubbed data at a desktop window size and verifies it uses
/// the desktop data grid (not the phone card list) with no overflow, then
/// captures a golden for visual inspection. NOT a Windows install test.
CustomerSummary _c(String id, String name, String village, String? phone,
        {bool portal = false}) =>
    CustomerSummary.fromJson({
      'id': id,
      'name': name,
      'phone': phone,
      'address': null,
      'village': village,
      'userId': portal ? 'u-$id' : null,
    });

const _owner = AppUser(
  id: 'u1',
  companyId: 'c1',
  fullName: 'Test Owner',
  email: 'owner@example.com',
  mobileNumber: null,
  roleSystemKey: 'owner',
  roleName: 'Owner',
);

void main() {
  testWidgets('Customers renders a desktop data grid at desktop width',
      (tester) async {
    tester.view.devicePixelRatio = 1.0;
    tester.view.physicalSize = const Size(1366, 768);
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          currentUserProvider.overrideWith((ref) => _owner),
          customersListProvider.overrideWith((ref) async => [
                _c('1', 'Ramesh Kumar', 'Anandpur', '9876543210', portal: true),
                _c('2', 'Sita Devi', 'Bela', '9812345678'),
                _c('3', 'Mohan Lal', 'Chak', null),
              ]),
        ],
        child: MaterialApp(
          theme: AppTheme.themeData,
          home: const CustomerListScreen(),
        ),
      ),
    );
    await tester.pumpAndSettle();

    // Desktop grid is used (not the phone card list), with no overflow.
    expect(find.byType(DesktopTable), findsOneWidget);
    expect(find.byType(DataTable), findsOneWidget);
    expect(find.text('Ramesh Kumar'), findsOneWidget);
    expect(find.text('New Customer'), findsOneWidget); // top-bar action
    expect(tester.takeException(), isNull);

    await expectLater(
      find.byType(CustomerListScreen),
      matchesGoldenFile('goldens/customers_desktop_1366.png'),
    );
  });
}
