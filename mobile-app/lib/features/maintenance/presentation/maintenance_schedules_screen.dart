import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../core/network/api_client.dart';
import '../../../core/network/api_error.dart';
import '../../../core/providers/session_provider.dart';
import '../../../core/widgets/confirm_delete.dart';
import '../../machines/presentation/machine_list_screen.dart';

class MaintenanceSchedule {
  final String id;
  final String machineId;
  final String machineRegistration;
  final double? intervalHours;
  final int? intervalDays;
  final String? description;

  MaintenanceSchedule.fromJson(Map<String, dynamic> json)
      : id = json['id'] as String,
        machineId = (json['machine'] as Map<String, dynamic>)['id'] as String,
        machineRegistration = (json['machine'] as Map<String, dynamic>)['registrationNumber'] as String,
        intervalHours = (json['intervalHours'] as num?)?.toDouble(),
        intervalDays = json['intervalDays'] as int?,
        description = json['description'] as String?;
}

final maintenanceSchedulesProvider = FutureProvider<List<MaintenanceSchedule>>((ref) async {
  final dio = ref.watch(apiClientProvider);
  final response = await dio.get('/maintenance/schedules');
  return (response.data as List<dynamic>).map((j) => MaintenanceSchedule.fromJson(j as Map<String, dynamic>)).toList();
});

/// Simple enough (3 real fields) to manage via an in-place dialog rather
/// than a dedicated full-screen form, unlike the richer Records flow.
class MaintenanceSchedulesScreen extends ConsumerWidget {
  const MaintenanceSchedulesScreen({super.key});

  Future<void> _showScheduleDialog(BuildContext context, WidgetRef ref, {MaintenanceSchedule? existing}) async {
    String? machineId = existing?.machineId;
    final hoursController = TextEditingController(text: existing?.intervalHours?.toString());
    final daysController = TextEditingController(text: existing?.intervalDays?.toString());
    final descController = TextEditingController(text: existing?.description);

    final saved = await showDialog<bool>(
      context: context,
      builder: (context) => StatefulBuilder(
        builder: (context, setDialogState) => AlertDialog(
          title: Text(existing == null ? 'New Schedule' : 'Edit Schedule'),
          content: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                if (existing == null)
                  Consumer(builder: (context, ref, _) {
                    final machinesAsync = ref.watch(machinesListProvider);
                    return machinesAsync.when(
                      data: (machines) => DropdownButtonFormField<String>(
                        initialValue: machineId,
                        decoration: const InputDecoration(labelText: 'Machine *', border: OutlineInputBorder()),
                        items: machines.map((m) => DropdownMenuItem(value: m.id, child: Text(m.registrationNumber))).toList(),
                        onChanged: (value) => setDialogState(() => machineId = value),
                      ),
                      loading: () => const LinearProgressIndicator(),
                      error: (e, s) => Text('Could not load machines: ${apiErrorMessage(e)}'),
                    );
                  }),
                const SizedBox(height: 12),
                TextField(
                  controller: hoursController,
                  decoration: const InputDecoration(labelText: 'Interval (hours)', border: OutlineInputBorder()),
                  keyboardType: const TextInputType.numberWithOptions(decimal: true),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: daysController,
                  decoration: const InputDecoration(labelText: 'Interval (days)', border: OutlineInputBorder()),
                  keyboardType: TextInputType.number,
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: descController,
                  decoration: const InputDecoration(labelText: 'Description', border: OutlineInputBorder()),
                ),
              ],
            ),
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Cancel')),
            ElevatedButton(
              onPressed: () async {
                if (existing == null && machineId == null) return;
                final dio = ref.read(apiClientProvider);
                final data = {
                  if (existing == null) 'machineId': machineId,
                  if (hoursController.text.trim().isNotEmpty) 'intervalHours': double.tryParse(hoursController.text.trim()),
                  if (daysController.text.trim().isNotEmpty) 'intervalDays': int.tryParse(daysController.text.trim()),
                  if (descController.text.trim().isNotEmpty) 'description': descController.text.trim(),
                };
                try {
                  if (existing == null) {
                    await dio.post('/maintenance/schedules', data: data);
                  } else {
                    await dio.patch('/maintenance/schedules/${existing.id}', data: data);
                  }
                  if (context.mounted) Navigator.pop(context, true);
                } catch (e) {
                  if (context.mounted) {
                    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(apiErrorMessage(e))));
                  }
                }
              },
              child: const Text('Save'),
            ),
          ],
        ),
      ),
    );
    if (saved == true) ref.invalidate(maintenanceSchedulesProvider);
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final schedulesAsync = ref.watch(maintenanceSchedulesProvider);
    final user = ref.watch(currentUserProvider);
    final canManage = user?.isOwnerOrManager ?? false;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Maintenance Schedules'),
        leading: IconButton(icon: const Icon(Icons.arrow_back), onPressed: () => context.go('/maintenance')),
      ),
      floatingActionButton: canManage
          ? FloatingActionButton(onPressed: () => _showScheduleDialog(context, ref), child: const Icon(Icons.add))
          : null,
      body: schedulesAsync.when(
        data: (schedules) {
          if (schedules.isEmpty) return const Center(child: Text('No maintenance schedules found.'));
          return ListView.builder(
            itemCount: schedules.length,
            itemBuilder: (context, index) {
              final s = schedules[index];
              final intervalText = [
                if (s.intervalHours != null) '${s.intervalHours!.toStringAsFixed(0)} hrs',
                if (s.intervalDays != null) '${s.intervalDays} days',
              ].join(' / ');
              return Card(
                margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                child: ListTile(
                  title: Text(s.machineRegistration),
                  subtitle: Text('${s.description ?? 'Routine Maintenance'}${intervalText.isNotEmpty ? ' · $intervalText' : ''}'),
                  trailing: canManage
                      ? PopupMenuButton<String>(
                          onSelected: (action) async {
                            if (action == 'edit') {
                              _showScheduleDialog(context, ref, existing: s);
                            } else if (action == 'delete') {
                              final dio = ref.read(apiClientProvider);
                              await confirmAndDelete(
                                context: context,
                                entityLabel: 'this schedule',
                                onDelete: () => dio.delete('/maintenance/schedules/${s.id}'),
                                onSuccess: () => ref.invalidate(maintenanceSchedulesProvider),
                              );
                            }
                          },
                          itemBuilder: (context) => const [
                            PopupMenuItem(value: 'edit', child: Text('Edit')),
                            PopupMenuItem(value: 'delete', child: Text('Delete', style: TextStyle(color: Colors.red))),
                          ],
                        )
                      : null,
                ),
              );
            },
          );
        },
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, stack) => Center(child: Text('Error: ${apiErrorMessage(error)}')),
      ),
    );
  }
}
