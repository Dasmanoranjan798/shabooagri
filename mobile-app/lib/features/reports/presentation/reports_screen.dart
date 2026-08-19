import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:pdf/widgets.dart' as pw;
import 'package:printing/printing.dart';
import 'package:share_plus/share_plus.dart' show Share;
import '../../../core/network/api_client.dart';
import '../../../core/network/api_error.dart';
import '../../../core/widgets/app_drawer.dart';
import '../../dashboard/data/dashboard_summary.dart';

class IncomePoint {
  final String label; // date or month
  final double amount;
  IncomePoint.fromJson(Map<String, dynamic> json)
      : label = (json['date'] ?? json['month']) as String,
        amount = (double.tryParse(json['amount'].toString()) ?? 0.0);
}

final reportsSummaryProvider = FutureProvider<DashboardSummary>((ref) async {
  final dio = ref.watch(apiClientProvider);
  final response = await dio.get('/dashboard/summary');
  return DashboardSummary.fromJson(response.data as Map<String, dynamic>);
});

final incomeSeriesProvider = FutureProvider.family<List<IncomePoint>, String>((ref, range) async {
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
                  ['Today\'s Revenue', '₹${summary.kpis.todayRevenue.current.toStringAsFixed(2)}'],
                  ['This Month Revenue', '₹${summary.kpis.monthRevenue.current.toStringAsFixed(2)}'],
                  ['Pending Collection', '₹${summary.kpis.pendingCollection.current.toStringAsFixed(2)}'],
                  ['Machines Working', '${summary.kpis.machinesWorking.working}/${summary.kpis.machinesWorking.activeUsable}'],
                  ['Drivers Active', '${summary.kpis.driversActive.current.toInt()}'],
                  ['Jobs Completed', '${summary.kpis.jobsCompleted.current.toInt()}'],
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

    return Scaffold(
      drawer: const AppDrawer(currentRoute: '/reports'),
      appBar: AppBar(title: const Text('Reports')),
      body: summaryAsync.when(
        data: (summary) => incomeAsync.when(
          data: (income) => ListView(
            padding: const EdgeInsets.all(16.0),
            children: [
              DropdownButtonFormField<String>(
                initialValue: _range,
                decoration: const InputDecoration(labelText: 'Range', border: OutlineInputBorder()),
                items: _ranges.map((r) => DropdownMenuItem(value: r, child: Text(r))).toList(),
                onChanged: (value) => setState(() => _range = value!),
              ),
              const SizedBox(height: 16),
              Row(
                children: [
                  Expanded(
                    child: ElevatedButton.icon(
                      icon: const Icon(Icons.picture_as_pdf),
                      label: const Text('Export PDF'),
                      onPressed: _exporting ? null : () => _exportPdf(summary, income),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: OutlinedButton.icon(
                      icon: const Icon(Icons.table_chart),
                      label: const Text('Export CSV'),
                      onPressed: _exporting ? null : () => _exportCsv(income),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 24),
              const Text('Key Metrics', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
              const SizedBox(height: 8),
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(16.0),
                  child: Column(
                    children: [
                      _metricRow("Today's Revenue", '₹${summary.kpis.todayRevenue.current.toStringAsFixed(0)}'),
                      _metricRow('This Month', '₹${summary.kpis.monthRevenue.current.toStringAsFixed(0)}'),
                      _metricRow('Pending Collection', '₹${summary.kpis.pendingCollection.current.toStringAsFixed(0)}'),
                      _metricRow('Machines Working',
                          '${summary.kpis.machinesWorking.working}/${summary.kpis.machinesWorking.activeUsable}'),
                      _metricRow('Drivers Active', '${summary.kpis.driversActive.current.toInt()}'),
                      _metricRow('Jobs Completed', '${summary.kpis.jobsCompleted.current.toInt()}'),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 24),
              const Text('Income Overview', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
              const SizedBox(height: 8),
              if (income.isEmpty)
                const Text('No income data for this range.')
              else
                ...income.map((p) => Card(
                      child: ListTile(
                        title: Text(p.label),
                        trailing: Text('₹${p.amount.toStringAsFixed(0)}'),
                      ),
                    )),
            ],
          ),
          loading: () => const Center(child: CircularProgressIndicator()),
          error: (e, s) => Center(child: Text('Could not load income data: ${apiErrorMessage(e)}')),
        ),
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, s) => Center(child: Text('Could not load report: ${apiErrorMessage(e)}')),
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
