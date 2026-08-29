import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/layout/responsive_form.dart';
import '../../../core/providers/session_provider.dart';
import '../../../core/repositories/auth_repository.dart';
import '../../../core/widgets/change_password_card.dart';
import '../../settings/presentation/privacy_policy_screen.dart';

/// Matches `FarmerProfilePage.tsx`: profile card, details grid, shared
/// Change Password, Sign Out. No compensation section — that's Driver-only.
class FarmerProfileScreen extends ConsumerWidget {
  const FarmerProfileScreen({super.key});

  Future<void> _handleLogout(WidgetRef ref, BuildContext context) async {
    await ref.read(authRepositoryProvider).logout();
    if (context.mounted) context.go('/login');
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final user = ref.watch(currentUserProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('My Account')),
      body: DesktopContentColumn(
        maxWidth: 720,
        child: ListView(
        padding: const EdgeInsets.all(16.0),
        children: [
          Card(
            child: Padding(
              padding: const EdgeInsets.all(20.0),
              child: Column(
                children: [
                  CircleAvatar(
                    radius: 32,
                    child: Text(
                      (user?.fullName.isNotEmpty ?? false) ? user!.fullName[0].toUpperCase() : 'F',
                      style: const TextStyle(fontSize: 28),
                    ),
                  ),
                  const SizedBox(height: 12),
                  Text(user?.fullName ?? 'Customer', style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                  const Text('Customer', style: TextStyle(color: Colors.grey)),
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16.0),
              child: Column(
                children: [
                  _detailRow('Full Name', user?.fullName ?? '—'),
                  _detailRow('Email', user?.email ?? '—'),
                  _detailRow('Mobile', user?.mobileNumber ?? '—'),
                  _detailRow('Status', user?.status == 'ACTIVE' ? 'Active' : 'Inactive'),
                ],
              ),
            ),
          ),
          const SizedBox(height: 20),
          const ChangePasswordCard(),
          const SizedBox(height: 12),
          ListTile(
            contentPadding: EdgeInsets.zero,
            leading: const Icon(Icons.privacy_tip_outlined),
            title: const Text('Privacy Policy'),
            trailing: const Icon(Icons.open_in_new, size: 18),
            onTap: openPrivacyPolicy,
          ),
          const SizedBox(height: 24),
          OutlinedButton.icon(
            onPressed: () => _handleLogout(ref, context),
            icon: const Icon(Icons.logout),
            label: const Text('Sign Out'),
            style: OutlinedButton.styleFrom(padding: const EdgeInsets.symmetric(vertical: 14), foregroundColor: Colors.red),
          ),
        ],
      ),
      ),
    );
  }

  Widget _detailRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Row(
        children: [
          SizedBox(width: 90, child: Text(label, style: const TextStyle(color: Colors.grey, fontSize: 12))),
          Expanded(child: Text(value)),
        ],
      ),
    );
  }
}
