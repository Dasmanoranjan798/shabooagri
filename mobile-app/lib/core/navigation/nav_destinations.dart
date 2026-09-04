import 'package:flutter/material.dart';

/// A single owner/manager navigation destination. Shared by the mobile
/// [AppDrawer] and the desktop [DesktopSidebar] so both stay in lock-step —
/// there is exactly one list of modules, presented differently per form factor.
class NavDestination {
  final String label;
  final IconData icon;
  final String route;

  const NavDestination(this.label, this.icon, this.route);
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
  NavDestination('Payments', Icons.receipt_long, '/payments'),
  NavDestination('Employees', Icons.groups, '/employees'),
  NavDestination('Team', Icons.admin_panel_settings, '/team'),
  NavDestination('Expenses', Icons.money_off, '/expenses'),
  NavDestination('Maintenance', Icons.build, '/maintenance'),
  NavDestination('Fuel', Icons.local_gas_station, '/fuel'),
  NavDestination('Reports', Icons.bar_chart, '/reports'),
  NavDestination('Settings', Icons.settings, '/settings'),
];

/// Whether [route] matches [destinationRoute], treating sub-routes as part of
/// their parent module (e.g. `/customers/123/edit` highlights `Customers`).
bool isDestinationActive(String destinationRoute, String currentRoute) {
  if (currentRoute == destinationRoute) return true;
  return currentRoute.startsWith('$destinationRoute/');
}
