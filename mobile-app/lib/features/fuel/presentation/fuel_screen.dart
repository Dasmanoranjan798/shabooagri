import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/network/api_client.dart';
import '../../../core/network/api_error.dart';
import '../../../core/widgets/app_drawer.dart';

class FuelEntry {
  final String machineRegistration;
  final double litres;
  final double? cost;
  final String recordedAt;
  final String recordedByName;

  FuelEntry.fromJson(Map<String, dynamic> json)
      : machineRegistration = (json['machine'] as Map<String, dynamic>)['registrationNumber'] as String,
        litres = (json['litres'] as num).toDouble(),
        cost = (json['cost'] as num?)?.toDouble(),
        recordedAt = json['recordedAt'] as String,
        recordedByName = (json['recorder'] as Map<String, dynamic>?)?['fullName'] as String? ?? 'Unknown';
}

final fuelEntriesProvider = FutureProvider<List<FuelEntry>>((ref) async {
  final dio = ref.watch(apiClientProvider);
  final response = await dio.get('/fuel/entries');
  return (response.data as List<dynamic>).map((j) => FuelEntry.fromJson(j as Map<String, dynamic>)).toList();
});

/// Read-only, matching the website exactly: `fuel.routes.ts` documents
/// this endpoint as a read-only view — the real write path is only via a
/// Job's own fuel-logging action (already built in Stage 1's "Add Fuel"
/// quick action), there is no standalone "Add Fuel Entry" form anywhere,
/// including on the website. Confirmed, not assumed, before building this
/// as list-only.
class FuelScreen extends ConsumerWidget {
  const FuelScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final entriesAsync = ref.watch(fuelEntriesProvider);

    return Scaffold(
      drawer: const AppDrawer(currentRoute: '/fuel'),
      appBar: AppBar(
        title: const Text('Fuel Log'),
        actions: [
          IconButton(icon: const Icon(Icons.refresh), onPressed: () => ref.invalidate(fuelEntriesProvider)),
        ],
      ),
      body: entriesAsync.when(
        data: (entries) {
          if (entries.isEmpty) return const Center(child: Text('No fuel entries found.'));
          final totalLitres = entries.fold<double>(0, (sum, e) => sum + e.litres);
          return Column(
            children: [
              Padding(
                padding: const EdgeInsets.all(16.0),
                child: Text('Total: ${totalLitres.toStringAsFixed(1)} L across ${entries.length} entries',
                    style: const TextStyle(fontWeight: FontWeight.bold)),
              ),
              Expanded(
                child: ListView.builder(
                  itemCount: entries.length,
                  itemBuilder: (context, index) {
                    final entry = entries[index];
                    return Card(
                      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                      child: ListTile(
                        title: Text('${entry.machineRegistration} · ${entry.litres.toStringAsFixed(1)} L'),
                        subtitle: Text('${entry.recordedAt.split('T').first} · ${entry.recordedByName}'),
                        trailing: entry.cost != null ? Text('₹${entry.cost!.toStringAsFixed(0)}') : null,
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
