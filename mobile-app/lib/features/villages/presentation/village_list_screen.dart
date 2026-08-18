import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/database/database.dart';
import '../../../core/repositories/village_repository.dart';
import '../../../core/widgets/app_drawer.dart';

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
