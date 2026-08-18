import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../core/network/api_client.dart';
import '../../../core/network/api_error.dart';
import '../../../core/providers/session_provider.dart';
import '../../../core/widgets/app_drawer.dart';
import '../../../core/widgets/confirm_delete.dart';
import '../../../core/widgets/search_field.dart';

class CustomerSummary {
  final String id;
  final String name;
  final String? phone;
  final String? address;
  final String villageName;
  final bool hasPortalAccess;

  CustomerSummary.fromJson(Map<String, dynamic> json)
      : id = json['id'] as String,
        name = json['name'] as String,
        phone = json['phone'] as String?,
        address = json['address'] as String?,
        villageName = (json['village'] as Map<String, dynamic>?)?['name'] as String? ?? '—',
        hasPortalAccess = json['userId'] != null;
}

/// Live list (not the offline cache) — Village name, Address, Portal Access
/// aren't on the flat offline table.
final customersListProvider = FutureProvider<List<CustomerSummary>>((ref) async {
  final dio = ref.watch(apiClientProvider);
  final response = await dio.get('/customers');
  return (response.data as List<dynamic>).map((j) => CustomerSummary.fromJson(j as Map<String, dynamic>)).toList();
});

class CustomerListScreen extends ConsumerStatefulWidget {
  const CustomerListScreen({super.key});

  @override
  ConsumerState<CustomerListScreen> createState() => _CustomerListScreenState();
}

class _CustomerListScreenState extends ConsumerState<CustomerListScreen> {
  String _query = '';

  @override
  Widget build(BuildContext context) {
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
          final filtered = _query.isEmpty
              ? customers
              : customers
                  .where((c) =>
                      c.name.toLowerCase().contains(_query) ||
                      c.villageName.toLowerCase().contains(_query) ||
                      (c.phone?.toLowerCase().contains(_query) ?? false) ||
                      (c.address?.toLowerCase().contains(_query) ?? false))
                  .toList();
          return Column(
            children: [
              SearchField(
                hintText: 'Search by Name, Village, Phone, Address...',
                onChanged: (value) => setState(() => _query = value.trim().toLowerCase()),
              ),
              Expanded(
                child: filtered.isEmpty
                    ? Center(child: Text(_query.isEmpty ? 'No customers found.' : 'No customers match your search.'))
                    : ListView.builder(
                        itemCount: filtered.length,
                        itemBuilder: (context, index) {
                          final customer = filtered[index];
                          return Card(
                            margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                            child: ListTile(
                              title: Text(customer.name),
                              subtitle: Text(
                                  '${customer.villageName} · ${customer.phone ?? 'No phone on file'}${customer.hasPortalAccess ? ' · Portal Linked' : ''}'),
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
                                          const PopupMenuItem(
                                              value: 'delete', child: Text('Delete', style: TextStyle(color: Colors.red))),
                                      ],
                                    ),
                                  const Icon(Icons.chevron_right),
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
}
