import 'package:flutter/material.dart';
import 'package:shabooagri_mobile/core/sync/data_sync.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:share_plus/share_plus.dart' show Share;
import '../../../core/layout/responsive.dart';
import '../../../core/network/api_client.dart';
import '../../../core/network/api_error.dart';
import '../../../core/widgets/adaptive_scaffold.dart';
import '../../../core/widgets/desktop_table.dart';
import '../../machines/presentation/machine_list_screen.dart';

class FuelEntry {
  final String machineRegistration;
  final double litres;
  final double? cost;
  final String recordedAt;
  final String recordedByName;

  FuelEntry.fromJson(Map<String, dynamic> json)
      : machineRegistration = (json['machine'] as Map<String, dynamic>)['registrationNumber'] as String,
        litres = (double.tryParse(json['litres'].toString()) ?? 0.0),
        cost = (json['cost'] != null ? double.tryParse(json['cost'].toString()) : null),
        recordedAt = json['recordedAt'] as String,
        recordedByName = (json['recorder'] as Map<String, dynamic>?)?['fullName'] as String? ?? 'Unknown';
}

class FuelFilter {
  final String? machineId;
  final DateTime? fromDate;
  final DateTime? toDate;

  const FuelFilter({this.machineId, this.fromDate, this.toDate});
}

final fuelFilterProvider = StateProvider<FuelFilter>((ref) => const FuelFilter());

final fuelEntriesProvider = FutureProvider<List<FuelEntry>>((ref) async {
  syncOn(ref, {SyncEntity.fuel});
  final dio = ref.watch(apiClientProvider);
  final filter = ref.watch(fuelFilterProvider);
  final response = await dio.get('/fuel/entries', queryParameters: {
    if (filter.machineId != null) 'machineId': filter.machineId,
    if (filter.fromDate != null) 'from': filter.fromDate!.toIso8601String().split('T').first,
    if (filter.toDate != null) 'to': filter.toDate!.toIso8601String().split('T').first,
  });
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

  Future<void> _exportCsv(List<FuelEntry> entries) async {
    final buffer = StringBuffer('Date,Machine,Litres,Cost,Recorded By\n');
    for (final e in entries) {
      buffer.writeln(
          '${e.recordedAt.split('T').first},${e.machineRegistration},${e.litres.toStringAsFixed(2)},${e.cost?.toStringAsFixed(2) ?? ''},${e.recordedByName}');
    }
    await Share.share(buffer.toString(), subject: 'ShabooAgri Fuel Log Export');
  }

  Future<void> _pickDateRange(BuildContext context, WidgetRef ref, FuelFilter current) async {
    final range = await showDateRangePicker(
      context: context,
      firstDate: DateTime.now().subtract(const Duration(days: 365 * 3)),
      lastDate: DateTime.now(),
      initialDateRange:
          current.fromDate != null && current.toDate != null ? DateTimeRange(start: current.fromDate!, end: current.toDate!) : null,
    );
    if (range != null) {
      ref.read(fuelFilterProvider.notifier).state = FuelFilter(machineId: current.machineId, fromDate: range.start, toDate: range.end);
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final entriesAsync = ref.watch(fuelEntriesProvider);
    final filter = ref.watch(fuelFilterProvider);
    final machinesAsync = ref.watch(machinesListProvider);
    final isDesktop = context.responsive.isDesktop;

    return AdaptiveScaffold(
      currentRoute: '/fuel',
      title: 'Fuel Log',
      actions: [
        IconButton(
          icon: const Icon(Icons.ios_share),
          tooltip: 'Export CSV',
          onPressed: () => entriesAsync.whenData(_exportCsv),
        ),
        IconButton(icon: const Icon(Icons.refresh), onPressed: () => ref.invalidate(fuelEntriesProvider)),
      ],
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 4),
            child: Row(
              children: [
                Expanded(
                  child: machinesAsync.when(
                    data: (machines) => DropdownButtonFormField<String>(
                      initialValue: filter.machineId,
                      decoration: const InputDecoration(labelText: 'Machine', border: OutlineInputBorder(), isDense: true),
                      items: [
                        const DropdownMenuItem(value: null, child: Text('All Machines')),
                        ...machines.map((m) => DropdownMenuItem(value: m.id, child: Text(m.registrationNumber))),
                      ],
                      onChanged: (value) => ref.read(fuelFilterProvider.notifier).state =
                          FuelFilter(machineId: value, fromDate: filter.fromDate, toDate: filter.toDate),
                    ),
                    loading: () => const LinearProgressIndicator(),
                    error: (e, s) => const SizedBox.shrink(),
                  ),
                ),
                const SizedBox(width: 8),
                IconButton(
                  icon: const Icon(Icons.date_range),
                  tooltip: 'Date range',
                  onPressed: () => _pickDateRange(context, ref, filter),
                ),
                if (filter.machineId != null || filter.fromDate != null)
                  IconButton(
                    icon: const Icon(Icons.clear),
                    tooltip: 'Clear filters',
                    onPressed: () => ref.read(fuelFilterProvider.notifier).state = const FuelFilter(),
                  ),
              ],
            ),
          ),
          Expanded(
            child: entriesAsync.when(
              data: (entries) {
                if (entries.isEmpty) return const Center(child: Text('No fuel entries found.'));
                final totalLitres = entries.fold<double>(0, (sum, e) => sum + e.litres);
                final totalCost = entries.fold<double>(0, (sum, e) => sum + (e.cost ?? 0));
                return Column(
                  children: [
                    Padding(
                      padding: const EdgeInsets.all(16.0),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                        children: [
                          _kpi('Total Entries', '${entries.length}'),
                          _kpi('Total Litres', '${totalLitres.toStringAsFixed(1)} L'),
                          _kpi('Total Cost', '₹${totalCost.toStringAsFixed(0)}'),
                        ],
                      ),
                    ),
                    Expanded(
                      child: isDesktop
                          ? Padding(
                              padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
                              child: DesktopTable(
                                columns: const [
                                  DataColumn(label: Text('Date')),
                                  DataColumn(label: Text('Machine')),
                                  DataColumn(label: Text('Litres'), numeric: true),
                                  DataColumn(label: Text('Cost'), numeric: true),
                                  DataColumn(label: Text('Recorded By')),
                                ],
                                rows: [
                                  for (final e in entries)
                                    DataRow(cells: [
                                      DataCell(Text(e.recordedAt.split('T').first)),
                                      DataCell(Text(e.machineRegistration, style: const TextStyle(fontWeight: FontWeight.w600))),
                                      DataCell(Text('${e.litres.toStringAsFixed(1)} L')),
                                      DataCell(Text(e.cost != null ? '₹${e.cost!.toStringAsFixed(0)}' : '—')),
                                      DataCell(Text(e.recordedByName)),
                                    ]),
                                ],
                              ),
                            )
                          : ListView.builder(
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
          ),
        ],
      ),
    );
  }

  Widget _kpi(String label, String value) {
    return Column(
      children: [
        Text(value, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
        Text(label, style: const TextStyle(fontSize: 12, color: Colors.grey)),
      ],
    );
  }
}
