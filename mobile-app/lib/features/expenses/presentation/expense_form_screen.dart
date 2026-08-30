import 'package:flutter/material.dart';
import 'package:shabooagri_mobile/core/sync/data_sync.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../core/layout/responsive.dart';
import '../../../core/layout/responsive_form.dart';
import '../../../core/network/api_client.dart';
import '../../../core/network/api_error.dart';
import '../../../core/widgets/adaptive_scaffold.dart';
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
  syncOn(ref, {SyncEntity.expense});
  final dio = ref.watch(apiClientProvider);
  final response = await dio.get('/expenses/categories');
  return (response.data as List<dynamic>).map((j) => ExpenseCategoryOption.fromJson(j as Map<String, dynamic>)).toList();
});

final expenseByIdProvider = FutureProvider.family<Map<String, dynamic>, String>((ref, id) async {
  syncOn(ref, {SyncEntity.expense});
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
    _amountController.text = (double.tryParse(expense['amount'].toString()) ?? 0.0).toString();
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
    return AdaptiveScaffold(
      currentRoute: '/expenses',
      title: _isEdit ? 'Edit Expense' : 'New Expense',
      showBack: true,
      body: (_isEdit && !_prefilled)
          ? ref.watch(expenseByIdProvider(widget.expenseId!)).when(
              data: (expense) {
                _prefillFrom(expense);
                return _buildForm(context);
              },
              loading: () => const Center(child: CircularProgressIndicator()),
              error: (e, s) => Center(child: Text('Could not load expense: ${apiErrorMessage(e)}')),
            )
          : _buildForm(context),
    );
  }

  Widget _buildForm(BuildContext context) {
    final categoriesAsync = ref.watch(expenseCategoriesProvider);
    final machinesAsync = ref.watch(machinesListProvider);

    final form = Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        if (_error != null)
          Padding(
            padding: const EdgeInsets.only(bottom: 12),
            child: Text(_error!, style: const TextStyle(color: Colors.red)),
          ),
        ResponsiveFormGrid(
          children: [
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
            TextField(
              controller: _amountController,
              decoration: const InputDecoration(labelText: 'Amount *', border: OutlineInputBorder(), prefixText: '₹ '),
              keyboardType: const TextInputType.numberWithOptions(decimal: true),
              enabled: !_saving,
            ),
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
            InputDecorator(
              decoration: const InputDecoration(labelText: 'Expense Date', border: OutlineInputBorder()),
              child: InkWell(
                onTap: _saving ? null : _pickDate,
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                        '${_expenseDate.year}-${_expenseDate.month.toString().padLeft(2, '0')}-${_expenseDate.day.toString().padLeft(2, '0')}'),
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
          decoration: const InputDecoration(labelText: 'Description', border: OutlineInputBorder()),
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
                : Text(_isEdit ? 'Save Changes' : 'Create Expense'),
          ),
        ),
      ],
    );

    return SingleChildScrollView(
      padding: EdgeInsets.all(context.responsive.isDesktop ? 24.0 : 16.0),
      child: DesktopFormContainer(child: form),
    );
  }
}
