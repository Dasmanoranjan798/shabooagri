import 'package:flutter/material.dart';
import 'package:shabooagri_mobile/core/sync/data_sync.dart';
import '../../../core/widgets/quick_action_bar.dart';
import '../../../core/widgets/status_badge.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../core/layout/responsive.dart';
import '../../../core/network/api_client.dart';
import '../../../core/network/api_error.dart';
import '../../../core/providers/company_profile_provider.dart';
import '../../../core/providers/session_provider.dart';
import '../../../core/widgets/adaptive_scaffold.dart';
import '../../../core/widgets/confirm_delete.dart';
import '../../../core/widgets/desktop_table.dart';
import '../../../core/widgets/search_field.dart';

class MachineSummary {
  final String id;
  final String registrationNumber;
  final String? brand;
  final String? model;
  final String status;
  final double? hourMeterReading;
  final double? nextServiceDueHours;
  final DateTime? insuranceExpiryDate;
  final String? driverName;

  MachineSummary.fromJson(Map<String, dynamic> json)
      : id = json['id'] as String,
        registrationNumber = json['registrationNumber'] as String,
        brand = json['brand'] as String?,
        model = json['model'] as String?,
        status = json['status'] as String,
        hourMeterReading = (json['hourMeterReading'] != null ? double.tryParse(json['hourMeterReading'].toString()) : null),
        nextServiceDueHours = (json['nextServiceDueHours'] != null ? double.tryParse(json['nextServiceDueHours'].toString()) : null),
        insuranceExpiryDate =
            json['insuranceExpiryDate'] == null ? null : DateTime.parse(json['insuranceExpiryDate'] as String),
        driverName = json['assignedDriver']?['employee']?['name'] as String?;
}

/// Live list (not the offline cache) — service/insurance warning chips need
/// `nextServiceDueHours`/`insuranceExpiryDate`, which the flat offline
/// table doesn't carry.
final machinesListProvider = FutureProvider<List<MachineSummary>>((ref) async {
  syncOn(ref, {SyncEntity.machine});
  final dio = ref.watch(apiClientProvider);
  final response = await dio.get('/machines');
  return (response.data as List<dynamic>).map((j) => MachineSummary.fromJson(j as Map<String, dynamic>)).toList();
});

enum _StatusFilter { all, available, working, repair, offline }

class MachineListScreen extends ConsumerStatefulWidget {
  const MachineListScreen({super.key});

  @override
  ConsumerState<MachineListScreen> createState() => _MachineListScreenState();
}

class _MachineListScreenState extends ConsumerState<MachineListScreen> {
  String _query = '';
  _StatusFilter _filter = _StatusFilter.all;

  bool _matchesFilter(MachineSummary m, _StatusFilter filter) {
    switch (filter) {
      case _StatusFilter.all:
        return true;
      case _StatusFilter.available:
        return m.status == 'AVAILABLE';
      case _StatusFilter.working:
        return m.status == 'WORKING';
      case _StatusFilter.repair:
        return m.status == 'REPAIR';
      case _StatusFilter.offline:
        return m.status == 'OFFLINE';
    }
  }

  Future<void> _delete(MachineSummary machine) async {
    final dio = ref.read(apiClientProvider);
    await confirmAndDelete(
      context: context,
      entityLabel: machine.registrationNumber,
      onDelete: () => dio.delete('/machines/${machine.id}'),
      onSuccess: () => ref.invalidate(machinesListProvider),
    );
  }

  @override
  Widget build(BuildContext context) {
    final machinesAsync = ref.watch(machinesListProvider);
    final profileAsync = ref.watch(companyProfileProvider);
    final user = ref.watch(currentUserProvider);
    final canManage = user?.isOwnerOrManager ?? false;
    final canDelete = user?.roleSystemKey == 'owner';
    final serviceAlertHours = profileAsync.valueOrNull?.serviceAlertHours ?? 50;
    final insuranceAlertDays = profileAsync.valueOrNull?.insuranceAlertDays ?? 30;
    final isDesktop = context.responsive.isDesktop;

    return AdaptiveScaffold(
      currentRoute: '/machines',
      title: 'Machines',
      actions: [
        IconButton(
          icon: const Icon(Icons.refresh),
          onPressed: () => ref.invalidate(machinesListProvider),
        ),
        if (isDesktop && canManage)
          Padding(
            padding: const EdgeInsets.only(left: 8),
            child: FilledButton.icon(
              onPressed: () => context.go('/machines/new'),
              icon: const Icon(Icons.add),
              label: const Text('New Machine'),
            ),
          ),
      ],
      floatingActionButton: (!isDesktop && canManage)
          ? FloatingActionButton(onPressed: () => context.go('/machines/new'), child: const Icon(Icons.add))
          : null,
      bottomNavigationBar: isDesktop ? null : const QuickActionBar(),
      body: machinesAsync.when(
        data: (machines) {
          final counts = {for (final f in _StatusFilter.values) f: machines.where((m) => _matchesFilter(m, f)).length};
          var filtered = machines.where((m) => _matchesFilter(m, _filter)).toList();
          if (_query.isNotEmpty) {
            filtered = filtered
                .where((m) =>
                    m.registrationNumber.toLowerCase().contains(_query) ||
                    (m.brand?.toLowerCase().contains(_query) ?? false) ||
                    (m.model?.toLowerCase().contains(_query) ?? false))
                .toList();
          }

          return Column(
            children: [
              SearchField(
                hintText: 'Search by Reg #, Brand, Model...',
                onChanged: (value) => setState(() => _query = value.trim().toLowerCase()),
              ),
              FilterTabsRow<_StatusFilter>(
                selected: _filter,
                onSelected: (f) => setState(() => _filter = f),
                tabs: [
                  (_StatusFilter.all, 'All', counts[_StatusFilter.all]!),
                  (_StatusFilter.available, 'Available', counts[_StatusFilter.available]!),
                  (_StatusFilter.working, 'Working', counts[_StatusFilter.working]!),
                  (_StatusFilter.repair, 'Repair', counts[_StatusFilter.repair]!),
                  (_StatusFilter.offline, 'Offline', counts[_StatusFilter.offline]!),
                ],
              ),
              Expanded(
                child: filtered.isEmpty
                    ? const Center(child: Text('No machines match this view.'))
                    : isDesktop
                        ? _desktopTable(context, filtered,
                            canManage: canManage,
                            canDelete: canDelete,
                            serviceAlertHours: serviceAlertHours,
                            insuranceAlertDays: insuranceAlertDays)
                        : ListView.builder(
                        itemCount: filtered.length,
                        itemBuilder: (context, index) {
                          final machine = filtered[index];
                          final title = [machine.brand, machine.model].where((s) => s != null && s.isNotEmpty).join(' ');
                          final serviceWarn = machineServiceWarning(
                            hourMeterReading: machine.hourMeterReading,
                            nextServiceDueHours: machine.nextServiceDueHours,
                            serviceAlertHours: serviceAlertHours,
                          );
                          final insuranceWarn = expiryWarning(
                            expiryDate: machine.insuranceExpiryDate,
                            alertDays: insuranceAlertDays,
                            overdueLabel: 'Insurance Expired',
                            dueSoonLabel: 'Insurance Expires',
                          );

                          return Card(
                            margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
                            child: InkWell(
                              onTap: () => context.go('/machines/${machine.id}'),
                              borderRadius: BorderRadius.circular(10),
                              child: Padding(
                                padding: const EdgeInsets.all(16),
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Row(
                                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                      children: [
                                        Text(
                                          machine.registrationNumber,
                                          style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                                        ),
                                        if (canManage || canDelete)
                                          SizedBox(
                                            width: 32,
                                            height: 32,
                                            child: PopupMenuButton<String>(
                                              padding: EdgeInsets.zero,
                                              icon: const Icon(Icons.more_vert, size: 20, color: Colors.grey),
                                              onSelected: (action) async {
                                                if (action == 'edit') {
                                                  context.go('/machines/${machine.id}/edit');
                                                } else if (action == 'delete') {
                                                  await _delete(machine);
                                                }
                                              },
                                              itemBuilder: (context) => [
                                                if (canManage) const PopupMenuItem(value: 'edit', child: Text('Edit')),
                                                if (canDelete) const PopupMenuItem(value: 'delete', child: Text('Delete', style: TextStyle(color: Colors.red))),
                                              ],
                                            ),
                                          ),
                                      ],
                                    ),
                                    if (title.isNotEmpty)
                                      Padding(
                                        padding: const EdgeInsets.only(top: 4, bottom: 8),
                                        child: Text(title, style: TextStyle(color: Colors.grey.shade700, fontSize: 14)),
                                      ),
                                    const SizedBox(height: 8),
                                    Row(
                                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                      children: [
                                        MachineStatusBadge(status: machine.status),
                                        if (machine.hourMeterReading != null)
                                          Text(
                                            '${machine.hourMeterReading} hrs',
                                            style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13),
                                          ),
                                      ],
                                    ),
                                    if (serviceWarn != null || insuranceWarn != null) ...[
                                      const Divider(height: 24),
                                      if (serviceWarn != null)
                                        Row(
                                          children: [
                                            Icon(Icons.build, size: 14, color: serviceWarn.$1 ? Colors.red : Colors.orange),
                                            const SizedBox(width: 6),
                                            Expanded(
                                              child: Text(
                                                serviceWarn.$3,
                                                style: TextStyle(color: serviceWarn.$1 ? Colors.red : Colors.orange, fontSize: 12),
                                              ),
                                            ),
                                          ],
                                        ),
                                      if (insuranceWarn != null)
                                        Padding(
                                          padding: EdgeInsets.only(top: serviceWarn != null ? 4 : 0),
                                          child: Row(
                                            children: [
                                              Icon(Icons.shield_outlined, size: 14, color: insuranceWarn.$1 ? Colors.red : Colors.orange),
                                              const SizedBox(width: 6),
                                              Expanded(
                                                child: Text(
                                                  insuranceWarn.$3,
                                                  style: TextStyle(color: insuranceWarn.$1 ? Colors.red : Colors.orange, fontSize: 12),
                                                ),
                                              ),
                                            ],
                                          ),
                                        ),
                                    ],
                                  ],
                                ),
                              ),
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

  /// Desktop presentation: a proper machines data grid. Same data + navigation
  /// (row click → detail) + RBAC as the phone card list. The service/insurance
  /// alert copy is preserved as a compact warning column.
  Widget _desktopTable(
    BuildContext context,
    List<MachineSummary> machines, {
    required bool canManage,
    required bool canDelete,
    required int serviceAlertHours,
    required int insuranceAlertDays,
  }) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
      child: DesktopTable(
        columns: const [
          DataColumn(label: Text('Registration')),
          DataColumn(label: Text('Brand / Model')),
          DataColumn(label: Text('Status')),
          DataColumn(label: Text('Hours')),
          DataColumn(label: Text('Alerts')),
          DataColumn(label: Text('Actions')),
        ],
        rows: [
          for (final m in machines)
            () {
              final title = [m.brand, m.model].where((s) => s != null && s.isNotEmpty).join(' ');
              final serviceWarn = machineServiceWarning(
                hourMeterReading: m.hourMeterReading,
                nextServiceDueHours: m.nextServiceDueHours,
                serviceAlertHours: serviceAlertHours,
              );
              final insuranceWarn = expiryWarning(
                expiryDate: m.insuranceExpiryDate,
                alertDays: insuranceAlertDays,
                overdueLabel: 'Insurance Expired',
                dueSoonLabel: 'Insurance Expires',
              );
              return DataRow(
                onSelectChanged: (_) => context.go('/machines/${m.id}'),
                cells: [
                  DataCell(Text(m.registrationNumber, style: const TextStyle(fontWeight: FontWeight.w600))),
                  DataCell(Text(title.isEmpty ? '—' : title)),
                  DataCell(MachineStatusBadge(status: m.status)),
                  DataCell(Text(m.hourMeterReading != null ? '${m.hourMeterReading} hrs' : '—')),
                  DataCell(
                    (serviceWarn == null && insuranceWarn == null)
                        ? const Text('—', style: TextStyle(color: Colors.green))
                        : Column(
                            mainAxisSize: MainAxisSize.min,
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              if (serviceWarn != null)
                                Text(serviceWarn.$3,
                                    style: TextStyle(color: serviceWarn.$1 ? Colors.red : Colors.orange, fontSize: 12)),
                              if (insuranceWarn != null)
                                Text(insuranceWarn.$3,
                                    style: TextStyle(color: insuranceWarn.$1 ? Colors.red : Colors.orange, fontSize: 12)),
                            ],
                          ),
                  ),
                  DataCell(
                    (canManage || canDelete)
                        ? Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              if (canManage)
                                IconButton(
                                  icon: const Icon(Icons.edit, size: 18),
                                  tooltip: 'Edit',
                                  onPressed: () => context.go('/machines/${m.id}/edit'),
                                ),
                              if (canDelete)
                                IconButton(
                                  icon: const Icon(Icons.delete, size: 18, color: Colors.red),
                                  tooltip: 'Delete',
                                  onPressed: () => _delete(m),
                                ),
                            ],
                          )
                        : const Text('—'),
                  ),
                ],
              );
            }(),
        ],
      ),
    );
  }
}
