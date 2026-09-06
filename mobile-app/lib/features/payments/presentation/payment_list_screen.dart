import 'package:flutter/material.dart';
import 'package:shabooagri_mobile/core/sync/data_sync.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../core/layout/responsive.dart';
import '../../../core/network/api_client.dart';
import '../../../core/network/api_error.dart';
import '../../../core/providers/session_provider.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/widgets/adaptive_scaffold.dart';
import '../../../core/widgets/search_field.dart';
import '../../reports/presentation/report_export.dart';
import '../data/invoice_analysis.dart';
import 'payment_filters.dart';
import 'payment_list_screen_provider.dart';
import 'widgets/payment_filters_dialog.dart';
import 'widgets/payment_filters_desktop_dialog.dart';

/// Invoice payment-status chip (§ clear payment status). UNPAID/OVERDUE = red;
/// partial = amber; paid = green; cancelled = muted.
Widget _invoiceStatusChip(String status) {
  final (Color color, String label) = switch (status) {
    'PAID' => (AppTheme.success, 'Paid'),
    'PARTIALLY_PAID' => (AppTheme.warning, 'Partial'),
    'OVERDUE' => (AppTheme.danger, 'Overdue'),
    'CANCELLED' => (AppTheme.textMuted, 'Cancelled'),
    _ => (AppTheme.danger, 'Unpaid'),
  };
  return Container(
    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
    decoration: BoxDecoration(color: color.withValues(alpha: 0.12), borderRadius: BorderRadius.circular(6)),
    child: Text(label, style: TextStyle(color: color, fontSize: 11, fontWeight: FontWeight.bold)),
  );
}

class InvoiceSummary {
  final String id;
  final String invoiceNumber;
  final String status;
  final double totalAmount;
  final double paidAmount;
  final double balanceAmount;
  final String invoiceDate;
  final String? dueDate;
  final String customerName;
  final String villageName;
  // A manual/"Direct Invoice" has no booking (bookingId == null); a job-
  // generated "After-Work" invoice is tied to a booking. Derived from the
  // already-returned field — no API change. Powers the Invoice workspace tabs.
  final bool isDirect;

  InvoiceSummary.fromJson(Map<String, dynamic> json)
      : id = json['id'] as String,
        invoiceNumber = json['invoiceNumber'] as String,
        status = json['status'] as String,
        totalAmount = double.tryParse(json['totalAmount'].toString()) ?? 0.0,
        paidAmount = double.tryParse(json['paidAmount'].toString()) ?? 0.0,
        balanceAmount = double.tryParse(json['balanceAmount'].toString()) ?? 0.0,
        invoiceDate = json['invoiceDate'] as String,
        dueDate = json['dueDate'] as String?,
        customerName = (json['customer'] as Map<String, dynamic>?)?['name'] as String? ?? 'Unknown',
        villageName = (json['customer'] as Map<String, dynamic>?)?['village'] as String? ?? '—',
        isDirect = json['bookingId'] == null;
}

// Keep original provider for Farmer app etc if needed
final invoicesListProvider = FutureProvider<List<InvoiceSummary>>((ref) async {
  syncOn(ref, {SyncEntity.invoice, SyncEntity.payment});
  final dio = ref.watch(apiClientProvider);
  final response = await dio.get('/invoices');
  return (response.data as List<dynamic>)
      .map((json) => InvoiceSummary.fromJson(json as Map<String, dynamic>))
      .toList();
});

// NOTE: There is no standalone "Customer Advances" list/screen. Advance/credit
// is created only automatically when a Payment In exceeds the customer's
// outstanding (see backend payment.repository); the resulting available credit
// is surfaced on the customer (list card + detail), not as a separate feature.

class PaymentListScreen extends ConsumerStatefulWidget {
  final List<String>? initialStatuses;
  const PaymentListScreen({super.key, this.initialStatuses});

  @override
  ConsumerState<PaymentListScreen> createState() => _PaymentListScreenState();
}

class _PaymentListScreenState extends ConsumerState<PaymentListScreen> {
  String _query = '';

  @override
  void initState() {
    super.initState();
    if (widget.initialStatuses != null && widget.initialStatuses!.isNotEmpty) {
      Future.microtask(() {
        final current = ref.read(paymentFilterProvider);
        ref.read(paymentFilterProvider.notifier).updateFilter(current.copyWith(status: widget.initialStatuses!));
      });
    }
  }

  /// Invoices after the on-screen search — the same list the table shows.
  List<InvoiceSummary> _filteredInvoices(InvoiceAnalysisResponse analysis) {
    if (_query.isEmpty) return analysis.invoices;
    return analysis.invoices
        .where((i) =>
            i.invoiceNumber.toLowerCase().contains(_query) ||
            i.customerName.toLowerCase().contains(_query) ||
            i.villageName.toLowerCase().contains(_query))
        .toList();
  }

  ReportDoc _buildDoc(InvoiceAnalysisResponse analysis) {
    final rows = _filteredInvoices(analysis);
    return ReportDoc(
      title: 'Payments / Transactions Report',
      filters: [
        ...appliedPaymentFilters(ref.read(paymentFilterProvider)),
        if (_query.isNotEmpty) ('Search', _query),
      ],
      columns: const [
        ReportColumn('Invoice', width: 14),
        ReportColumn('Customer', width: 22),
        ReportColumn('Village', width: 14),
        ReportColumn('Date', type: ColType.date, width: 14),
        ReportColumn('Due', type: ColType.date, width: 14),
        ReportColumn('Total', type: ColType.currency, width: 15),
        ReportColumn('Paid', type: ColType.currency, width: 15),
        ReportColumn('Balance', type: ColType.currency, width: 15),
        ReportColumn('Status', width: 12),
      ],
      rows: rows
          .map((i) => [
                i.invoiceNumber,
                i.customerName,
                i.villageName,
                i.invoiceDate,
                i.dueDate,
                i.totalAmount,
                i.paidAmount,
                i.balanceAmount,
                i.status,
              ])
          .toList(),
      totals: [
        null, null, null, null, null,
        rows.fold<double>(0, (s, i) => s + i.totalAmount),
        rows.fold<double>(0, (s, i) => s + i.paidAmount),
        rows.fold<double>(0, (s, i) => s + i.balanceAmount),
        null,
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    final analysisAsync = ref.watch(invoicesAnalysisProvider);
    final user = ref.watch(currentUserProvider);
    final filterState = ref.watch(paymentFilterProvider);
    final canReceive = user?.isOwnerOrManager ?? false;
    final isDesktop = context.responsive.isDesktop;

    return AdaptiveScaffold(
      currentRoute: '/payments',
      title: 'Payments',
      actions: [
        IconButton(
          icon: const Icon(Icons.filter_list),
          tooltip: 'Advanced Filters',
          onPressed: () {
            // Desktop: a centred filter dialog (mouse/keyboard). Phone: the
            // existing modal bottom sheet, unchanged. Both drive the same
            // paymentFilterProvider with identical filters + apply/clear.
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
        if (canReceive)
          IconButton(
            icon: const Icon(Icons.receipt_long),
            tooltip: 'New Invoice',
            onPressed: () => context.go('/payments/invoice/new'),
          ),
        // Shortcut into the canonical Reports section (Payments & Collections);
        // opens the same authoritative reports — no report lives here anymore.
        IconButton(
          icon: const Icon(Icons.insights),
          tooltip: 'Payment reports',
          onPressed: () => context.go('/reports'),
        ),
        ReportExportMenu(docBuilder: () {
          final a = analysisAsync.valueOrNull;
          return a == null ? null : _buildDoc(a);
        }),
        IconButton(
          icon: const Icon(Icons.refresh),
          onPressed: () {
            ref.invalidate(invoicesAnalysisProvider);
          },
        ),
      ],
      body: analysisAsync.when(
        data: (analysis) {
          final filtered = _filteredInvoices(analysis);
          bool hasFilter = filterState.toJson().isNotEmpty;

          return RefreshIndicator(
            onRefresh: () async {
              ref.invalidate(invoicesAnalysisProvider);
            },
            child: ListView(
              children: [
                if (hasFilter)
                   Container(
                     padding: const EdgeInsets.all(8),
                     color: Colors.amber.shade100,
                     child: Row(
                       mainAxisAlignment: MainAxisAlignment.spaceBetween,
                       children: [
                         const Text('Filters Applied', style: TextStyle(fontWeight: FontWeight.bold)),
                         TextButton(
                           onPressed: () => ref.read(paymentFilterProvider.notifier).clearFilters(),
                           child: const Text('Clear Filters'),
                         )
                       ]
                     ),
                   ),
                Padding(
                  padding: const EdgeInsets.all(12.0),
                  child: GridView.extent(
                    maxCrossAxisExtent: isDesktop ? 260 : 220,
                    shrinkWrap: true,
                    physics: const NeverScrollableScrollPhysics(),
                    mainAxisSpacing: 8,
                    crossAxisSpacing: 8,
                    childAspectRatio: 2.2,
                    children: [
                      _kpiCard('Filtered Invoices', '${analysis.summary.invoicesCount}', Colors.blueGrey),
                      _kpiCard('Total Invoiced', '₹${analysis.summary.totalInvoiced.toStringAsFixed(0)}', Colors.blue, onTap: () => ref.read(paymentFilterProvider.notifier).updateFilter(ref.read(paymentFilterProvider).copyWith(status: []))),
                      // Collected + Outstanding are money to RECEIVE → green.
                      _kpiCard('Total Collected', '₹${analysis.summary.totalPaid.toStringAsFixed(0)}', AppTheme.success, onTap: () => ref.read(paymentFilterProvider.notifier).updateFilter(ref.read(paymentFilterProvider).copyWith(status: ['PAID']))),
                      _kpiCard('Outstanding', '₹${analysis.summary.totalOutstanding.toStringAsFixed(0)}',
                          onTap: () => ref.read(paymentFilterProvider.notifier).updateFilter(ref.read(paymentFilterProvider).copyWith(status: ['UNPAID', 'PARTIALLY_PAID'])),
                          AppTheme.receivable),
                      // Overdue is a problem flag (not the money-direction rule) → red.
                      _kpiCard('Overdue Amount', '₹${analysis.summary.overdueAmount.toStringAsFixed(0)}', AppTheme.danger, onTap: () => ref.read(paymentFilterProvider.notifier).updateFilter(ref.read(paymentFilterProvider).copyWith(status: ['OVERDUE']))),
                    ],
                  ),
                ),
                SearchField(
                  hintText: 'Search Invoice #, Customer, Village...',
                  onChanged: (value) => setState(() => _query = value.trim().toLowerCase()),
                ),
                if (filtered.isEmpty)
                  const Padding(padding: EdgeInsets.all(24), child: Center(child: Text('No invoices match this view.')))
                else if (isDesktop)
                  _desktopInvoiceTable(context, filtered, canReceive: canReceive)
                else
                  ...filtered.map((invoice) => Card(
                        margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                        child: ListTile(
                          title: Text('${invoice.invoiceNumber} · ${invoice.customerName}',
                              maxLines: 1, overflow: TextOverflow.ellipsis),
                          subtitle: Row(
                            children: [
                              _invoiceStatusChip(invoice.status),
                              const SizedBox(width: 8),
                              Text(invoice.invoiceDate.split('T').first,
                                  style: const TextStyle(fontSize: 12, color: AppTheme.textMuted)),
                            ],
                          ),
                          onTap: () => context.go('/payments/${invoice.id}'),
                          trailing: canReceive && invoice.balanceAmount > 0 && invoice.status != 'CANCELLED'
                              ? TextButton(
                                  onPressed: () => context.go('/payments/${invoice.id}'),
                                  child: Text('Receive\n₹${invoice.balanceAmount.toStringAsFixed(0)}',
                                      textAlign: TextAlign.center, style: const TextStyle(fontSize: 11)),
                                )
                              // Balance due is a RECEIVABLE (money to collect) →
                              // GREEN (§20); the red UNPAID chip carries status.
                              : Text(
                                  invoice.balanceAmount > 0 ? 'Due ₹${invoice.balanceAmount.toStringAsFixed(0)}' : 'Paid',
                                  style: TextStyle(
                                    color: invoice.balanceAmount > 0 ? AppTheme.receivable : AppTheme.textMuted,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                        ),
                      )),

                // Reports (Payment Methods, Customer Outstanding, Day-wise
                // Collections, Overdue, Analytics) now live on their own routes
                // under Payments — reachable from the side menu's expandable
                // Payments section — instead of being stacked here at the bottom
                // of the transaction list.
              ],
            ),
          );
        },
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, stack) => Center(child: Text('Error: ${apiErrorMessage(error)}')),
      ),
    );
  }

  /// Desktop presentation of the invoices list: a proper data grid. Lives
  /// inside the page's own vertical [ListView], so it manages only horizontal
  /// scroll (the DataTable has intrinsic height) — no nested vertical scroll.
  /// Same row navigation + same Receive action + same RBAC as the phone list.
  Widget _desktopInvoiceTable(BuildContext context, List<InvoiceSummary> invoices, {required bool canReceive}) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 8),
      child: Card(
        clipBehavior: Clip.antiAlias,
        child: SingleChildScrollView(
          scrollDirection: Axis.horizontal,
          child: ConstrainedBox(
            constraints: BoxConstraints(
              minWidth: (MediaQuery.sizeOf(context).width - Breakpoints.sidebarWidth - 96).clamp(0, double.infinity),
            ),
            child: DataTable(
              headingRowColor: WidgetStateProperty.all(Theme.of(context).colorScheme.surfaceContainerHighest),
              showCheckboxColumn: false,
              columns: const [
                DataColumn(label: Text('Invoice #')),
                DataColumn(label: Text('Customer')),
                DataColumn(label: Text('Village')),
                DataColumn(label: Text('Status')),
                DataColumn(label: Text('Date')),
                DataColumn(label: Text('Total'), numeric: true),
                DataColumn(label: Text('Balance'), numeric: true),
                DataColumn(label: Text('Action')),
              ],
              rows: [
                for (final i in invoices)
                  DataRow(
                    onSelectChanged: (_) => context.go('/payments/${i.id}'),
                    cells: [
                      DataCell(Text(i.invoiceNumber, style: const TextStyle(fontWeight: FontWeight.w600))),
                      DataCell(Text(i.customerName)),
                      DataCell(Text(i.villageName)),
                      DataCell(Text(i.status)),
                      DataCell(Text(i.invoiceDate.split('T').first)),
                      DataCell(Text('₹${i.totalAmount.toStringAsFixed(0)}')),
                      // Balance = receivable → GREEN when due (§20).
                      DataCell(Text(
                        i.balanceAmount > 0 ? '₹${i.balanceAmount.toStringAsFixed(0)}' : 'Paid',
                        style: TextStyle(
                          color: i.balanceAmount > 0 ? AppTheme.receivable : AppTheme.textMuted,
                          fontWeight: FontWeight.bold,
                        ),
                      )),
                      DataCell(
                        canReceive && i.balanceAmount > 0 && i.status != 'CANCELLED'
                            ? FilledButton.tonal(
                                onPressed: () => context.go('/payments/${i.id}'),
                                child: const Text('Receive'),
                              )
                            : const Text('—'),
                      ),
                    ],
                  ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _kpiCard(String title, String value, Color color, {VoidCallback? onTap}) {
    return Card(
      child: InkWell(
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.all(10.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Text(title, style: const TextStyle(fontSize: 11, color: Colors.grey)),
              const SizedBox(height: 2),
              Text(value, style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: color)),
            ],
          ),
        ),
      ),
    );
  }
}
