import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../core/network/api_client.dart';
import '../../../core/network/api_error.dart';
import '../../../core/providers/company_profile_provider.dart';
import '../../../core/providers/session_provider.dart';
import '../../../core/widgets/app_drawer.dart';
import '../../../core/widgets/confirm_delete.dart';
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

  MachineSummary.fromJson(Map<String, dynamic> json)
      : id = json['id'] as String,
        registrationNumber = json['registrationNumber'] as String,
        brand = json['brand'] as String?,
        model = json['model'] as String?,
        status = json['status'] as String,
        hourMeterReading = (json['hourMeterReading'] as num?)?.toDouble(),
        nextServiceDueHours = (json['nextServiceDueHours'] as num?)?.toDouble(),
        insuranceExpiryDate =
            json['insuranceExpiryDate'] == null ? null : DateTime.parse(json['insuranceExpiryDate'] as String);
}

/// Live list (not the offline cache) — service/insurance warning chips need
/// `nextServiceDueHours`/`insuranceExpiryDate`, which the flat offline
/// table doesn't carry.
final machinesListProvider = FutureProvider<List<MachineSummary>>((ref) async {
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

  @override
  Widget build(BuildContext context) {
    final machinesAsync = ref.watch(machinesListProvider);
    final profileAsync = ref.watch(companyProfileProvider);
    final user = ref.watch(currentUserProvider);
    final canManage = user?.isOwnerOrManager ?? false;
    final canDelete = user?.roleSystemKey == 'owner';
    final serviceAlertHours = profileAsync.valueOrNull?.serviceAlertHours ?? 50;
    final insuranceAlertDays = profileAsync.valueOrNull?.insuranceAlertDays ?? 30;

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
                            margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                            child: ListTile(
                              title: Text(title.isNotEmpty ? title : machine.registrationNumber),
                              subtitle: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text('${machine.registrationNumber} · ${machine.status}'),
                                  if (serviceWarn != null)
                                    Text(serviceWarn.$3,
                                        style: TextStyle(color: serviceWarn.$1 ? Colors.red : Colors.orange, fontSize: 12)),
                                  if (insuranceWarn != null)
                                    Text(insuranceWarn.$3,
                                        style:
                                            TextStyle(color: insuranceWarn.$1 ? Colors.red : Colors.orange, fontSize: 12)),
                                ],
                              ),
                              isThreeLine: serviceWarn != null || insuranceWarn != null,
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
                                          const PopupMenuItem(
                                              value: 'delete', child: Text('Delete', style: TextStyle(color: Colors.red))),
                                      ],
                                    ),
                                  const Icon(Icons.chevron_right),
                                ],
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
}
