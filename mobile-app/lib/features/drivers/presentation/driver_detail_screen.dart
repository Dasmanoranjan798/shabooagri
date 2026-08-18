import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../core/database/database.dart';
import '../../../core/widgets/info_row.dart';
import 'driver_list_screen.dart';

final driverDetailProvider = FutureProvider.family<OfflineDriver, String>((ref, id) async {
  final drivers = await ref.watch(driversListProvider.future);
  return drivers.firstWhere((d) => d.id == id);
});

class DriverDetailScreen extends ConsumerWidget {
  final String driverId;

  const DriverDetailScreen({super.key, required this.driverId});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final driverAsync = ref.watch(driverDetailProvider(driverId));

    return Scaffold(
      appBar: AppBar(
        title: const Text('Driver Details'),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => context.go('/drivers'),
        ),
      ),
      body: driverAsync.when(
        data: (driver) => Padding(
          padding: const EdgeInsets.all(16.0),
          child: ListView(
            children: [
              InfoRow('Name', driver.name),
              if (driver.mobileNumber != null) InfoRow('Mobile Number', driver.mobileNumber!),
              InfoRow('Availability', driver.availabilityStatus),
            ],
          ),
        ),
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, stack) => Center(child: Text('Error: $error')),
      ),
    );
  }
}
