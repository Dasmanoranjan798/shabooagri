import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../core/network/api_client.dart';
import '../../../core/network/api_error.dart';
import '../../../core/widgets/info_row.dart';

final expenseDetailProvider = FutureProvider.family<Map<String, dynamic>, String>((ref, id) async {
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

    return Scaffold(
      appBar: AppBar(
        title: const Text('Expense Details'),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => context.go('/expenses'),
        ),
      ),
      body: expenseAsync.when(
        data: (expense) {
          final category = expense['category'] as Map<String, dynamic>?;
          final machine = expense['machine'] as Map<String, dynamic>?;
          final recorder = expense['incurredByUser'] as Map<String, dynamic>?;
          return Padding(
            padding: const EdgeInsets.all(16.0),
            child: ListView(
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
          );
        },
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, stack) => Center(child: Text('Error: ${apiErrorMessage(error)}')),
      ),
    );
  }
}
