import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../navigation/nav_destinations.dart';
import '../layout/responsive.dart';
import '../repositories/auth_repository.dart';
import '../theme/app_theme.dart';
import '../../features/settings/presentation/privacy_policy_screen.dart';

/// Persistent left-hand navigation for the desktop/Windows shell. Uses the same
/// [ownerNavDestinations] as the mobile [AppDrawer], so the module set is
/// identical — only the presentation differs (always-visible rail vs. a drawer
/// that has to be opened). Designed for mouse/keyboard: full-width click
/// targets, hover/selection states, scrollable when the window is short.
class DesktopSidebar extends ConsumerWidget {
  final String currentRoute;

  const DesktopSidebar({super.key, required this.currentRoute});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Container(
      width: Breakpoints.sidebarWidth,
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surface,
        border: Border(
          right: BorderSide(color: Theme.of(context).dividerColor),
        ),
      ),
      // Transparent Material so ListTile ink/selection paints correctly above
      // the sidebar's decorated (coloured + bordered) Container.
      child: Material(
        type: MaterialType.transparency,
        child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          _brandHeader(context),
          const Divider(height: 1),
          Expanded(
            child: ListView(
              padding: const EdgeInsets.symmetric(vertical: 8),
              children: [
                for (final d in ownerNavDestinations)
                  _NavTile(
                    destination: d,
                    selected: isDestinationActive(d.route, currentRoute),
                    onTap: () {
                      if (!isDestinationActive(d.route, currentRoute)) {
                        context.go(d.route);
                      }
                    },
                  ),
              ],
            ),
          ),
          const Divider(height: 1),
          _footerTile(
            context,
            icon: Icons.help_outline,
            label: 'Support',
            onTap: () => ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(content: Text('Support: support.shaboo@gmail.com')),
            ),
          ),
          _footerTile(
            context,
            icon: Icons.privacy_tip_outlined,
            label: 'Privacy Policy',
            onTap: () => Navigator.of(context).push(
              MaterialPageRoute(builder: (_) => const PrivacyPolicyScreen()),
            ),
          ),
          _footerTile(
            context,
            icon: Icons.logout,
            label: 'Logout',
            color: Colors.red,
            onTap: () async {
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

  Widget _brandHeader(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 20, 16, 16),
      child: Row(
        children: [
          Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(
              color: AppTheme.primary,
              borderRadius: BorderRadius.circular(8),
            ),
            alignment: Alignment.center,
            child: const Text('SA',
                style: TextStyle(
                    color: Colors.white,
                    fontWeight: FontWeight.bold,
                    fontSize: 16)),
          ),
          const SizedBox(width: 12),
          const Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('ShabooAgri',
                    style: TextStyle(
                        fontWeight: FontWeight.bold, fontSize: 16),
                    overflow: TextOverflow.ellipsis),
                Text('A Shaboo Product',
                    style: TextStyle(fontSize: 11, color: AppTheme.textMuted),
                    overflow: TextOverflow.ellipsis),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _footerTile(BuildContext context,
      {required IconData icon,
      required String label,
      required VoidCallback onTap,
      Color? color}) {
    return ListTile(
      dense: true,
      leading: Icon(icon, color: color, size: 20),
      title: Text(label, style: TextStyle(color: color)),
      onTap: onTap,
    );
  }
}

class _NavTile extends StatelessWidget {
  final NavDestination destination;
  final bool selected;
  final VoidCallback onTap;

  const _NavTile(
      {required this.destination, required this.selected, required this.onTap});

  @override
  Widget build(BuildContext context) {
    final primary = AppTheme.primary;
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
      child: Material(
        color: selected ? primary.withValues(alpha: 0.10) : Colors.transparent,
        borderRadius: BorderRadius.circular(8),
        child: InkWell(
          borderRadius: BorderRadius.circular(8),
          onTap: onTap,
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 11),
            child: Row(
              children: [
                Icon(destination.icon,
                    size: 20,
                    color: selected ? primary : AppTheme.textMuted),
                const SizedBox(width: 14),
                Expanded(
                  child: Text(
                    destination.label,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                      fontSize: 14,
                      fontWeight:
                          selected ? FontWeight.w600 : FontWeight.w500,
                      color: selected ? primary : null,
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
