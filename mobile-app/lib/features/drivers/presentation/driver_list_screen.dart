import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../core/database/database.dart';
import '../../../core/network/api_client.dart';
import '../../../core/providers/session_provider.dart';
import '../../../core/repositories/driver_repository.dart';
import '../../../core/widgets/app_drawer.dart';
import '../../../core/widgets/confirm_delete.dart';

final driversListProvider = FutureProvider<List<OfflineDriver>>((ref) async {
  final repository = ref.watch(driverRepositoryProvider);
  await repository.refreshFromApi();
  return repository.getDrivers();
});

class DriverListScreen extends ConsumerWidget {
  const DriverListScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final driversAsync = ref.watch(driversListProvider);
    final user = ref.watch(currentUserProvider);
    final canManage = user?.isOwnerOrManager ?? false;
    final canDelete = user?.roleSystemKey == 'owner';

    return Scaffold(
      drawer: const AppDrawer(currentRoute: '/drivers'),
      appBar: AppBar(
        title: const Text('Drivers'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () => ref.invalidate(driversListProvider),
          ),
        ],
      ),
      floatingActionButton: canManage
          ? FloatingActionButton(onPressed: () => context.go('/drivers/new'), child: const Icon(Icons.add))
          : null,
      body: driversAsync.when(
        data: (drivers) {
          if (drivers.isEmpty) {
            return const Center(child: Text('No drivers found.'));
          }
          return ListView.builder(
            itemCount: drivers.length,
            itemBuilder: (context, index) {
              final driver = drivers[index];
              return Card(
                margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                child: ListTile(
                  title: Text(driver.name),
                  subtitle: Text(driver.availabilityStatus),
                  onTap: () => context.go('/drivers/${driver.id}'),
                  trailing: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      if (canManage || canDelete)
                        PopupMenuButton<String>(
                          onSelected: (action) async {
                            if (action == 'edit') {
                              context.go('/drivers/${driver.id}/edit');
                            } else if (action == 'delete') {
                              final dio = ref.read(apiClientProvider);
                              await confirmAndDelete(
                                context: context,
                                entityLabel: driver.name,
                                onDelete: () => dio.delete('/drivers/${driver.id}'),
                                onSuccess: () => ref.invalidate(driversListProvider),
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
