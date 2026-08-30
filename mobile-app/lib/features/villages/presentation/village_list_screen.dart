import 'package:flutter/material.dart';
import 'package:shabooagri_mobile/core/sync/data_sync.dart';
import '../../../core/widgets/quick_action_bar.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../core/layout/responsive.dart';
import '../../../core/network/api_client.dart';
import '../../../core/network/api_error.dart';
import '../../../core/providers/session_provider.dart';
import '../../../core/widgets/adaptive_scaffold.dart';
import '../../../core/widgets/confirm_delete.dart';
import '../../../core/widgets/desktop_table.dart';
import '../../../core/widgets/search_field.dart';

class VillageSummary {
  final String id;
  final String name;
  final bool isActive;

  VillageSummary.fromJson(Map<String, dynamic> json)
      : id = json['id'] as String,
        name = json['name'] as String,
        isActive = json['isActive'] as bool? ?? true;
}

/// Live list (not the offline cache) — `isActive` isn't on the flat
/// offline table, and the Mark Inactive/Active action needs it.
final villagesListProvider = FutureProvider<List<VillageSummary>>((ref) async {
  syncOn(ref, {SyncEntity.village});
  final dio = ref.watch(apiClientProvider);
  final response = await dio.get('/villages');
  return (response.data as List<dynamic>).map((j) => VillageSummary.fromJson(j as Map<String, dynamic>)).toList();
});

class VillageListScreen extends ConsumerStatefulWidget {
  const VillageListScreen({super.key});

  @override
  ConsumerState<VillageListScreen> createState() => _VillageListScreenState();
}

class _VillageListScreenState extends ConsumerState<VillageListScreen> {
  String _query = '';

  Future<void> _toggleActive(WidgetRef ref, VillageSummary village) async {
    final dio = ref.read(apiClientProvider);
    try {
      await dio.patch('/villages/${village.id}', data: {'isActive': !village.isActive});
      ref.invalidate(villagesListProvider);
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(apiErrorMessage(e))));
      }
    }
  }

  Future<void> _delete(VillageSummary village) async {
    final dio = ref.read(apiClientProvider);
    await confirmAndDelete(
      context: context,
      entityLabel: village.name,
      onDelete: () => dio.delete('/villages/${village.id}'),
      onSuccess: () => ref.invalidate(villagesListProvider),
    );
  }

  @override
  Widget build(BuildContext context) {
    final villagesAsync = ref.watch(villagesListProvider);
    final user = ref.watch(currentUserProvider);
    final canManage = user?.isOwnerOrManager ?? false;
    final canDelete = user?.roleSystemKey == 'owner';
    final isDesktop = context.responsive.isDesktop;

    return AdaptiveScaffold(
      currentRoute: '/villages',
      title: 'Villages',
      actions: [
        IconButton(
          icon: const Icon(Icons.refresh),
          onPressed: () => ref.invalidate(villagesListProvider),
        ),
        if (isDesktop && canManage)
          Padding(
            padding: const EdgeInsets.only(left: 8),
            child: FilledButton.icon(
              onPressed: () => context.go('/villages/new'),
              icon: const Icon(Icons.add),
              label: const Text('New Village'),
            ),
          ),
      ],
      floatingActionButton: (!isDesktop && canManage)
          ? FloatingActionButton(
              onPressed: () => context.go('/villages/new'),
              child: const Icon(Icons.add),
            )
          : null,
      bottomNavigationBar: isDesktop ? null : const QuickActionBar(),
      body: villagesAsync.when(
        data: (villages) {
          final filtered =
              _query.isEmpty ? villages : villages.where((v) => v.name.toLowerCase().contains(_query)).toList();
          return Column(
            children: [
              SearchField(
                hintText: 'Search by name...',
                onChanged: (value) => setState(() => _query = value.trim().toLowerCase()),
              ),
              Expanded(
                child: filtered.isEmpty
                    ? Center(child: Text(_query.isEmpty ? 'No villages found.' : 'No villages match your search.'))
                    : isDesktop
                        ? _desktopTable(context, filtered, canManage: canManage, canDelete: canDelete)
                        : ListView.builder(
                        itemCount: filtered.length,
                        itemBuilder: (context, index) {
                          final village = filtered[index];
                          return Card(
                            margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                            child: ListTile(
                              leading: const Icon(Icons.location_city),
                              title: Text(village.name),
                              subtitle: Text(village.isActive ? 'Active' : 'Inactive',
                                  style: TextStyle(color: village.isActive ? Colors.green : Colors.grey)),
                              trailing: (canManage || canDelete)
                                  ? PopupMenuButton<String>(
                                      onSelected: (action) async {
                                        if (action == 'edit') {
                                          context.go('/villages/${village.id}/edit', extra: village.name);
                                        } else if (action == 'toggle') {
                                          await _toggleActive(ref, village);
                                        } else if (action == 'delete') {
                                          await _delete(village);
                                        }
                                      },
                                      itemBuilder: (context) => [
                                        if (canManage) const PopupMenuItem(value: 'edit', child: Text('Rename')),
                                        if (canManage)
                                          PopupMenuItem(
                                              value: 'toggle', child: Text(village.isActive ? 'Mark Inactive' : 'Mark Active')),
                                        if (canDelete)
                                          const PopupMenuItem(
                                              value: 'delete', child: Text('Delete', style: TextStyle(color: Colors.red))),
                                      ],
                                    )
                                  : null,
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

  /// Desktop presentation: a proper villages data grid with the same
  /// rename / mark-active-inactive / delete actions (RBAC-gated) as the phone
  /// list.
  Widget _desktopTable(
    BuildContext context,
    List<VillageSummary> villages, {
    required bool canManage,
    required bool canDelete,
  }) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
      child: DesktopTable(
        columns: const [
          DataColumn(label: Text('Village')),
          DataColumn(label: Text('Status')),
          DataColumn(label: Text('Actions')),
        ],
        rows: [
          for (final v in villages)
            DataRow(
              cells: [
                DataCell(Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Icon(Icons.location_city, size: 18, color: Colors.grey),
                    const SizedBox(width: 8),
                    Text(v.name, style: const TextStyle(fontWeight: FontWeight.w600)),
                  ],
                )),
                DataCell(Text(v.isActive ? 'Active' : 'Inactive',
                    style: TextStyle(color: v.isActive ? Colors.green : Colors.grey))),
                DataCell(
                  (canManage || canDelete)
                      ? Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            if (canManage)
                              IconButton(
                                icon: const Icon(Icons.edit, size: 18),
                                tooltip: 'Rename',
                                onPressed: () => context.go('/villages/${v.id}/edit', extra: v.name),
                              ),
                            if (canManage)
                              IconButton(
                                icon: Icon(v.isActive ? Icons.toggle_on : Icons.toggle_off, size: 22),
                                color: v.isActive ? Colors.green : Colors.grey,
                                tooltip: v.isActive ? 'Mark Inactive' : 'Mark Active',
                                onPressed: () => _toggleActive(ref, v),
                              ),
                            if (canDelete)
                              IconButton(
                                icon: const Icon(Icons.delete, size: 18, color: Colors.red),
                                tooltip: 'Delete',
                                onPressed: () => _delete(v),
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
