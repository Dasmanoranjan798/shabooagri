import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../core/database/database.dart';
import '../../../core/widgets/info_row.dart';
import 'machine_list_screen.dart';

final machineDetailProvider = FutureProvider.family<OfflineMachine, String>((ref, id) async {
  final machines = await ref.watch(machinesListProvider.future);
  return machines.firstWhere((m) => m.id == id);
});

class MachineDetailScreen extends ConsumerWidget {
  final String machineId;

  const MachineDetailScreen({super.key, required this.machineId});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final machineAsync = ref.watch(machineDetailProvider(machineId));

    return Scaffold(
      appBar: AppBar(
        title: const Text('Machine Details'),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => context.go('/machines'),
        ),
      ),
      body: machineAsync.when(
        data: (machine) => Padding(
          padding: const EdgeInsets.all(16.0),
          child: ListView(
            children: [
              InfoRow('Registration Number', machine.registrationNumber),
              if (machine.brand != null) InfoRow('Brand', machine.brand!),
              if (machine.model != null) InfoRow('Model', machine.model!),
              InfoRow('Status', machine.status),
              if (machine.hourMeter != null) InfoRow('Hour Meter', machine.hourMeter!.toStringAsFixed(1)),
            ],
          ),
        ),
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, stack) => Center(child: Text('Error: $error')),
      ),
    );
  }
}
