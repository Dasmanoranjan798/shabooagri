import 'package:flutter/material.dart';
import 'package:shabooagri_mobile/core/sync/data_sync.dart';
import '../../../core/widgets/quick_action_bar.dart';
import '../../../core/widgets/status_badge.dart';
import '../../../core/widgets/adaptive_scaffold.dart';
import '../../../core/layout/responsive.dart';
import '../../../core/theme/app_theme.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import '../../../core/network/api_client.dart';
import '../../../core/network/api_error.dart';
import '../../../core/providers/company_profile_provider.dart';
import '../../../core/providers/network_provider.dart';
import '../../../core/providers/session_provider.dart';
import '../../../core/storage/local_storage.dart';
import '../../customers/presentation/customer_list_screen.dart';
import '../../drivers/presentation/driver_list_screen.dart';
import '../../machines/presentation/machine_list_screen.dart';
import '../../payments/presentation/invoice_workspace.dart';
import '../../notifications/presentation/notification_bell.dart';
import '../data/dashboard_summary.dart';

/// Owner/Manager home — real KPIs from `GET /dashboard/summary`, the same
/// endpoint the website's Dashboard and Reports pages both already use.
/// Replaces the old client-side "count locally-synced jobs" placeholder.
final dashboardSummaryProvider = FutureProvider<DashboardSummary>((ref) async {
  syncOn(ref, {SyncEntity.dashboard});
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
  syncOn(ref, {SyncEntity.maintenance, SyncEntity.dashboard});
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

/// The contextual workspace selected by the quick-access pills. `today` is the
/// default (Today's Job Cards); the rest embed the SAME list bodies used by the
/// standalone screens — no duplicate list/search implementations.
enum _WorkspaceArea { today, customers, invoices, machines, drivers }

class DashboardScreen extends ConsumerStatefulWidget {
  const DashboardScreen({super.key});

  @override
  ConsumerState<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends ConsumerState<DashboardScreen> {
  _WorkspaceArea _area = _WorkspaceArea.today;

  @override
  Widget build(BuildContext context) {
    final networkStatusAsync = ref.watch(networkStatusProvider);
    final isOnline = networkStatusAsync.valueOrNull ?? false;
    final summaryAsync = ref.watch(dashboardSummaryProvider);
    final user = ref.watch(currentUserProvider);
    final dateStr = DateFormat('EEEE, d MMMM yyyy').format(DateTime.now());
    final isDesktop = context.responsive.isDesktop;

    return AdaptiveScaffold(
      currentRoute: '/dashboard',
      title: 'Dashboard',
      actions: [
        const NotificationBell(),
        Icon(isOnline ? Icons.cloud_done : Icons.cloud_off, color: isOnline ? Colors.green : Colors.red),
        const SizedBox(width: 16),
      ],
      // Quick actions live in a bottom bar on phones; on desktop the same
      // navigation is always available in the persistent sidebar.
      bottomNavigationBar: isDesktop ? null : const QuickActionBar(),
      body: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Compact greeting.
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 4),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Hello, ${user?.fullName.split(' ').first ?? 'Partner'}',
                    style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                Text(dateStr, style: const TextStyle(fontSize: 12, color: Colors.grey)),
              ],
            ),
          ),
          // 1. Horizontal, swipeable KPI carousel — every card is clickable.
          _kpiCarousel(context, summaryAsync),
          // 5. Quick-access pills.
          _pillsRow(context),
          const Divider(height: 1),
          // 6. Contextual workspace controlled by the selected pill.
          Expanded(child: _workspace(context, summaryAsync)),
        ],
      ),
    );
  }

  // ---------------------------------------------------------------- KPI band

  Widget _kpiCarousel(BuildContext context, AsyncValue<DashboardSummary> summaryAsync) {
    return SizedBox(
      height: 108,
      child: summaryAsync.when(
        data: (summary) {
          final k = summary.kpis;
          if (k == null) return const SizedBox.shrink();
          final cards = <Widget>[
            _kpiCard("Today's Revenue", '₹${k.todayRevenue.current.toStringAsFixed(0)}',
                k.todayRevenue.deltaPercent, Colors.green, onTap: () => context.go('/payments')),
            _kpiCard('This Month', '₹${k.monthRevenue.current.toStringAsFixed(0)}',
                k.monthRevenue.deltaPercent, Colors.green, onTap: () => context.go('/payments')),
            _kpiCard('Pending Collection', '₹${k.pendingCollection.current.toStringAsFixed(0)}', null, Colors.orange,
                onTap: () => context.go('/payments?status=UNPAID&status=PARTIALLY_PAID'),
                valueColor: k.pendingCollection.current > 0 ? Colors.red : null),
            _kpiCard('Machines Working', '${k.machinesWorking.working}/${k.machinesWorking.activeUsable}', null, Colors.blue,
                onTap: () => context.go('/machines')),
            _kpiCard('Drivers Active', '${k.driversActive.current.toInt()}', null, Colors.purple,
                onTap: () => context.go('/drivers')),
            _kpiCard('Jobs Completed', '${k.jobsCompleted.current.toInt()}', k.jobsCompleted.deltaPercent, Colors.teal,
                onTap: () => context.go('/jobs')),
          ];
          return ListView.separated(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            itemCount: cards.length,
            separatorBuilder: (_, _) => const SizedBox(width: 12),
            itemBuilder: (_, i) => cards[i],
          );
        },
        loading: () => const Center(child: SizedBox(height: 24, width: 24, child: CircularProgressIndicator(strokeWidth: 2))),
        error: (e, _) => Center(child: Text('KPIs unavailable: ${apiErrorMessage(e)}', style: const TextStyle(fontSize: 12, color: Colors.grey))),
      ),
    );
  }

  Widget _kpiCard(String title, String value, double? deltaPercent, Color color, {VoidCallback? onTap, Color? valueColor}) {
    return SizedBox(
      width: 168,
      child: Card(
        color: color.withValues(alpha: 0.05),
        margin: EdgeInsets.zero,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(12),
          side: BorderSide(color: color.withValues(alpha: 0.2)),
        ),
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(12),
          child: Padding(
            padding: const EdgeInsets.all(12),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Text(title,
                    style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: color.withValues(alpha: 0.8)),
                    maxLines: 1, overflow: TextOverflow.ellipsis),
                const SizedBox(height: 6),
                Text(value, style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: valueColor ?? color.withValues(alpha: 1.0))),
                if (deltaPercent != null) ...[
                  const SizedBox(height: 4),
                  Row(
                    children: [
                      Icon(deltaPercent >= 0 ? Icons.arrow_upward : Icons.arrow_downward, size: 12, color: deltaPercent >= 0 ? Colors.green : Colors.red),
                      Text('${deltaPercent.abs().toStringAsFixed(1)}%', style: TextStyle(fontSize: 10, color: deltaPercent >= 0 ? Colors.green : Colors.red)),
                    ],
                  ),
                ] else
                  const Icon(Icons.chevron_right, size: 14, color: Colors.grey),
              ],
            ),
          ),
        ),
      ),
    );
  }

  // ---------------------------------------------------------------- Pills

  Widget _pillsRow(BuildContext context) {
    final pills = <(_WorkspaceArea, String, IconData)>[
      (_WorkspaceArea.today, 'Today', Icons.today),
      (_WorkspaceArea.customers, 'Customers', Icons.people),
      (_WorkspaceArea.invoices, 'Invoices', Icons.receipt_long),
      (_WorkspaceArea.machines, 'Machines', Icons.agriculture),
      (_WorkspaceArea.drivers, 'Drivers', Icons.badge),
    ];
    return SizedBox(
      height: 48,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
        itemCount: pills.length,
        separatorBuilder: (_, _) => const SizedBox(width: 8),
        itemBuilder: (_, i) {
          final (area, label, icon) = pills[i];
          final selected = _area == area;
          return ChoiceChip(
            avatar: Icon(icon, size: 16, color: selected ? Colors.white : AppTheme.primary),
            label: Text(label),
            selected: selected,
            showCheckmark: false,
            selectedColor: AppTheme.primary,
            labelStyle: TextStyle(color: selected ? Colors.white : null, fontWeight: FontWeight.w600),
            onSelected: (_) => setState(() => _area = area),
          );
        },
      ),
    );
  }

  // ---------------------------------------------------------------- Workspace

  Widget _workspace(BuildContext context, AsyncValue<DashboardSummary> summaryAsync) {
    switch (_area) {
      case _WorkspaceArea.today:
        return _todayWorkspace(context, summaryAsync);
      case _WorkspaceArea.customers:
        return Column(children: [
          _workspaceHeader('Customers', '+ New Customer', () => context.go('/customers/new')),
          const Expanded(child: CustomerListBody()),
        ]);
      case _WorkspaceArea.invoices:
        return Column(children: [
          _workspaceHeader('Invoices', '+ Create', () => showInvoiceCreateMenu(context)),
          const Expanded(child: InvoiceWorkspaceBody()),
        ]);
      case _WorkspaceArea.machines:
        return Column(children: [
          _workspaceHeader('Machines', '+ New Machine', () => context.go('/machines/new')),
          const Expanded(child: MachineListBody()),
        ]);
      case _WorkspaceArea.drivers:
        return Column(children: [
          _workspaceHeader('Drivers', '+ New Driver', () => context.go('/drivers/new')),
          const Expanded(child: DriverListBody()),
        ]);
    }
  }

  Widget _workspaceHeader(String title, String actionLabel, VoidCallback onAction) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 10, 8, 0),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(title, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
          TextButton(onPressed: onAction, child: Text(actionLabel)),
        ],
      ),
    );
  }

  Widget _todayWorkspace(BuildContext context, AsyncValue<DashboardSummary> summaryAsync) {
    return summaryAsync.when(
      data: (summary) {
        final opsCountsAsync = ref.watch(_opsWarningCountsProvider);
        final opsDismissedAsync = ref.watch(_opsWarningDismissedProvider);
        return RefreshIndicator(
          onRefresh: () async => ref.invalidate(dashboardSummaryProvider),
          child: ListView(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
            children: [
              if (opsCountsAsync.valueOrNull != null && !(opsDismissedAsync.valueOrNull ?? false))
                _buildOpsWarningBanner(context, ref, opsCountsAsync.valueOrNull!),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text("Today's Job Cards", style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                  TextButton(onPressed: () => context.go('/jobs'), child: const Text('View all')),
                ],
              ),
              const SizedBox(height: 4),
              if (summary.todaysJobs.isEmpty)
                const Padding(padding: EdgeInsets.symmetric(vertical: 8), child: Text('No jobs scheduled today.'))
              else
                ...summary.todaysJobs.map((job) => Card(
                      margin: const EdgeInsets.only(bottom: 12),
                      child: InkWell(
                        onTap: () => context.go('/jobs/${job.jobId}'),
                        borderRadius: BorderRadius.circular(10),
                        child: Padding(
                          padding: const EdgeInsets.all(16),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  Flexible(child: Text(job.bookingNumber, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16), overflow: TextOverflow.ellipsis)),
                                  JobStatusBadge(status: job.jobStatus),
                                ],
                              ),
                              const SizedBox(height: 8),
                              Row(
                                children: [
                                  const Icon(Icons.person, size: 16, color: AppTheme.textMuted),
                                  const SizedBox(width: 8),
                                  Expanded(child: Text(job.customerName, style: const TextStyle(fontSize: 14), overflow: TextOverflow.ellipsis)),
                                ],
                              ),
                              if (job.jobStatus == 'NOT_STARTED') ...[
                                const SizedBox(height: 4),
                                Row(
                                  children: [
                                    const Icon(Icons.info_outline, size: 16, color: AppTheme.textMuted),
                                    const SizedBox(width: 8),
                                    Text(job.isReadyToStart ? 'Ready to Start' : 'Awaiting Machine',
                                      style: TextStyle(fontSize: 13, color: job.isReadyToStart ? AppTheme.success : AppTheme.warning)),
                                  ],
                                ),
                              ],
                            ],
                          ),
                        ),
                      ),
                    )),
            ],
          ),
        );
      },
      loading: () => const Center(child: CircularProgressIndicator()),
      error: (error, stack) => Center(child: Text('Could not load dashboard: ${apiErrorMessage(error)}')),
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
}
