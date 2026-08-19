import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'farmer_bookings_screen.dart';
import 'farmer_home_screen.dart';
import 'farmer_invoices_screen.dart';
import 'farmer_profile_screen.dart';

/// Same lifted-provider pattern as `driverTabIndexProvider` — keeps tab
/// selection stable if this shell is ever torn down and rebuilt.
final farmerTabIndexProvider = StateProvider<int>((ref) => 0);

/// 4-tab bottom nav — Home / Bookings / Invoices / Profile — matching the
/// website's Farmer/Customer portal shell.
class FarmerShellScreen extends ConsumerWidget {
  const FarmerShellScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final index = ref.watch(farmerTabIndexProvider);

    return Scaffold(
      body: IndexedStack(
        index: index,
        children: const [
          FarmerHomeScreen(),
          FarmerBookingsScreen(),
          FarmerInvoicesScreen(),
          FarmerProfileScreen(),
        ],
      ),
      bottomNavigationBar: NavigationBar(
        selectedIndex: index,
        onDestinationSelected: (i) => ref.read(farmerTabIndexProvider.notifier).state = i,
        destinations: const [
          NavigationDestination(icon: Icon(Icons.home_outlined), selectedIcon: Icon(Icons.home), label: 'Home'),
          NavigationDestination(icon: Icon(Icons.event_note_outlined), selectedIcon: Icon(Icons.event_note), label: 'Bookings'),
          NavigationDestination(icon: Icon(Icons.receipt_long_outlined), selectedIcon: Icon(Icons.receipt_long), label: 'Invoices'),
          NavigationDestination(icon: Icon(Icons.person_outline), selectedIcon: Icon(Icons.person), label: 'Profile'),
        ],
      ),
    );
  }
}
