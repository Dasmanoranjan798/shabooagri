import 'package:flutter/material.dart';
import 'package:shabooagri_mobile/core/sync/data_sync.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:pdf/widgets.dart' as pw;
import 'package:printing/printing.dart';
import 'package:share_plus/share_plus.dart' show Share;
import '../../../core/layout/responsive.dart';
import '../../../core/network/api_client.dart';
import '../../../core/network/api_error.dart';
import '../../../core/widgets/adaptive_scaffold.dart';
import '../../dashboard/data/dashboard_summary.dart';

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
  bool _exporting = false;

  Future<void> _exportPdf(DashboardSummary summary, List<IncomePoint> income) async {
    setState(() => _exporting = true);
    try {
      final doc = pw.Document();
      doc.addPage(
        pw.Page(
          build: (context) => pw.Column(
            crossAxisAlignment: pw.CrossAxisAlignment.start,
            children: [
              pw.Text('ShabooAgri Report', style: pw.TextStyle(fontSize: 24, fontWeight: pw.FontWeight.bold)),
              pw.SizedBox(height: 4),
              pw.Text('Generated ${DateTime.now().toIso8601String().split('T').first} · Range: $_range'),
              pw.SizedBox(height: 20),
              pw.Text('Key Metrics', style: pw.TextStyle(fontSize: 16, fontWeight: pw.FontWeight.bold)),
              pw.SizedBox(height: 8),
              pw.TableHelper.fromTextArray(
                headers: ['Metric', 'Value'],
                data: [
                  ['Today\'s Revenue', '₹${summary.kpis!.todayRevenue.current.toStringAsFixed(2)}'],
                  ['This Month Revenue', '₹${summary.kpis!.monthRevenue.current.toStringAsFixed(2)}'],
                  ['Pending Collection', '₹${summary.kpis!.pendingCollection.current.toStringAsFixed(2)}'],
                  ['Machines Working', '${summary.kpis!.machinesWorking.working}/${summary.kpis!.machinesWorking.activeUsable}'],
                  ['Drivers Active', '${summary.kpis!.driversActive.current.toInt()}'],
                  ['Jobs Completed', '${summary.kpis!.jobsCompleted.current.toInt()}'],
                ],
              ),
              pw.SizedBox(height: 20),
              pw.Text('Income Overview', style: pw.TextStyle(fontSize: 16, fontWeight: pw.FontWeight.bold)),
              pw.SizedBox(height: 8),
              pw.TableHelper.fromTextArray(
                headers: ['Period', 'Amount'],
                data: income.map((p) => [p.label, '₹${p.amount.toStringAsFixed(2)}']).toList(),
              ),
            ],
          ),
        ),
      );
      await Printing.sharePdf(bytes: await doc.save(), filename: 'shabooagri-report-$_range.pdf');
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Export failed: $e')));
    } finally {
      if (mounted) setState(() => _exporting = false);
    }
  }

  Future<void> _exportCsv(List<IncomePoint> income) async {
    setState(() => _exporting = true);
    try {
      final buffer = StringBuffer('Period,Amount\n');
      for (final p in income) {
        buffer.writeln('${p.label},${p.amount.toStringAsFixed(2)}');
      }
      await Share.share(buffer.toString(), subject: 'ShabooAgri Income Report ($_range)');
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Export failed: $e')));
    } finally {
      if (mounted) setState(() => _exporting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final summaryAsync = ref.watch(reportsSummaryProvider);
    final incomeAsync = ref.watch(incomeSeriesProvider(_range));
    final isDesktop = context.responsive.isDesktop;

    return AdaptiveScaffold(
      currentRoute: '/reports',
      title: 'Reports',
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
              decoration: const InputDecoration(labelText: 'Range', border: OutlineInputBorder()),
              items: _ranges.map((r) => DropdownMenuItem(value: r, child: Text(r))).toList(),
              onChanged: (value) => setState(() => _range = value!),
            );
            final pdfButton = ElevatedButton.icon(
              icon: const Icon(Icons.picture_as_pdf),
              label: const Text('Export PDF'),
              onPressed: _exporting ? null : () => _exportPdf(summary, income),
            );
            final csvButton = OutlinedButton.icon(
              icon: const Icon(Icons.table_chart),
              label: const Text('Export CSV'),
              onPressed: _exporting ? null : () => _exportCsv(income),
            );

            return ListView(
              padding: const EdgeInsets.all(16.0),
              children: [
                // Desktop: range + both export buttons in one compact toolbar
                // row. Phone: range on its own line, buttons on the next.
                if (isDesktop)
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.center,
                    children: [
                      SizedBox(width: 220, child: rangeField),
                      const Spacer(),
                      pdfButton,
                      const SizedBox(width: 12),
                      csvButton,
                    ],
                  )
                else ...[
                  rangeField,
                  const SizedBox(height: 16),
                  Row(
                    children: [
                      Expanded(child: pdfButton),
                      const SizedBox(width: 12),
                      Expanded(child: csvButton),
                    ],
                  ),
                ],
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
