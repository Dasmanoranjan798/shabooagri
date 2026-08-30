import 'package:flutter/material.dart';
import 'package:shabooagri_mobile/core/sync/data_sync.dart';
import '../../../core/widgets/status_badge.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../core/network/api_client.dart';
import '../../../core/network/api_error.dart';
import '../../../core/providers/company_profile_provider.dart';
import '../../../core/widgets/adaptive_scaffold.dart';
import '../../../core/widgets/info_row.dart';

final machineDetailProvider = FutureProvider.family<Map<String, dynamic>, String>((ref, id) async {
  syncOn(ref, {SyncEntity.machine});
  final dio = ref.watch(apiClientProvider);
  final response = await dio.get('/machines/$id');
  return response.data as Map<String, dynamic>;
});

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
