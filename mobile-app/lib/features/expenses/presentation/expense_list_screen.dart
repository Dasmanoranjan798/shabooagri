import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../core/network/api_client.dart';
import '../../../core/network/api_error.dart';
import '../../../core/providers/session_provider.dart';
import '../../../core/widgets/app_drawer.dart';
import '../../../core/widgets/confirm_delete.dart';

class ExpenseSummary {
  final String id;
  final double amount;
  final String? description;
  final String expenseDate;
  final String categoryName;

  ExpenseSummary.fromJson(Map<String, dynamic> json)
      : id = json['id'] as String,
        amount = (json['amount'] as num).toDouble(),
        description = json['description'] as String?,
        expenseDate = json['expenseDate'] as String,
        categoryName = (json['category'] as Map<String, dynamic>?)?['name'] as String? ?? 'Uncategorized';
}

final expensesListProvider = FutureProvider<List<ExpenseSummary>>((ref) async {
  final dio = ref.watch(apiClientProvider);
  final response = await dio.get('/expenses');
  return (response.data as List<dynamic>).map((j) => ExpenseSummary.fromJson(j as Map<String, dynamic>)).toList();
});

/// New module — no offline table, matching the same live-only pattern as
/// Payments/Employees (this is back-office financial record-keeping, not
/// field-critical offline data).
class ExpenseListScreen extends ConsumerWidget {
  const ExpenseListScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
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
          IconButton(icon: const Icon(Icons.refresh), onPressed: () => ref.invalidate(expensesListProvider)),
        ],
      ),
      floatingActionButton: canManage
          ? FloatingActionButton(onPressed: () => context.go('/expenses/new'), child: const Icon(Icons.add))
          : null,
      body: expensesAsync.when(
        data: (expenses) {
          if (expenses.isEmpty) return const Center(child: Text('No expenses found.'));
          return ListView.builder(
            itemCount: expenses.length,
            itemBuilder: (context, index) {
              final expense = expenses[index];
              return Card(
                margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                child: ListTile(
                  title: Text(expense.categoryName),
                  subtitle: Text(
                    '${expense.expenseDate.split('T').first}${expense.description != null ? ' · ${expense.description}' : ''}',
                  ),
                  trailing: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text('₹${expense.amount.toStringAsFixed(0)}', style: const TextStyle(fontWeight: FontWeight.bold)),
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
          );
        },
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, stack) => Center(child: Text('Error: ${apiErrorMessage(error)}')),
      ),
    );
  }
}
