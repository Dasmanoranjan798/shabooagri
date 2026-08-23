import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:shabooagri_mobile/core/theme/app_theme.dart';
import 'package:shabooagri_mobile/core/widgets/desktop_sidebar.dart';
import 'package:shabooagri_mobile/core/widgets/role_shell.dart';

import 'package:shabooagri_mobile/features/auth/presentation/login_screen.dart';

/// Desktop-layout proxy for the role shells (Driver/Farmer) and authentication.
/// The role shell must show a persistent role rail on desktop and the phone
/// bottom-nav on narrow screens, and must NEVER render the owner
/// [DesktopSidebar] (RBAC/navigation stay role-scoped). Auth screens must be
/// centred, width-capped desktop panels with no sidebar. NOT a Windows install
/// test.

Future<void> _pump(WidgetTester tester, Widget child, Size size, {List<Override> overrides = const []}) async {
  tester.view.devicePixelRatio = 1.0;
  tester.view.physicalSize = size;
  addTearDown(tester.view.resetPhysicalSize);
  addTearDown(tester.view.resetDevicePixelRatio);
  await tester.pumpWidget(
    ProviderScope(
      overrides: overrides,
      child: MaterialApp(theme: AppTheme.themeData, home: child),
    ),
  );
  await tester.pump();
  await tester.pump(const Duration(milliseconds: 50));
}

Widget _roleShell(int index) => RoleShell(
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
  testWidgets('Role shell shows a persistent rail on desktop (never the owner sidebar)', (tester) async {
    await _pump(tester, _roleShell(0), const Size(1366, 768));

    // Persistent role rail: the tab labels are visible on-screen (rail), and
    // there is no bottom NavigationBar and no owner sidebar.
    expect(find.text('Job Cards'), findsOneWidget);
    expect(find.byType(NavigationBar), findsNothing);
    expect(find.byType(DesktopSidebar), findsNothing);
    expect(find.text('Logout'), findsOneWidget);
    expect(tester.takeException(), isNull);

    await expectLater(find.byType(RoleShell), matchesGoldenFile('goldens/role_shell_desktop_1366.png'));
  });

  testWidgets('Role shell uses the phone bottom nav on narrow screens', (tester) async {
    await _pump(tester, _roleShell(0), const Size(390, 844));
    expect(find.byType(NavigationBar), findsOneWidget); // phone bottom nav
    expect(find.byType(DesktopSidebar), findsNothing);
    expect(tester.takeException(), isNull);
  });

  testWidgets('Role shell has no overflow at a small desktop window (900x700)', (tester) async {
    await _pump(tester, _roleShell(1), const Size(900, 700));
    // 900 < 1000 => phone bottom nav here, but must not overflow.
    expect(tester.takeException(), isNull);
  });

  testWidgets('Login is a centred desktop panel (no sidebar) at 1366', (tester) async {
    await _pump(tester, const LoginScreen(), const Size(1366, 768));
    expect(find.text('Sign In'), findsOneWidget);
    expect(find.text('LOGIN'), findsOneWidget); // password-mode submit button
    expect(find.byType(DesktopSidebar), findsNothing);
    expect(tester.takeException(), isNull);

    await expectLater(find.byType(LoginScreen), matchesGoldenFile('goldens/login_desktop_1366.png'));
  });
}
