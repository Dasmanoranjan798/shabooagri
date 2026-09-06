import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import 'package:shabooagri_mobile/core/sync/data_sync.dart';

import '../../../core/network/api_client.dart';
import '../../../core/network/api_error.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/widgets/adaptive_scaffold.dart';
import 'report_export.dart';

/// Driver-work, machine-utilization and machine-maintenance reports — each a
/// canonical Reports screen that opens directly (no intermediate tabbed
/// "Operational Reports" hop). All numbers come from the backend `/reports/*`
/// endpoints (the same authoritative work-transaction calculations the rest of
/// the app uses); these screens only render, filter and export them.
///
/// The driver/machine reports now surface the backend's already-supported
/// `from`/`to` date filters (previously the UI passed none).

/// Shared date window for the driver + machine reports (backend `from`/`to`).
final reportRangeProvider = StateProvider<({DateTime? from, DateTime? to})>(
  (ref) => (from: null, to: null),
);

Map<String, dynamic> _rangeQuery(({DateTime? from, DateTime? to}) r) {
  String d(DateTime x) => x.toIso8601String().split('T').first;
  return {
    if (r.from != null) 'from': d(r.from!),
    if (r.to != null) 'to': d(r.to!),
  };
}

final driverReportProvider = FutureProvider<Map<String, dynamic>>((ref) async {
  syncOn(ref, {SyncEntity.report, SyncEntity.job, SyncEntity.driver});
  final range = ref.watch(reportRangeProvider);
  final dio = ref.watch(apiClientProvider);
  final r = await dio.get('/reports/drivers', queryParameters: _rangeQuery(range));
  return r.data as Map<String, dynamic>;
});

final machineReportProvider = FutureProvider<Map<String, dynamic>>((ref) async {
  syncOn(ref, {SyncEntity.report, SyncEntity.job, SyncEntity.machine});
  final range = ref.watch(reportRangeProvider);
  final dio = ref.watch(apiClientProvider);
  final r = await dio.get('/reports/machines', queryParameters: _rangeQuery(range));
  return r.data as Map<String, dynamic>;
});

final maintenanceReportProvider = FutureProvider<List<dynamic>>((ref) async {
  syncOn(ref, {SyncEntity.report, SyncEntity.machine, SyncEntity.maintenance});
  final dio = ref.watch(apiClientProvider);
  final r = await dio.get('/reports/machine-maintenance');
  return r.data as List<dynamic>;
});

String _money(dynamic v) => '₹${(double.tryParse(v.toString()) ?? 0).toStringAsFixed(0)}';

num _n(dynamic v) => v is num ? v : (num.tryParse(v?.toString() ?? '') ?? 0);

String? _rangeSubtitle(({DateTime? from, DateTime? to}) r) {
  if (r.from == null && r.to == null) return 'All time';
  final f = DateFormat('d MMM yyyy');
  return 'Period: ${r.from == null ? '—' : f.format(r.from!)} to ${r.to == null ? '—' : f.format(r.to!)}';
}

List<(String, String)> _rangeFilters(({DateTime? from, DateTime? to}) r) {
  final f = DateFormat('d MMM yyyy');
  return [
    if (r.from != null) ('From', f.format(r.from!)),
    if (r.to != null) ('To', f.format(r.to!)),
  ];
}

/// A compact From / To date-range bar wired to [reportRangeProvider]. Used by
/// the reports whose backend endpoint supports `from`/`to`.
class _ReportRangeBar extends ConsumerWidget {
  const _ReportRangeBar();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final range = ref.watch(reportRangeProvider);
    final fmt = DateFormat('d MMM yyyy');
    Future<void> pick(bool isFrom) async {
      final now = DateTime.now();
      final picked = await showDatePicker(
        context: context,
        initialDate: (isFrom ? range.from : range.to) ?? now,
        firstDate: DateTime(now.year - 5),
        lastDate: DateTime(now.year + 1),
      );
      if (picked == null) return;
      final n = ref.read(reportRangeProvider.notifier);
      n.state = isFrom ? (from: picked, to: range.to) : (from: range.from, to: picked);
    }

    return Padding(
      padding: const EdgeInsets.fromLTRB(12, 8, 12, 0),
      child: Row(
        children: [
          Expanded(
            child: OutlinedButton.icon(
              icon: const Icon(Icons.calendar_today, size: 16),
              label: Text(range.from == null ? 'From' : fmt.format(range.from!)),
              onPressed: () => pick(true),
            ),
          ),
          const SizedBox(width: 8),
          Expanded(
            child: OutlinedButton.icon(
              icon: const Icon(Icons.event, size: 16),
              label: Text(range.to == null ? 'To' : fmt.format(range.to!)),
              onPressed: () => pick(false),
            ),
          ),
          if (range.from != null || range.to != null)
            IconButton(
              tooltip: 'Clear dates',
              icon: const Icon(Icons.clear),
              onPressed: () => ref.read(reportRangeProvider.notifier).state = (from: null, to: null),
            ),
        ],
      ),
    );
  }
}

// ---------------------------------------------------------------- Driver Work

class DriverWorkReportScreen extends ConsumerWidget {
  const DriverWorkReportScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(driverReportProvider);
    final range = ref.watch(reportRangeProvider);
    return AdaptiveScaffold(
      currentRoute: '/reports',
      title: 'Driver Work & Payment',
      showBack: true,
      actions: [
        ReportExportMenu(docBuilder: () {
          final data = async.valueOrNull;
          if (data == null) return null;
          final rows = (data['rows'] as List<dynamic>? ?? const []).cast<Map<String, dynamic>>();
          return ReportDoc(
            title: 'Driver Work & Payment Report',
            subtitle: _rangeSubtitle(range),
            filters: _rangeFilters(range),
            columns: const [
              ReportColumn('Driver', width: 22),
              ReportColumn('Jobs', type: ColType.number, width: 10),
              ReportColumn('Worked', width: 14),
              ReportColumn('Earned', type: ColType.currency, width: 16),
              ReportColumn('Paid', type: ColType.currency, width: 16),
              ReportColumn('Balance', type: ColType.currency, width: 16),
            ],
            rows: rows
                .map((r) => [
                      r['driverName']?.toString() ?? '—',
                      _n(r['jobs']),
                      r['workedText']?.toString() ?? '',
                      _n(r['totalEarned']),
                      _n(r['totalPaid']),
                      _n(r['balance']),
                    ])
                .toList(),
            totals: [
              null,
              rows.fold<num>(0, (s, r) => s + _n(r['jobs'])),
              null,
              rows.fold<num>(0, (s, r) => s + _n(r['totalEarned'])),
              rows.fold<num>(0, (s, r) => s + _n(r['totalPaid'])),
              rows.fold<num>(0, (s, r) => s + _n(r['balance'])),
            ],
          );
        }),
        IconButton(icon: const Icon(Icons.refresh), onPressed: () => ref.invalidate(driverReportProvider)),
      ],
      body: Column(
        children: [
          const _ReportRangeBar(),
          Expanded(
            child: async.when(
              loading: () => const Center(child: CircularProgressIndicator()),
              error: (e, _) => Center(child: Text('Error: ${apiErrorMessage(e)}')),
              data: (data) {
                final rows = (data['rows'] as List<dynamic>? ?? const []).cast<Map<String, dynamic>>();
                if (rows.isEmpty) return const Center(child: Text('No driver work recorded for this period.'));
                return Column(
                  children: [
                    Expanded(
                      child: ListView(
                        children: rows
                            .map((r) => Card(
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
                                            color: (double.tryParse(r['balance'].toString()) ?? 0) > 0
                                                ? AppTheme.danger
                                                : AppTheme.success)),
                                  ),
                                ))
                            .toList(),
                      ),
                    ),
                  ],
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}

// ---------------------------------------------------------------- Machine Utilization

class MachineUtilizationReportScreen extends ConsumerWidget {
  const MachineUtilizationReportScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(machineReportProvider);
    final range = ref.watch(reportRangeProvider);
    return AdaptiveScaffold(
      currentRoute: '/reports',
      title: 'Machine Utilization / Hours',
      showBack: true,
      actions: [
        ReportExportMenu(docBuilder: () {
          final data = async.valueOrNull;
          if (data == null) return null;
          final rows = (data['rows'] as List<dynamic>? ?? const []).cast<Map<String, dynamic>>();
          return ReportDoc(
            title: 'Machine Utilization Report',
            subtitle: _rangeSubtitle(range),
            filters: _rangeFilters(range),
            columns: const [
              ReportColumn('Machine', width: 22),
              ReportColumn('Brand / Model', width: 22),
              ReportColumn('Jobs', type: ColType.number, width: 10),
              ReportColumn('Customers', type: ColType.number, width: 12),
              ReportColumn('Worked', width: 14),
            ],
            rows: rows
                .map((r) => [
                      r['registrationNumber']?.toString() ?? '—',
                      r['brandModel']?.toString() ?? '',
                      _n(r['jobs']),
                      _n(r['customers']),
                      r['workedText']?.toString() ?? '',
                    ])
                .toList(),
            totals: [
              null,
              null,
              rows.fold<num>(0, (s, r) => s + _n(r['jobs'])),
              null,
              null,
            ],
          );
        }),
        IconButton(icon: const Icon(Icons.refresh), onPressed: () => ref.invalidate(machineReportProvider)),
      ],
      body: Column(
        children: [
          const _ReportRangeBar(),
          Expanded(
            child: async.when(
              loading: () => const Center(child: CircularProgressIndicator()),
              error: (e, _) => Center(child: Text('Error: ${apiErrorMessage(e)}')),
              data: (data) {
                final rows = (data['rows'] as List<dynamic>? ?? const []).cast<Map<String, dynamic>>();
                if (rows.isEmpty) return const Center(child: Text('No machine work recorded for this period.'));
                return Column(
                  children: [
                    Expanded(
                      child: ListView(
                        children: rows
                            .map((r) => Card(
                                  margin: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                                  child: ListTile(
                                    title: Text('${r['registrationNumber']} ${r['brandModel'] ?? ''}'.trim()),
                                    subtitle: Text('${r['jobs']} jobs · ${r['customers']} customers'),
                                    trailing: Text(r['workedText'] as String? ?? '',
                                        style: const TextStyle(fontWeight: FontWeight.bold)),
                                  ),
                                ))
                            .toList(),
                      ),
                    ),
                  ],
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}

// ---------------------------------------------------------------- Maintenance / Due

class MaintenanceReportScreen extends ConsumerWidget {
  const MaintenanceReportScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(maintenanceReportProvider);
    return AdaptiveScaffold(
      currentRoute: '/reports',
      title: 'Maintenance / Due',
      showBack: true,
      actions: [
        ReportExportMenu(docBuilder: () {
          final rows = async.valueOrNull?.cast<Map<String, dynamic>>();
          if (rows == null) return null;
          return ReportDoc(
            title: 'Machine Maintenance / Due Report',
            columns: const [
              ReportColumn('Machine', width: 20),
              ReportColumn('Brand / Model', width: 22),
              ReportColumn('Total Worked', width: 16),
              ReportColumn('Status', width: 18),
              ReportColumn('Detail', width: 30),
            ],
            rows: rows
                .map((r) => [
                      r['registrationNumber']?.toString() ?? '—',
                      r['brandModel']?.toString() ?? '',
                      (r['totalWorked'] as Map<String, dynamic>?)?['text']?.toString() ?? '',
                      (r['status']?.toString() ?? 'NORMAL').replaceAll('_', ' '),
                      r['message']?.toString() ?? '',
                    ])
                .toList(),
          );
        }),
        IconButton(icon: const Icon(Icons.refresh), onPressed: () => ref.invalidate(maintenanceReportProvider)),
      ],
      body: async.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(child: Text('Error: ${apiErrorMessage(e)}')),
        data: (rows) {
          if (rows.isEmpty) return const Center(child: Text('No active machines.'));
          Color color(String s) {
            switch (s) {
              case 'OVERDUE':
                return AppTheme.danger;
              case 'DUE':
                return Colors.deepOrange;
              case 'DUE_SOON':
                return AppTheme.warning;
              case 'UNDER_MAINTENANCE':
                return Colors.blueGrey;
              case 'TRACKING_DISABLED':
                return AppTheme.textMuted;
              default:
                return AppTheme.success;
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
                    decoration: BoxDecoration(
                        color: color(status).withValues(alpha: 0.12), borderRadius: BorderRadius.circular(6)),
                    child: Text(status.replaceAll('_', ' '),
                        style: TextStyle(color: color(status), fontWeight: FontWeight.bold, fontSize: 11)),
                  ),
                ),
              );
            }).toList(),
          );
        },
      ),
    );
  }
}
