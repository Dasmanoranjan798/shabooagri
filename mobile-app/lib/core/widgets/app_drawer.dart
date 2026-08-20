import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:image_picker/image_picker.dart';
import 'package:url_launcher/url_launcher.dart';
import '../repositories/auth_repository.dart';
import '../storage/local_storage.dart';
import '../../features/settings/presentation/privacy_policy_screen.dart';

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
class AppDrawer extends ConsumerStatefulWidget {
  final String currentRoute;

  const AppDrawer({super.key, required this.currentRoute});

  @override
  ConsumerState<AppDrawer> createState() => _AppDrawerState();
}

class _AppDrawerState extends ConsumerState<AppDrawer> {
  String? _profileImagePath;

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
    _DrawerItem('Team', Icons.admin_panel_settings, '/team'),
    _DrawerItem('Expenses', Icons.money_off, '/expenses'),
    _DrawerItem('Maintenance', Icons.build, '/maintenance'),
    _DrawerItem('Fuel', Icons.local_gas_station, '/fuel'),
    _DrawerItem('Reports', Icons.bar_chart, '/reports'),
    _DrawerItem('Settings', Icons.settings, '/settings'),
  ];

  @override
  void initState() {
    super.initState();
    _loadProfileImage();
  }

  Future<void> _loadProfileImage() async {
    final path = await ProfileStorage.getProfileImagePath();
    if (path != null && mounted) {
      setState(() {
        _profileImagePath = path;
      });
    }
  }

  Future<void> _pickProfileImage() async {
    final picker = ImagePicker();
    final pickedFile = await picker.pickImage(source: ImageSource.gallery);
    if (pickedFile != null) {
      await ProfileStorage.setProfileImagePath(pickedFile.path);
      if (mounted) {
        setState(() {
          _profileImagePath = pickedFile.path;
        });
      }
    }
  }

  Future<void> _launchSupportEmail() async {
    final Uri emailLaunchUri = Uri(
      scheme: 'mailto',
      path: 'support.shaboo@gmail.com',
    );
    if (await canLaunchUrl(emailLaunchUri)) {
      await launchUrl(emailLaunchUri);
    } else {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Support email: support.shaboo@gmail.com')),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Drawer(
      child: SafeArea(
        child: Column(
          children: [
            // FULL-WIDTH PROFILE PHOTO HEADER
            GestureDetector(
              onTap: _pickProfileImage,
              child: Container(
                width: double.infinity,
                height: 200,
                color: Colors.grey[200],
                child: _profileImagePath != null
                    ? Image.file(
                        File(_profileImagePath!),
                        width: double.infinity,
                        height: 200,
                        fit: BoxFit.cover,
                      )
                    : Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(Icons.add_a_photo, size: 40, color: Colors.grey[500]),
                          const SizedBox(height: 8),
                          Text(
                            'Add Profile Photo',
                            style: TextStyle(color: Colors.grey[600]),
                          ),
                        ],
                      ),
              ),
            ),
            
            // BRAND NAME STRIP UNDER PHOTO
            Container(
              width: double.infinity,
              margin: const EdgeInsets.symmetric(horizontal: 8.0, vertical: 8.0),
              padding: const EdgeInsets.symmetric(vertical: 8.0),
              decoration: BoxDecoration(
                color: Colors.green.shade50,
                border: Border.all(color: Colors.green, width: 1.0),
                borderRadius: BorderRadius.circular(4.0),
              ),
              child: Text(
                'ShabooAgri - A Shaboo Product',
                textAlign: TextAlign.center,
                style: TextStyle(
                  color: Colors.green.shade800,
                  fontWeight: FontWeight.w600,
                  fontSize: 14,
                ),
              ),
            ),

            // SIDEBAR NAVIGATION
            Expanded(
              child: ListView(
                padding: EdgeInsets.zero,
                children: _items
                    .map((item) => ListTile(
                          leading: Icon(item.icon),
                          title: Text(item.label),
                          selected: widget.currentRoute == item.route,
                          onTap: () {
                            Navigator.of(context).pop();
                            if (widget.currentRoute != item.route) {
                              context.go(item.route);
                            }
                          },
                        ))
                    .toList(),
              ),
            ),
            
            const Divider(height: 1),
            
            // BOTTOM SUPPORT + PRIVACY POLICY + LOGOUT
            ListTile(
              leading: const Icon(Icons.help_outline),
              title: const Text('Support'),
              onTap: () {
                Navigator.of(context).pop();
                _launchSupportEmail();
              },
            ),
            ListTile(
              leading: const Icon(Icons.privacy_tip_outlined),
              title: const Text('Privacy Policy'),
              onTap: () {
                Navigator.of(context).pop();
                Navigator.of(context).push(
                  MaterialPageRoute(builder: (_) => const PrivacyPolicyScreen()),
                );
              },
            ),
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
