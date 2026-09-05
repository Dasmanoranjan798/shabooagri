import 'package:flutter/material.dart';
import 'package:shabooagri_mobile/core/sync/data_sync.dart';
import '../../../core/widgets/status_badge.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../core/network/api_client.dart';
import '../../../core/network/api_error.dart';
import '../../../core/providers/company_profile_provider.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/widgets/adaptive_scaffold.dart';
import '../../../core/widgets/info_row.dart';

final machineDetailProvider = FutureProvider.family<Map<String, dynamic>, String>((ref, id) async {
  syncOn(ref, {SyncEntity.machine});
  final dio = ref.watch(apiClientProvider);
  final response = await dio.get('/machines/$id');
  return response.data as Map<String, dynamic>;
});

// Backend-computed working time + maintenance status (total worked,
// since-last-service, remaining, next threshold, overdue-by, status). The
// client only renders this — it never recomputes machine hours.
final machineUtilizationProvider = FutureProvider.family<Map<String, dynamic>, String>((ref, id) async {
  syncOn(ref, {SyncEntity.machine, SyncEntity.job, SyncEntity.maintenance});
  final dio = ref.watch(apiClientProvider);
  final response = await dio.get('/machines/$id/utilization');
  return response.data as Map<String, dynamic>;
});

Color _maintenanceColor(String status) {
  switch (status) {
    case 'OVERDUE':
      return Colors.red;
    case 'DUE':
      return Colors.deepOrange;
    case 'DUE_SOON':
      return Colors.orange;
    case 'UNDER_MAINTENANCE':
      return Colors.blueGrey;
    case 'TRACKING_DISABLED':
      return Colors.grey;
    default:
      return Colors.green;
  }
}

class MachineDetailScreen extends ConsumerWidget {
  final String machineId;

  const MachineDetailScreen({super.key, required this.machineId});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final machineAsync = ref.watch(machineDetailProvider(machineId));
    final profileAsync = ref.watch(companyProfileProvider);
    final serviceAlertHours = profileAsync.valueOrNull?.serviceAlertHours ?? 50;
    final insuranceAlertDays = profileAsync.valueOrNull?.insuranceAlertDays ?? 30;

    return AdaptiveScaffold(
      currentRoute: '/machines',
      title: 'Machine Details',
      showBack: true,
      actions: [
        IconButton(
          icon: const Icon(Icons.edit),
          tooltip: 'Edit',
          onPressed: () => context.go('/machines/$machineId/edit'),
        ),
      ],
      body: machineAsync.when(
        data: (machine) {
          final hourMeter = (machine['hourMeterReading'] != null ? double.tryParse(machine['hourMeterReading'].toString()) : null);
          final nextServiceDueHours = (machine['nextServiceDueHours'] != null ? double.tryParse(machine['nextServiceDueHours'].toString()) : null);
          final insuranceExpiry =
              machine['insuranceExpiryDate'] == null ? null : DateTime.parse(machine['insuranceExpiryDate'] as String);
          final serviceWarn = machineServiceWarning(
            hourMeterReading: hourMeter,
            nextServiceDueHours: nextServiceDueHours,
            serviceAlertHours: serviceAlertHours,
          );
          final insuranceWarn = expiryWarning(
            expiryDate: insuranceExpiry,
            alertDays: insuranceAlertDays,
            overdueLabel: 'Insurance Expired',
            dueSoonLabel: 'Insurance Expires',
          );
          final assignedDriver = machine['assignedDriver'] as Map<String, dynamic>?;

          return Padding(
            padding: const EdgeInsets.all(16.0),
            child: ListView(
              children: [
                if (serviceWarn != null || insuranceWarn != null)
                  Card(
                    color: Colors.red.withValues(alpha: 0.08),
                    child: Padding(
                      padding: const EdgeInsets.all(12.0),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          if (serviceWarn != null)
                            Text('⚠ Service Alert: ${serviceWarn.$3}',
                                style: TextStyle(color: serviceWarn.$1 ? Colors.red : Colors.orange, fontWeight: FontWeight.bold)),
                          if (insuranceWarn != null)
                            Text('⚠ Insurance Alert: ${insuranceWarn.$3}',
                                style: TextStyle(
                                    color: insuranceWarn.$1 ? Colors.red : Colors.orange, fontWeight: FontWeight.bold)),
                        ],
                      ),
                    ),
                  ),
                Card(
                  margin: const EdgeInsets.only(top: 8),
                  child: Padding(
                    padding: const EdgeInsets.all(16.0),
                    child: Column(
                      children: [
                InfoRow('Registration Number', machine['registrationNumber'] as String),
                if (machine['brand'] != null) InfoRow('Brand', machine['brand'] as String),
                if (machine['model'] != null) InfoRow('Model', machine['model'] as String),
                InfoRow(
                  'Status', 
                  machine['status'] as String,
                  customValueWidget: MachineStatusBadge(status: machine['status'] as String),
                ),
                if (hourMeter != null) InfoRow('Hour Meter', '${hourMeter.toStringAsFixed(1)} hrs'),
                InfoRow('Default Driver', assignedDriver != null ? (assignedDriver['employee']?['name'] ?? assignedDriver['id']) as String : 'Unassigned'),
                InfoRow(
                  'Next Service Due',
                  nextServiceDueHours != null ? '${nextServiceDueHours.toStringAsFixed(0)} hrs' : 'Not scheduled',
                ),
                if (machine['purchaseYear'] != null) InfoRow('Purchase Year', '${machine['purchaseYear']}'),
                if (machine['insuranceNumber'] != null) InfoRow('Insurance Policy Number', machine['insuranceNumber'] as String),
                if (insuranceExpiry != null)
                  InfoRow('Insurance Expiry', insuranceExpiry.toIso8601String().split('T').first),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 8),
                _MachineUtilizationCard(machineId: machineId),
                const SizedBox(height: 8),
                _MachineCustomerWorkSection(machineId: machineId),
              ],
            ),
          );
        },
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, stack) => Center(child: Text('Error: ${apiErrorMessage(error)}')),
      ),
    );
  }
}

/// Working time & maintenance status card — all values from
/// GET /machines/:id/utilization (the single authoritative machine-hour
/// calculation). Answers: total worked, worked since last service, remaining
/// to service, due/overdue.
class _MachineUtilizationCard extends ConsumerWidget {
  final String machineId;
  const _MachineUtilizationCard({required this.machineId});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(machineUtilizationProvider(machineId));
    return async.when(
      loading: () => const Card(child: Padding(padding: EdgeInsets.all(24), child: Center(child: CircularProgressIndicator()))),
      error: (e, _) => Card(child: Padding(padding: const EdgeInsets.all(16), child: Text('Could not load utilization: ${apiErrorMessage(e)}'))),
      data: (u) {
        final status = u['status'] as String? ?? 'NORMAL';
        final total = u['totalWorked'] as Map<String, dynamic>? ?? const {};
        final since = u['workedSinceLastService'] as Map<String, dynamic>? ?? const {};
        final remaining = u['remainingToService'] as Map<String, dynamic>? ?? const {};
        final overdue = u['overdueBy'] as Map<String, dynamic>? ?? const {};
        final tracking = u['trackingEnabled'] == true;
        final color = _maintenanceColor(status);

        return Card(
          child: Padding(
            padding: const EdgeInsets.all(16.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text('Working Time & Maintenance', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                      decoration: BoxDecoration(color: color.withValues(alpha: 0.12), borderRadius: BorderRadius.circular(6)),
                      child: Text(status.replaceAll('_', ' '), style: TextStyle(color: color, fontWeight: FontWeight.bold, fontSize: 12)),
                    ),
                  ],
                ),
                const SizedBox(height: 4),
                Text(u['message'] as String? ?? '', style: TextStyle(color: color)),
                const SizedBox(height: 8),
                InfoRow('Total Worked', total['text'] as String? ?? '—'),
                if (tracking) ...[
                  InfoRow('Maintenance Interval', '${u['intervalHours'] ?? '—'} h'),
                  InfoRow('Worked Since Service', since['text'] as String? ?? '—'),
                  if (status == 'OVERDUE')
                    InfoRow('Overdue By', overdue['text'] as String? ?? '—')
                  else
                    InfoRow('Remaining', remaining['text'] as String? ?? '—'),
                  InfoRow('Next Service At', u['nextServiceThresholdHours'] != null ? '${u['nextServiceThresholdHours']} h' : '—'),
                  InfoRow('Last Service', (u['lastServiceDate'] as String?)?.split('T').first ?? 'Never'),
                ],
              ],
            ),
          ),
        );
      },
    );
  }
}

/// Customer-wise work history for a machine (§ which customers/jobs generated
/// its working time). Reads the SAME session-attributed data as the machine's
/// total worked hours, exposed by GET /machines/:id/utilization → `customerWise`.
class _MachineCustomerWorkSection extends ConsumerWidget {
  final String machineId;
  const _MachineCustomerWorkSection({required this.machineId});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(machineUtilizationProvider(machineId));
    return async.maybeWhen(
      orElse: () => const SizedBox.shrink(),
      data: (u) {
        final rows = (u['customerWise'] as List<dynamic>? ?? const []).cast<Map<String, dynamic>>();
        if (rows.isEmpty) return const SizedBox.shrink();
        return Card(
          child: Padding(
            padding: const EdgeInsets.all(16.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text('Work by Customer', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                    Text('Total ${(u['totalWorked'] as Map<String, dynamic>?)?['text'] ?? ''}',
                        style: const TextStyle(color: AppTheme.textMuted, fontSize: 13)),
                  ],
                ),
                const SizedBox(height: 4),
                ...rows.map((r) => ListTile(
                      dense: true,
                      contentPadding: EdgeInsets.zero,
                      title: Text(r['customerName'] as String? ?? 'Unknown'),
                      subtitle: Text([
                        '${r['jobs']} job${(r['jobs'] as num? ?? 0) == 1 ? '' : 's'}',
                        if ((r['lastWorkedDate'] as String?)?.isNotEmpty == true)
                          (r['lastWorkedDate'] as String).split('T').first,
                      ].join(' · ')),
                      trailing: Text(r['workedText'] as String? ?? '—',
                          style: const TextStyle(fontWeight: FontWeight.w600)),
                    )),
              ],
            ),
          ),
        );
      },
    );
  }
}
