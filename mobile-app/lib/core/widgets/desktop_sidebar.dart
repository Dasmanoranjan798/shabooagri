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
                  if (d.hasChildren)
                    _NavGroup(destination: d, currentRoute: currentRoute)
                  else
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
  final bool indented;

  const _NavTile(
      {required this.destination,
      required this.selected,
      required this.onTap,
      this.indented = false});

  @override
  Widget build(BuildContext context) {
    final primary = AppTheme.primary;
    return Padding(
      padding: EdgeInsets.only(left: indented ? 24 : 8, right: 8, top: 2, bottom: 2),
      child: Material(
        color: selected ? primary.withValues(alpha: 0.10) : Colors.transparent,
        borderRadius: BorderRadius.circular(8),
        child: InkWell(
          borderRadius: BorderRadius.circular(8),
          onTap: onTap,
          child: Padding(
            padding: EdgeInsets.symmetric(horizontal: 12, vertical: indented ? 9 : 11),
            child: Row(
              children: [
                Icon(destination.icon,
                    size: indented ? 18 : 20,
                    color: selected ? primary : AppTheme.textMuted),
                const SizedBox(width: 14),
                Expanded(
                  child: Text(
                    destination.label,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                      fontSize: indented ? 13 : 14,
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

/// An expandable module (e.g. Payments) whose children each navigate to their
/// own route. The group starts open when the current route is inside it, so the
/// active child is visible; the header toggles open/closed.
class _NavGroup extends StatefulWidget {
  final NavDestination destination;
  final String currentRoute;

  const _NavGroup({required this.destination, required this.currentRoute});

  @override
  State<_NavGroup> createState() => _NavGroupState();
}

class _NavGroupState extends State<_NavGroup> {
  late bool _open =
      isDestinationActive(widget.destination.route, widget.currentRoute);

  @override
  void didUpdateWidget(_NavGroup old) {
    super.didUpdateWidget(old);
    // Auto-open when navigation moves into this module.
    if (isDestinationActive(widget.destination.route, widget.currentRoute)) {
      _open = true;
    }
  }

  @override
  Widget build(BuildContext context) {
    final primary = AppTheme.primary;
    final parentActive =
        isDestinationActive(widget.destination.route, widget.currentRoute);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
          child: Material(
            color: parentActive ? primary.withValues(alpha: 0.10) : Colors.transparent,
            borderRadius: BorderRadius.circular(8),
            child: InkWell(
              borderRadius: BorderRadius.circular(8),
              onTap: () => setState(() => _open = !_open),
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 11),
                child: Row(
                  children: [
                    Icon(widget.destination.icon,
                        size: 20, color: parentActive ? primary : AppTheme.textMuted),
                    const SizedBox(width: 14),
                    Expanded(
                      child: Text(
                        widget.destination.label,
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(
                          fontSize: 14,
                          fontWeight: parentActive ? FontWeight.w600 : FontWeight.w500,
                          color: parentActive ? primary : null,
                        ),
                      ),
                    ),
                    Icon(_open ? Icons.expand_less : Icons.expand_more,
                        size: 20, color: AppTheme.textMuted),
                  ],
                ),
              ),
            ),
          ),
        ),
        if (_open)
          for (final child in widget.destination.children)
            _NavTile(
              destination: child,
              indented: true,
              selected: isLeafActive(child.route, widget.currentRoute),
              onTap: () {
                if (!isLeafActive(child.route, widget.currentRoute)) {
                  context.go(child.route);
                }
              },
            ),
      ],
    );
  }
}
