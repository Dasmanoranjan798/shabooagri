import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../core/layout/responsive.dart';
import '../../../core/network/api_client.dart';
import '../../../core/network/api_error.dart';
import '../../../core/providers/session_provider.dart';
import '../../../core/widgets/adaptive_scaffold.dart';
import '../../../core/widgets/confirm_delete.dart';

class MaintenanceAlert {
  final String id;
  final String machineRegistration;
  final String description;
  final String status; // OVERDUE | DUE_SOON | HEALTHY
  final String reason;

  MaintenanceAlert.fromJson(Map<String, dynamic> json)
      : id = json['id'] as String,
        machineRegistration = json['machineRegistration'] as String,
        description = json['description'] as String,
        status = json['status'] as String,
        reason = json['reason'] as String;
}

class MaintenanceRecord {
  final String id;
  final String machineRegistration;
  final String serviceDate;
  final double? cost;
  final String? description;

  MaintenanceRecord.fromJson(Map<String, dynamic> json)
      : id = json['id'] as String,
        machineRegistration = (json['machine'] as Map<String, dynamic>?)?['registrationNumber'] as String? ?? '—',
        serviceDate = json['serviceDate'] as String,
        cost = (json['cost'] != null ? double.tryParse(json['cost'].toString()) : null),
        description = json['description'] as String?;
}

final maintenanceAlertsProvider = FutureProvider<List<MaintenanceAlert>>((ref) async {
  final dio = ref.watch(apiClientProvider);
  final response = await dio.get('/maintenance/alerts');
  return (response.data as List<dynamic>).map((j) => MaintenanceAlert.fromJson(j as Map<String, dynamic>)).toList();
});

final maintenanceRecordsProvider = FutureProvider<List<MaintenanceRecord>>((ref) async {
  final dio = ref.watch(apiClientProvider);
  final response = await dio.get('/maintenance/records');
  return (response.data as List<dynamic>).map((j) => MaintenanceRecord.fromJson(j as Map<String, dynamic>)).toList();
});

Color _statusColor(String status) {
  switch (status) {
    case 'OVERDUE':
      return Colors.red;
    case 'DUE_SOON':
      return Colors.orange;
    default:
      return Colors.green;
  }
}

/// New module — Alerts (read-only, real-time engine already built
/// server-side) + Service Records CRUD, matching `MaintenancePage.tsx`'s
/// "Log Service Record" flow. Schedules management lives one tap away via
/// the app bar / top bar action rather than cluttering this screen.
class MaintenanceScreen extends ConsumerWidget {
  const MaintenanceScreen({super.key});

  void _refresh(WidgetRef ref) {
    ref.invalidate(maintenanceAlertsProvider);
    ref.invalidate(maintenanceRecordsProvider);
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final alertsAsync = ref.watch(maintenanceAlertsProvider);
    final recordsAsync = ref.watch(maintenanceRecordsProvider);
    final user = ref.watch(currentUserProvider);
    final canManage = user?.isOwnerOrManager ?? false;
    final isDesktop = context.responsive.isDesktop;

    return AdaptiveScaffold(
      currentRoute: '/maintenance',
      title: 'Maintenance',
      actions: [
        IconButton(
          icon: const Icon(Icons.schedule),
          tooltip: 'Schedules',
          onPressed: () => context.go('/maintenance/schedules'),
        ),
        IconButton(
          icon: const Icon(Icons.refresh),
          onPressed: () => _refresh(ref),
        ),
        if (isDesktop && canManage)
          Padding(
            padding: const EdgeInsets.only(left: 8),
            child: FilledButton.icon(
              onPressed: () => context.go('/maintenance/records/new'),
              icon: const Icon(Icons.add),
              label: const Text('Log Service'),
            ),
          ),
      ],
      floatingActionButton: (!isDesktop && canManage)
          ? FloatingActionButton.extended(
              onPressed: () => context.go('/maintenance/records/new'),
              icon: const Icon(Icons.add),
              label: const Text('Log Service'),
            )
          : null,
      body: RefreshIndicator(
        onRefresh: () async => _refresh(ref),
        child: ListView(
          padding: const EdgeInsets.all(16.0),
          children: [
            const Text('Service Alerts', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
            const SizedBox(height: 8),
            alertsAsync.when(
              data: (alerts) {
                final active = alerts.where((a) => a.status != 'HEALTHY').toList();
                if (active.isEmpty) {
                  return const Padding(padding: EdgeInsets.symmetric(vertical: 8), child: Text('All machines up to date.'));
                }
                return Column(
                  children: active
                      .map((a) => Card(
                            color: _statusColor(a.status).withValues(alpha: 0.08),
                            child: ListTile(
                              leading: Icon(Icons.warning, color: _statusColor(a.status)),
                              title: Text('${a.machineRegistration} · ${a.description}'),
                              subtitle: Text(a.reason),
                            ),
                          ))
                      .toList(),
                );
              },
              loading: () => const Center(child: Padding(padding: EdgeInsets.all(16), child: CircularProgressIndicator())),
              error: (e, s) => Text('Could not load alerts: ${apiErrorMessage(e)}'),
            ),
            const SizedBox(height: 24),
            const Text('Service Records', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
            const SizedBox(height: 8),
            recordsAsync.when(
              data: (records) {
                if (records.isEmpty) {
                  return const Padding(padding: EdgeInsets.symmetric(vertical: 8), child: Text('No service records yet.'));
                }
                if (isDesktop) {
                  return _recordsTable(context, ref, records, canManage: canManage);
                }
                return Column(
                  children: records
                      .map((r) => Card(
                            child: ListTile(
                              title: Text(r.machineRegistration),
                              subtitle: Text('${r.serviceDate}${r.description != null ? ' · ${r.description}' : ''}'),
                              trailing: Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  if (r.cost != null) Text('₹${r.cost!.toStringAsFixed(0)}'),
                                  if (canManage)
                                    PopupMenuButton<String>(
                                      onSelected: (action) async {
                                        if (action == 'edit') {
                                          context.go('/maintenance/records/${r.id}/edit');
                                        } else if (action == 'delete') {
                                          await _deleteRecord(context, ref, r);
                                        }
                                      },
                                      itemBuilder: (context) => const [
                                        PopupMenuItem(value: 'edit', child: Text('Edit')),
                                        PopupMenuItem(value: 'delete', child: Text('Delete', style: TextStyle(color: Colors.red))),
                                      ],
                                    ),
                                ],
                              ),
                            ),
                          ))
                      .toList(),
                );
              },
              loading: () => const Center(child: Padding(padding: EdgeInsets.all(16), child: CircularProgressIndicator())),
              error: (e, s) => Text('Could not load records: ${apiErrorMessage(e)}'),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _deleteRecord(BuildContext context, WidgetRef ref, MaintenanceRecord r) async {
    final dio = ref.read(apiClientProvider);
    await confirmAndDelete(
      context: context,
      entityLabel: 'this service record',
      onDelete: () => dio.delete('/maintenance/records/${r.id}'),
      onSuccess: () => ref.invalidate(maintenanceRecordsProvider),
    );
  }

  /// Desktop presentation of service records: a proper data grid (horizontal
  /// scroll only; lives inside the page ListView). Same edit/delete RBAC.
  Widget _recordsTable(BuildContext context, WidgetRef ref, List<MaintenanceRecord> records, {required bool canManage}) {
    return Card(
      clipBehavior: Clip.antiAlias,
      child: SingleChildScrollView(
        scrollDirection: Axis.horizontal,
        child: ConstrainedBox(
          constraints: BoxConstraints(
            minWidth: (MediaQuery.sizeOf(context).width - Breakpoints.sidebarWidth - 96).clamp(0, double.infinity),
          ),
          child: DataTable(
            headingRowColor: WidgetStateProperty.all(Theme.of(context).colorScheme.surfaceContainerHighest),
            showCheckboxColumn: false,
            columns: const [
              DataColumn(label: Text('Machine')),
              DataColumn(label: Text('Service Date')),
              DataColumn(label: Text('Details')),
              DataColumn(label: Text('Cost'), numeric: true),
              DataColumn(label: Text('Actions')),
            ],
            rows: [
              for (final r in records)
                DataRow(cells: [
                  DataCell(Text(r.machineRegistration, style: const TextStyle(fontWeight: FontWeight.w600))),
                  DataCell(Text(r.serviceDate.split('T').first)),
                  DataCell(Text(r.description ?? '—')),
                  DataCell(Text(r.cost != null ? '₹${r.cost!.toStringAsFixed(0)}' : '—')),
                  DataCell(
                    canManage
                        ? Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              IconButton(
                                icon: const Icon(Icons.edit, size: 18),
                                tooltip: 'Edit',
                                onPressed: () => context.go('/maintenance/records/${r.id}/edit'),
                              ),
                              IconButton(
                                icon: const Icon(Icons.delete, size: 18, color: Colors.red),
                                tooltip: 'Delete',
                                onPressed: () => _deleteRecord(context, ref, r),
                              ),
                            ],
                          )
                        : const Text('—'),
                  ),
                ]),
            ],
          ),
        ),
      ),
    );
  }
}
