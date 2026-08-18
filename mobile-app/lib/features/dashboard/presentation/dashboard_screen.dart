import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../core/network/api_client.dart';
import '../../../core/network/api_error.dart';
import '../../../core/providers/network_provider.dart';
import '../../../core/widgets/app_drawer.dart';
import '../data/dashboard_summary.dart';

/// Owner/Manager home — real KPIs from `GET /dashboard/summary`, the same
/// endpoint the website's Dashboard and Reports pages both already use.
/// Replaces the old client-side "count locally-synced jobs" placeholder.
final dashboardSummaryProvider = FutureProvider<DashboardSummary>((ref) async {
  final dio = ref.watch(apiClientProvider);
  final response = await dio.get('/dashboard/summary');
  return DashboardSummary.fromJson(response.data as Map<String, dynamic>);
});

class DashboardScreen extends ConsumerWidget {
  const DashboardScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final networkStatusAsync = ref.watch(networkStatusProvider);
    final isOnline = networkStatusAsync.valueOrNull ?? false;
    final summaryAsync = ref.watch(dashboardSummaryProvider);

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
            ],
          ),
        ),
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, stack) => Center(child: Text('Could not load dashboard: ${apiErrorMessage(error)}')),
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
