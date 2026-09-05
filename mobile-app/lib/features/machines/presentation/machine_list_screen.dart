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
import '../../../core/theme/app_theme.dart';
import '../../../core/widgets/adaptive_scaffold.dart';
import '../../../core/widgets/confirm_delete.dart';
import '../../../core/widgets/desktop_table.dart';
import '../../../core/widgets/list_action_bar.dart';
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
  // Backend-authoritative working time + maintenance (machine.service
  // .listWithUtilization → the single machine-hour calculation).
  final String totalWorkedText; // "1,248 h 35 min"
  final String maintenanceStatus; // NORMAL | DUE_SOON | DUE | OVERDUE | ...
  final String maintenanceMessage; // human-readable ("Due in 7 h 40 min")
  final bool maintenanceTrackingEnabled;

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
        driverName = json['assignedDriver']?['employee']?['name'] as String?,
        totalWorkedText = json['totalWorkedText'] as String? ?? '0 h 0 min',
        maintenanceStatus = json['maintenanceStatus'] as String? ?? 'NORMAL',
        maintenanceMessage = json['maintenanceMessage'] as String? ?? '',
        maintenanceTrackingEnabled = json['maintenanceTrackingEnabled'] == true;
}

/// Maintenance status → colour. NOT financial (money) colours — these are
/// operational-status colours (due/overdue), kept separate from the red/green
/// money language.
Color maintenanceStatusColor(String status) {
  switch (status) {
    case 'OVERDUE':
      return const Color(0xFFDC2626);
    case 'DUE':
      return const Color(0xFFEA580C);
    case 'DUE_SOON':
      return const Color(0xFFD97706);
    case 'UNDER_MAINTENANCE':
      return const Color(0xFF64748B);
    default:
      return const Color(0xFF16A34A);
  }
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

class MachineListScreen extends ConsumerWidget {
  const MachineListScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final user = ref.watch(currentUserProvider);
    final canManage = user?.isOwnerOrManager ?? false;
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
      // New Machine is inline in the compact search/action bar on phones (no
      // FAB); desktop keeps its top-bar button.
      bottomNavigationBar: isDesktop ? null : const QuickActionBar(),
      body: const MachineListBody(),
    );
  }
}

/// Search + status-filter + list content of the Machines screen, without the
/// scaffold — reused both as the standalone screen body and the Dashboard's
/// contextual "Machines" workspace.
class MachineListBody extends ConsumerStatefulWidget {
  const MachineListBody({super.key});

  @override
  ConsumerState<MachineListBody> createState() => _MachineListBodyState();
}

class _MachineListBodyState extends ConsumerState<MachineListBody> {
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

    return machinesAsync.when(
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
            ListActionBar(
              hintText: 'Search by Reg #, Brand, Model...',
              onChanged: (value) => setState(() => _query = value.trim().toLowerCase()),
              actionLabel: (!isDesktop && canManage) ? 'New Machine' : null,
              onAction: (!isDesktop && canManage) ? () => context.go('/machines/new') : null,
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
                                  const SizedBox(height: 10),
                                  Row(
                                    children: [
                                      MachineStatusBadge(status: machine.status),
                                      const SizedBox(width: 8),
                                      const Spacer(),
                                      const Icon(Icons.schedule, size: 15, color: AppTheme.textMuted),
                                      const SizedBox(width: 6),
                                      // Authoritative accumulated working time.
                                      Flexible(
                                        child: Text('Worked ${machine.totalWorkedText}',
                                            overflow: TextOverflow.ellipsis,
                                            style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
                                      ),
                                    ],
                                  ),
                                  if (machine.maintenanceTrackingEnabled && machine.maintenanceMessage.isNotEmpty) ...[
                                    const SizedBox(height: 6),
                                    Row(
                                      children: [
                                        Icon(Icons.build_circle_outlined,
                                            size: 15, color: maintenanceStatusColor(machine.maintenanceStatus)),
                                        const SizedBox(width: 6),
                                        Expanded(
                                          child: Text(machine.maintenanceMessage,
                                              style: TextStyle(
                                                  fontSize: 12.5,
                                                  color: maintenanceStatusColor(machine.maintenanceStatus),
                                                  fontWeight: machine.maintenanceStatus == 'OVERDUE' || machine.maintenanceStatus == 'DUE'
                                                      ? FontWeight.bold
                                                      : FontWeight.normal)),
                                        ),
                                      ],
                                    ),
                                  ],
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
          DataColumn(label: Text('Worked')),
          DataColumn(label: Text('Maintenance / Alerts')),
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
                  DataCell(Text(m.totalWorkedText)),
                  DataCell(
                    Column(
                      mainAxisSize: MainAxisSize.min,
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        if (m.maintenanceTrackingEnabled && m.maintenanceMessage.isNotEmpty)
                          Text(m.maintenanceMessage,
                              style: TextStyle(color: maintenanceStatusColor(m.maintenanceStatus), fontSize: 12)),
                        if (serviceWarn != null)
                          Text(serviceWarn.$3,
                              style: TextStyle(color: serviceWarn.$1 ? Colors.red : Colors.orange, fontSize: 12)),
                        if (insuranceWarn != null)
                          Text(insuranceWarn.$3,
                              style: TextStyle(color: insuranceWarn.$1 ? Colors.red : Colors.orange, fontSize: 12)),
                        if (!m.maintenanceTrackingEnabled && serviceWarn == null && insuranceWarn == null)
                          const Text('—', style: TextStyle(color: AppTheme.textMuted)),
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
