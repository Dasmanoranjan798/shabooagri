import 'package:flutter/material.dart';
import 'package:shabooagri_mobile/core/sync/data_sync.dart';
import '../../../core/widgets/quick_action_bar.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../core/network/api_client.dart';
import '../../../core/network/api_error.dart';
import '../../../core/providers/session_provider.dart';
import '../../../core/layout/responsive.dart';
import '../../../core/widgets/adaptive_scaffold.dart';
import '../../../core/widgets/confirm_delete.dart';
import '../../../core/widgets/desktop_table.dart';
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
        villageName = (json['village'] as String?)?.isNotEmpty == true ? json['village'] as String : '—',
        hasPortalAccess = json['userId'] != null;
}

/// Live list (not the offline cache) — Village name, Address, Portal Access
/// aren't on the flat offline table.
final customersListProvider = FutureProvider<List<CustomerSummary>>((ref) async {
  syncOn(ref, {SyncEntity.customer});
  final dio = ref.watch(apiClientProvider);
  final response = await dio.get('/customers');
  return (response.data as List<dynamic>).map((j) => CustomerSummary.fromJson(j as Map<String, dynamic>)).toList();
});

class CustomerListScreen extends ConsumerWidget {
  const CustomerListScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final user = ref.watch(currentUserProvider);
    final canManage = user?.isOwnerOrManager ?? false;
    final isDesktop = context.responsive.isDesktop;
    return AdaptiveScaffold(
      currentRoute: '/customers',
      title: 'Customers',
      actions: [
        IconButton(
          icon: const Icon(Icons.refresh),
          tooltip: 'Refresh',
          onPressed: () => ref.invalidate(customersListProvider),
        ),
        if (isDesktop && canManage)
          Padding(
            padding: const EdgeInsets.only(left: 8),
            child: FilledButton.icon(
              onPressed: () => context.go('/customers/new'),
              icon: const Icon(Icons.add),
              label: const Text('New Customer'),
            ),
          ),
      ],
      // On desktop the "New" action is a top-bar button; on phones it's a FAB.
      floatingActionButton: (!isDesktop && canManage)
          ? FloatingActionButton(onPressed: () => context.go('/customers/new'), child: const Icon(Icons.add))
          : null,
      bottomNavigationBar: isDesktop ? null : const QuickActionBar(),
      body: const CustomerListBody(),
    );
  }
}

/// The search + list content of the Customers screen, without the scaffold —
/// so it can be reused both as the standalone screen body and as the Dashboard's
/// contextual "Customers" workspace (no duplicate list/search implementation).
class CustomerListBody extends ConsumerStatefulWidget {
  const CustomerListBody({super.key});

  @override
  ConsumerState<CustomerListBody> createState() => _CustomerListBodyState();
}

class _CustomerListBodyState extends ConsumerState<CustomerListBody> {
  String _query = '';

  @override
  Widget build(BuildContext context) {
    final customersAsync = ref.watch(customersListProvider);
    final user = ref.watch(currentUserProvider);
    final canManage = user?.isOwnerOrManager ?? false;
    final canDelete = user?.roleSystemKey == 'owner';
    final isDesktop = context.responsive.isDesktop;

    return customersAsync.when(
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
                  : isDesktop
                      ? _desktopTable(context, ref, filtered, canManage: canManage, canDelete: canDelete)
                      : ListView.builder(
                      itemCount: filtered.length,
                      itemBuilder: (context, index) {
                        final customer = filtered[index];
                        return Card(
                          margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
                          child: InkWell(
                            onTap: () => context.go('/customers/${customer.id}'),
                            borderRadius: BorderRadius.circular(10),
                            child: Padding(
                              padding: const EdgeInsets.all(16),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Row(
                                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                    children: [
                                      Text(customer.name, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                                      if (canManage || canDelete)
                                        SizedBox(
                                          width: 32,
                                          height: 32,
                                          child: PopupMenuButton<String>(
                                            padding: EdgeInsets.zero,
                                            icon: const Icon(Icons.more_vert, size: 20, color: Colors.grey),
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
                                              if (canDelete) const PopupMenuItem(value: 'delete', child: Text('Delete', style: TextStyle(color: Colors.red))),
                                            ],
                                          ),
                                        ),
                                    ],
                                  ),
                                  const SizedBox(height: 8),
                                  Row(
                                    children: [
                                      const Icon(Icons.location_on, size: 16, color: Colors.grey),
                                      const SizedBox(width: 8),
                                      Expanded(child: Text(customer.villageName, style: const TextStyle(fontSize: 14))),
                                    ],
                                  ),
                                  if (customer.phone != null) ...[
                                    const SizedBox(height: 4),
                                    Row(
                                      children: [
                                        const Icon(Icons.phone, size: 16, color: Colors.grey),
                                        const SizedBox(width: 8),
                                        Expanded(child: Text(customer.phone!, style: const TextStyle(fontSize: 14))),
                                      ],
                                    ),
                                  ],
                                  if (customer.hasPortalAccess) ...[
                                    const SizedBox(height: 8),
                                    Container(
                                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                      decoration: BoxDecoration(
                                        color: Colors.blue.withValues(alpha: 0.1),
                                        borderRadius: BorderRadius.circular(4),
                                      ),
                                      child: const Text('Portal Linked', style: TextStyle(color: Colors.blue, fontSize: 12, fontWeight: FontWeight.bold)),
                                    ),
                                  ]
                                ],
                              ),
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
    );
  }

  /// Desktop presentation: a proper data grid. Same data + same navigation
  /// (row click → detail) + same RBAC (edit/delete gated by role) as the phone
  /// card list — just laid out as a table for mouse/keyboard use.
  Widget _desktopTable(
    BuildContext context,
    WidgetRef ref,
    List<CustomerSummary> customers, {
    required bool canManage,
    required bool canDelete,
  }) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
      child: DesktopTable(
        columns: const [
          DataColumn(label: Text('Name')),
          DataColumn(label: Text('Village')),
          DataColumn(label: Text('Phone')),
          DataColumn(label: Text('Portal')),
          DataColumn(label: Text('Actions')),
        ],
        rows: [
          for (final c in customers)
            DataRow(
              onSelectChanged: (_) => context.go('/customers/${c.id}'),
              cells: [
                DataCell(Text(c.name, style: const TextStyle(fontWeight: FontWeight.w600))),
                DataCell(Text(c.villageName)),
                DataCell(Text(c.phone ?? '—')),
                DataCell(c.hasPortalAccess
                    ? const Text('Linked', style: TextStyle(color: Colors.blue, fontWeight: FontWeight.bold))
                    : const Text('—')),
                DataCell(
                  (canManage || canDelete)
                      ? Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            if (canManage)
                              IconButton(
                                icon: const Icon(Icons.edit, size: 18),
                                tooltip: 'Edit',
                                onPressed: () => context.go('/customers/${c.id}/edit'),
                              ),
                            if (canDelete)
                              IconButton(
                                icon: const Icon(Icons.delete, size: 18, color: Colors.red),
                                tooltip: 'Delete',
                                onPressed: () async {
                                  final dio = ref.read(apiClientProvider);
                                  await confirmAndDelete(
                                    context: context,
                                    entityLabel: c.name,
                                    onDelete: () => dio.delete('/customers/${c.id}'),
                                    onSuccess: () => ref.invalidate(customersListProvider),
                                  );
                                },
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
}
