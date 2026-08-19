import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import '../../../core/network/api_client.dart';
import '../../../core/network/api_error.dart';
import '../../../core/providers/company_profile_provider.dart';
import '../../../core/providers/network_provider.dart';
import '../../../core/providers/session_provider.dart';
import '../../../core/storage/local_storage.dart';
import '../../../core/widgets/app_drawer.dart';
import '../../drivers/presentation/driver_list_screen.dart';
import '../../machines/presentation/machine_list_screen.dart';
import '../data/dashboard_summary.dart';

/// Owner/Manager home — real KPIs from `GET /dashboard/summary`, the same
/// endpoint the website's Dashboard and Reports pages both already use.
/// Replaces the old client-side "count locally-synced jobs" placeholder.
final dashboardSummaryProvider = FutureProvider<DashboardSummary>((ref) async {
  final dio = ref.watch(apiClientProvider);
  final response = await dio.get('/dashboard/summary');
  return DashboardSummary.fromJson(response.data as Map<String, dynamic>);
});

/// Machine/Driver counts feeding the Operational Warning banner — mirrors
/// `DashboardPage.tsx`'s own `loadSummary()`, which fetches machines/
/// drivers/company profile alongside the summary purely to compute these
/// three counts client-side (no dedicated warning-count endpoint exists on
/// either platform).
final _opsWarningCountsProvider = FutureProvider<(int service, int insurance, int license)>((ref) async {
  final machines = await ref.watch(machinesListProvider.future);
  final drivers = await ref.watch(driversListProvider.future);
  final company = await ref.watch(companyProfileProvider.future);

  final serviceCount = machines
      .where((m) => machineServiceWarning(
            hourMeterReading: m.hourMeterReading,
            nextServiceDueHours: m.nextServiceDueHours,
            serviceAlertHours: company.serviceAlertHours,
          ) !=
          null)
      .length;
  final insuranceCount = machines
      .where((m) => expiryWarning(
            expiryDate: m.insuranceExpiryDate,
            alertDays: company.insuranceAlertDays,
            overdueLabel: 'Insurance Expired',
            dueSoonLabel: 'Insurance Expires',
          ) !=
          null)
      .length;
  final licenseCount = drivers
      .where((d) => expiryWarning(
            expiryDate: d.licenseExpiryDate,
            alertDays: company.licenseAlertDays,
            overdueLabel: 'License Expired',
            dueSoonLabel: 'License Expires',
          ) !=
          null)
      .length;

  return (serviceCount, insuranceCount, licenseCount);
});

final _opsWarningDismissedProvider = FutureProvider<bool>((ref) => DashboardStorage.isOpsWarningDismissed());

class DashboardScreen extends ConsumerWidget {
  const DashboardScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final networkStatusAsync = ref.watch(networkStatusProvider);
    final isOnline = networkStatusAsync.valueOrNull ?? false;
    final summaryAsync = ref.watch(dashboardSummaryProvider);
    final user = ref.watch(currentUserProvider);
    final opsCountsAsync = ref.watch(_opsWarningCountsProvider);
    final opsDismissedAsync = ref.watch(_opsWarningDismissedProvider);
    final dateStr = DateFormat('EEEE, d MMMM yyyy').format(DateTime.now());

    return Scaffold(
      drawer: const AppDrawer(currentRoute: '/dashboard'),
      appBar: AppBar(
        title: const Text('Dashboard'),
        actions: [
          Icon(isOnline ? Icons.cloud_done : Icons.cloud_off, color: isOnline ? Colors.green : Colors.red),
          const SizedBox(width: 16),
        ],
      ),
      body: summaryAsync.when(
        data: (summary) => RefreshIndicator(
          onRefresh: () async => ref.invalidate(dashboardSummaryProvider),
          child: ListView(
            padding: const EdgeInsets.all(16.0),
            children: [
              Text('Hello, ${user?.fullName.split(' ').first ?? 'Partner'}', style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
              Text(dateStr, style: const TextStyle(fontSize: 12, color: Colors.grey)),
              const SizedBox(height: 16),
              if (opsCountsAsync.valueOrNull != null && !(opsDismissedAsync.valueOrNull ?? false))
                _buildOpsWarningBanner(context, ref, opsCountsAsync.valueOrNull!),
              _buildQuickActions(context),
              const SizedBox(height: 8),
              GridView.count(
                crossAxisCount: 2,
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                mainAxisSpacing: 12,
                crossAxisSpacing: 12,
                childAspectRatio: 1.4,
                children: [
                  _kpiCard("Today's Revenue", '₹${summary.kpis.todayRevenue.current.toStringAsFixed(0)}',
                      summary.kpis.todayRevenue.deltaPercent, Colors.green),
                  _kpiCard('This Month', '₹${summary.kpis.monthRevenue.current.toStringAsFixed(0)}',
                      summary.kpis.monthRevenue.deltaPercent, Colors.green),
                  _kpiCard('Pending Collection', '₹${summary.kpis.pendingCollection.current.toStringAsFixed(0)}',
                      null, Colors.orange),
                  _kpiCard('Machines Working',
                      '${summary.kpis.machinesWorking.working}/${summary.kpis.machinesWorking.activeUsable}',
                      null, Colors.blue),
                  _kpiCard('Drivers Active', '${summary.kpis.driversActive.current.toInt()}', null, Colors.purple),
                  _kpiCard('Jobs Completed', '${summary.kpis.jobsCompleted.current.toInt()}',
                      summary.kpis.jobsCompleted.deltaPercent, Colors.teal),
                ],
              ),
              const SizedBox(height: 24),
              const Text("Today's Job Cards", style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
              const SizedBox(height: 8),
              if (summary.todaysJobs.isEmpty)
                const Padding(padding: EdgeInsets.symmetric(vertical: 8), child: Text('No jobs scheduled today.'))
              else
                ...summary.todaysJobs.map((job) => Card(
                      child: ListTile(
                        title: Text('${job.bookingNumber} · ${job.customerName}'),
                        subtitle: Text(job.jobStatus == 'NOT_STARTED'
                            ? (job.isReadyToStart ? 'Ready to Start' : 'Awaiting Machine')
                            : job.jobStatus),
                        trailing: const Icon(Icons.chevron_right),
                        onTap: () => context.go('/jobs/${job.jobId}'),
                      ),
                    )),
              const SizedBox(height: 24),
              const Text('Pending Payments', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
              const SizedBox(height: 8),
              if (summary.pendingPayments.isEmpty)
                const Padding(padding: EdgeInsets.symmetric(vertical: 8), child: Text('No pending payments.'))
              else
                ...summary.pendingPayments.map((p) => Card(
                      child: ListTile(
                        title: Text('${p.invoiceNumber} · ${p.customerName}'),
                        subtitle: Text('${p.daysOutstanding} days outstanding'),
                        trailing: Text('₹${p.balanceAmount.toStringAsFixed(0)}',
                            style: const TextStyle(color: Colors.red, fontWeight: FontWeight.bold)),
                        onTap: () => context.go('/payments/${p.invoiceId}'),
                      ),
                    )),
              const SizedBox(height: 24),
              ElevatedButton.icon(
                icon: const Icon(Icons.work),
                label: const Text('VIEW ALL JOBS', style: TextStyle(fontSize: 16)),
                style: ElevatedButton.styleFrom(padding: const EdgeInsets.symmetric(vertical: 24)),
                onPressed: () => context.go('/jobs'),
              ),
              const SizedBox(height: 12),
              OutlinedButton.icon(
                icon: const Icon(Icons.receipt_long),
                label: const Text('VIEW ALL INVOICES', style: TextStyle(fontSize: 16)),
                style: OutlinedButton.styleFrom(padding: const EdgeInsets.symmetric(vertical: 24)),
                onPressed: () => context.go('/payments'),
              ),
            ],
          ),
        ),
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, stack) => Center(child: Text('Could not load dashboard: ${apiErrorMessage(error)}')),
      ),
    );
  }

  Widget _buildOpsWarningBanner(BuildContext context, WidgetRef ref, (int service, int insurance, int license) counts) {
    final (service, insurance, license) = counts;
    if (service == 0 && insurance == 0 && license == 0) return const SizedBox.shrink();

    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: Colors.amber.shade50,
          borderRadius: BorderRadius.circular(10),
          border: Border.all(color: Colors.amber.shade200),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Expanded(
                  child: Row(children: [
                    Icon(Icons.warning_amber, size: 18, color: Color(0xFFB45309)),
                    SizedBox(width: 8),
                    Flexible(
                      child: Text('Operational Fleet & Staff Warning Alerts',
                          style: TextStyle(fontWeight: FontWeight.bold, color: Color(0xFFB45309))),
                    ),
                  ]),
                ),
                IconButton(
                  icon: const Icon(Icons.close, size: 16, color: Color(0xFFB45309)),
                  tooltip: 'Hide for 24 hours',
                  onPressed: () async {
                    await DashboardStorage.dismissOpsWarningFor24h();
                    ref.invalidate(_opsWarningDismissedProvider);
                  },
                ),
              ],
            ),
            const SizedBox(height: 8),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                if (service > 0) _opsWarningChip(Icons.build, '$service Equipment Service Due Soon'),
                if (insurance > 0) _opsWarningChip(Icons.shield, '$insurance Machine Document / Insurance Expiring'),
                if (license > 0) _opsWarningChip(Icons.badge, '$license Driver License Expiring'),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _opsWarningChip(IconData icon, String text) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(color: const Color(0xFFFEF3C7), borderRadius: BorderRadius.circular(6)),
      child: Row(mainAxisSize: MainAxisSize.min, children: [
        Icon(icon, size: 13, color: const Color(0xFFB45309)),
        const SizedBox(width: 6),
        Text(text, style: const TextStyle(color: Color(0xFFB45309), fontSize: 12, fontWeight: FontWeight.w600)),
      ]),
    );
  }

  Widget _buildQuickActions(BuildContext context) {
    return Row(
      children: [
        Expanded(child: _quickActionButton(context, Icons.add, 'New Booking', '/bookings/new')),
        const SizedBox(width: 8),
        Expanded(child: _quickActionButton(context, Icons.credit_card, 'Collect Payment', '/payments')),
        const SizedBox(width: 8),
        Expanded(child: _quickActionButton(context, Icons.person_add, 'New Customer', '/customers/new')),
        const SizedBox(width: 8),
        Expanded(child: _quickActionButton(context, Icons.description, 'New Expense', '/expenses/new')),
      ],
    );
  }

  Widget _quickActionButton(BuildContext context, IconData icon, String label, String route) {
    return OutlinedButton(
      onPressed: () => context.go(route),
      style: OutlinedButton.styleFrom(padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 4)),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 18),
          const SizedBox(height: 4),
          Text(label, style: const TextStyle(fontSize: 10), textAlign: TextAlign.center, maxLines: 2),
        ],
      ),
    );
  }

  Widget _kpiCard(String title, String value, double? deltaPercent, Color color) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(12.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Text(title, style: const TextStyle(fontSize: 12, color: Colors.grey), maxLines: 2),
            const SizedBox(height: 4),
            Text(value, style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: color)),
            if (deltaPercent != null)
              Text(
                '${deltaPercent >= 0 ? '+' : ''}${deltaPercent.toStringAsFixed(1)}% vs yesterday',
                style: TextStyle(fontSize: 11, color: deltaPercent >= 0 ? Colors.green : Colors.red),
              ),
          ],
        ),
      ),
    );
  }
}
