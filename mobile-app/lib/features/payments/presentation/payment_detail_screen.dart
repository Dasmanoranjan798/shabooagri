import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../core/network/api_client.dart';
import '../../../core/network/api_error.dart';
import '../../../core/providers/session_provider.dart';
import '../../../core/widgets/info_row.dart';
import 'payment_list_screen.dart';

final invoiceDetailProvider = FutureProvider.family<Map<String, dynamic>, String>((ref, id) async {
  final dio = ref.watch(apiClientProvider);
  final response = await dio.get('/invoices/$id');
  return response.data as Map<String, dynamic>;
});

const _paymentMethods = ['CASH', 'UPI', 'BANK_TRANSFER', 'CREDIT'];

class PaymentDetailScreen extends ConsumerStatefulWidget {
  final String invoiceId;

  const PaymentDetailScreen({super.key, required this.invoiceId});

  @override
  ConsumerState<PaymentDetailScreen> createState() => _PaymentDetailScreenState();
}

class _PaymentDetailScreenState extends ConsumerState<PaymentDetailScreen> {
  bool _acting = false;

  void _refresh() {
    ref.invalidate(invoiceDetailProvider(widget.invoiceId));
    ref.invalidate(invoicesListProvider);
  }

  Future<void> _handleReceivePayment(double balanceAmount) async {
    final result = await showDialog<Map<String, String>>(
      context: context,
      builder: (context) => _ReceivePaymentDialog(maxAmount: balanceAmount),
    );
    if (result == null) return;
    final amount = double.tryParse(result['amount'] ?? '');
    if (amount == null || amount <= 0) return;

    setState(() => _acting = true);
    try {
      final dio = ref.read(apiClientProvider);
      await dio.post('/invoices/${widget.invoiceId}/payments', data: {
        'amount': amount,
        'paymentMethod': result['paymentMethod'],
        if ((result['referenceNumber'] ?? '').isNotEmpty) 'referenceNumber': result['referenceNumber'],
        if ((result['notes'] ?? '').isNotEmpty) 'notes': result['notes'],
      });
      _refresh();
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Payment recorded.')));
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(apiErrorMessage(e))));
    } finally {
      if (mounted) setState(() => _acting = false);
    }
  }

  Future<void> _handleVoid() async {
    final reasonController = TextEditingController();
    final reason = await showDialog<String>(
      context: context,
      builder: (context) => StatefulBuilder(
        builder: (context, setDialogState) => AlertDialog(
          title: const Text('Void this invoice?'),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text('This cannot be undone. A reason is required.'),
              const SizedBox(height: 12),
              TextField(
                controller: reasonController,
                decoration: const InputDecoration(labelText: 'Reason *', border: OutlineInputBorder()),
                onChanged: (_) => setDialogState(() {}),
                autofocus: true,
              ),
            ],
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(context), child: const Text('Cancel')),
            ElevatedButton(
              style: ElevatedButton.styleFrom(backgroundColor: Colors.red),
              onPressed: reasonController.text.trim().isEmpty ? null : () => Navigator.pop(context, reasonController.text.trim()),
              child: const Text('Void'),
            ),
          ],
        ),
      ),
    );
    if (reason == null) return;

    setState(() => _acting = true);
    try {
      final dio = ref.read(apiClientProvider);
      await dio.post('/invoices/${widget.invoiceId}/void', data: {'reason': reason});
      _refresh();
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(apiErrorMessage(e))));
    } finally {
      if (mounted) setState(() => _acting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final invoiceAsync = ref.watch(invoiceDetailProvider(widget.invoiceId));
    final user = ref.watch(currentUserProvider);
    final canReceivePayment = user?.isOwnerOrManager ?? false;
    final isOwner = user?.roleSystemKey == 'owner';

    return Scaffold(
      appBar: AppBar(
        title: const Text('Invoice Details'),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => context.go('/payments'),
        ),
      ),
      body: invoiceAsync.when(
        data: (invoice) {
          final balance = (invoice['balanceAmount'] as num).toDouble();
          final status = invoice['status'] as String;
          final isVoided = status == 'VOIDED';
          return Padding(
            padding: const EdgeInsets.all(16.0),
            child: ListView(
              children: [
                InfoRow('Invoice Number', invoice['invoiceNumber'] as String),
                InfoRow('Status', status),
                InfoRow('Invoice Date', (invoice['invoiceDate'] as String).split('T').first),
                InfoRow('Total Amount', '₹${(invoice['totalAmount'] as num).toStringAsFixed(2)}'),
                InfoRow('Paid Amount', '₹${(invoice['paidAmount'] as num).toStringAsFixed(2)}'),
                InfoRow('Balance Due', '₹${balance.toStringAsFixed(2)}'),
                const SizedBox(height: 24),
                if (canReceivePayment && balance > 0 && !isVoided)
                  ElevatedButton.icon(
                    icon: const Icon(Icons.payments),
                    label: const Text('Receive Payment'),
                    style: ElevatedButton.styleFrom(backgroundColor: Colors.green, padding: const EdgeInsets.symmetric(vertical: 16)),
                    onPressed: _acting ? null : () => _handleReceivePayment(balance),
                  ),
                if (isOwner && !isVoided) ...[
                  const SizedBox(height: 12),
                  OutlinedButton.icon(
                    icon: const Icon(Icons.block, color: Colors.red),
                    label: const Text('Void Invoice', style: TextStyle(color: Colors.red)),
                    onPressed: _acting ? null : _handleVoid,
                  ),
                ],
              ],
            ),
          );
        },
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, stack) => Center(child: Text('Error: ${apiErrorMessage(error)}')),
      ),
    );
  }
}

class _ReceivePaymentDialog extends StatefulWidget {
  final double maxAmount;
  const _ReceivePaymentDialog({required this.maxAmount});

  @override
  State<_ReceivePaymentDialog> createState() => _ReceivePaymentDialogState();
}

class _ReceivePaymentDialogState extends State<_ReceivePaymentDialog> {
  late final _amountController = TextEditingController(text: widget.maxAmount.toStringAsFixed(2));
  final _referenceController = TextEditingController();
  final _notesController = TextEditingController();
  String _method = 'CASH';

  @override
  void dispose() {
    _amountController.dispose();
    _referenceController.dispose();
    _notesController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: const Text('Receive Payment'),
      content: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(
              controller: _amountController,
              decoration: InputDecoration(
                labelText: 'Amount *',
                border: const OutlineInputBorder(),
                prefixText: '₹ ',
                helperText: 'Balance due: ₹${widget.maxAmount.toStringAsFixed(2)}',
              ),
              keyboardType: const TextInputType.numberWithOptions(decimal: true),
              autofocus: true,
            ),
            const SizedBox(height: 12),
            DropdownButtonFormField<String>(
              initialValue: _method,
              decoration: const InputDecoration(labelText: 'Payment Method', border: OutlineInputBorder()),
              items: _paymentMethods.map((m) => DropdownMenuItem(value: m, child: Text(m))).toList(),
              onChanged: (value) => setState(() => _method = value!),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: _referenceController,
              decoration: const InputDecoration(labelText: 'Reference/Transaction Number (optional)', border: OutlineInputBorder()),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: _notesController,
              decoration: const InputDecoration(labelText: 'Notes (optional)', border: OutlineInputBorder()),
              maxLines: 2,
            ),
          ],
        ),
      ),
      actions: [
        TextButton(onPressed: () => Navigator.pop(context), child: const Text('Cancel')),
        ElevatedButton(
          onPressed: () => Navigator.pop(context, {
            'amount': _amountController.text,
            'paymentMethod': _method,
            'referenceNumber': _referenceController.text.trim(),
            'notes': _notesController.text.trim(),
          }),
          child: const Text('Save'),
        ),
      ],
    );
  }
}
