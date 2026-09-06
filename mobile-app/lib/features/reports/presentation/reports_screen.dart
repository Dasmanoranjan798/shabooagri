import 'package:flutter/material.dart';
import 'package:shabooagri_mobile/core/sync/data_sync.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/layout/responsive.dart';
import '../../../core/network/api_client.dart';
import '../../../core/network/api_error.dart';
import '../../../core/widgets/adaptive_scaffold.dart';
import '../../dashboard/data/dashboard_summary.dart';
import 'report_export.dart';

class IncomePoint {
  final String label; // date or month
  final double amount;
  IncomePoint.fromJson(Map<String, dynamic> json)
      : label = (json['date'] ?? json['month']) as String,
        amount = (double.tryParse(json['amount'].toString()) ?? 0.0);
}

final reportsSummaryProvider = FutureProvider<DashboardSummary>((ref) async {
  syncOn(ref, {SyncEntity.report});
  final dio = ref.watch(apiClientProvider);
  final response = await dio.get('/dashboard/summary');
  return DashboardSummary.fromJson(response.data as Map<String, dynamic>);
});

final incomeSeriesProvider = FutureProvider.family<List<IncomePoint>, String>((ref, range) async {
  syncOn(ref, {SyncEntity.report});
  final dio = ref.watch(apiClientProvider);
  final response = await dio.get('/dashboard/income', queryParameters: {'range': range});
  final data = (response.data as Map<String, dynamic>)['data'] as List<dynamic>;
  return data.map((j) => IncomePoint.fromJson(j as Map<String, dynamic>)).toList();
});

const _ranges = ['7d', '30d', '90d', '12m'];

/// Reuses the same `/dashboard/summary` + `/dashboard/income` endpoints as
/// the Dashboard (Stage 2) — matches the website, where Reports is
/// confirmed to be a re-presentation of Dashboard's data with export/print
/// added, not a separate aggregation engine. The genuinely new work here is
/// the export itself: real PDF generation (via `pdf`/`printing`, shared
/// through the OS share sheet) and CSV (not the website's .xls XML
/// Spreadsheet format — a real, working, differently-formatted export, see
/// BUILD_LOG.md).
class ReportsScreen extends ConsumerStatefulWidget {
  const ReportsScreen({super.key});

  @override
  ConsumerState<ReportsScreen> createState() => _ReportsScreenState();
}

class _ReportsScreenState extends ConsumerState<ReportsScreen> {
  String _range = '30d';

  /// One export document for the whole screen, built from the SAME
  /// `reportsSummaryProvider` + `incomeSeriesProvider($_range)` data shown on
  /// screen (no new calculation). It is presented as three professional,
  /// correctly-typed sections rather than a generic Item/Value dump:
  ///  1. Financial Summary — currency KPIs
  ///  2. Operational Summary — numeric/count KPIs
  ///  3. Income Overview — the range's time-series (currency, with a total)
  ReportDoc _buildDoc(DashboardSummary summary, List<IncomePoint> income) {
    final k = summary.kpis!;
    return ReportDoc.multi(
      title: 'Business Summary',
      subtitle: 'Income range: $_range',
      filters: [('Income Range', _range)],
      sections: [
        ReportSection(
          heading: 'Financial Summary',
          columns: const [
            ReportColumn('Metric', width: 28),
            ReportColumn('Amount', type: ColType.currency, width: 18),
          ],
          rows: [
            ["Today's Revenue", k.todayRevenue.current],
            ['This Month Revenue', k.monthRevenue.current],
            ['Pending Collection', k.pendingCollection.current],
          ],
        ),
        ReportSection(
          heading: 'Operational Summary',
          columns: const [
            ReportColumn('Metric', width: 28),
            ReportColumn('Count', type: ColType.number, width: 14),
          ],
          rows: [
            ['Machines Working', k.machinesWorking.working],
            ['Machines Usable', k.machinesWorking.activeUsable],
            ['Drivers Active', k.driversActive.current.toInt()],
            ['Jobs Completed', k.jobsCompleted.current.toInt()],
          ],
        ),
        ReportSection(
          heading: 'Income Overview ($_range)',
          columns: const [
            ReportColumn('Period', width: 22),
            ReportColumn('Amount', type: ColType.currency, width: 18),
          ],
          rows: income.map((p) => [p.label, p.amount]).toList(),
          totals: [null, income.fold<double>(0, (s, p) => s + p.amount)],
        ),
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    final summaryAsync = ref.watch(reportsSummaryProvider);
    final incomeAsync = ref.watch(incomeSeriesProvider(_range));
    final isDesktop = context.responsive.isDesktop;

    return AdaptiveScaffold(
      // Reached directly from the Reports hub; the old "Operational Reports"
      // hop is gone (driver/machine/maintenance are their own hub entries now).
      currentRoute: '/reports',
      title: 'Business Summary',
      showBack: true,
      actions: [
        ReportExportMenu(docBuilder: () {
          final summary = summaryAsync.valueOrNull;
          final income = incomeAsync.valueOrNull;
          if (summary == null || summary.kpis == null || income == null) return null;
          return _buildDoc(summary, income);
        }),
      ],
      body: summaryAsync.when(
        // The dashboard/summary contract returns `kpis: null` for the narrow
        // (driver/non-company) scope. Reports are a company-level view, so
        // guard here instead of force-unwrapping `kpis!` further down (which
        // would throw for a non-company caller).
        data: (summary) => summary.kpis == null
            ? const Center(
                child: Padding(
                  padding: EdgeInsets.all(24),
                  child: Text(
                    'Reports are available for owner and manager accounts.',
                    textAlign: TextAlign.center,
                  ),
                ),
              )
            : incomeAsync.when(
          data: (income) {
            final rangeField = DropdownButtonFormField<String>(
              initialValue: _range,
              decoration: const InputDecoration(labelText: 'Income Range', border: OutlineInputBorder()),
              items: _ranges.map((r) => DropdownMenuItem(value: r, child: Text(r))).toList(),
              onChanged: (value) => setState(() => _range = value!),
            );

            return ListView(
              padding: const EdgeInsets.all(16.0),
              children: [
                // Export/Print live in the app-bar menu (Excel/PDF/Print/CSV).
                if (isDesktop) SizedBox(width: 220, child: rangeField) else rangeField,
                const SizedBox(height: 24),
                const Text('Key Metrics', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                const SizedBox(height: 8),
                Card(
                  child: Padding(
                    padding: const EdgeInsets.all(16.0),
                    child: Column(
                      children: [
                        _metricRow("Today's Revenue", '₹${summary.kpis!.todayRevenue.current.toStringAsFixed(0)}'),
                        _metricRow('This Month', '₹${summary.kpis!.monthRevenue.current.toStringAsFixed(0)}'),
                        _metricRow('Pending Collection', '₹${summary.kpis!.pendingCollection.current.toStringAsFixed(0)}'),
                        _metricRow('Machines Working',
                            '${summary.kpis!.machinesWorking.working}/${summary.kpis!.machinesWorking.activeUsable}'),
                        _metricRow('Drivers Active', '${summary.kpis!.driversActive.current.toInt()}'),
                        _metricRow('Jobs Completed', '${summary.kpis!.jobsCompleted.current.toInt()}'),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 24),
                const Text('Income Overview', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                const SizedBox(height: 8),
                if (income.isEmpty)
                  const Text('No income data for this range.')
                else if (isDesktop)
                  _incomeTable(context, income)
                else
                  ...income.map((p) => Card(
                        child: ListTile(
                          title: Text(p.label),
                          trailing: Text('₹${p.amount.toStringAsFixed(0)}'),
                        ),
                      )),
              ],
            );
          },
          loading: () => const Center(child: CircularProgressIndicator()),
          error: (e, s) => Center(child: Text('Could not load income data: ${apiErrorMessage(e)}')),
        ),
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, s) => Center(child: Text('Could not load report: ${apiErrorMessage(e)}')),
      ),
    );
  }

  /// Desktop presentation of the income series: a proper data grid (horizontal
  /// scroll only; lives inside the page ListView).
  Widget _incomeTable(BuildContext context, List<IncomePoint> income) {
    return Card(
      clipBehavior: Clip.antiAlias,
      child: SingleChildScrollView(
        scrollDirection: Axis.horizontal,
        child: ConstrainedBox(
          constraints: BoxConstraints(
            minWidth: (MediaQuery.sizeOf(context).width - Breakpoints.sidebarWidth - 96).clamp(0, double.infinity),
          ),
          child: DataTable(
            headingRowColor: WidgetStateProperty.all(Theme.of(context).colorScheme.surfaceContainerHighest),
            columns: const [
              DataColumn(label: Text('Period')),
              DataColumn(label: Text('Amount'), numeric: true),
            ],
            rows: [
              for (final p in income)
                DataRow(cells: [
                  DataCell(Text(p.label)),
                  DataCell(Text('₹${p.amount.toStringAsFixed(0)}', style: const TextStyle(fontWeight: FontWeight.w600))),
                ]),
            ],
          ),
        ),
      ),
    );
  }

  Widget _metricRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: const TextStyle(color: Colors.grey)),
          Text(value, style: const TextStyle(fontWeight: FontWeight.bold)),
        ],
      ),
    );
  }
}
