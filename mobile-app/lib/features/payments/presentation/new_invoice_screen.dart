import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../core/layout/responsive_form.dart';
import '../../../core/network/api_client.dart';
import '../../../core/network/api_error.dart';
import '../../../core/widgets/adaptive_scaffold.dart';
import '../../customers/presentation/customer_list_screen.dart';
import 'payment_list_screen.dart';

/// Manual invoice — for charges not tied to a Job Card (spare parts sale,
/// pre-migration backlog balance, etc). Matches `NewInvoiceModal.tsx`.
class NewInvoiceScreen extends ConsumerStatefulWidget {
  const NewInvoiceScreen({super.key});

  @override
  ConsumerState<NewInvoiceScreen> createState() => _NewInvoiceScreenState();
}

class _NewInvoiceScreenState extends ConsumerState<NewInvoiceScreen> {
  final _amountController = TextEditingController();
  final _descriptionController = TextEditingController();
  String? _customerId;
  DateTime? _dueDate;
  bool _saving = false;
  String? _error;

  @override
  void dispose() {
    _amountController.dispose();
    _descriptionController.dispose();
    super.dispose();
  }

  Future<void> _pickDueDate() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: DateTime.now().add(const Duration(days: 7)),
      firstDate: DateTime.now(),
      lastDate: DateTime.now().add(const Duration(days: 365)),
    );
    if (picked != null) setState(() => _dueDate = picked);
  }

  Future<void> _save() async {
    final amount = double.tryParse(_amountController.text.trim());
    final description = _descriptionController.text.trim();
    if (_customerId == null) {
      setState(() => _error = 'Please select a customer.');
      return;
    }
    if (amount == null || amount <= 0) {
      setState(() => _error = 'Please enter a valid amount greater than zero.');
      return;
    }
    if (description.isEmpty) {
      setState(() => _error = 'Please describe what this invoice is for.');
      return;
    }
    setState(() {
      _saving = true;
      _error = null;
    });
    try {
      final dio = ref.read(apiClientProvider);
      await dio.post('/invoices', data: {
        'customerId': _customerId,
        'totalAmount': amount,
        'description': description,
        if (_dueDate != null) 'dueDate': _dueDate!.toIso8601String().split('T').first,
      });
      ref.invalidate(invoicesListProvider);
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

    return AdaptiveScaffold(
      currentRoute: '/payments',
      title: 'New Invoice',
      showBack: true,
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16.0),
        child: DesktopFormContainer(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              if (_error != null)
                Padding(padding: const EdgeInsets.only(bottom: 12), child: Text(_error!, style: const TextStyle(color: Colors.red))),
              ResponsiveFormGrid(
                children: [
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
                  TextField(
                    controller: _amountController,
                    decoration: const InputDecoration(labelText: 'Invoice Amount (₹) *', border: OutlineInputBorder()),
                    keyboardType: const TextInputType.numberWithOptions(decimal: true),
                    enabled: !_saving,
                  ),
                  InputDecorator(
                    decoration: const InputDecoration(labelText: 'Due Date (optional)', border: OutlineInputBorder()),
                    child: InkWell(
                      onTap: _saving ? null : _pickDueDate,
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text(_dueDate == null ? 'Not set' : _dueDate!.toIso8601String().split('T').first),
                          const Icon(Icons.calendar_today, size: 18),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              TextField(
                controller: _descriptionController,
                decoration: const InputDecoration(
                  labelText: 'Description *',
                  hintText: 'What is this invoice for?',
                  border: OutlineInputBorder(),
                ),
                maxLines: 2,
                enabled: !_saving,
              ),
              const SizedBox(height: 24),
              DesktopFormActions(
                child: ElevatedButton(
                  onPressed: _saving ? null : _save,
                  style: ElevatedButton.styleFrom(padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 32)),
                  child: _saving
                      ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                      : const Text('Create Invoice'),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
