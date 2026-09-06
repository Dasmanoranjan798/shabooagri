import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/layout/responsive.dart';
import '../../../core/network/api_error.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/widgets/adaptive_scaffold.dart';
import '../../reports/presentation/report_export.dart';
import '../data/invoice_analysis.dart';
import 'payment_filters.dart';
import 'payment_list_screen_provider.dart';
import 'widgets/payment_filters_dialog.dart';
import 'widgets/payment_filters_desktop_dialog.dart';

/// The Payments & Collections reports, reached from the canonical Reports hub.
/// They all re-present the SAME `invoicesAnalysisProvider` data (backed by
/// `POST /invoices/filter`) that the operational Payments list already loads —
/// no new API, provider, or calculation is introduced. They share the same
/// `paymentFilterProvider`, so they expose the existing rich payment filters and
/// their CSV export is built from the exact rows shown.

double _num(dynamic v) => double.tryParse(v?.toString() ?? '') ?? 0.0;

/// Shared scaffold: filter (reuses the Payments filter dialogs), optional CSV
/// export (built from the same displayed rows), refresh, loading/error/empty.
class _ReportScaffold extends ConsumerWidget {
  final String title;
  final Widget Function(BuildContext, InvoiceAnalysisResponse) builder;

  /// Builds the export document from the SAME analysis the screen displays, so
  /// PDF/Excel/CSV all match the on-screen (filtered) data. The applied filters
  /// (from the shared `paymentFilterProvider`) are passed through for the header.
  final ReportDoc Function(InvoiceAnalysisResponse, List<(String, String)>) docBuilder;

  const _ReportScaffold({
    required this.title,
    required this.builder,
    required this.docBuilder,
  });

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final analysisAsync = ref.watch(invoicesAnalysisProvider);
    final filterState = ref.watch(paymentFilterProvider);
    final appliedFilters = appliedPaymentFilters(filterState);
    final isDesktop = context.responsive.isDesktop;
    return AdaptiveScaffold(
      // Canonical Reports sub-screen: keep Reports highlighted in the sidebar,
      // and a back affordance to the Reports hub.
      currentRoute: '/reports',
      title: title,
      showBack: true,
      actions: [
        IconButton(
          icon: const Icon(Icons.filter_list),
          tooltip: 'Filters',
          onPressed: () {
            if (isDesktop) {
              showPaymentFiltersDesktopDialog(context);
            } else {
              showModalBottomSheet(
                context: context,
                isScrollControlled: true,
                builder: (_) => const PaymentFiltersDialog(),
              );
            }
          },
        ),
        ReportExportMenu(
          docBuilder: () {
            final a = analysisAsync.valueOrNull;
            return a == null ? null : docBuilder(a, appliedFilters);
          },
        ),
        IconButton(
          icon: const Icon(Icons.refresh),
          onPressed: () => ref.invalidate(invoicesAnalysisProvider),
        ),
      ],
      body: analysisAsync.when(
        data: (analysis) => RefreshIndicator(
          onRefresh: () async => ref.invalidate(invoicesAnalysisProvider),
          child: builder(context, analysis),
        ),
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(child: Text('Error: ${apiErrorMessage(e)}')),
      ),
    );
  }
}

Widget _emptyState(String message) => ListView(
      children: [
        Padding(
          padding: const EdgeInsets.all(32),
          child: Center(child: Text(message, textAlign: TextAlign.center)),
        ),
      ],
    );

// ---------------------------------------------------------------- Payment Methods

class PaymentMethodsReportScreen extends StatelessWidget {
  const PaymentMethodsReportScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return _ReportScaffold(
      title: 'Payment Methods',
      docBuilder: (a, filters) => ReportDoc(
        title: 'Payment Methods Report',
        filters: filters,
        columns: const [
          ReportColumn('Payment Method', width: 28),
          ReportColumn('Amount Collected', type: ColType.currency, width: 18),
        ],
        rows: a.methodWiseCollection.map((m) => [m['method']?.toString() ?? '—', _num(m['amount'])]).toList(),
        totals: [null, a.methodWiseCollection.fold<double>(0, (s, m) => s + _num(m['amount']))],
      ),
      builder: (context, a) {
        if (a.methodWiseCollection.isEmpty) {
          return _emptyState('No collections recorded yet.');
        }
        final total = a.methodWiseCollection.fold<double>(0, (s, m) => s + _num(m['amount']));
        return ListView(
          padding: const EdgeInsets.all(16),
          children: [
            _totalCard('Total Collected', total, AppTheme.success),
            const SizedBox(height: 8),
            ...a.methodWiseCollection.map((m) => Card(
                  child: ListTile(
                    leading: const Icon(Icons.account_balance_wallet, color: AppTheme.primary),
                    title: Text(m['method']?.toString() ?? '—'),
                    trailing: Text('₹${_num(m['amount']).toStringAsFixed(0)}',
                        style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                  ),
                )),
          ],
        );
      },
    );
  }
}

// ---------------------------------------------------------------- Customer Outstanding

class CustomerOutstandingReportScreen extends StatelessWidget {
  const CustomerOutstandingReportScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return _ReportScaffold(
      title: 'Customer Outstanding',
      docBuilder: (a, filters) {
        final rows = a.customerWise.where((c) => _num(c['outstanding']) > 0).toList()
          ..sort((x, y) => _num(y['outstanding']).compareTo(_num(x['outstanding'])));
        return ReportDoc(
          title: 'Customer Outstanding Report',
          filters: filters,
          columns: const [
            ReportColumn('Customer', width: 26),
            ReportColumn('Invoiced', type: ColType.currency, width: 16),
            ReportColumn('Paid', type: ColType.currency, width: 16),
            ReportColumn('Outstanding', type: ColType.currency, width: 16),
          ],
          rows: rows
              .map((c) => [c['name']?.toString() ?? 'Unknown', _num(c['invoiced']), _num(c['paid']), _num(c['outstanding'])])
              .toList(),
          totals: [
            null,
            rows.fold<double>(0, (s, c) => s + _num(c['invoiced'])),
            rows.fold<double>(0, (s, c) => s + _num(c['paid'])),
            a.summary.totalOutstanding,
          ],
        );
      },
      builder: (context, a) {
        final rows = a.customerWise
            .where((c) => _num(c['outstanding']) > 0)
            .toList()
          ..sort((x, y) => _num(y['outstanding']).compareTo(_num(x['outstanding'])));
        if (rows.isEmpty) {
          return _emptyState('No outstanding balances — everyone is settled up.');
        }
        return ListView(
          padding: const EdgeInsets.all(16),
          children: [
            _totalCard('Total Outstanding', a.summary.totalOutstanding, AppTheme.receivable),
            const SizedBox(height: 8),
            ...rows.map((c) => Card(
                  child: ListTile(
                    title: Text(c['name']?.toString() ?? 'Unknown'),
                    subtitle: Text(
                        'Invoiced ₹${_num(c['invoiced']).toStringAsFixed(0)} · Paid ₹${_num(c['paid']).toStringAsFixed(0)}'),
                    trailing: Text('₹${_num(c['outstanding']).toStringAsFixed(0)}',
                        style: const TextStyle(color: AppTheme.receivable, fontWeight: FontWeight.bold, fontSize: 16)),
                  ),
                )),
          ],
        );
      },
    );
  }
}

// ---------------------------------------------------------------- Day-wise Collections

class DayWiseCollectionsReportScreen extends StatelessWidget {
  const DayWiseCollectionsReportScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return _ReportScaffold(
      title: 'Day-wise Collections',
      docBuilder: (a, filters) => ReportDoc(
        title: 'Day-wise Collections Report',
        filters: filters,
        columns: const [
          ReportColumn('Date', type: ColType.date, width: 22),
          ReportColumn('Amount Collected', type: ColType.currency, width: 18),
        ],
        rows: a.dayWiseCollection.map((d) => [d['date']?.toString() ?? '—', _num(d['amount'])]).toList(),
        totals: [null, a.dayWiseCollection.fold<double>(0, (s, d) => s + _num(d['amount']))],
      ),
      builder: (context, a) {
        if (a.dayWiseCollection.isEmpty) {
          return _emptyState('No collections recorded yet.');
        }
        final total = a.dayWiseCollection.fold<double>(0, (s, d) => s + _num(d['amount']));
        return ListView(
          padding: const EdgeInsets.all(16),
          children: [
            _totalCard('Total Collected', total, AppTheme.success),
            const SizedBox(height: 8),
            ...a.dayWiseCollection.map((d) => Card(
                  child: ListTile(
                    leading: const Icon(Icons.calendar_month, color: AppTheme.primary),
                    title: Text(d['date']?.toString() ?? '—'),
                    trailing: Text('₹${_num(d['amount']).toStringAsFixed(0)}',
                        style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                  ),
                )),
          ],
        );
      },
    );
  }
}

// ---------------------------------------------------------------- Overdue

class OverdueReportScreen extends StatelessWidget {
  const OverdueReportScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return _ReportScaffold(
      title: 'Overdue',
      docBuilder: (a, filters) {
        final overdue = a.invoices.where((i) => i.status == 'OVERDUE').toList()
          ..sort((x, y) => y.balanceAmount.compareTo(x.balanceAmount));
        return ReportDoc(
          title: 'Overdue Invoices Report',
          filters: filters,
          columns: const [
            ReportColumn('Invoice', width: 16),
            ReportColumn('Customer', width: 24),
            ReportColumn('Due Date', type: ColType.date, width: 16),
            ReportColumn('Balance', type: ColType.currency, width: 16),
          ],
          rows: overdue
              .map((i) => [i.invoiceNumber, i.customerName, i.dueDate, i.balanceAmount])
              .toList(),
          totals: [null, null, null, a.summary.overdueAmount],
        );
      },
      builder: (context, a) {
        final overdue = a.invoices.where((i) => i.status == 'OVERDUE').toList()
          ..sort((x, y) => y.balanceAmount.compareTo(x.balanceAmount));
        if (overdue.isEmpty) {
          return _emptyState('No overdue invoices — nothing past due.');
        }
        return ListView(
          padding: const EdgeInsets.all(16),
          children: [
            _totalCard('Overdue Amount', a.summary.overdueAmount, AppTheme.danger),
            const SizedBox(height: 8),
            ...overdue.map((i) => Card(
                  child: ListTile(
                    leading: const Icon(Icons.warning_amber, color: AppTheme.danger),
                    title: Text('${i.invoiceNumber} · ${i.customerName}',
                        maxLines: 1, overflow: TextOverflow.ellipsis),
                    subtitle: Text('Due ${i.dueDate?.split('T').first ?? '—'}'),
                    trailing: Text('₹${i.balanceAmount.toStringAsFixed(0)}',
                        style: const TextStyle(color: AppTheme.danger, fontWeight: FontWeight.bold, fontSize: 16)),
                  ),
                )),
          ],
        );
      },
    );
  }
}

// ---------------------------------------------------------------- Analytics

class PaymentsAnalyticsReportScreen extends StatelessWidget {
  const PaymentsAnalyticsReportScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return _ReportScaffold(
      title: 'Payments Analytics',
      docBuilder: (a, filters) {
        final s = a.summary;
        return ReportDoc(
          title: 'Payments Analytics Report',
          filters: filters,
          columns: const [
            ReportColumn('Metric', width: 28),
            ReportColumn('Value', type: ColType.currency, width: 18),
          ],
          rows: [
            ['Total Invoiced', s.totalInvoiced],
            ['Total Collected', s.totalPaid],
            ['Outstanding', s.totalOutstanding],
            ['Overdue Amount', s.overdueAmount],
          ],
        );
      },
      builder: (context, a) {
        final s = a.summary;
        return ListView(
          padding: const EdgeInsets.all(16),
          children: [
            const Text('Overview', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
            const SizedBox(height: 8),
            GridView.extent(
              maxCrossAxisExtent: 220,
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              mainAxisSpacing: 8,
              crossAxisSpacing: 8,
              childAspectRatio: 2.2,
              children: [
                _statCard('Invoices', '${s.invoicesCount}', Colors.blueGrey),
                _statCard('Total Invoiced', '₹${s.totalInvoiced.toStringAsFixed(0)}', AppTheme.info),
                _statCard('Total Collected', '₹${s.totalPaid.toStringAsFixed(0)}', AppTheme.success),
                _statCard('Outstanding', '₹${s.totalOutstanding.toStringAsFixed(0)}', AppTheme.receivable),
                _statCard('Overdue', '₹${s.overdueAmount.toStringAsFixed(0)}', AppTheme.danger),
                _statCard('Paid / Partial / Unpaid',
                    '${s.paidCount} / ${s.partialCount} / ${s.unpaidCount}', AppTheme.textMuted),
              ],
            ),
            if (a.dayWiseCollection.isNotEmpty) ...[
              const SizedBox(height: 20),
              const Text('Recent Collections', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
              const SizedBox(height: 8),
              ...a.dayWiseCollection.take(7).map((d) => ListTile(
                    dense: true,
                    title: Text(d['date']?.toString() ?? '—'),
                    trailing: Text('₹${_num(d['amount']).toStringAsFixed(0)}'),
                  )),
            ],
            if (a.methodWiseCollection.isNotEmpty) ...[
              const SizedBox(height: 20),
              const Text('By Payment Method', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
              const SizedBox(height: 8),
              ...a.methodWiseCollection.map((m) => ListTile(
                    dense: true,
                    title: Text(m['method']?.toString() ?? '—'),
                    trailing: Text('₹${_num(m['amount']).toStringAsFixed(0)}'),
                  )),
            ],
          ],
        );
      },
    );
  }
}

// ---------------------------------------------------------------- shared bits

Widget _totalCard(String label, double value, Color color) => Card(
      color: color.withValues(alpha: 0.08),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(label, style: const TextStyle(fontWeight: FontWeight.w600)),
            Text('₹${value.toStringAsFixed(0)}',
                style: TextStyle(color: color, fontWeight: FontWeight.bold, fontSize: 20)),
          ],
        ),
      ),
    );

Widget _statCard(String title, String value, Color color) => Card(
      child: Padding(
        padding: const EdgeInsets.all(10),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Text(title, style: const TextStyle(fontSize: 11, color: Colors.grey), maxLines: 2, overflow: TextOverflow.ellipsis),
            const SizedBox(height: 2),
            Text(value, style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: color),
                maxLines: 1, overflow: TextOverflow.ellipsis),
          ],
        ),
      ),
    );
