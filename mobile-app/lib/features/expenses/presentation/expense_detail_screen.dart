import 'package:flutter/material.dart';
import 'package:shabooagri_mobile/core/sync/data_sync.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../core/network/api_client.dart';
import '../../../core/network/api_error.dart';
import '../../../core/widgets/adaptive_scaffold.dart';
import '../../../core/widgets/info_row.dart';

final expenseDetailProvider = FutureProvider.family<Map<String, dynamic>, String>((ref, id) async {
  syncOn(ref, {SyncEntity.expense});
  final dio = ref.watch(apiClientProvider);
  final response = await dio.get('/expenses/$id');
  return response.data as Map<String, dynamic>;
});

class ExpenseDetailScreen extends ConsumerWidget {
  final String expenseId;

  const ExpenseDetailScreen({super.key, required this.expenseId});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final expenseAsync = ref.watch(expenseDetailProvider(expenseId));

    return AdaptiveScaffold(
      currentRoute: '/expenses',
      title: 'Expense Details',
      showBack: true,
      actions: [
        IconButton(
          icon: const Icon(Icons.edit),
          tooltip: 'Edit',
          onPressed: () => context.go('/expenses/$expenseId/edit'),
        ),
      ],
      body: expenseAsync.when(
        data: (expense) {
          final category = expense['category'] as Map<String, dynamic>?;
          final machine = expense['machine'] as Map<String, dynamic>?;
          final recorder = expense['incurredByUser'] as Map<String, dynamic>?;
          return ListView(
            padding: const EdgeInsets.all(16.0),
            children: [
              Card(
                margin: EdgeInsets.zero,
                child: Padding(
                  padding: const EdgeInsets.all(16.0),
                  child: Column(
                    children: [
                      InfoRow('Amount', '₹${(double.tryParse(expense['amount'].toString()) ?? 0.0).toStringAsFixed(2)}'),
                      InfoRow('Category', category?['name'] as String? ?? 'Uncategorized'),
                      InfoRow('Linked Machine', machine?['registrationNumber'] as String? ?? 'General Operational Expense'),
                      InfoRow('Recorded By', recorder?['fullName'] as String? ?? 'Company Staff'),
                      InfoRow('Date', (expense['expenseDate'] as String).split('T').first),
                      if (expense['description'] != null && (expense['description'] as String).isNotEmpty)
                        InfoRow('Description & Remarks', expense['description'] as String),
                    ],
                  ),
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
}
