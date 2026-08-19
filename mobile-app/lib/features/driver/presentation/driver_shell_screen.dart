import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../jobs/presentation/job_list_screen.dart';
import 'driver_home_screen.dart';
import 'driver_profile_screen.dart';

/// Which of the 3 bottom-nav tabs is active. Lifted to a provider (rather
/// than local State) so it survives the shell being torn down and rebuilt
/// when navigating away to a full-screen route (e.g. Job Detail) and back —
/// without this, returning from a job would always land back on Home
/// instead of wherever the driver actually was.
final driverTabIndexProvider = StateProvider<int>((ref) => 0);

/// 3-tab bottom nav — Home / Job Cards / Profile — matching the website's
/// Driver shell (`DriverHomePage` / `DriverJobsPage` / `DriverProfilePage`
/// under a shared bottom tab bar). Each tab is a full `Scaffold` in its own
/// right (own AppBar); nesting them inside this outer `Scaffold`'s body is
/// intentional and standard for a bottom-tab shell — only the
/// `bottomNavigationBar` is shared chrome.
class DriverShellScreen extends ConsumerWidget {
  const DriverShellScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final index = ref.watch(driverTabIndexProvider);

    return Scaffold(
      body: IndexedStack(
        index: index,
        children: const [
          DriverHomeScreen(),
          JobListScreen(),
          DriverProfileScreen(),
        ],
      ),
      bottomNavigationBar: NavigationBar(
        selectedIndex: index,
        onDestinationSelected: (i) => ref.read(driverTabIndexProvider.notifier).state = i,
        destinations: const [
          NavigationDestination(icon: Icon(Icons.home_outlined), selectedIcon: Icon(Icons.home), label: 'Home'),
          NavigationDestination(icon: Icon(Icons.work_outline), selectedIcon: Icon(Icons.work), label: 'Job Cards'),
          NavigationDestination(icon: Icon(Icons.person_outline), selectedIcon: Icon(Icons.person), label: 'Profile'),
        ],
      ),
    );
  }
}
