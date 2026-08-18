import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../core/database/database.dart';
import '../../../core/widgets/info_row.dart';
import 'customer_list_screen.dart';

final customerDetailProvider = FutureProvider.family<OfflineCustomer, String>((ref, id) async {
  final customers = await ref.watch(customersListProvider.future);
  return customers.firstWhere((c) => c.id == id);
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
        data: (customer) => Padding(
          padding: const EdgeInsets.all(16.0),
          child: ListView(
            children: [
              InfoRow('Name', customer.name),
              if (customer.mobileNumber != null) InfoRow('Mobile Number', customer.mobileNumber!),
            ],
          ),
        ),
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, stack) => Center(child: Text('Error: $error')),
      ),
    );
  }
}
