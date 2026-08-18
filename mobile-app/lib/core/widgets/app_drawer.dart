import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../repositories/auth_repository.dart';

class _DrawerItem {
  final String label;
  final IconData icon;
  final String route;

  const _DrawerItem(this.label, this.icon, this.route);
}

/// Owner/Manager navigation — one entry per module, so no single screen
/// (least of all the Dashboard) ends up cramming links to everything.
/// Driver and Farmer don't get this: they each have a narrower, fixed set
/// of screens appropriate to their role.
class AppDrawer extends ConsumerWidget {
  final String currentRoute;

  const AppDrawer({super.key, required this.currentRoute});

  static const _items = [
    _DrawerItem('Dashboard', Icons.dashboard, '/dashboard'),
    _DrawerItem('Jobs', Icons.work, '/jobs'),
    _DrawerItem('Bookings', Icons.event_note, '/bookings'),
    _DrawerItem('Machines', Icons.agriculture, '/machines'),
    _DrawerItem('Drivers', Icons.badge, '/drivers'),
    _DrawerItem('Customers', Icons.people, '/customers'),
    _DrawerItem('Villages', Icons.location_city, '/villages'),
    _DrawerItem('Payments', Icons.receipt_long, '/payments'),
    _DrawerItem('Employees', Icons.groups, '/employees'),
  ];

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Drawer(
      child: SafeArea(
        child: Column(
          children: [
            const DrawerHeader(
              decoration: BoxDecoration(color: Colors.green),
              child: Align(
                alignment: Alignment.bottomLeft,
                child: Text(
                  'ShabooAgri',
                  style: TextStyle(color: Colors.white, fontSize: 24, fontWeight: FontWeight.bold),
                ),
              ),
            ),
            Expanded(
              child: ListView(
                padding: EdgeInsets.zero,
                children: _items
                    .map((item) => ListTile(
                          leading: Icon(item.icon),
                          title: Text(item.label),
                          selected: currentRoute == item.route,
                          onTap: () {
                            Navigator.of(context).pop();
                            if (currentRoute != item.route) context.go(item.route);
                          },
                        ))
                    .toList(),
              ),
            ),
            const Divider(height: 1),
            ListTile(
              leading: const Icon(Icons.logout, color: Colors.red),
              title: const Text('Logout', style: TextStyle(color: Colors.red)),
              onTap: () async {
                Navigator.of(context).pop();
                await ref.read(authRepositoryProvider).logout();
                if (context.mounted) context.go('/login');
              },
            ),
            const SizedBox(height: 8),
          ],
        ),
      ),
    );
  }
}
