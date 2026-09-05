import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../core/network/api_error.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/widgets/search_field.dart';
import 'payment_list_screen.dart';

enum InvoiceTab { all, direct, afterWork }

/// The Invoices contextual workspace used by the Dashboard's "Invoices" pill.
///
/// This is NOT a second invoice system — it reuses the existing
/// [invoicesListProvider] and the existing detail route (`/payments/:id`), and
/// its two create paths open the two EXISTING workflows unchanged:
///   • New Invoice        → `/payments/invoice/new`  (direct/manual invoice)
///   • Log After-Work     → `/jobs/manual`           (field-work entry)
///
/// The three tabs are just views over the same list: an invoice with no booking
/// is a Direct Invoice; one tied to a booking is an After-Work invoice.
class InvoiceWorkspaceBody extends ConsumerStatefulWidget {
  const InvoiceWorkspaceBody({super.key});

  @override
  ConsumerState<InvoiceWorkspaceBody> createState() => _InvoiceWorkspaceBodyState();
}

class _InvoiceWorkspaceBodyState extends ConsumerState<InvoiceWorkspaceBody> {
  InvoiceTab _tab = InvoiceTab.all;
  String _query = '';

  bool _matchesTab(InvoiceSummary inv) {
    switch (_tab) {
      case InvoiceTab.all:
        return true;
      case InvoiceTab.direct:
        return inv.isDirect;
      case InvoiceTab.afterWork:
        return !inv.isDirect;
    }
  }

  @override
  Widget build(BuildContext context) {
    final invoicesAsync = ref.watch(invoicesListProvider);

    return invoicesAsync.when(
      data: (invoices) {
        final counts = (
          all: invoices.length,
          direct: invoices.where((i) => i.isDirect).length,
          afterWork: invoices.where((i) => !i.isDirect).length,
        );
        var filtered = invoices.where(_matchesTab).toList();
        if (_query.isNotEmpty) {
          filtered = filtered
              .where((i) =>
                  i.invoiceNumber.toLowerCase().contains(_query) ||
                  i.customerName.toLowerCase().contains(_query) ||
                  i.villageName.toLowerCase().contains(_query))
              .toList();
        }

        return Column(
          children: [
            // Tabs: All / Direct Invoice / After-Work
            SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.fromLTRB(16, 8, 16, 0),
              child: Row(
                children: [
                  _tabChip('All', counts.all, InvoiceTab.all),
                  const SizedBox(width: 8),
                  _tabChip('Direct Invoice', counts.direct, InvoiceTab.direct),
                  const SizedBox(width: 8),
                  _tabChip('After-Work', counts.afterWork, InvoiceTab.afterWork),
                ],
              ),
            ),
            SearchField(
              hintText: 'Search Invoice #, Customer, Village...',
              onChanged: (value) => setState(() => _query = value.trim().toLowerCase()),
            ),
            Expanded(
              child: filtered.isEmpty
                  ? Center(child: Text(_query.isEmpty ? 'No invoices in this view.' : 'No invoices match your search.'))
                  : ListView.builder(
                      itemCount: filtered.length,
                      itemBuilder: (context, index) => _invoiceCard(context, filtered[index]),
                    ),
            ),
          ],
        );
      },
      loading: () => const Center(child: CircularProgressIndicator()),
      error: (error, stack) => Center(child: Text('Error: ${apiErrorMessage(error)}')),
    );
  }

  Widget _tabChip(String label, int count, InvoiceTab tab) {
    final selected = _tab == tab;
    return ChoiceChip(
      label: Text('$label ($count)'),
      selected: selected,
      onSelected: (_) => setState(() => _tab = tab),
      showCheckmark: false,
    );
  }

  Widget _invoiceCard(BuildContext context, InvoiceSummary inv) {
    final (statusColor, statusLabel) = switch (inv.status) {
      'PAID' => (Colors.green, 'Paid'),
      'PARTIALLY_PAID' => (Colors.orange, 'Partial'),
      'CANCELLED' => (Colors.grey, 'Cancelled'),
      _ => (Colors.red, 'Unpaid'),
    };
    return Card(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
      child: InkWell(
        onTap: () => context.go('/payments/${inv.id}'),
        borderRadius: BorderRadius.circular(10),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Flexible(
                    child: Text(inv.invoiceNumber,
                        style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16), overflow: TextOverflow.ellipsis),
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                    decoration: BoxDecoration(color: statusColor.withValues(alpha: 0.12), borderRadius: BorderRadius.circular(6)),
                    child: Text(statusLabel, style: TextStyle(color: statusColor, fontSize: 12, fontWeight: FontWeight.bold)),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              Row(
                children: [
                  const Icon(Icons.person, size: 16, color: AppTheme.textMuted),
                  const SizedBox(width: 8),
                  Expanded(child: Text(inv.customerName, style: const TextStyle(fontSize: 14), overflow: TextOverflow.ellipsis)),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                    decoration: BoxDecoration(
                      color: (inv.isDirect ? Colors.indigo : Colors.teal).withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(4),
                    ),
                    child: Text(inv.isDirect ? 'Direct' : 'After-Work',
                        style: TextStyle(color: inv.isDirect ? Colors.indigo : Colors.teal, fontSize: 11, fontWeight: FontWeight.w600)),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text('Total ₹${inv.totalAmount.toStringAsFixed(0)}', style: const TextStyle(fontSize: 13, color: AppTheme.textMuted)),
                  Text('Balance ₹${inv.balanceAmount.toStringAsFixed(0)}',
                      style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: inv.balanceAmount > 0 ? Colors.red : Colors.green)),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// The Create action for the Invoice workspace — offers the two EXISTING
/// workflows. Shared by the Dashboard workspace header.
Future<void> showInvoiceCreateMenu(BuildContext context) async {
  final choice = await showModalBottomSheet<String>(
    context: context,
    builder: (ctx) => SafeArea(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Padding(
            padding: EdgeInsets.all(16),
            child: Text('Create', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
          ),
          ListTile(
            leading: const Icon(Icons.receipt_long),
            title: const Text('New Invoice'),
            subtitle: const Text('A direct invoice — amount, customer, description'),
            onTap: () => Navigator.pop(ctx, 'invoice'),
          ),
          ListTile(
            leading: const Icon(Icons.agriculture),
            title: const Text('After-Work Entry'),
            subtitle: const Text('Record completed field work (machine, driver, hours…)'),
            onTap: () => Navigator.pop(ctx, 'afterwork'),
          ),
          const SizedBox(height: 8),
        ],
      ),
    ),
  );
  if (choice == 'invoice' && context.mounted) {
    context.go('/payments/invoice/new');
  } else if (choice == 'afterwork' && context.mounted) {
    context.go('/jobs/manual');
  }
}
