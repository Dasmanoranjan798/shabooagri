import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../../core/theme/app_theme.dart';
import '../../../core/widgets/adaptive_scaffold.dart';

/// The ONE canonical Reports section. It organizes every genuinely-backed report
/// into categories; tapping an item opens that report directly (no intermediate
/// Reports screen). Report screens live under `/reports/*` and are reached with
/// `push` (so Back returns here); operational modules that double as reports
/// (Payments transactions, Expenses, Fuel) are reached with `go`.
///
/// Only reports with a real backend calculation are listed — speculative reports
/// with no data model (P&L, cash flow, profitability, etc.) are intentionally
/// omitted rather than shown as empty/placeholder screens.
class ReportsHubScreen extends StatelessWidget {
  const ReportsHubScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return AdaptiveScaffold(
      currentRoute: '/reports',
      title: 'Reports',
      body: ListView(
        padding: const EdgeInsets.symmetric(vertical: 8),
        children: const [
          _Category('Overview', [
            _Report('Business Summary', Icons.insights, '/reports/summary',
                subtitle: 'KPIs + income overview, with export'),
            _Report('Outstanding Summary', Icons.account_balance, '/reports/outstanding',
                subtitle: 'Total receivable, by customer'),
          ]),
          _Category('Payments & Collections', [
            _Report('Payments / Transactions', Icons.receipt_long, '/payments',
                subtitle: 'Invoice list with filters', isModule: true),
            _Report('Collections (Day-wise)', Icons.calendar_month, '/reports/collections'),
            _Report('Payment Methods', Icons.account_balance_wallet, '/reports/payment-methods'),
            _Report('Customer Outstanding', Icons.people_outline, '/reports/outstanding'),
            _Report('Overdue', Icons.warning_amber, '/reports/overdue'),
            _Report('Payment Analytics', Icons.analytics, '/reports/payment-analytics'),
          ]),
          _Category('Machines', [
            _Report('Machine Utilization / Hours', Icons.agriculture, '/reports/machines'),
            _Report('Maintenance / Due', Icons.build, '/reports/maintenance'),
          ]),
          _Category('Drivers & Employees', [
            _Report('Driver Work & Payment Report', Icons.badge, '/reports/drivers'),
          ]),
          _Category('Expenses', [
            _Report('Expense Report', Icons.money_off, '/expenses',
                subtitle: 'Expenses by category, with filters', isModule: true),
          ]),
          _Category('Fuel', [
            _Report('Fuel Report', Icons.local_gas_station, '/fuel',
                subtitle: 'Fuel log by machine + date, with export', isModule: true),
          ]),
        ],
      ),
    );
  }
}

class _Category extends StatelessWidget {
  final String title;
  final List<_Report> reports;
  const _Category(this.title, this.reports);

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 16, 16, 6),
          child: Text(
            title.toUpperCase(),
            style: const TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.bold,
              color: AppTheme.textMuted,
              letterSpacing: 0.6,
            ),
          ),
        ),
        ...reports,
        const Divider(height: 8),
      ],
    );
  }
}

class _Report extends StatelessWidget {
  final String label;
  final IconData icon;
  final String route;
  final String? subtitle;

  /// Operational modules that also serve as reports (Payments/Expenses/Fuel):
  /// navigated with `go` so they open as their normal module; report screens
  /// under `/reports/*` are `push`ed so Back returns to the hub.
  final bool isModule;

  const _Report(this.label, this.icon, this.route, {this.subtitle, this.isModule = false});

  @override
  Widget build(BuildContext context) {
    return ListTile(
      leading: Icon(icon, color: AppTheme.primary),
      title: Text(label),
      subtitle: subtitle == null ? null : Text(subtitle!),
      trailing: const Icon(Icons.chevron_right, color: AppTheme.textMuted),
      onTap: () => isModule ? context.go(route) : context.push(route),
    );
  }
}
