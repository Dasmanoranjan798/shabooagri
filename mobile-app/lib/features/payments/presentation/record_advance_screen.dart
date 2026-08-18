import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../core/network/api_client.dart';
import '../../../core/network/api_error.dart';
import '../../customers/presentation/customer_list_screen.dart';
import 'payment_list_screen.dart';

const _paymentMethods = ['CASH', 'UPI', 'BANK_TRANSFER', 'CREDIT'];

/// "Use this to record money received from a customer that isn't tied to
/// an invoice yet — an advance before a job starts, or a walk-in
/// collection." — matches `RecordAdvanceModal.tsx` exactly.
class RecordAdvanceScreen extends ConsumerStatefulWidget {
  const RecordAdvanceScreen({super.key});

  @override
  ConsumerState<RecordAdvanceScreen> createState() => _RecordAdvanceScreenState();
}

class _RecordAdvanceScreenState extends ConsumerState<RecordAdvanceScreen> {
  final _amountController = TextEditingController();
  final _referenceController = TextEditingController();
  final _notesController = TextEditingController();
  String? _customerId;
  String _method = 'CASH';
  bool _saving = false;
  String? _error;

  @override
  void dispose() {
    _amountController.dispose();
    _referenceController.dispose();
    _notesController.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    final amount = double.tryParse(_amountController.text.trim());
    if (_customerId == null || amount == null || amount <= 0) {
      setState(() => _error = 'Select a customer and enter a valid amount greater than zero.');
      return;
    }
    setState(() {
      _saving = true;
      _error = null;
    });
    try {
      final dio = ref.read(apiClientProvider);
      await dio.post('/payments/advances', data: {
        'customerId': _customerId,
        'amount': amount,
        'paymentMethod': _method,
        if (_referenceController.text.trim().isNotEmpty) 'referenceNumber': _referenceController.text.trim(),
        if (_notesController.text.trim().isNotEmpty) 'notes': _notesController.text.trim(),
      });
      ref.invalidate(advancesListProvider);
      if (mounted) context.go('/payments');
    } catch (e) {
      setState(() => _error = apiErrorMessage(e));
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final customersAsync = ref.watch(customersListProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Record Advance'),
        leading: IconButton(icon: const Icon(Icons.arrow_back), onPressed: () => context.go('/payments')),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const Text(
              "Use this to record money received from a customer that isn't tied to an invoice yet — an advance before a job starts, or a walk-in collection.",
              style: TextStyle(color: Colors.grey),
            ),
            const SizedBox(height: 16),
            if (_error != null)
              Padding(padding: const EdgeInsets.only(bottom: 12), child: Text(_error!, style: const TextStyle(color: Colors.red))),
            customersAsync.when(
              data: (customers) => DropdownButtonFormField<String>(
                initialValue: _customerId,
                decoration: const InputDecoration(labelText: 'Customer *', border: OutlineInputBorder()),
                items: customers.map((c) => DropdownMenuItem(value: c.id, child: Text(c.name))).toList(),
                onChanged: _saving ? null : (value) => setState(() => _customerId = value),
              ),
              loading: () => const LinearProgressIndicator(),
              error: (e, s) => Text('Could not load customers: ${apiErrorMessage(e)}'),
            ),
            const SizedBox(height: 16),
            TextField(
              controller: _amountController,
              decoration: const InputDecoration(labelText: 'Amount Received (₹) *', border: OutlineInputBorder()),
              keyboardType: const TextInputType.numberWithOptions(decimal: true),
              enabled: !_saving,
            ),
            const SizedBox(height: 16),
            Wrap(
              spacing: 8,
              children: _paymentMethods.map((m) {
                return ChoiceChip(label: Text(m), selected: _method == m, onSelected: (_) => setState(() => _method = m));
              }).toList(),
            ),
            const SizedBox(height: 16),
            TextField(
              controller: _referenceController,
              decoration: const InputDecoration(labelText: 'Reference Number (optional)', border: OutlineInputBorder()),
              enabled: !_saving,
            ),
            const SizedBox(height: 16),
            TextField(
              controller: _notesController,
              decoration: const InputDecoration(labelText: 'Notes (optional)', border: OutlineInputBorder()),
              maxLines: 2,
              enabled: !_saving,
            ),
            const SizedBox(height: 24),
            ElevatedButton(
              onPressed: _saving ? null : _save,
              style: ElevatedButton.styleFrom(padding: const EdgeInsets.symmetric(vertical: 16)),
              child: _saving
                  ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                  : const Text('Record Advance'),
            ),
          ],
        ),
      ),
    );
  }
}
