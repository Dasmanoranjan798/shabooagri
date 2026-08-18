import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../core/network/api_client.dart';
import '../../../core/network/api_error.dart';
import '../../machines/presentation/machine_list_screen.dart';
import 'expense_list_screen.dart';

class ExpenseCategoryOption {
  final String id;
  final String name;
  ExpenseCategoryOption.fromJson(Map<String, dynamic> json)
      : id = json['id'] as String,
        name = json['name'] as String;
}

final expenseCategoriesProvider = FutureProvider<List<ExpenseCategoryOption>>((ref) async {
  final dio = ref.watch(apiClientProvider);
  final response = await dio.get('/expenses/categories');
  return (response.data as List<dynamic>).map((j) => ExpenseCategoryOption.fromJson(j as Map<String, dynamic>)).toList();
});

final expenseByIdProvider = FutureProvider.family<Map<String, dynamic>, String>((ref, id) async {
  final dio = ref.watch(apiClientProvider);
  final response = await dio.get('/expenses/$id');
  return response.data as Map<String, dynamic>;
});

class ExpenseFormScreen extends ConsumerStatefulWidget {
  final String? expenseId;

  const ExpenseFormScreen({super.key, this.expenseId});

  @override
  ConsumerState<ExpenseFormScreen> createState() => _ExpenseFormScreenState();
}

class _ExpenseFormScreenState extends ConsumerState<ExpenseFormScreen> {
  final _amountController = TextEditingController();
  final _descriptionController = TextEditingController();
  String? _categoryId;
  String? _machineId;
  DateTime _expenseDate = DateTime.now();
  bool _saving = false;
  bool _prefilled = false;
  String? _error;

  bool get _isEdit => widget.expenseId != null;

  void _prefillFrom(Map<String, dynamic> expense) {
    if (_prefilled) return;
    _prefilled = true;
    _amountController.text = (expense['amount'] as num).toString();
    _descriptionController.text = expense['description'] as String? ?? '';
    _categoryId = (expense['category'] as Map<String, dynamic>?)?['id'] as String?;
    _machineId = (expense['machine'] as Map<String, dynamic>?)?['id'] as String?;
    if (expense['expenseDate'] != null) {
      _expenseDate = DateTime.parse(expense['expenseDate'] as String);
    }
  }

  @override
  void dispose() {
    _amountController.dispose();
    _descriptionController.dispose();
    super.dispose();
  }

  Future<void> _pickDate() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: _expenseDate,
      firstDate: DateTime.now().subtract(const Duration(days: 365)),
      lastDate: DateTime.now(),
    );
    if (picked != null) setState(() => _expenseDate = picked);
  }

  Future<void> _save() async {
    final amount = double.tryParse(_amountController.text.trim());
    if (amount == null || amount <= 0 || _categoryId == null) {
      setState(() => _error = 'Category and a valid amount are required.');
      return;
    }
    setState(() {
      _saving = true;
      _error = null;
    });
    final dio = ref.read(apiClientProvider);
    final data = {
      'categoryId': _categoryId,
      'amount': amount,
      if (_machineId != null) 'machineId': _machineId,
      if (_descriptionController.text.trim().isNotEmpty) 'description': _descriptionController.text.trim(),
      'expenseDate': _expenseDate.toIso8601String(),
    };
    try {
      if (_isEdit) {
        await dio.patch('/expenses/${widget.expenseId}', data: data);
      } else {
        await dio.post('/expenses', data: data);
      }
      ref.invalidate(expensesListProvider);
      if (mounted) context.go('/expenses');
    } catch (e) {
      setState(() => _error = apiErrorMessage(e));
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_isEdit && !_prefilled) {
      final expenseAsync = ref.watch(expenseByIdProvider(widget.expenseId!));
      return Scaffold(
        appBar: AppBar(title: const Text('Edit Expense')),
        body: expenseAsync.when(
          data: (expense) {
            _prefillFrom(expense);
            return _buildForm();
          },
          loading: () => const Center(child: CircularProgressIndicator()),
          error: (e, s) => Center(child: Text('Could not load expense: ${apiErrorMessage(e)}')),
        ),
      );
    }

    return Scaffold(
      appBar: AppBar(
        title: Text(_isEdit ? 'Edit Expense' : 'New Expense'),
        leading: IconButton(icon: const Icon(Icons.arrow_back), onPressed: () => context.go('/expenses')),
      ),
      body: _buildForm(),
    );
  }

  Widget _buildForm() {
    final categoriesAsync = ref.watch(expenseCategoriesProvider);
    final machinesAsync = ref.watch(machinesListProvider);

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          if (_error != null)
            Padding(
              padding: const EdgeInsets.only(bottom: 12),
              child: Text(_error!, style: const TextStyle(color: Colors.red)),
            ),
          categoriesAsync.when(
            data: (categories) => DropdownButtonFormField<String>(
              initialValue: _categoryId,
              decoration: const InputDecoration(labelText: 'Category *', border: OutlineInputBorder()),
              items: categories.map((c) => DropdownMenuItem(value: c.id, child: Text(c.name))).toList(),
              onChanged: _saving ? null : (value) => setState(() => _categoryId = value),
            ),
            loading: () => const LinearProgressIndicator(),
            error: (e, s) => Text('Could not load categories: ${apiErrorMessage(e)}'),
          ),
          const SizedBox(height: 16),
          TextField(
            controller: _amountController,
            decoration: const InputDecoration(labelText: 'Amount *', border: OutlineInputBorder(), prefixText: '₹ '),
            keyboardType: const TextInputType.numberWithOptions(decimal: true),
            enabled: !_saving,
          ),
          const SizedBox(height: 16),
          machinesAsync.when(
            data: (machines) => DropdownButtonFormField<String>(
              initialValue: _machineId,
              decoration: const InputDecoration(labelText: 'Machine (optional)', border: OutlineInputBorder()),
              items: [
                const DropdownMenuItem(value: null, child: Text('Not machine-specific')),
                ...machines.map((m) => DropdownMenuItem(value: m.id, child: Text(m.registrationNumber))),
              ],
              onChanged: _saving ? null : (value) => setState(() => _machineId = value),
            ),
            loading: () => const LinearProgressIndicator(),
            error: (e, s) => Text('Could not load machines: ${apiErrorMessage(e)}'),
          ),
          const SizedBox(height: 16),
          ListTile(
            contentPadding: EdgeInsets.zero,
            title: const Text('Expense Date'),
            subtitle: Text('${_expenseDate.year}-${_expenseDate.month.toString().padLeft(2, '0')}-${_expenseDate.day.toString().padLeft(2, '0')}'),
            trailing: const Icon(Icons.calendar_today),
            onTap: _saving ? null : _pickDate,
          ),
          const SizedBox(height: 8),
          TextField(
            controller: _descriptionController,
            decoration: const InputDecoration(labelText: 'Description', border: OutlineInputBorder()),
            maxLines: 2,
            enabled: !_saving,
          ),
          const SizedBox(height: 24),
          ElevatedButton(
            onPressed: _saving ? null : _save,
            style: ElevatedButton.styleFrom(padding: const EdgeInsets.symmetric(vertical: 16)),
            child: _saving
                ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                : Text(_isEdit ? 'Save Changes' : 'Create Expense'),
          ),
        ],
      ),
    );
  }
}
