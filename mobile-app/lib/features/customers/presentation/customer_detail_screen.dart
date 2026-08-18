import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../core/network/api_client.dart';
import '../../../core/network/api_error.dart';
import '../../../core/widgets/info_row.dart';

final customerDetailProvider = FutureProvider.family<Map<String, dynamic>, String>((ref, id) async {
  final dio = ref.watch(apiClientProvider);
  final response = await dio.get('/customers/$id');
  return response.data as Map<String, dynamic>;
});

class CustomerDetailScreen extends ConsumerWidget {
  final String customerId;

  const CustomerDetailScreen({super.key, required this.customerId});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final customerAsync = ref.watch(customerDetailProvider(customerId));

    return Scaffold(
      appBar: AppBar(
        title: const Text('Customer Details'),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => context.go('/customers'),
        ),
      ),
      body: customerAsync.when(
        data: (customer) {
          final villageName = (customer['village'] as Map<String, dynamic>?)?['name'] as String? ?? 'N/A';
          return Padding(
            padding: const EdgeInsets.all(16.0),
            child: ListView(
              children: [
                InfoRow('Name', customer['name'] as String),
                InfoRow('Village', villageName),
                InfoRow('Mobile Contact', customer['phone'] as String? ?? 'N/A'),
                InfoRow('Portal Access', customer['userId'] != null ? 'Linked to Portal Account' : 'Standard Record'),
                if (customer['address'] != null && (customer['address'] as String).isNotEmpty)
                  InfoRow('Address / Field Location', customer['address'] as String),
                if (customer['notes'] != null && (customer['notes'] as String).isNotEmpty)
                  InfoRow('Notes', customer['notes'] as String),
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
