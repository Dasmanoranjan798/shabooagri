import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/network/api_client.dart';
import '../../../core/providers/session_provider.dart';
import '../../../core/layout/responsive_form.dart';
import '../../../core/repositories/auth_repository.dart';
import '../../../core/widgets/change_password_card.dart';
import '../../drivers/presentation/driver_list_screen.dart';

class _CompensationSummary {
  final String compensationType; // HOURLY | MONTHLY | YEARLY
  final int totalCompletedJobs;
  final double totalWorkedHours;
  final double calculatedEarnings;
  final String explanation;

  _CompensationSummary.fromJson(Map<String, dynamic> json)
      : compensationType = json['compensationType'] as String,
        totalCompletedJobs = json['totalCompletedJobs'] as int,
        totalWorkedHours = (double.tryParse(json['totalWorkedHours'].toString()) ?? 0.0),
        calculatedEarnings = (double.tryParse(json['calculatedEarnings'].toString()) ?? 0.0),
        explanation = json['explanation'] as String;
}

/// Matches `DriverProfilePage.tsx`: profile card, details grid, work
/// history & compensation summary (resolved by matching this user's id/
/// phone against the Drivers list — same lookup the website does, since
/// there's no direct "my driver record" endpoint), shared Change Password,
/// Sign Out.
class DriverProfileScreen extends ConsumerStatefulWidget {
  const DriverProfileScreen({super.key});

  @override
  ConsumerState<DriverProfileScreen> createState() => _DriverProfileScreenState();
}

class _DriverProfileScreenState extends ConsumerState<DriverProfileScreen> {
  _CompensationSummary? _comp;
  bool _loadingComp = true;

  @override
  void initState() {
    super.initState();
    _loadCompensation();
  }

  Future<void> _loadCompensation() async {
    final user = ref.read(currentUserProvider);
    if (user == null) return;
    try {
      final dio = ref.read(apiClientProvider);
      final driversResponse = await dio.get('/drivers');
      final drivers = (driversResponse.data as List<dynamic>).map((j) => DriverSummary.fromJson(j as Map<String, dynamic>)).toList();
      final myDriver = drivers.where((d) => d.employeeUserId == user.id || (d.phone != null && d.phone == user.mobileNumber));
      if (myDriver.isEmpty) return;
      final compResponse = await dio.get('/drivers/${myDriver.first.id}/compensation');
      if (mounted) setState(() => _comp = _CompensationSummary.fromJson(compResponse.data as Map<String, dynamic>));
    } catch (_) {
      // Matches the website: compensation is best-effort display, silently
      // omitted (not an error banner) if the lookup fails.
    } finally {
      if (mounted) setState(() => _loadingComp = false);
    }
  }

  String _compensationModelLabel(String type) {
    switch (type) {
      case 'HOURLY':
        return 'Hourly Wage';
      case 'MONTHLY':
        return 'Monthly Salaried';
      case 'YEARLY':
        return 'Yearly Salaried';
      default:
        return type;
    }
  }

  Future<void> _handleLogout() async {
    await ref.read(authRepositoryProvider).logout();
    if (mounted) context.go('/login');
  }

  @override
  Widget build(BuildContext context) {
    final user = ref.watch(currentUserProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Profile & Earnings')),
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
                      (user?.fullName.isNotEmpty ?? false) ? user!.fullName[0].toUpperCase() : 'D',
                      style: const TextStyle(fontSize: 28),
                    ),
                  ),
                  const SizedBox(height: 12),
                  Text(user?.fullName ?? 'Driver', style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                  const Text('Driver', style: TextStyle(color: Colors.grey)),
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
          if (_loadingComp) const Padding(padding: EdgeInsets.all(16), child: Center(child: CircularProgressIndicator())),
          if (_comp != null) ...[
            const SizedBox(height: 16),
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16.0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('Work History & Compensation Model', style: TextStyle(fontWeight: FontWeight.bold)),
                    const SizedBox(height: 8),
                    Text('Model: ${_compensationModelLabel(_comp!.compensationType)}'),
                    const SizedBox(height: 4),
                    Text('Total Completed Jobs: ${_comp!.totalCompletedJobs} jobs (${_comp!.totalWorkedHours} worked hrs)'),
                    const SizedBox(height: 4),
                    Text('Compensation Calculation: ${_comp!.explanation}'),
                    const SizedBox(height: 8),
                    Text(
                      'Current Amount: ₹${_comp!.calculatedEarnings.toStringAsFixed(2)}',
                      style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.green),
                    ),
                  ],
                ),
              ),
            ),
          ],
          const SizedBox(height: 20),
          const ChangePasswordCard(),
          const SizedBox(height: 24),
          OutlinedButton.icon(
            onPressed: _handleLogout,
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
