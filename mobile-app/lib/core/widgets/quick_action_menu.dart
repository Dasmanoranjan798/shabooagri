import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../theme/app_theme.dart';

void showQuickActionMenu(BuildContext context) {
  showModalBottomSheet(
    context: context,
    isScrollControlled: true,
    backgroundColor: Colors.transparent,
    builder: (context) => const _QuickActionMenu(),
  );
}

class _QuickActionMenu extends StatelessWidget {
  const _QuickActionMenu();

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: const BoxDecoration(
        color: AppTheme.background,
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      padding: EdgeInsets.only(
        top: 24,
        left: 20,
        right: 20,
        bottom: MediaQuery.of(context).padding.bottom + 24,
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 40,
            height: 4,
            decoration: BoxDecoration(
              color: Colors.grey.shade300,
              borderRadius: BorderRadius.circular(2),
            ),
          ),
          const SizedBox(height: 24),
          const Text(
            'Quick Actions',
            style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: AppTheme.text),
          ),
          const SizedBox(height: 24),
          Wrap(
            spacing: 16,
            runSpacing: 20,
            alignment: WrapAlignment.center,
            children: [
              _ActionItem(icon: Icons.person, label: 'Farmer', onTap: () { Navigator.pop(context); context.go('/customers/new'); }),
              _ActionItem(icon: Icons.agriculture, label: 'Machine', onTap: () { Navigator.pop(context); context.go('/machines/new'); }),
              _ActionItem(icon: Icons.badge, label: 'Driver', onTap: () { Navigator.pop(context); context.go('/drivers/new'); }),
              _ActionItem(icon: Icons.groups, label: 'Employee', onTap: () { Navigator.pop(context); context.go('/employees/new'); }),
              _ActionItem(icon: Icons.category, label: 'Work Type', onTap: () { Navigator.pop(context); context.go('/settings'); }),
              _ActionItem(icon: Icons.money_off, label: 'Expense', onTap: () { Navigator.pop(context); context.go('/expenses/new'); }),
              _ActionItem(icon: Icons.build, label: 'Maintenance', onTap: () { Navigator.pop(context); context.go('/maintenance'); }),
              _ActionItem(icon: Icons.payments, label: 'Advance', onTap: () { Navigator.pop(context); context.go('/payments/advance'); }),
              _ActionItem(icon: Icons.local_gas_station, label: 'Fuel', onTap: () { Navigator.pop(context); context.go('/fuel'); }),
            ],
          ),
        ],
      ),
    );
  }
}

class _ActionItem extends StatelessWidget {
  final IconData icon;
  final String label;
  final VoidCallback onTap;

  const _ActionItem({required this.icon, required this.label, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: SizedBox(
        width: 80,
        child: Column(
          children: [
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: AppTheme.surface,
                shape: BoxShape.circle,
                border: Border.all(color: AppTheme.border),
                boxShadow: [
                  BoxShadow(color: Colors.black.withValues(alpha: 0.03), blurRadius: 8, offset: const Offset(0, 2)),
                ],
              ),
              child: Icon(icon, color: AppTheme.primary, size: 28),
            ),
            const SizedBox(height: 8),
            Text(
              label,
              textAlign: TextAlign.center,
              style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w500, color: AppTheme.text),
            ),
          ],
        ),
      ),
    );
  }
}
