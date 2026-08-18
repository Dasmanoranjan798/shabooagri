import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:share_plus/share_plus.dart' show Share;
import '../../../core/network/api_client.dart';
import '../../../core/network/api_error.dart';
import '../../../core/providers/session_provider.dart';
import '../../../core/widgets/app_drawer.dart';
import '../../../core/widgets/search_field.dart';

/// No offline table exists for invoices (Stage 2's offline layer never
/// covered Payments/Invoices) — this is a live-only screen, same pattern as
/// the Farmer portal's read-only invoice list, just company-wide in scope
/// here since `GET /invoices` is scoped server-side per caller role
/// (all company invoices for Owner/Manager, own only for a Farmer).
class InvoiceSummary {
  final String id;
  final String invoiceNumber;
  final String status;
  final double totalAmount;
  final double paidAmount;
  final double balanceAmount;
  final String invoiceDate;
  final String customerName;
  final String villageName;

  InvoiceSummary.fromJson(Map<String, dynamic> json)
      : id = json['id'] as String,
        invoiceNumber = json['invoiceNumber'] as String,
        status = json['status'] as String,
        totalAmount = (json['totalAmount'] as num).toDouble(),
        paidAmount = (json['paidAmount'] as num).toDouble(),
        balanceAmount = (json['balanceAmount'] as num).toDouble(),
        invoiceDate = json['invoiceDate'] as String,
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
        amount = (json['amount'] as num).toDouble(),
        appliedAmount = (json['appliedAmount'] as num?)?.toDouble() ?? 0,
        paymentMethod = json['paymentMethod'] as String,
        receivedAt = json['receivedAt'] as String,
        notes = json['notes'] as String?,
        referenceNumber = json['referenceNumber'] as String?;

  double get balance => amount - appliedAmount;
}

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

enum _StatusFilter { all, unpaid, partiallyPaid, paid, voided }

class PaymentListScreen extends ConsumerStatefulWidget {
  const PaymentListScreen({super.key});

  @override
  ConsumerState<PaymentListScreen> createState() => _PaymentListScreenState();
}

class _PaymentListScreenState extends ConsumerState<PaymentListScreen> {
  String _query = '';
  _StatusFilter _filter = _StatusFilter.all;

  Future<void> _exportCsv(List<InvoiceSummary> invoices) async {
    final buffer = StringBuffer('Invoice Number,Customer,Village,Total,Paid,Balance,Status,Date\n');
    for (final i in invoices) {
      buffer.writeln(
          '${i.invoiceNumber},${i.customerName},${i.villageName},${i.totalAmount.toStringAsFixed(2)},${i.paidAmount.toStringAsFixed(2)},${i.balanceAmount.toStringAsFixed(2)},${i.status},${i.invoiceDate.split('T').first}');
    }
    await Share.share(buffer.toString(), subject: 'ShabooAgri Payments Export');
  }

  bool _matchesFilter(InvoiceSummary inv, _StatusFilter filter) {
    switch (filter) {
      case _StatusFilter.all:
        return true;
      case _StatusFilter.unpaid:
        return inv.status == 'UNPAID';
      case _StatusFilter.partiallyPaid:
        return inv.status == 'PARTIALLY_PAID';
      case _StatusFilter.paid:
        return inv.status == 'PAID';
      case _StatusFilter.voided:
        return inv.status == 'VOIDED';
    }
  }

  @override
  Widget build(BuildContext context) {
    final invoicesAsync = ref.watch(invoicesListProvider);
    final advancesAsync = ref.watch(advancesListProvider);
    final user = ref.watch(currentUserProvider);
    final canReceive = user?.isOwnerOrManager ?? false;

    return Scaffold(
      drawer: const AppDrawer(currentRoute: '/payments'),
      appBar: AppBar(
        title: const Text('Payments'),
        actions: [
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
            onPressed: () => invoicesAsync.whenData(_exportCsv),
          ),
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () {
              ref.invalidate(invoicesListProvider);
              ref.invalidate(advancesListProvider);
            },
          ),
        ],
      ),
      body: invoicesAsync.when(
        data: (invoices) {
          final counts = {for (final f in _StatusFilter.values) f: invoices.where((i) => _matchesFilter(i, f)).length};
          var filtered = invoices.where((i) => _matchesFilter(i, _filter)).toList();
          if (_query.isNotEmpty) {
            filtered = filtered
                .where((i) =>
                    i.invoiceNumber.toLowerCase().contains(_query) ||
                    i.customerName.toLowerCase().contains(_query) ||
                    i.villageName.toLowerCase().contains(_query))
                .toList();
          }
          final totalReceivables = invoices.fold<double>(0, (s, i) => s + i.totalAmount);
          final totalCollected = invoices.fold<double>(0, (s, i) => s + i.paidAmount);
          final outstandingBalance = invoices.fold<double>(0, (s, i) => s + i.balanceAmount);
          final advanceBalance = advancesAsync.valueOrNull?.fold<double>(0, (s, a) => s + a.balance) ?? 0;

          return RefreshIndicator(
            onRefresh: () async {
              ref.invalidate(invoicesListProvider);
              ref.invalidate(advancesListProvider);
            },
            child: ListView(
              children: [
                Padding(
                  padding: const EdgeInsets.all(12.0),
                  child: GridView.count(
                    crossAxisCount: 2,
                    shrinkWrap: true,
                    physics: const NeverScrollableScrollPhysics(),
                    mainAxisSpacing: 8,
                    crossAxisSpacing: 8,
                    childAspectRatio: 2.2,
                    children: [
                      _kpiCard('Total Invoices', '${invoices.length}', Colors.blueGrey),
                      _kpiCard('Total Receivables', '₹${totalReceivables.toStringAsFixed(0)}', Colors.blue),
                      _kpiCard('Total Collected', '₹${totalCollected.toStringAsFixed(0)}', Colors.green),
                      _kpiCard('Outstanding Balance', '₹${outstandingBalance.toStringAsFixed(0)}',
                          outstandingBalance > 0 ? Colors.red : Colors.green),
                      _kpiCard('Advance Balance', '₹${advanceBalance.toStringAsFixed(0)}', Colors.purple),
                    ],
                  ),
                ),
                SearchField(
                  hintText: 'Search Invoice #, Customer, Village...',
                  onChanged: (value) => setState(() => _query = value.trim().toLowerCase()),
                ),
                FilterTabsRow<_StatusFilter>(
                  selected: _filter,
                  onSelected: (f) => setState(() => _filter = f),
                  tabs: [
                    (_StatusFilter.all, 'All', counts[_StatusFilter.all]!),
                    (_StatusFilter.unpaid, 'Unpaid', counts[_StatusFilter.unpaid]!),
                    (_StatusFilter.partiallyPaid, 'Partially Paid', counts[_StatusFilter.partiallyPaid]!),
                    (_StatusFilter.paid, 'Paid', counts[_StatusFilter.paid]!),
                    (_StatusFilter.voided, 'Voided', counts[_StatusFilter.voided]!),
                  ],
                ),
                if (filtered.isEmpty)
                  const Padding(padding: EdgeInsets.all(24), child: Center(child: Text('No invoices match this view.')))
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
                          const Text('Money on file that isn\'t tied to an invoice yet.',
                              style: TextStyle(fontSize: 12, color: Colors.grey)),
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

  Widget _kpiCard(String title, String value, Color color) {
    return Card(
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
    );
  }
}
