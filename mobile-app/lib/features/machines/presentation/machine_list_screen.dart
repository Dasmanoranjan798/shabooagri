import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../core/database/database.dart';
import '../../../core/network/api_client.dart';
import '../../../core/providers/session_provider.dart';
import '../../../core/repositories/machine_repository.dart';
import '../../../core/widgets/app_drawer.dart';
import '../../../core/widgets/confirm_delete.dart';

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
    final user = ref.watch(currentUserProvider);
    final canManage = user?.isOwnerOrManager ?? false;
    final canDelete = user?.roleSystemKey == 'owner';

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
      floatingActionButton: canManage
          ? FloatingActionButton(onPressed: () => context.go('/machines/new'), child: const Icon(Icons.add))
          : null,
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
                  onTap: () => context.go('/machines/${machine.id}'),
                  trailing: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      if (canManage || canDelete)
                        PopupMenuButton<String>(
                          onSelected: (action) async {
                            if (action == 'edit') {
                              context.go('/machines/${machine.id}/edit');
                            } else if (action == 'delete') {
                              final dio = ref.read(apiClientProvider);
                              await confirmAndDelete(
                                context: context,
                                entityLabel: machine.registrationNumber,
                                onDelete: () => dio.delete('/machines/${machine.id}'),
                                onSuccess: () => ref.invalidate(machinesListProvider),
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
