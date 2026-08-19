import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../../core/network/api_error.dart';
import '../data/farmer_models.dart';

enum _InvoiceFilter { all, unpaid, partial, paid }

Color _invoiceStatusColor(String status) {
  switch (status) {
    case 'PAID':
      return const Color(0xFF16A34A);
    case 'PARTIALLY_PAID':
      return const Color(0xFFF59E0B);
    case 'UNPAID':
      return const Color(0xFFDC2626);
    default:
      return const Color(0xFF2563EB);
  }
}

String _invoiceStatusLabel(String status) {
  switch (status) {
    case 'PAID':
      return 'Paid';
    case 'PARTIALLY_PAID':
      return 'Partial';
    case 'UNPAID':
      return 'Unpaid';
    default:
      return status;
  }
}

/// Matches `FarmerInvoicesPage.tsx`: summary KPI row (Total Invoices/Total
/// Paid/Balance Due), filter chips with counts (All/Unpaid/Partial/Paid),
/// expandable cards (Total/Paid/Balance/Booking/Due Date).
class FarmerInvoicesScreen extends ConsumerStatefulWidget {
  const FarmerInvoicesScreen({super.key});

  @override
  ConsumerState<FarmerInvoicesScreen> createState() => _FarmerInvoicesScreenState();
}

class _FarmerInvoicesScreenState extends ConsumerState<FarmerInvoicesScreen> {
  _InvoiceFilter _filter = _InvoiceFilter.all;
  String? _expandedId;

  bool _matches(String status, _InvoiceFilter filter) {
    switch (filter) {
      case _InvoiceFilter.all:
        return true;
      case _InvoiceFilter.unpaid:
        return status == 'UNPAID';
      case _InvoiceFilter.partial:
        return status == 'PARTIALLY_PAID';
      case _InvoiceFilter.paid:
        return status == 'PAID';
    }
  }

  @override
  Widget build(BuildContext context) {
    final invoicesAsync = ref.watch(farmerInvoicesProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('My Invoices'),
        actions: [IconButton(icon: const Icon(Icons.refresh), onPressed: () => ref.invalidate(farmerInvoicesProvider))],
      ),
      body: invoicesAsync.when(
        data: (invoices) {
          final filtered = invoices.where((i) => _matches(i.status, _filter)).toList()
            ..sort((a, b) => b.createdAt.compareTo(a.createdAt));
          final totalPaid = invoices.fold<double>(0, (acc, i) => acc + i.paidAmount);
          final totalBalance = invoices.fold<double>(0, (acc, i) => acc + i.balanceAmount);
          final counts = {
            for (final f in _InvoiceFilter.values)
              f: f == _InvoiceFilter.all ? invoices.length : invoices.where((i) => _matches(i.status, f)).length,
          };

          return Column(
            children: [
              Padding(
                padding: const EdgeInsets.fromLTRB(12, 12, 12, 0),
                child: Row(children: [
                  Expanded(child: _kpiCard('Total Invoices', '${invoices.length}')),
                  const SizedBox(width: 10),
                  Expanded(child: _kpiCard('Total Paid', '₹${totalPaid.toStringAsFixed(0)}')),
                  const SizedBox(width: 10),
                  Expanded(child: _kpiCard('Balance Due', '₹${totalBalance.toStringAsFixed(0)}', alert: totalBalance > 0)),
                ]),
              ),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                child: Wrap(
                  spacing: 8,
                  children: [
                    ChoiceChip(label: Text('All (${counts[_InvoiceFilter.all]})'), selected: _filter == _InvoiceFilter.all, onSelected: (_) => setState(() => _filter = _InvoiceFilter.all)),
                    ChoiceChip(
                        label: Text('Unpaid (${counts[_InvoiceFilter.unpaid]})'),
                        selected: _filter == _InvoiceFilter.unpaid,
                        onSelected: (_) => setState(() => _filter = _InvoiceFilter.unpaid)),
                    ChoiceChip(
                        label: Text('Partial (${counts[_InvoiceFilter.partial]})'),
                        selected: _filter == _InvoiceFilter.partial,
                        onSelected: (_) => setState(() => _filter = _InvoiceFilter.partial)),
                    ChoiceChip(label: Text('Paid (${counts[_InvoiceFilter.paid]})'), selected: _filter == _InvoiceFilter.paid, onSelected: (_) => setState(() => _filter = _InvoiceFilter.paid)),
                  ],
                ),
              ),
              Expanded(
                child: filtered.isEmpty
                    ? const Center(child: Text('No invoices found'))
                    : ListView.builder(
                        padding: const EdgeInsets.symmetric(horizontal: 12),
                        itemCount: filtered.length,
                        itemBuilder: (context, index) {
                          final inv = filtered[index];
                          final expanded = _expandedId == inv.id;
                          final color = _invoiceStatusColor(inv.status);

                          return Card(
                            margin: const EdgeInsets.only(bottom: 10),
                            child: Column(
                              children: [
                                InkWell(
                                  onTap: () => setState(() => _expandedId = expanded ? null : inv.id),
                                  child: Padding(
                                    padding: const EdgeInsets.all(14.0),
                                    child: Row(
                                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                      children: [
                                        Column(
                                          crossAxisAlignment: CrossAxisAlignment.start,
                                          children: [
                                            Text(inv.invoiceNumber, style: const TextStyle(fontWeight: FontWeight.bold)),
                                            Text(DateFormat('d MMM yyyy').format(inv.createdAt), style: const TextStyle(color: Colors.grey, fontSize: 12)),
                                          ],
                                        ),
                                        Column(
                                          crossAxisAlignment: CrossAxisAlignment.end,
                                          children: [
                                            Container(
                                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                              decoration: BoxDecoration(color: color.withValues(alpha: 0.12), borderRadius: BorderRadius.circular(12)),
                                              child: Text(_invoiceStatusLabel(inv.status), style: TextStyle(color: color, fontSize: 11, fontWeight: FontWeight.bold)),
                                            ),
                                            const SizedBox(height: 2),
                                            Text('₹${inv.totalAmount.toStringAsFixed(0)}',
                                                style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: inv.balanceAmount > 0 ? Colors.red : Colors.green)),
                                          ],
                                        ),
                                      ],
                                    ),
                                  ),
                                ),
                                if (expanded)
                                  Padding(
                                    padding: const EdgeInsets.fromLTRB(14, 0, 14, 14),
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        const Divider(),
                                        Wrap(
                                          spacing: 20,
                                          runSpacing: 10,
                                          children: [
                                            _detailItem('Total Amount', '₹${inv.totalAmount.toStringAsFixed(2)}'),
                                            _detailItem('Paid', '₹${inv.paidAmount.toStringAsFixed(2)}'),
                                            _detailItem('Balance', '₹${inv.balanceAmount.toStringAsFixed(2)}', highlight: inv.balanceAmount > 0),
                                            _detailItem('Booking', inv.bookingNumber ?? '—'),
                                            if (inv.dueDate != null) _detailItem('Due Date', DateFormat('d MMM yyyy').format(inv.dueDate!)),
                                          ],
                                        ),
                                      ],
                                    ),
                                  ),
                              ],
                            ),
                          );
                        },
                      ),
              ),
            ],
          );
        },
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, s) => Center(child: Text('Error: ${apiErrorMessage(e)}')),
      ),
    );
  }

  Widget _kpiCard(String label, String value, {bool alert = false}) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 4),
        child: Column(children: [
          Text(value, style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: alert ? Colors.red : null)),
          const SizedBox(height: 4),
          Text(label, style: const TextStyle(fontSize: 10, color: Colors.grey), textAlign: TextAlign.center),
        ]),
      ),
    );
  }

  Widget _detailItem(String label, String value, {bool highlight = false}) {
    return SizedBox(
      width: 140,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(label, style: const TextStyle(fontSize: 10, color: Colors.grey, fontWeight: FontWeight.bold)),
          Text(value, style: TextStyle(fontSize: 13, color: highlight ? Colors.red : null, fontWeight: highlight ? FontWeight.bold : null)),
        ],
      ),
    );
  }
}
