import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:share_plus/share_plus.dart' show Share;
import '../../../core/network/api_client.dart';
import '../../../core/network/api_error.dart';
import '../../../core/providers/session_provider.dart';
import '../../../core/widgets/app_drawer.dart';
import '../../../core/widgets/confirm_delete.dart';
import '../../../core/widgets/search_field.dart';

class ExpenseSummary {
  final String id;
  final double amount;
  final String? description;
  final String expenseDate;
  final String categoryId;
  final String categoryName;
  final String? machineRegistration;
  final String recordedBy;

  ExpenseSummary.fromJson(Map<String, dynamic> json)
      : id = json['id'] as String,
        amount = (json['amount'] as num).toDouble(),
        description = json['description'] as String?,
        expenseDate = json['expenseDate'] as String,
        categoryId = (json['category'] as Map<String, dynamic>?)?['id'] as String? ?? '',
        categoryName = (json['category'] as Map<String, dynamic>?)?['name'] as String? ?? 'Uncategorized',
        machineRegistration = (json['machine'] as Map<String, dynamic>?)?['registrationNumber'] as String?,
        recordedBy = (json['incurredByUser'] as Map<String, dynamic>?)?['fullName'] as String? ?? 'Company Staff';
}

final expensesListProvider = FutureProvider<List<ExpenseSummary>>((ref) async {
  final dio = ref.watch(apiClientProvider);
  final response = await dio.get('/expenses');
  return (response.data as List<dynamic>).map((j) => ExpenseSummary.fromJson(j as Map<String, dynamic>)).toList();
});

/// New module — no offline table, matching the same live-only pattern as
/// Payments/Employees (this is back-office financial record-keeping, not
/// field-critical offline data).
class ExpenseListScreen extends ConsumerStatefulWidget {
  const ExpenseListScreen({super.key});

  @override
  ConsumerState<ExpenseListScreen> createState() => _ExpenseListScreenState();
}

class _ExpenseListScreenState extends ConsumerState<ExpenseListScreen> {
  String _query = '';
  String? _categoryFilter; // null = All Categories

  Future<void> _exportCsv(List<ExpenseSummary> expenses) async {
    final buffer = StringBuffer('Date,Category,Amount,Machine,Recorded By,Description\n');
    for (final e in expenses) {
      buffer.writeln(
          '${e.expenseDate.split('T').first},${e.categoryName},${e.amount.toStringAsFixed(2)},${e.machineRegistration ?? ''},${e.recordedBy},"${(e.description ?? '').replaceAll('"', '""')}"');
    }
    await Share.share(buffer.toString(), subject: 'ShabooAgri Expenses Export');
  }

  @override
  Widget build(BuildContext context) {
    final expensesAsync = ref.watch(expensesListProvider);
    final user = ref.watch(currentUserProvider);
    // Delete is gated by expense.manage (Manager-accessible), NOT a
    // separate Owner-only expense.delete permission — unlike Villages/
    // Machines/Drivers/Customers/Bookings/Employees. Confirmed against
    // expense.routes.ts before building this, not assumed from the
    // pattern used everywhere else.
    final canManage = user?.isOwnerOrManager ?? false;

    return Scaffold(
      drawer: const AppDrawer(currentRoute: '/expenses'),
      appBar: AppBar(
        title: const Text('Expenses'),
        actions: [
          IconButton(
            icon: const Icon(Icons.ios_share),
            tooltip: 'Export CSV',
            onPressed: () => expensesAsync.whenData(_exportCsv),
          ),
          IconButton(icon: const Icon(Icons.refresh), onPressed: () => ref.invalidate(expensesListProvider)),
        ],
      ),
      floatingActionButton: canManage
          ? FloatingActionButton(onPressed: () => context.go('/expenses/new'), child: const Icon(Icons.add))
          : null,
      body: expensesAsync.when(
        data: (expenses) {
          final categories = <String, String>{}; // id -> name
          for (final e in expenses) {
            if (e.categoryId.isNotEmpty) categories[e.categoryId] = e.categoryName;
          }
          var filtered = _categoryFilter == null ? expenses : expenses.where((e) => e.categoryId == _categoryFilter).toList();
          if (_query.isNotEmpty) {
            filtered = filtered
                .where((e) =>
                    e.categoryName.toLowerCase().contains(_query) ||
                    (e.description?.toLowerCase().contains(_query) ?? false) ||
                    (e.machineRegistration?.toLowerCase().contains(_query) ?? false))
                .toList();
          }
          final totalOutflow = expenses.fold<double>(0, (sum, e) => sum + e.amount);
          final machineryTotal =
              expenses.where((e) => e.machineRegistration != null).fold<double>(0, (sum, e) => sum + e.amount);
          final generalTotal = totalOutflow - machineryTotal;

          return Column(
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
                    _kpiCard('Total Outflow', '₹${totalOutflow.toStringAsFixed(0)}', Colors.red),
                    _kpiCard('Machinery Expenses', '₹${machineryTotal.toStringAsFixed(0)}', Colors.orange),
                    _kpiCard('General Operations', '₹${generalTotal.toStringAsFixed(0)}', Colors.blueGrey),
                    _kpiCard('Expense Entries', '${expenses.length}', Colors.blue),
                  ],
                ),
              ),
              SearchField(
                hintText: 'Search Category, Machine, Details...',
                onChanged: (value) => setState(() => _query = value.trim().toLowerCase()),
              ),
              SizedBox(
                height: 44,
                child: ListView(
                  scrollDirection: Axis.horizontal,
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                  children: [
                    Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 4),
                      child: ChoiceChip(
                        label: Text('All Categories (${expenses.length})'),
                        selected: _categoryFilter == null,
                        onSelected: (_) => setState(() => _categoryFilter = null),
                      ),
                    ),
                    ...categories.entries.map((entry) {
                      final count = expenses.where((e) => e.categoryId == entry.key).length;
                      return Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 4),
                        child: ChoiceChip(
                          label: Text('${entry.value} ($count)'),
                          selected: _categoryFilter == entry.key,
                          onSelected: (_) => setState(() => _categoryFilter = entry.key),
                        ),
                      );
                    }),
                  ],
                ),
              ),
              Expanded(
                child: filtered.isEmpty
                    ? const Center(child: Text('No expenses match this view.'))
                    : ListView.builder(
                        itemCount: filtered.length,
                        itemBuilder: (context, index) {
                          final expense = filtered[index];
                          return Card(
                            margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                            child: ListTile(
                              title: Text(expense.categoryName),
                              subtitle: Text(
                                '${expense.expenseDate.split('T').first}${expense.description != null ? ' · ${expense.description}' : ''}',
                              ),
                              onTap: () => context.go('/expenses/${expense.id}'),
                              trailing: Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  Text('₹${expense.amount.toStringAsFixed(0)}',
                                      style: const TextStyle(fontWeight: FontWeight.bold)),
                                  if (canManage)
                                    PopupMenuButton<String>(
                                      onSelected: (action) async {
                                        if (action == 'edit') {
                                          context.go('/expenses/${expense.id}/edit');
                                        } else if (action == 'delete') {
                                          final dio = ref.read(apiClientProvider);
                                          await confirmAndDelete(
                                            context: context,
                                            entityLabel: 'this expense',
                                            onDelete: () => dio.delete('/expenses/${expense.id}'),
                                            onSuccess: () => ref.invalidate(expensesListProvider),
                                          );
                                        }
                                      },
                                      itemBuilder: (context) => const [
                                        PopupMenuItem(value: 'edit', child: Text('Edit')),
                                        PopupMenuItem(value: 'delete', child: Text('Delete', style: TextStyle(color: Colors.red))),
                                      ],
                                    ),
                                ],
                              ),
                            ),
                          );
                        },
                      ),
              ),
            ],
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
            Text(value, style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: color)),
          ],
        ),
      ),
    );
  }
}
