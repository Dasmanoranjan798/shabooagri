import 'package:flutter/material.dart';
import '../layout/responsive.dart';
import '../theme/app_theme.dart';

/// One navigation destination in a role shell (Driver / Farmer).
class RoleTab {
  final IconData icon;
  final IconData selectedIcon;
  final String label;
  const RoleTab({required this.icon, required this.selectedIcon, required this.label});
}

/// The shell used by the **Driver** and **Farmer** role apps. It gives those
/// roles a genuine desktop presentation on Windows — a persistent left
/// navigation rail — while keeping the existing phone **bottom navigation bar**
/// on narrow screens, from the same tab screens and the same business logic.
///
/// Crucially this is a *role-scoped* shell: it shows ONLY the destinations
/// passed in [tabs] (the driver's / farmer's own screens). It never renders the
/// owner/manager module sidebar, so RBAC/navigation stay correct — a Driver on
/// a wide window gets a Driver rail, not owner navigation.
///
/// Each entry in [children] is a full tab screen (its own `Scaffold`/app bar);
/// they are kept alive in an [IndexedStack] so tab state survives switching,
/// exactly as the phone shell already did.
class RoleShell extends StatelessWidget {
  final String brandTitle;
  final String brandSubtitle;
  final int index;
  final ValueChanged<int> onSelect;
  final List<RoleTab> tabs;
  final List<Widget> children;
  final VoidCallback onLogout;

  const RoleShell({
    super.key,
    required this.brandTitle,
    required this.brandSubtitle,
    required this.index,
    required this.onSelect,
    required this.tabs,
    required this.children,
    required this.onLogout,
  });

  @override
  Widget build(BuildContext context) {
    final stack = IndexedStack(index: index, children: children);

    if (Responsive.of(context).isDesktop) {
      return Scaffold(
        body: Row(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            _RoleRail(
              brandTitle: brandTitle,
              brandSubtitle: brandSubtitle,
              index: index,
              onSelect: onSelect,
              tabs: tabs,
              onLogout: onLogout,
            ),
            Expanded(child: stack),
          ],
        ),
      );
    }

    return Scaffold(
      body: stack,
      bottomNavigationBar: NavigationBar(
        selectedIndex: index,
        onDestinationSelected: onSelect,
        destinations: [
          for (final t in tabs)
            NavigationDestination(icon: Icon(t.icon), selectedIcon: Icon(t.selectedIcon), label: t.label),
        ],
      ),
    );
  }
}

class _RoleRail extends StatelessWidget {
  final String brandTitle;
  final String brandSubtitle;
  final int index;
  final ValueChanged<int> onSelect;
  final List<RoleTab> tabs;
  final VoidCallback onLogout;

  const _RoleRail({
    required this.brandTitle,
    required this.brandSubtitle,
    required this.index,
    required this.onSelect,
    required this.tabs,
    required this.onLogout,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      width: Breakpoints.sidebarWidth,
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surface,
        border: Border(right: BorderSide(color: Theme.of(context).dividerColor)),
      ),
      child: Material(
        type: MaterialType.transparency,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Brand header
            Padding(
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
                        style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 16)),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(brandTitle,
                            style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                            overflow: TextOverflow.ellipsis),
                        Text(brandSubtitle,
                            style: const TextStyle(color: AppTheme.textMuted, fontSize: 12),
                            overflow: TextOverflow.ellipsis),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            const Divider(height: 1),
            // Nav tiles
            Expanded(
              child: ListView(
                padding: const EdgeInsets.symmetric(vertical: 8),
                children: [
                  for (int i = 0; i < tabs.length; i++)
                    _RailTile(
                      tab: tabs[i],
                      selected: i == index,
                      onTap: () => onSelect(i),
                    ),
                ],
              ),
            ),
            const Divider(height: 1),
            ListTile(
              leading: const Icon(Icons.logout, color: Colors.red),
              title: const Text('Logout', style: TextStyle(color: Colors.red)),
              onTap: onLogout,
            ),
            const SizedBox(height: 8),
          ],
        ),
      ),
    );
  }
}

class _RailTile extends StatelessWidget {
  final RoleTab tab;
  final bool selected;
  final VoidCallback onTap;

  const _RailTile({required this.tab, required this.selected, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
      child: Material(
        color: selected ? AppTheme.primaryLight : Colors.transparent,
        borderRadius: BorderRadius.circular(8),
        child: ListTile(
          leading: Icon(selected ? tab.selectedIcon : tab.icon, color: selected ? AppTheme.primary : null),
          title: Text(
            tab.label,
            style: TextStyle(
              color: selected ? AppTheme.primaryDark : null,
              fontWeight: selected ? FontWeight.w600 : FontWeight.normal,
            ),
          ),
          selected: selected,
          onTap: onTap,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
        ),
      ),
    );
  }
}
