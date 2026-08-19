import 'package:flutter/material.dart';
import '../../../core/widgets/quick_action_bar.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../core/network/api_client.dart';
import '../../../core/network/api_error.dart';
import '../../../core/providers/session_provider.dart';
import '../../../core/widgets/app_drawer.dart';
import '../../../core/widgets/confirm_delete.dart';
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

  @override
  Widget build(BuildContext context) {
    final villagesAsync = ref.watch(villagesListProvider);
    final user = ref.watch(currentUserProvider);
    final canManage = user?.isOwnerOrManager ?? false;
    final canDelete = user?.roleSystemKey == 'owner';

    return Scaffold(
      drawer: const AppDrawer(currentRoute: '/villages'),
      appBar: AppBar(
        title: const Text('Villages'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () => ref.invalidate(villagesListProvider),
          ),
        ],
      ),
      floatingActionButton: canManage
          ? FloatingActionButton(
              onPressed: () => context.go('/villages/new'),
              child: const Icon(Icons.add),
            )
          : null,
      bottomNavigationBar: const QuickActionBar(),
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
                                          final dio = ref.read(apiClientProvider);
                                          await confirmAndDelete(
                                            context: context,
                                            entityLabel: village.name,
                                            onDelete: () => dio.delete('/villages/${village.id}'),
                                            onSuccess: () => ref.invalidate(villagesListProvider),
                                          );
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
}
