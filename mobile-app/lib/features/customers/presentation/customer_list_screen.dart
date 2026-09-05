import 'package:flutter/material.dart';
import 'package:shabooagri_mobile/core/sync/data_sync.dart';
import '../../../core/widgets/quick_action_bar.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../core/network/api_client.dart';
import '../../../core/network/api_error.dart';
import '../../../core/providers/session_provider.dart';
import '../../../core/layout/responsive.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/utils/money.dart';
import '../../../core/widgets/adaptive_scaffold.dart';
import '../../../core/widgets/confirm_delete.dart';
import '../../../core/widgets/desktop_table.dart';
import '../../../core/widgets/list_action_bar.dart';

class CustomerSummary {
  final String id;
  final String name;
  final String? phone;
  final String? address;
  final String? village;
  final String? block;
  final String? district;
  final String villageName;
  final bool hasPortalAccess;
  // Backend-authoritative financial standing (customer.service.listWithFinance).
  final double outstanding; // money to COLLECT (green)
  final double creditBalance; // available advance/credit from overpayment

  CustomerSummary.fromJson(Map<String, dynamic> json)
      : id = json['id'] as String,
        name = json['name'] as String,
        phone = json['phone'] as String?,
        address = json['address'] as String?,
        village = json['village'] as String?,
        block = json['block'] as String?,
        district = json['district'] as String?,
        villageName = (json['village'] as String?)?.isNotEmpty == true ? json['village'] as String : '—',
        hasPortalAccess = json['userId'] != null,
        outstanding = double.tryParse(json['outstanding']?.toString() ?? '0') ?? 0,
        creditBalance = double.tryParse(json['creditBalance']?.toString() ?? '0') ?? 0;

  /// The customer's actual/original stored address. Prefer the free-text
  /// `address`; otherwise compose from the structured locality fields. Never a
  /// placeholder — falls back to the village name, then a neutral dash.
  String get displayAddress {
    final full = address?.trim();
    if (full != null && full.isNotEmpty) return full;
    final parts = [village, block, district].where((p) => p != null && p.trim().isNotEmpty).map((p) => p!.trim());
    final composed = parts.join(', ');
    return composed.isNotEmpty ? composed : '—';
  }
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
      // On desktop the "New" action is a top-bar button; on phones it now lives
      // inline in the compact search/action bar (ListActionBar) — no FAB, so the
      // list keeps the full width and there's a single New affordance.
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
                    c.displayAddress.toLowerCase().contains(_query))
                .toList();
        return Column(
          children: [
            ListActionBar(
              hintText: 'Search by Name, Village, Phone, Address...',
              onChanged: (value) => setState(() => _query = value.trim().toLowerCase()),
              // Inline New on phones; desktop keeps its top-bar button.
              actionLabel: (!isDesktop && canManage) ? 'New Customer' : null,
              onAction: (!isDesktop && canManage) ? () => context.go('/customers/new') : null,
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
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Expanded(
                                        child: Text(customer.name,
                                            style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                                      ),
                                      if (canManage || canDelete)
                                        SizedBox(
                                          width: 32,
                                          height: 32,
                                          child: PopupMenuButton<String>(
                                            padding: EdgeInsets.zero,
                                            icon: const Icon(Icons.more_vert, size: 20, color: AppTheme.textMuted),
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
                                              if (canDelete) const PopupMenuItem(value: 'delete', child: Text('Delete', style: TextStyle(color: AppTheme.danger))),
                                            ],
                                          ),
                                        ),
                                    ],
                                  ),
                                  const SizedBox(height: 6),
                                  // Original/stored address (§ customer address).
                                  Row(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      const Icon(Icons.location_on, size: 15, color: AppTheme.textMuted),
                                      const SizedBox(width: 6),
                                      Expanded(
                                          child: Text(customer.displayAddress,
                                              style: const TextStyle(fontSize: 13, color: AppTheme.textMuted))),
                                    ],
                                  ),
                                  if (customer.phone != null) ...[
                                    const SizedBox(height: 3),
                                    Row(
                                      children: [
                                        const Icon(Icons.phone, size: 15, color: AppTheme.textMuted),
                                        const SizedBox(width: 6),
                                        Text(customer.phone!, style: const TextStyle(fontSize: 13, color: AppTheme.textMuted)),
                                        if (customer.hasPortalAccess) ...[
                                          const SizedBox(width: 8),
                                          const Icon(Icons.link, size: 14, color: AppTheme.info),
                                        ],
                                      ],
                                    ),
                                  ],
                                  const SizedBox(height: 10),
                                  // Financial standing: GREEN = money to collect.
                                  _CustomerOutstanding(outstanding: customer.outstanding, credit: customer.creditBalance),
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
          DataColumn(label: Text('Address')),
          DataColumn(label: Text('Phone')),
          DataColumn(label: Text('Outstanding'), numeric: true),
          DataColumn(label: Text('Actions')),
        ],
        rows: [
          for (final c in customers)
            DataRow(
              onSelectChanged: (_) => context.go('/customers/${c.id}'),
              cells: [
                DataCell(Text(c.name, style: const TextStyle(fontWeight: FontWeight.w600))),
                DataCell(ConstrainedBox(
                  constraints: const BoxConstraints(maxWidth: 260),
                  child: Text(c.displayAddress, overflow: TextOverflow.ellipsis),
                )),
                DataCell(Text(c.phone ?? '—')),
                DataCell(c.outstanding > 0
                    ? Text(rupees(c.outstanding),
                        style: const TextStyle(color: AppTheme.receivable, fontWeight: FontWeight.bold))
                    : c.creditBalance > 0
                        ? Text('${rupees(c.creditBalance)} cr', style: const TextStyle(color: AppTheme.info))
                        : const Text('—', style: TextStyle(color: AppTheme.textMuted))),
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

/// Customer financial standing for the list card. GREEN = money to COLLECT
/// (outstanding/receivable). Advance credit (customer paid ahead) is shown
/// neutrally in blue — it is not a receivable, so it must not read as green.
class _CustomerOutstanding extends StatelessWidget {
  final double outstanding;
  final double credit;
  const _CustomerOutstanding({required this.outstanding, required this.credit});

  @override
  Widget build(BuildContext context) {
    if (outstanding > 0) {
      return Row(
        children: [
          const Text('Outstanding', style: TextStyle(fontSize: 12, color: AppTheme.textMuted)),
          const SizedBox(width: 8),
          Expanded(
            child: Text(rupees(outstanding),
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: AppTheme.receivable)),
          ),
        ],
      );
    }
    if (credit > 0) {
      return Row(
        children: [
          const Text('Advance credit', style: TextStyle(fontSize: 12, color: AppTheme.textMuted)),
          const SizedBox(width: 8),
          Expanded(
            child: Text('${rupees(credit)} available',
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: AppTheme.info)),
          ),
        ],
      );
    }
    return const Text('No outstanding', style: TextStyle(fontSize: 13, color: AppTheme.textMuted));
  }
}
