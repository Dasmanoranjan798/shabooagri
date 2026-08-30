import 'package:flutter/material.dart';
import 'package:shabooagri_mobile/core/sync/data_sync.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:share_plus/share_plus.dart' show Share;
import '../../../core/layout/responsive.dart';
import '../../../core/network/api_client.dart';
import '../../../core/network/api_error.dart';
import '../../../core/providers/session_provider.dart';
import '../../../core/widgets/adaptive_scaffold.dart';
import '../../../core/widgets/confirm_delete.dart';
import '../../../core/widgets/desktop_table.dart';
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
        amount = (double.tryParse(json['amount'].toString()) ?? 0.0),
        description = json['description'] as String?,
        expenseDate = json['expenseDate'] as String,
        categoryId = (json['category'] as Map<String, dynamic>?)?['id'] as String? ?? '',
        categoryName = (json['category'] as Map<String, dynamic>?)?['name'] as String? ?? 'Uncategorized',
        machineRegistration = (json['machine'] as Map<String, dynamic>?)?['registrationNumber'] as String?,
        recordedBy = (json['incurredByUser'] as Map<String, dynamic>?)?['fullName'] as String? ?? 'Company Staff';
}

final expensesListProvider = FutureProvider<List<ExpenseSummary>>((ref) async {
  syncOn(ref, {SyncEntity.expense});
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

  Future<void> _delete(ExpenseSummary expense) async {
    final dio = ref.read(apiClientProvider);
    await confirmAndDelete(
      context: context,
      entityLabel: 'this expense',
      onDelete: () => dio.delete('/expenses/${expense.id}'),
      onSuccess: () => ref.invalidate(expensesListProvider),
    );
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
    final isDesktop = context.responsive.isDesktop;

    return AdaptiveScaffold(
      currentRoute: '/expenses',
      title: 'Expenses',
      actions: [
        IconButton(
          icon: const Icon(Icons.ios_share),
          tooltip: 'Export CSV',
          onPressed: () => expensesAsync.whenData(_exportCsv),
        ),
        IconButton(icon: const Icon(Icons.refresh), onPressed: () => ref.invalidate(expensesListProvider)),
        if (isDesktop && canManage)
          Padding(
            padding: const EdgeInsets.only(left: 8),
            child: FilledButton.icon(
              onPressed: () => context.go('/expenses/new'),
              icon: const Icon(Icons.add),
              label: const Text('New Expense'),
            ),
          ),
      ],
      floatingActionButton: (!isDesktop && canManage)
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
                child: GridView.extent(
                  maxCrossAxisExtent: isDesktop ? 280 : 240,
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
                    : isDesktop
                        ? _desktopTable(context, filtered, canManage: canManage)
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
                                          await _delete(expense);
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

  /// Desktop presentation: a proper expenses data grid — same data + row nav +
  /// RBAC as the phone list.
  Widget _desktopTable(BuildContext context, List<ExpenseSummary> expenses, {required bool canManage}) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
      child: DesktopTable(
        columns: const [
          DataColumn(label: Text('Date')),
          DataColumn(label: Text('Category')),
          DataColumn(label: Text('Machine')),
          DataColumn(label: Text('Recorded By')),
          DataColumn(label: Text('Amount'), numeric: true),
          DataColumn(label: Text('Actions')),
        ],
        rows: [
          for (final e in expenses)
            DataRow(
              onSelectChanged: (_) => context.go('/expenses/${e.id}'),
              cells: [
                DataCell(Text(e.expenseDate.split('T').first)),
                DataCell(Text(e.categoryName, style: const TextStyle(fontWeight: FontWeight.w600))),
                DataCell(Text(e.machineRegistration ?? '—')),
                DataCell(Text(e.recordedBy)),
                DataCell(Text('₹${e.amount.toStringAsFixed(0)}', style: const TextStyle(fontWeight: FontWeight.bold))),
                DataCell(
                  canManage
                      ? Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            IconButton(
                              icon: const Icon(Icons.edit, size: 18),
                              tooltip: 'Edit',
                              onPressed: () => context.go('/expenses/${e.id}/edit'),
                            ),
                            IconButton(
                              icon: const Icon(Icons.delete, size: 18, color: Colors.red),
                              tooltip: 'Delete',
                              onPressed: () => _delete(e),
                            ),
                          ],
                        )
                      : const Text('—'),
                ),
              ],
            ),
        ],
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
