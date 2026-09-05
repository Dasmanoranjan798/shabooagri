import 'package:flutter/material.dart';

/// A single owner/manager navigation destination. Shared by the mobile
/// [AppDrawer] and the desktop [DesktopSidebar] so both stay in lock-step —
/// there is exactly one list of modules, presented differently per form factor.
///
/// A destination may have [children]: a module (e.g. Payments) that expands to
/// its own dedicated sub-screens. Each child is itself a real route — the
/// parent never "borrows" a child's destination, so every item opens its own
/// screen.
class NavDestination {
  final String label;
  final IconData icon;
  final String route;
  final List<NavDestination> children;

  const NavDestination(this.label, this.icon, this.route, {this.children = const []});

  bool get hasChildren => children.isNotEmpty;
}

/// The owner/manager module list. Order is the navigation order on both
/// mobile (drawer) and desktop (sidebar). Driver/Farmer roles use their own
/// narrower shells and do not see this list.
const List<NavDestination> ownerNavDestinations = [
  NavDestination('Dashboard', Icons.dashboard, '/dashboard'),
  NavDestination('Jobs', Icons.work, '/jobs'),
  NavDestination('Bookings', Icons.event_note, '/bookings'),
  NavDestination('Machines', Icons.agriculture, '/machines'),
  NavDestination('Drivers', Icons.badge, '/drivers'),
  NavDestination('Customers', Icons.people, '/customers'),
  // Payments expands to its own reports, each on a dedicated route/screen —
  // they are no longer buried at the bottom of the transaction list.
  NavDestination('Payments', Icons.receipt_long, '/payments', children: [
    NavDestination('Payments', Icons.list_alt, '/payments'),
    NavDestination('Payment Methods', Icons.account_balance_wallet, '/payments/methods'),
    NavDestination('Customer Outstanding', Icons.people_outline, '/payments/outstanding'),
    NavDestination('Day-wise Collections', Icons.calendar_month, '/payments/collections'),
    NavDestination('Overdue', Icons.warning_amber, '/payments/overdue'),
    NavDestination('Analytics', Icons.analytics, '/payments/analytics'),
  ]),
  NavDestination('Employees', Icons.groups, '/employees'),
  NavDestination('Team', Icons.admin_panel_settings, '/team'),
  NavDestination('Expenses', Icons.money_off, '/expenses'),
  NavDestination('Maintenance', Icons.build, '/maintenance'),
  NavDestination('Fuel', Icons.local_gas_station, '/fuel'),
  NavDestination('Reports', Icons.bar_chart, '/reports'),
  NavDestination('Settings', Icons.settings, '/settings'),
];

/// Whether [route] matches [destinationRoute], treating sub-routes as part of
/// their parent module (e.g. `/customers/123/edit` highlights `Customers`, and
/// `/payments/overdue` highlights the `Payments` parent). Used for the PARENT /
/// module-level highlight and for deciding whether an expandable section should
/// start open.
bool isDestinationActive(String destinationRoute, String currentRoute) {
  if (currentRoute == destinationRoute) return true;
  return currentRoute.startsWith('$destinationRoute/');
}

/// Exact-match selection for a leaf/child item. Children like `/payments` and
/// `/payments/methods` share a prefix, so a child is only "selected" when it is
/// the exact current route — otherwise the plain `/payments` child would also
/// light up on every `/payments/*` sub-screen.
bool isLeafActive(String leafRoute, String currentRoute) => currentRoute == leafRoute;
