import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../core/database/database.dart';
import '../../../core/network/api_client.dart';
import '../../../core/providers/session_provider.dart';
import '../../../core/repositories/village_repository.dart';
import '../../../core/widgets/app_drawer.dart';
import '../../../core/widgets/confirm_delete.dart';

final villagesListProvider = FutureProvider<List<OfflineVillage>>((ref) async {
  final repository = ref.watch(villageRepositoryProvider);
  await repository.refreshFromApi();
  return repository.getVillages();
});

/// Villages are lightweight master data (just a name) with nothing further
/// to drill into, so this is List-only — no separate Detail screen, unlike
/// the richer modules.
class VillageListScreen extends ConsumerWidget {
  const VillageListScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
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
      body: villagesAsync.when(
        data: (villages) {
          if (villages.isEmpty) {
            return const Center(child: Text('No villages found.'));
          }
          return ListView.builder(
            itemCount: villages.length,
            itemBuilder: (context, index) {
              final village = villages[index];
              return Card(
                margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                child: ListTile(
                  leading: const Icon(Icons.location_city),
                  title: Text(village.name),
                  trailing: (canManage || canDelete)
                      ? PopupMenuButton<String>(
                          onSelected: (action) async {
                            if (action == 'edit') {
                              context.go('/villages/${village.id}/edit', extra: village.name);
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
                            if (canManage) const PopupMenuItem(value: 'edit', child: Text('Edit')),
                            if (canDelete)
                              const PopupMenuItem(value: 'delete', child: Text('Delete', style: TextStyle(color: Colors.red))),
                          ],
                        )
                      : null,
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
