import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:pdf/widgets.dart' as pw;
import 'package:printing/printing.dart';
import 'package:share_plus/share_plus.dart' show Share;
import 'package:url_launcher/url_launcher.dart';
import '../../../core/network/api_client.dart';
import '../../../core/network/api_error.dart';
import '../../../core/providers/session_provider.dart';
import '../../../core/widgets/info_row.dart';
import '../data/receipt.dart';
import 'payment_list_screen.dart';

final receiptProvider = FutureProvider.family<Receipt, String>((ref, id) async {
  final dio = ref.watch(apiClientProvider);
  final response = await dio.get('/invoices/$id/receipt');
  return Receipt.fromJson(response.data as Map<String, dynamic>);
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
    ref.invalidate(receiptProvider(widget.invoiceId));
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

  Future<String?> _promptVoidReason(String title) {
    final reasonController = TextEditingController();
    return showDialog<String>(
      context: context,
      builder: (context) => StatefulBuilder(
        builder: (context, setDialogState) => AlertDialog(
          title: Text(title),
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
  }

  Future<void> _handleVoidInvoice() async {
    final reason = await _promptVoidReason('Void this invoice?');
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

  Future<void> _handleVoidPayment(String paymentId) async {
    final reason = await _promptVoidReason('Void this payment?');
    if (reason == null) return;
    setState(() => _acting = true);
    try {
      final dio = ref.read(apiClientProvider);
      await dio.post('/payments/$paymentId/void', data: {'reason': reason});
      _refresh();
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(apiErrorMessage(e))));
    } finally {
      if (mounted) setState(() => _acting = false);
    }
  }

  Future<void> _exportPdf(Receipt receipt) async {
    final inv = receipt.invoice;
    final doc = pw.Document();
    doc.addPage(
      pw.Page(
        build: (context) => pw.Column(
          crossAxisAlignment: pw.CrossAxisAlignment.start,
          children: [
            pw.Text(receipt.company['name'] as String? ?? 'ShabooAgri', style: pw.TextStyle(fontSize: 20, fontWeight: pw.FontWeight.bold)),
            if (receipt.company['address'] != null) pw.Text(receipt.company['address'] as String),
            if (receipt.company['gstin'] != null) pw.Text('GSTIN: ${receipt.company['gstin']}'),
            pw.SizedBox(height: 16),
            pw.Text('Invoice #${inv['invoiceNumber']}', style: pw.TextStyle(fontSize: 16, fontWeight: pw.FontWeight.bold)),
            pw.Text('Date: ${(inv['invoiceDate'] as String).split('T').first}'),
            pw.SizedBox(height: 12),
            pw.Text('Bill To: ${receipt.customer['name']}'),
            pw.Text('Village: ${receipt.customer['village']}'),
            pw.SizedBox(height: 16),
            pw.TableHelper.fromTextArray(headers: [
              'Total Amount',
              'Paid Amount',
              'Balance Due',
            ], data: [
              [
                '₹${(inv['totalAmount'] as num).toStringAsFixed(2)}',
                '₹${(inv['paidAmount'] as num).toStringAsFixed(2)}',
                '₹${(inv['balanceAmount'] as num).toStringAsFixed(2)}',
              ]
            ]),
            pw.SizedBox(height: 16),
            if (receipt.payments.isNotEmpty) ...[
              pw.Text('Payment History', style: pw.TextStyle(fontWeight: pw.FontWeight.bold)),
              pw.TableHelper.fromTextArray(
                headers: ['Date', 'Method', 'Amount', 'Status'],
                data: receipt.payments
                    .map((p) => [
                          p.receivedAt.split('T').first,
                          p.paymentMethod,
                          '₹${p.amount.toStringAsFixed(2)}',
                          p.voided ? 'Voided' : 'Active',
                        ])
                    .toList(),
              ),
            ],
          ],
        ),
      ),
    );
    await Printing.sharePdf(bytes: await doc.save(), filename: 'invoice-${inv['invoiceNumber']}.pdf');
  }

  Future<void> _exportCsv(Receipt receipt) async {
    final inv = receipt.invoice;
    final buffer = StringBuffer('Invoice Number,Customer,Date,Total Amount,Paid Amount,Balance Due,Status\n');
    buffer.writeln(
        '${inv['invoiceNumber']},${receipt.customer['name']},${(inv['invoiceDate'] as String).split('T').first},${inv['totalAmount']},${inv['paidAmount']},${inv['balanceAmount']},${inv['status']}');
    await Share.share(buffer.toString(), subject: 'Invoice ${inv['invoiceNumber']}');
  }

  Future<void> _shareWhatsApp(Receipt receipt) async {
    final inv = receipt.invoice;
    final companyName = receipt.company['name'] as String? ?? 'ShabooAgri';
    final message = Uri.encodeComponent(
        'Hello ${receipt.customer['name']},\n\nHere is your invoice summary from $companyName:\n\nInvoice: #${inv['invoiceNumber']}\nTotal Amount: ₹${inv['totalAmount']}\nAmount Paid: ₹${inv['paidAmount']}\nBalance Due: ₹${inv['balanceAmount']}\nStatus: ${inv['status']}\n\nThank you for choosing $companyName!');
    final phone = (receipt.customer['phone'] as String?)?.replaceAll(RegExp(r'\D'), '');
    final uri = Uri.parse('https://wa.me/${phone ?? ''}?text=$message');
    if (await canLaunchUrl(uri)) await launchUrl(uri, mode: LaunchMode.externalApplication);
  }

  @override
  Widget build(BuildContext context) {
    final receiptAsync = ref.watch(receiptProvider(widget.invoiceId));
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
        actions: receiptAsync.maybeWhen(
          data: (receipt) => [
            IconButton(icon: const Icon(Icons.picture_as_pdf), tooltip: 'Print / PDF', onPressed: () => _exportPdf(receipt)),
            IconButton(icon: const Icon(Icons.ios_share), tooltip: 'Export CSV', onPressed: () => _exportCsv(receipt)),
            IconButton(icon: const Icon(Icons.chat), tooltip: 'Share WhatsApp', onPressed: () => _shareWhatsApp(receipt)),
          ],
          orElse: () => const [],
        ),
      ),
      body: receiptAsync.when(
        data: (receipt) {
          final inv = receipt.invoice;
          final balance = (inv['balanceAmount'] as num).toDouble();
          final status = inv['status'] as String;
          final isVoided = status == 'VOIDED';
          final isGstApplicable = inv['isGstApplicable'] as bool? ?? false;

          return Padding(
            padding: const EdgeInsets.all(16.0),
            child: ListView(
              children: [
                Text(receipt.company['name'] as String? ?? 'ShabooAgri',
                    style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                if (receipt.company['address'] != null) Text(receipt.company['address'] as String, style: const TextStyle(color: Colors.grey)),
                if (receipt.company['gstin'] != null) Text('GSTIN: ${receipt.company['gstin']}', style: const TextStyle(color: Colors.grey)),
                const Divider(height: 32),
                InfoRow('Invoice Number', inv['invoiceNumber'] as String),
                InfoRow('Status', status),
                InfoRow('Invoice Date', (inv['invoiceDate'] as String).split('T').first),
                InfoRow('Customer', receipt.customer['name'] as String),
                InfoRow('Village', receipt.customer['village'] as String? ?? '—'),
                if (receipt.service['machine'] != null)
                  InfoRow('Machine', (receipt.service['machine'] as Map<String, dynamic>)['registrationNumber'] as String),
                if (receipt.service['driver'] != null)
                  InfoRow('Driver', (receipt.service['driver'] as Map<String, dynamic>)['name'] as String),
                const Divider(height: 32),
                const Text('Billing Summary', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                const SizedBox(height: 8),
                InfoRow('Taxable Value', '₹${(inv['subtotalAmount'] as num).toStringAsFixed(2)}'),
                if (isGstApplicable) ...[
                  if ((inv['cgstAmount'] as num) > 0) InfoRow('CGST', '₹${(inv['cgstAmount'] as num).toStringAsFixed(2)}'),
                  if ((inv['sgstAmount'] as num) > 0) InfoRow('SGST', '₹${(inv['sgstAmount'] as num).toStringAsFixed(2)}'),
                  if ((inv['igstAmount'] as num) > 0) InfoRow('IGST', '₹${(inv['igstAmount'] as num).toStringAsFixed(2)}'),
                ],
                InfoRow('Total Amount', '₹${(inv['totalAmount'] as num).toStringAsFixed(2)}'),
                InfoRow('Amount Received', '₹${(inv['paidAmount'] as num).toStringAsFixed(2)}'),
                InfoRow('Balance Due', '₹${balance.toStringAsFixed(2)}'),
                if (receipt.company['bankName'] != null || receipt.company['upiId'] != null) ...[
                  const Divider(height: 32),
                  const Text('Bank & Payment Details', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                  const SizedBox(height: 8),
                  if (receipt.company['bankName'] != null) InfoRow('Bank Name', receipt.company['bankName'] as String),
                  if (receipt.company['accountNumber'] != null) InfoRow('Account No', receipt.company['accountNumber'] as String),
                  if (receipt.company['ifscCode'] != null) InfoRow('IFSC Code', receipt.company['ifscCode'] as String),
                  if (receipt.company['upiId'] != null) InfoRow('UPI ID', receipt.company['upiId'] as String),
                ],
                if (receipt.payments.isNotEmpty) ...[
                  const Divider(height: 32),
                  const Text('Payment Collections History', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                  const SizedBox(height: 8),
                  ...receipt.payments.map((p) => Card(
                        child: ListTile(
                          title: Text('₹${p.amount.toStringAsFixed(2)} · ${p.paymentMethod}',
                              style: TextStyle(decoration: p.voided ? TextDecoration.lineThrough : null)),
                          subtitle: Text(
                              '${p.receivedAt.split('T').first} · ${p.receivedBy}${p.voided ? ' · Voided${p.voidReason != null ? ': ${p.voidReason}' : ''}' : ''}'),
                          trailing: isOwner && !p.voided
                              ? TextButton(
                                  onPressed: _acting ? null : () => _handleVoidPayment(p.id),
                                  child: const Text('Void', style: TextStyle(color: Colors.red)),
                                )
                              : null,
                        ),
                      )),
                ],
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
                    onPressed: _acting ? null : _handleVoidInvoice,
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
