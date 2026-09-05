import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/repositories/auth_repository.dart';
import '../../../core/widgets/role_shell.dart';
import '../../jobs/presentation/job_list_screen.dart';
import 'driver_home_screen.dart';
import 'driver_my_earnings_screen.dart';
import 'driver_profile_screen.dart';

/// Which of the 3 nav destinations is active. Lifted to a provider (rather
/// than local State) so it survives the shell being torn down and rebuilt
/// when navigating away to a full-screen route (e.g. Job Detail) and back —
/// without this, returning from a job would always land back on Home
/// instead of wherever the driver actually was.
final driverTabIndexProvider = StateProvider<int>((ref) => 0);

/// Driver shell — Home / Job Cards / Profile. On phones this is a 3-tab bottom
/// navigation bar (unchanged); on Windows/desktop the same three screens sit
/// behind a persistent **Driver** navigation rail (never the owner sidebar —
/// RBAC/navigation stay scoped to the driver's own screens). See [RoleShell].
class DriverShellScreen extends ConsumerWidget {
  const DriverShellScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final index = ref.watch(driverTabIndexProvider);

    return RoleShell(
      brandTitle: 'ShabooAgri',
      brandSubtitle: 'Driver',
      index: index,
      onSelect: (i) => ref.read(driverTabIndexProvider.notifier).state = i,
      onLogout: () async {
        await ref.read(authRepositoryProvider).logout();
        if (context.mounted) context.go('/login');
      },
      tabs: const [
        RoleTab(icon: Icons.home_outlined, selectedIcon: Icons.home, label: 'Home'),
        RoleTab(icon: Icons.work_outline, selectedIcon: Icons.work, label: 'Job Cards'),
        RoleTab(icon: Icons.payments_outlined, selectedIcon: Icons.payments, label: 'Earnings'),
        RoleTab(icon: Icons.person_outline, selectedIcon: Icons.person, label: 'Profile'),
      ],
      children: const [
        DriverHomeScreen(),
        JobListScreen(),
        DriverMyEarningsScreen(),
        DriverProfileScreen(),
      ],
    );
  }
}
