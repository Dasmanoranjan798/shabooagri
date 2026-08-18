import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../core/network/api_client.dart';
import '../../../core/network/api_error.dart';
import '../../../core/providers/company_profile_provider.dart';
import '../../../core/widgets/info_row.dart';

final driverDetailProvider = FutureProvider.family<Map<String, dynamic>, String>((ref, id) async {
  final dio = ref.watch(apiClientProvider);
  final response = await dio.get('/drivers/$id');
  return response.data as Map<String, dynamic>;
});

class DriverDetailScreen extends ConsumerWidget {
  final String driverId;

  const DriverDetailScreen({super.key, required this.driverId});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final driverAsync = ref.watch(driverDetailProvider(driverId));
    final profileAsync = ref.watch(companyProfileProvider);
    final licenseAlertDays = profileAsync.valueOrNull?.licenseAlertDays ?? 30;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Driver Details'),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => context.go('/drivers'),
        ),
      ),
      body: driverAsync.when(
        data: (driver) {
          final employee = driver['employee'] as Map<String, dynamic>? ?? const {};
          final licenseExpiry =
              driver['licenseExpiryDate'] == null ? null : DateTime.parse(driver['licenseExpiryDate'] as String);
          final licenseWarn = expiryWarning(
            expiryDate: licenseExpiry,
            alertDays: licenseAlertDays,
            overdueLabel: 'License Expired',
            dueSoonLabel: 'License Expires',
          );

          return Padding(
            padding: const EdgeInsets.all(16.0),
            child: ListView(
              children: [
                if (licenseWarn != null)
                  Card(
                    color: Colors.red.withValues(alpha: 0.08),
                    child: Padding(
                      padding: const EdgeInsets.all(12.0),
                      child: Text('⚠ Driver License Alert: ${licenseWarn.$3}',
                          style: TextStyle(color: licenseWarn.$1 ? Colors.red : Colors.orange, fontWeight: FontWeight.bold)),
                    ),
                  ),
                InfoRow('Name', employee['name'] as String? ?? 'Unknown'),
                InfoRow('Designation', employee['roleTitle'] as String? ?? 'Equipment Operator'),
                if (employee['phone'] != null) InfoRow('Mobile Number', employee['phone'] as String),
                InfoRow('License Number', driver['licenseNumber'] as String? ?? 'N/A'),
                InfoRow(
                  'License Expiry',
                  licenseExpiry != null
                      ? '${licenseExpiry.toIso8601String().split('T').first}${licenseExpiry.isBefore(DateTime.now()) ? ' (Expired)' : ''}'
                      : 'N/A',
                ),
                InfoRow('Availability', driver['availabilityStatus'] as String),
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
