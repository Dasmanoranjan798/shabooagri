import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:share_plus/share_plus.dart' show Share;
import 'package:shabooagri_mobile/core/sync/data_sync.dart';
import '../../../core/network/api_client.dart';
import '../../../core/network/api_error.dart';
import '../../../core/widgets/adaptive_scaffold.dart';

// Driver-wise, machine-wise, and machine-maintenance reports. All numbers are
// computed by the backend (/reports/*) from the same work transactions the
// rest of the system uses — this screen only renders and exports them.
final driverReportProvider = FutureProvider<Map<String, dynamic>>((ref) async {
  syncOn(ref, {SyncEntity.report, SyncEntity.job, SyncEntity.driver});
  final dio = ref.watch(apiClientProvider);
  final r = await dio.get('/reports/drivers');
  return r.data as Map<String, dynamic>;
});

final machineReportProvider = FutureProvider<Map<String, dynamic>>((ref) async {
  syncOn(ref, {SyncEntity.report, SyncEntity.job, SyncEntity.machine});
  final dio = ref.watch(apiClientProvider);
  final r = await dio.get('/reports/machines');
  return r.data as Map<String, dynamic>;
});

final maintenanceReportProvider = FutureProvider<List<dynamic>>((ref) async {
  syncOn(ref, {SyncEntity.report, SyncEntity.machine, SyncEntity.maintenance});
  final dio = ref.watch(apiClientProvider);
  final r = await dio.get('/reports/machine-maintenance');
  return r.data as List<dynamic>;
});

class OperationalReportsScreen extends ConsumerWidget {
  const OperationalReportsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return DefaultTabController(
      length: 3,
      child: AdaptiveScaffold(
        currentRoute: '/reports',
        title: 'Operational Reports',
        showBack: true,
        body: Column(
          children: [
            const TabBar(
              isScrollable: true,
              tabs: [Tab(text: 'Drivers'), Tab(text: 'Machines'), Tab(text: 'Maintenance')],
            ),
            Expanded(
              child: TabBarView(
                children: [
                  _DriverReportTab(),
                  _MachineReportTab(),
                  _MaintenanceReportTab(),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

String _money(dynamic v) => '₹${(double.tryParse(v.toString()) ?? 0).toStringAsFixed(0)}';

class _DriverReportTab extends ConsumerWidget {
  Future<void> _export(List<Map<String, dynamic>> rows) async {
    final b = StringBuffer('Driver,Jobs,Hours,Minutes,Earned,Paid,Balance\n');
    for (final r in rows) {
      b.writeln('${r['driverName']},${r['jobs']},${r['workedHours']},${r['workedMinutes']},${r['totalEarned']},${r['totalPaid']},${r['balance']}');
    }
    await Share.share(b.toString(), subject: 'Driver Report');
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(driverReportProvider);
    return async.when(
      loading: () => const Center(child: CircularProgressIndicator()),
      error: (e, _) => Center(child: Text('Error: ${apiErrorMessage(e)}')),
      data: (data) {
        final rows = (data['rows'] as List<dynamic>? ?? const []).cast<Map<String, dynamic>>();
        if (rows.isEmpty) return const Center(child: Text('No driver work recorded.'));
        return Column(
          children: [
            Align(
              alignment: Alignment.centerRight,
              child: TextButton.icon(onPressed: () => _export(rows), icon: const Icon(Icons.ios_share), label: const Text('Export CSV')),
            ),
            Expanded(
              child: ListView(
                children: rows.map((r) => Card(
                      margin: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                      child: ListTile(
                        title: Text(r['driverName'] as String? ?? '—'),
                        subtitle: Text('${r['jobs']} jobs · ${r['workedText'] ?? ''}\n'
                            'Earned ${_money(r['totalEarned'])} · Paid ${_money(r['totalPaid'])}'),
                        isThreeLine: true,
                        trailing: Text('Bal\n${_money(r['balance'])}',
                            textAlign: TextAlign.center,
                            style: TextStyle(
                                fontWeight: FontWeight.bold,
                                color: (double.tryParse(r['balance'].toString()) ?? 0) > 0 ? Colors.red : Colors.green)),
                      ),
                    )).toList(),
              ),
            ),
          ],
        );
      },
    );
  }
}

class _MachineReportTab extends ConsumerWidget {
  Future<void> _export(List<Map<String, dynamic>> rows) async {
    final b = StringBuffer('Machine,Jobs,Customers,Hours,Minutes\n');
    for (final r in rows) {
      b.writeln('${r['registrationNumber']},${r['jobs']},${r['customers']},${r['workedHours']},${r['workedMinutes']}');
    }
    await Share.share(b.toString(), subject: 'Machine Utilization Report');
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(machineReportProvider);
    return async.when(
      loading: () => const Center(child: CircularProgressIndicator()),
      error: (e, _) => Center(child: Text('Error: ${apiErrorMessage(e)}')),
      data: (data) {
        final rows = (data['rows'] as List<dynamic>? ?? const []).cast<Map<String, dynamic>>();
        if (rows.isEmpty) return const Center(child: Text('No machine work recorded.'));
        return Column(
          children: [
            Align(
              alignment: Alignment.centerRight,
              child: TextButton.icon(onPressed: () => _export(rows), icon: const Icon(Icons.ios_share), label: const Text('Export CSV')),
            ),
            Expanded(
              child: ListView(
                children: rows.map((r) => Card(
                      margin: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                      child: ListTile(
                        title: Text('${r['registrationNumber']} ${r['brandModel'] ?? ''}'.trim()),
                        subtitle: Text('${r['jobs']} jobs · ${r['customers']} customers'),
                        trailing: Text(r['workedText'] as String? ?? '', style: const TextStyle(fontWeight: FontWeight.bold)),
                      ),
                    )).toList(),
              ),
            ),
          ],
        );
      },
    );
  }
}

class _MaintenanceReportTab extends ConsumerWidget {
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(maintenanceReportProvider);
    return async.when(
      loading: () => const Center(child: CircularProgressIndicator()),
      error: (e, _) => Center(child: Text('Error: ${apiErrorMessage(e)}')),
      data: (rows) {
        if (rows.isEmpty) return const Center(child: Text('No active machines.'));
        Color color(String s) {
          switch (s) {
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

        return ListView(
          children: rows.cast<Map<String, dynamic>>().map((r) {
            final status = r['status'] as String? ?? 'NORMAL';
            final total = r['totalWorked'] as Map<String, dynamic>? ?? const {};
            return Card(
              margin: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
              child: ListTile(
                title: Text('${r['registrationNumber']} ${r['brandModel'] ?? ''}'.trim()),
                subtitle: Text('Total ${total['text'] ?? '—'}\n${r['message'] ?? ''}'),
                isThreeLine: true,
                trailing: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(color: color(status).withValues(alpha: 0.12), borderRadius: BorderRadius.circular(6)),
                  child: Text(status.replaceAll('_', ' '), style: TextStyle(color: color(status), fontWeight: FontWeight.bold, fontSize: 11)),
                ),
              ),
            );
          }).toList(),
        );
      },
    );
  }
}
