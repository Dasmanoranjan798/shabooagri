import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../core/database/database.dart';
import '../../../core/network/api_client.dart';
import '../../../core/providers/session_provider.dart';
import '../../../core/repositories/customer_repository.dart';
import '../../../core/widgets/app_drawer.dart';
import '../../../core/widgets/confirm_delete.dart';

final customersListProvider = FutureProvider<List<OfflineCustomer>>((ref) async {
  final repository = ref.watch(customerRepositoryProvider);
  await repository.refreshFromApi();
  return repository.getCustomers();
});

class CustomerListScreen extends ConsumerWidget {
  const CustomerListScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final customersAsync = ref.watch(customersListProvider);
    final user = ref.watch(currentUserProvider);
    final canManage = user?.isOwnerOrManager ?? false;
    final canDelete = user?.roleSystemKey == 'owner';

    return Scaffold(
      drawer: const AppDrawer(currentRoute: '/customers'),
      appBar: AppBar(
        title: const Text('Customers'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () => ref.invalidate(customersListProvider),
          ),
        ],
      ),
      floatingActionButton: canManage
          ? FloatingActionButton(onPressed: () => context.go('/customers/new'), child: const Icon(Icons.add))
          : null,
      body: customersAsync.when(
        data: (customers) {
          if (customers.isEmpty) {
            return const Center(child: Text('No customers found.'));
          }
          return ListView.builder(
            itemCount: customers.length,
            itemBuilder: (context, index) {
              final customer = customers[index];
              return Card(
                margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                child: ListTile(
                  title: Text(customer.name),
                  subtitle: Text(customer.mobileNumber ?? 'No phone on file'),
                  onTap: () => context.go('/customers/${customer.id}'),
                  trailing: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      if (canManage || canDelete)
                        PopupMenuButton<String>(
                          onSelected: (action) async {
                            if (action == 'edit') {
                              context.go('/customers/${customer.id}/edit');
                            } else if (action == 'delete') {
                              final dio = ref.read(apiClientProvider);
                              await confirmAndDelete(
                                context: context,
                                entityLabel: customer.name,
                                onDelete: () => dio.delete('/customers/${customer.id}'),
                                onSuccess: () => ref.invalidate(customersListProvider),
                              );
                            }
                          },
                          itemBuilder: (context) => [
                            if (canManage) const PopupMenuItem(value: 'edit', child: Text('Edit')),
                            if (canDelete)
                              const PopupMenuItem(value: 'delete', child: Text('Delete', style: TextStyle(color: Colors.red))),
                          ],
                        ),
                      const Icon(Icons.chevron_right),
                    ],
                  ),
                ),
              );
            },
          );
        },
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, stack) => Center(child: Text('Error: $error')),
      ),
    );
  }
}
