import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:shabooagri_mobile/core/theme/app_theme.dart';
import 'package:shabooagri_mobile/core/widgets/adaptive_scaffold.dart';
import 'package:shabooagri_mobile/core/widgets/desktop_sidebar.dart';

/// Engineering verification for the desktop shell. This is a Flutter widget/
/// golden test that renders the *same* Flutter widget tree that Windows will
/// run, at desktop and phone window sizes. It proves the layout logic
/// (persistent sidebar on desktop, drawer on phone) and catches RenderFlex
/// overflow. It is a Flutter-desktop-layout proxy — NOT a Windows install test.
Future<void> _pumpAt(
  WidgetTester tester,
  Size logicalSize,
  Widget child,
) async {
  tester.view.devicePixelRatio = 1.0;
  tester.view.physicalSize = logicalSize;
  addTearDown(tester.view.resetPhysicalSize);
  addTearDown(tester.view.resetDevicePixelRatio);

  await tester.pumpWidget(
    ProviderScope(
      child: MaterialApp(
        theme: AppTheme.themeData,
        home: child,
      ),
    ),
  );
  await tester.pump();
}

Widget _demoScreen() => AdaptiveScaffold(
      currentRoute: '/customers',
      title: 'Customers',
      actions: const [Icon(Icons.search), SizedBox(width: 16)],
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          for (int i = 0; i < 20; i++)
            Card(child: ListTile(title: Text('Customer #$i'))),
        ],
      ),
    );

void main() {
  testWidgets('desktop width shows persistent sidebar and no overflow',
      (tester) async {
    await _pumpAt(tester, const Size(1366, 768), _demoScreen());

    // Persistent desktop sidebar is present; the phone drawer is not used.
    expect(find.byType(DesktopSidebar), findsOneWidget);
    // Owner modules render as nav tiles in the sidebar (top items are on-screen;
    // lower ones exist in the scrollable list).
    expect(find.text('Dashboard'), findsOneWidget);
    expect(find.text('Jobs'), findsOneWidget);
    expect(find.text('ShabooAgri'), findsOneWidget); // brand header
    // No layout overflow at this size.
    expect(tester.takeException(), isNull);

    await expectLater(
      find.byType(AdaptiveScaffold),
      matchesGoldenFile('goldens/shell_desktop_1366.png'),
    );
  });

  testWidgets('phone width uses drawer chrome (no persistent sidebar)',
      (tester) async {
    await _pumpAt(tester, const Size(390, 844), _demoScreen());

    // On a phone the persistent sidebar is NOT shown (it's a drawer instead).
    expect(find.byType(DesktopSidebar), findsNothing);
    expect(find.byType(AppBar), findsOneWidget);
    expect(tester.takeException(), isNull);

    await expectLater(
      find.byType(AdaptiveScaffold),
      matchesGoldenFile('goldens/shell_phone_390.png'),
    );
  });
}
