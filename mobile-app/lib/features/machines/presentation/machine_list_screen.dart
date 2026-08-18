import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../core/database/database.dart';
import '../../../core/repositories/machine_repository.dart';
import '../../../core/widgets/app_drawer.dart';

final machinesListProvider = FutureProvider<List<OfflineMachine>>((ref) async {
  final repository = ref.watch(machineRepositoryProvider);
  await repository.refreshFromApi();
  return repository.getMachines();
});

class MachineListScreen extends ConsumerWidget {
  const MachineListScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final machinesAsync = ref.watch(machinesListProvider);

    return Scaffold(
      drawer: const AppDrawer(currentRoute: '/machines'),
      appBar: AppBar(
        title: const Text('Machines'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () => ref.invalidate(machinesListProvider),
          ),
        ],
      ),
      body: machinesAsync.when(
        data: (machines) {
          if (machines.isEmpty) {
            return const Center(child: Text('No machines found.'));
          }
          return ListView.builder(
            itemCount: machines.length,
            itemBuilder: (context, index) {
              final machine = machines[index];
              final title = [machine.brand, machine.model].where((s) => s != null && s.isNotEmpty).join(' ');
              return Card(
                margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                child: ListTile(
                  title: Text(title.isNotEmpty ? title : machine.registrationNumber),
                  subtitle: Text('${machine.registrationNumber} · ${machine.status}'),
                  trailing: const Icon(Icons.chevron_right),
                  onTap: () => context.go('/machines/${machine.id}'),
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
