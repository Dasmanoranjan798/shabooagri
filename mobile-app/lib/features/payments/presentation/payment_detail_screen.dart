import 'package:flutter/material.dart';
import 'package:shabooagri_mobile/core/sync/data_sync.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:pdf/widgets.dart' as pw;
import 'package:printing/printing.dart';
import 'package:share_plus/share_plus.dart' show Share;
import 'package:url_launcher/url_launcher.dart';
import '../../../core/network/api_client.dart';
import '../../../core/network/api_error.dart';
import '../../../core/providers/session_provider.dart';
import '../../../core/widgets/adaptive_scaffold.dart';
import '../../../core/widgets/info_row.dart';
import '../data/receipt.dart';
import 'payment_list_screen.dart';

final receiptProvider = FutureProvider.family<Receipt, String>((ref, id) async {
  syncOn(ref, {SyncEntity.payment, SyncEntity.invoice});
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
      final response = await dio.post('/invoices/${widget.invoiceId}/payments', data: {
        'amount': amount,
        'paymentMethod': result['paymentMethod'],
        if ((result['referenceNumber'] ?? '').isNotEmpty) 'referenceNumber': result['referenceNumber'],
        if ((result['notes'] ?? '').isNotEmpty) 'notes': result['notes'],
      });
      _refresh();
      if (mounted) {
        // Overpayment beyond this invoice's balance is applied to the
        // customer's other open invoices (oldest first); any final leftover
        // becomes their advance/credit balance. Surface both if they happened.
        final data = response.data as Map<String, dynamic>?;
        final overflow = (data?['overflowApplications'] as List<dynamic>?) ?? const [];
        final credit = double.tryParse(data?['creditCreated']?.toString() ?? '0') ?? 0.0;
        final parts = <String>['Payment recorded.'];
        if (overflow.isNotEmpty) {
          parts.add('Applied to ${overflow.length} other open invoice${overflow.length == 1 ? '' : 's'}.');
        }
        if (credit > 0) {
          parts.add('₹${credit.toStringAsFixed(0)} added to customer credit.');
        }
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(parts.join(' '))));
      }
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(apiErrorMessage(e))));
    } finally {
      if (mounted) setState(() => _acting = false);
    }
  }

  Future<void> _handleEditTax(Map<String, dynamic> inv) async {
    final currentGst = inv['isGstApplicable'] as bool? ?? false;
    final currentRate = double.tryParse(inv['taxRate']?.toString() ?? '') ?? 18.0;
    final result = await showDialog<Map<String, dynamic>>(
      context: context,
      builder: (context) => _EditTaxDialog(isGstApplicable: currentGst, taxRate: currentRate),
    );
    if (result == null) return;

    setState(() => _acting = true);
    try {
      final dio = ref.read(apiClientProvider);
      final gst = result['isGstApplicable'] as bool;
      await dio.patch('/invoices/${widget.invoiceId}/tax', data: {
        'isGstApplicable': gst,
        // Backend recomputes the total; send 0 when GST is off, mirroring the web ReceiptModal.
        'taxRate': gst ? (result['taxRate'] as double) : 0,
      });
      _refresh();
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Tax updated.')));
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(apiErrorMessage(e))));
    } finally {
      if (mounted) setState(() => _acting = false);
    }
  }

  // The destructive action is now "Cancel" (was "Void"). The dialog's own
  // dismiss button therefore reads "Keep" — two "Cancel" buttons would be
  // ambiguous. `confirmLabel` is the red action ("Cancel Invoice"/"Cancel
  // Payment").
  Future<String?> _promptCancelReason(String title, String confirmLabel) {
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
            TextButton(onPressed: () => Navigator.pop(context), child: const Text('Keep')),
            ElevatedButton(
              style: ElevatedButton.styleFrom(backgroundColor: Colors.red),
              onPressed: reasonController.text.trim().isEmpty ? null : () => Navigator.pop(context, reasonController.text.trim()),
              child: Text(confirmLabel),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _handleCancelInvoice() async {
    final reason = await _promptCancelReason('Cancel this invoice?', 'Cancel Invoice');
    if (reason == null) return;
    setState(() => _acting = true);
    try {
      final dio = ref.read(apiClientProvider);
      await dio.post('/invoices/${widget.invoiceId}/cancel', data: {'reason': reason});
      _refresh();
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(apiErrorMessage(e))));
    } finally {
      if (mounted) setState(() => _acting = false);
    }
  }

  Future<void> _handleCancelPayment(String paymentId) async {
    final reason = await _promptCancelReason('Cancel this payment?', 'Cancel Payment');
    if (reason == null) return;
    setState(() => _acting = true);
    try {
      final dio = ref.read(apiClientProvider);
      await dio.post('/payments/$paymentId/cancel', data: {'reason': reason});
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
                '₹${(double.tryParse(inv['totalAmount'].toString()) ?? 0.0).toStringAsFixed(2)}',
                '₹${(double.tryParse(inv['paidAmount'].toString()) ?? 0.0).toStringAsFixed(2)}',
                '₹${(double.tryParse(inv['balanceAmount'].toString()) ?? 0.0).toStringAsFixed(2)}',
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
                          p.cancelled ? 'Cancelled' : 'Active',
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

    return AdaptiveScaffold(
      currentRoute: '/payments',
      title: 'Invoice Details',
      showBack: true,
      actions: receiptAsync.maybeWhen(
        data: (receipt) => [
          IconButton(icon: const Icon(Icons.picture_as_pdf), tooltip: 'Print / PDF', onPressed: () => _exportPdf(receipt)),
          IconButton(icon: const Icon(Icons.ios_share), tooltip: 'Export CSV', onPressed: () => _exportCsv(receipt)),
          IconButton(icon: const Icon(Icons.chat), tooltip: 'Share WhatsApp', onPressed: () => _shareWhatsApp(receipt)),
        ],
        orElse: () => const [],
      ),
      body: receiptAsync.when(
        data: (receipt) {
          final inv = receipt.invoice;
          final balance = (double.tryParse(inv['balanceAmount'].toString()) ?? 0.0);
          final status = inv['status'] as String;
          final isCancelled = status == 'CANCELLED';
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
                InfoRow('Taxable Value', '₹${(double.tryParse(inv['subtotalAmount'].toString()) ?? 0.0).toStringAsFixed(2)}'),
                if (isGstApplicable) ...[
                  if ((double.tryParse(inv['cgstAmount'].toString()) ?? 0.0) > 0) InfoRow('CGST', '₹${(double.tryParse(inv['cgstAmount'].toString()) ?? 0.0).toStringAsFixed(2)}'),
                  if ((double.tryParse(inv['sgstAmount'].toString()) ?? 0.0) > 0) InfoRow('SGST', '₹${(double.tryParse(inv['sgstAmount'].toString()) ?? 0.0).toStringAsFixed(2)}'),
                  if ((double.tryParse(inv['igstAmount'].toString()) ?? 0.0) > 0) InfoRow('IGST', '₹${(double.tryParse(inv['igstAmount'].toString()) ?? 0.0).toStringAsFixed(2)}'),
                ],
                InfoRow('Total Amount', '₹${(double.tryParse(inv['totalAmount'].toString()) ?? 0.0).toStringAsFixed(2)}'),
                InfoRow('Amount Received', '₹${(double.tryParse(inv['paidAmount'].toString()) ?? 0.0).toStringAsFixed(2)}'),
                InfoRow('Balance Due', '₹${balance.toStringAsFixed(2)}'),
                if (canReceivePayment && !isCancelled) ...[
                  const SizedBox(height: 8),
                  Align(
                    alignment: Alignment.centerLeft,
                    child: TextButton.icon(
                      icon: Icon(isGstApplicable ? Icons.edit : Icons.add, size: 18),
                      label: Text(isGstApplicable ? 'Edit GST Settings' : 'Add GST / Tax to Invoice'),
                      onPressed: _acting ? null : () => _handleEditTax(inv),
                    ),
                  ),
                ],
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
                              style: TextStyle(decoration: p.cancelled ? TextDecoration.lineThrough : null)),
                          subtitle: Text(
                              '${p.receivedAt.split('T').first} · ${p.receivedBy}${p.cancelled ? ' · Cancelled${p.cancelReason != null ? ': ${p.cancelReason}' : ''}' : ''}'),
                          trailing: isOwner && !p.cancelled
                              ? TextButton(
                                  onPressed: _acting ? null : () => _handleCancelPayment(p.id),
                                  child: const Text('Cancel', style: TextStyle(color: Colors.red)),
                                )
                              : null,
                        ),
                      )),
                ],
                const SizedBox(height: 24),
                if (canReceivePayment && balance > 0 && !isCancelled)
                  ElevatedButton.icon(
                    icon: const Icon(Icons.payments),
                    label: const Text('Receive Payment'),
                    style: ElevatedButton.styleFrom(backgroundColor: Colors.green, padding: const EdgeInsets.symmetric(vertical: 16)),
                    onPressed: _acting ? null : () => _handleReceivePayment(balance),
                  ),
                if (isOwner && !isCancelled) ...[
                  const SizedBox(height: 12),
                  OutlinedButton.icon(
                    icon: const Icon(Icons.block, color: Colors.red),
                    label: const Text('Cancel Invoice', style: TextStyle(color: Colors.red)),
                    onPressed: _acting ? null : _handleCancelInvoice,
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
                helperMaxLines: 2,
                helperText: 'Balance due: ₹${widget.maxAmount.toStringAsFixed(2)}. '
                    'Paying more settles the customer’s other open invoices; '
                    'any leftover becomes their credit balance.',
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

class _EditTaxDialog extends StatefulWidget {
  final bool isGstApplicable;
  final double taxRate;
  const _EditTaxDialog({required this.isGstApplicable, required this.taxRate});

  @override
  State<_EditTaxDialog> createState() => _EditTaxDialogState();
}

class _EditTaxDialogState extends State<_EditTaxDialog> {
  late bool _gst = widget.isGstApplicable;
  late final _rateController =
      TextEditingController(text: (widget.taxRate <= 0 ? 18 : widget.taxRate).toString());

  @override
  void dispose() {
    _rateController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: const Text('Invoice Tax'),
      content: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SwitchListTile(
            contentPadding: EdgeInsets.zero,
            title: const Text('Apply GST to this Invoice'),
            value: _gst,
            onChanged: (v) => setState(() => _gst = v),
          ),
          if (_gst) ...[
            const SizedBox(height: 8),
            TextField(
              controller: _rateController,
              decoration: const InputDecoration(
                labelText: 'GST Tax Rate (%)',
                border: OutlineInputBorder(),
                suffixText: '%',
              ),
              keyboardType: const TextInputType.numberWithOptions(decimal: true),
            ),
          ],
        ],
      ),
      actions: [
        TextButton(onPressed: () => Navigator.pop(context), child: const Text('Cancel')),
        ElevatedButton(
          onPressed: () {
            final rate = double.tryParse(_rateController.text.trim());
            if (_gst && (rate == null || rate < 0 || rate > 100)) {
              ScaffoldMessenger.of(context)
                  .showSnackBar(const SnackBar(content: Text('Enter a tax rate between 0 and 100.')));
              return;
            }
            Navigator.pop(context, {'isGstApplicable': _gst, 'taxRate': rate ?? 0.0});
          },
          child: const Text('Apply Tax Changes'),
        ),
      ],
    );
  }
}
