import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:share_plus/share_plus.dart' show Share;
import '../../../core/layout/responsive.dart';
import '../../../core/network/api_client.dart';
import '../../../core/network/api_error.dart';
import '../../../core/providers/session_provider.dart';
import '../../../core/widgets/adaptive_scaffold.dart';
import '../../../core/widgets/search_field.dart';
import '../data/invoice_analysis.dart';
import 'payment_list_screen_provider.dart';
import 'widgets/payment_filters_dialog.dart';
import 'widgets/payment_filters_desktop_dialog.dart';

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
        villageName = (json['customer'] as Map<String, dynamic>?)?['village']?['name'] as String? ?? '—';
}

class AdvanceSummary {
  final String customerName;
  final double amount;
  final double appliedAmount;
  final String paymentMethod;
  final String receivedAt;
  final String? notes;
  final String? referenceNumber;

  AdvanceSummary.fromJson(Map<String, dynamic> json)
      : customerName = (json['customer'] as Map<String, dynamic>?)?['name'] as String? ?? 'Unknown',
        amount = double.tryParse(json['amount'].toString()) ?? 0.0,
        appliedAmount = double.tryParse(json['appliedAmount']?.toString() ?? '0') ?? 0.0,
        paymentMethod = json['paymentMethod'] as String,
        receivedAt = json['receivedAt'] as String,
        notes = json['notes'] as String?,
        referenceNumber = json['referenceNumber'] as String?;

  double get balance => amount - appliedAmount;
}

// Keep original provider for Farmer app etc if needed
final invoicesListProvider = FutureProvider<List<InvoiceSummary>>((ref) async {
  final dio = ref.watch(apiClientProvider);
  final response = await dio.get('/invoices');
  return (response.data as List<dynamic>)
      .map((json) => InvoiceSummary.fromJson(json as Map<String, dynamic>))
      .toList();
});

final advancesListProvider = FutureProvider<List<AdvanceSummary>>((ref) async {
  final dio = ref.watch(apiClientProvider);
  final response = await dio.get('/payments/advances');
  return (response.data as List<dynamic>).map((j) => AdvanceSummary.fromJson(j as Map<String, dynamic>)).toList();
});

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

  Future<void> _exportCsv(InvoiceAnalysisResponse analysis) async {
    final buffer = StringBuffer();
    // Export Summary
    buffer.writeln('PAYMENT OUTSTANDING REPORT');
    buffer.writeln('Invoices:,${analysis.summary.invoicesCount}');
    buffer.writeln('Total Invoiced:,₹${analysis.summary.totalInvoiced.toStringAsFixed(2)}');
    buffer.writeln('Total Paid:,₹${analysis.summary.totalPaid.toStringAsFixed(2)}');
    buffer.writeln('Outstanding:,₹${analysis.summary.totalOutstanding.toStringAsFixed(2)}');
    buffer.writeln('Overdue Amount:,₹${analysis.summary.overdueAmount.toStringAsFixed(2)}');
    buffer.writeln();

    // Details
    buffer.writeln('Invoice Number,Customer,Village,Total,Paid,Balance,Status,Date,Due Date,Days Overdue');
    for (final i in analysis.invoices) {
      int daysOverdue = 0;
      if (i.dueDate != null && i.balanceAmount > 0) {
        final d = DateTime.parse(i.dueDate!);
        daysOverdue = DateTime.now().difference(d).inDays;
      }
      buffer.writeln(
          '${i.invoiceNumber},${i.customerName},${i.villageName},${i.totalAmount.toStringAsFixed(2)},${i.paidAmount.toStringAsFixed(2)},${i.balanceAmount.toStringAsFixed(2)},${i.status},${i.invoiceDate.split('T').first},${i.dueDate?.split('T').first ?? ''},$daysOverdue');
    }
    await Share.share(buffer.toString(), subject: 'ShabooAgri Payments Export');
  }

  @override
  Widget build(BuildContext context) {
    final analysisAsync = ref.watch(invoicesAnalysisProvider);
    final advancesAsync = ref.watch(advancesListProvider);
    final user = ref.watch(currentUserProvider);
    final filterState = ref.watch(paymentFilterProvider);
    final canReceive = user?.isOwnerOrManager ?? false;
    final isDesktop = context.responsive.isDesktop;

    return AdaptiveScaffold(
      currentRoute: '/payments',
      title: 'Payments Analysis',
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
            icon: const Icon(Icons.savings),
            tooltip: 'Record Advance',
            onPressed: () => context.go('/payments/advance/new'),
          ),
        if (canReceive)
          IconButton(
            icon: const Icon(Icons.receipt_long),
            tooltip: 'New Invoice',
            onPressed: () => context.go('/payments/invoice/new'),
          ),
        IconButton(
          icon: const Icon(Icons.ios_share),
          tooltip: 'Export CSV',
          onPressed: () => analysisAsync.whenData(_exportCsv),
        ),
        IconButton(
          icon: const Icon(Icons.refresh),
          onPressed: () {
            ref.invalidate(invoicesAnalysisProvider);
            ref.invalidate(advancesListProvider);
          },
        ),
      ],
      body: analysisAsync.when(
        data: (analysis) {
          var filtered = analysis.invoices;
          if (_query.isNotEmpty) {
            filtered = filtered
                .where((i) =>
                    i.invoiceNumber.toLowerCase().contains(_query) ||
                    i.customerName.toLowerCase().contains(_query) ||
                    i.villageName.toLowerCase().contains(_query))
                .toList();
          }

          bool hasFilter = filterState.toJson().isNotEmpty;

          return RefreshIndicator(
            onRefresh: () async {
              ref.invalidate(invoicesAnalysisProvider);
              ref.invalidate(advancesListProvider);
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
                      _kpiCard('Total Collected', '₹${analysis.summary.totalPaid.toStringAsFixed(0)}', Colors.green, onTap: () => ref.read(paymentFilterProvider.notifier).updateFilter(ref.read(paymentFilterProvider).copyWith(status: ['PAID']))),
                      _kpiCard('Outstanding', '₹${analysis.summary.totalOutstanding.toStringAsFixed(0)}',
                          onTap: () => ref.read(paymentFilterProvider.notifier).updateFilter(ref.read(paymentFilterProvider).copyWith(status: ['UNPAID', 'PARTIALLY_PAID'])),
                          analysis.summary.totalOutstanding > 0 ? Colors.red : Colors.green),
                      _kpiCard('Overdue Amount', '₹${analysis.summary.overdueAmount.toStringAsFixed(0)}', Colors.redAccent, onTap: () => ref.read(paymentFilterProvider.notifier).updateFilter(ref.read(paymentFilterProvider).copyWith(status: ['OVERDUE']))),
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
                          title: Text('${invoice.invoiceNumber} · ${invoice.customerName}'),
                          subtitle: Text('${invoice.status} · ${invoice.invoiceDate.split('T').first}'),
                          onTap: () => context.go('/payments/${invoice.id}'),
                          trailing: canReceive && invoice.balanceAmount > 0 && invoice.status != 'VOIDED'
                              ? TextButton(
                                  onPressed: () => context.go('/payments/${invoice.id}'),
                                  child: Text('Receive\n₹${invoice.balanceAmount.toStringAsFixed(0)}',
                                      textAlign: TextAlign.center, style: const TextStyle(fontSize: 11)),
                                )
                              : Text(
                                  invoice.balanceAmount > 0 ? 'Due ₹${invoice.balanceAmount.toStringAsFixed(0)}' : 'Paid',
                                  style: TextStyle(
                                    color: invoice.balanceAmount > 0 ? Colors.red : Colors.green,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                        ),
                      )),

                // Analytics Section
                const Padding(
                  padding: EdgeInsets.all(16.0),
                  child: Text('Analytics', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                ),
                if (analysis.dayWiseCollection.isNotEmpty) ...[
                   const ListTile(title: Text('Day-wise Collection', style: TextStyle(fontWeight: FontWeight.bold))),
                   ...analysis.dayWiseCollection.map((d) => ListTile(
                     title: Text(d['date']),
                     trailing: Text('₹${(double.tryParse(d['amount'].toString()) ?? 0.0).toStringAsFixed(0)}'),
                   )),
                ],
                if (analysis.methodWiseCollection.isNotEmpty) ...[
                   const ListTile(title: Text('Payment Methods', style: TextStyle(fontWeight: FontWeight.bold))),
                   ...analysis.methodWiseCollection.map((m) => ListTile(
                     title: Text(m['method']),
                     trailing: Text('₹${(double.tryParse(m['amount'].toString()) ?? 0.0).toStringAsFixed(0)}'),
                   )),
                ],
                if (analysis.customerWise.isNotEmpty) ...[
                   const ListTile(title: Text('Customer Outstanding', style: TextStyle(fontWeight: FontWeight.bold))),
                   ...analysis.customerWise.map((c) => ListTile(
                     title: Text(c['name']),
                     subtitle: Text('Invoiced: ₹${c['invoiced']} | Paid: ₹${c['paid']}'),
                     trailing: Text('₹${(double.tryParse(c['outstanding'].toString()) ?? 0.0).toStringAsFixed(0)}', style: TextStyle(color: c['outstanding'] > 0 ? Colors.red : Colors.green)),
                   )),
                ],

                advancesAsync.when(
                  data: (advances) {
                    if (advances.isEmpty) return const SizedBox.shrink();
                    return Padding(
                      padding: const EdgeInsets.all(16.0),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Divider(),
                          const Text('Customer Advances', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                          const SizedBox(height: 8),
                          ...advances.map((a) => Card(
                                child: ListTile(
                                  title: Text(a.customerName),
                                  subtitle: Text('${a.paymentMethod} · ${a.receivedAt.split('T').first}'),
                                  trailing: Text('₹${a.balance.toStringAsFixed(0)}',
                                      style: const TextStyle(fontWeight: FontWeight.bold)),
                                ),
                              )),
                        ],
                      ),
                    );
                  },
                  loading: () => const SizedBox.shrink(),
                  error: (e, s) => const SizedBox.shrink(),
                ),
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
                      DataCell(Text(
                        i.balanceAmount > 0 ? '₹${i.balanceAmount.toStringAsFixed(0)}' : 'Paid',
                        style: TextStyle(
                          color: i.balanceAmount > 0 ? Colors.red : Colors.green,
                          fontWeight: FontWeight.bold,
                        ),
                      )),
                      DataCell(
                        canReceive && i.balanceAmount > 0 && i.status != 'VOIDED'
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
