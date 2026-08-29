import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/repositories/auth_repository.dart';
import '../../../core/widgets/role_shell.dart';
import 'farmer_bookings_screen.dart';
import 'farmer_home_screen.dart';
import 'farmer_invoices_screen.dart';
import 'farmer_profile_screen.dart';

/// Same lifted-provider pattern as `driverTabIndexProvider` — keeps tab
/// selection stable if this shell is ever torn down and rebuilt.
final farmerTabIndexProvider = StateProvider<int>((ref) => 0);

/// Farmer/Customer portal shell — Home / Bookings / Invoices / Profile. On
/// phones this is a 4-tab bottom navigation bar (unchanged); on Windows/desktop
/// the same four screens sit behind a persistent **Farmer** navigation rail
/// (never the owner sidebar — the portal stays scoped to the farmer's own
/// screens). See [RoleShell].
class FarmerShellScreen extends ConsumerWidget {
  const FarmerShellScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final index = ref.watch(farmerTabIndexProvider);

    return RoleShell(
      brandTitle: 'ShabooAgri',
      brandSubtitle: 'Farmer Portal',
      index: index,
      onSelect: (i) => ref.read(farmerTabIndexProvider.notifier).state = i,
      onLogout: () async {
        await ref.read(authRepositoryProvider).logout();
        if (context.mounted) context.go('/login');
      },
      tabs: const [
        RoleTab(icon: Icons.home_outlined, selectedIcon: Icons.home, label: 'Home'),
        RoleTab(icon: Icons.event_note_outlined, selectedIcon: Icons.event_note, label: 'Bookings'),
        RoleTab(icon: Icons.receipt_long_outlined, selectedIcon: Icons.receipt_long, label: 'Invoices'),
        RoleTab(icon: Icons.person_outline, selectedIcon: Icons.person, label: 'Profile'),
      ],
      children: const [
        FarmerHomeScreen(),
        FarmerBookingsScreen(),
        FarmerInvoicesScreen(),
        FarmerProfileScreen(),
      ],
    );
  }
}
