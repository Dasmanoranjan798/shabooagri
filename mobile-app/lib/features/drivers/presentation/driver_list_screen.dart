import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../core/database/database.dart';
import '../../../core/repositories/driver_repository.dart';
import '../../../core/widgets/app_drawer.dart';

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
                  trailing: const Icon(Icons.chevron_right),
                  onTap: () => context.go('/drivers/${driver.id}'),
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
