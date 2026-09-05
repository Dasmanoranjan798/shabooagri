import 'package:flutter/material.dart';
import 'package:shabooagri_mobile/core/sync/data_sync.dart';
import '../../../core/widgets/quick_action_bar.dart';
import '../../../core/widgets/status_badge.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../core/layout/responsive.dart';
import '../../../core/network/api_client.dart';
import '../../../core/network/api_error.dart';
import '../../../core/providers/session_provider.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/utils/money.dart';
import '../../../core/widgets/adaptive_scaffold.dart';
import '../../../core/widgets/desktop_table.dart';
import '../../../core/widgets/list_action_bar.dart';
import '../../../core/widgets/search_field.dart';

class DriverSummary {
  final String id;
  final String name;
  final String? phone;
  final String? roleTitle;
  final String availabilityStatus;
  final String? licenseNumber;
  final DateTime? licenseExpiryDate;
  final String? employeeUserId;
  // Backend-authoritative work + pay (driver.service.listWithEarnings).
  final String workedText; // "87 h 30 min"
  final double remainingPayable; // money to PAY OUT (red)
  final String paymentStatus; // UNPAID | PARTIALLY_PAID | PAID

  DriverSummary.fromJson(Map<String, dynamic> json)
      : id = json['id'] as String,
        name = (json['employee'] as Map<String, dynamic>?)?['name'] as String? ?? 'Unknown',
        phone = (json['employee'] as Map<String, dynamic>?)?['phone'] as String?,
        roleTitle = (json['employee'] as Map<String, dynamic>?)?['roleTitle'] as String?,
        availabilityStatus = json['availabilityStatus'] as String,
        licenseNumber = json['licenseNumber'] as String?,
        licenseExpiryDate =
            json['licenseExpiryDate'] == null ? null : DateTime.parse(json['licenseExpiryDate'] as String),
        employeeUserId = (json['employee'] as Map<String, dynamic>?)?['userId'] as String?,
        workedText = json['workedText'] as String? ?? '0 h 0 min',
        remainingPayable = double.tryParse(json['remainingPayable']?.toString() ?? '0') ?? 0,
        paymentStatus = json['paymentStatus'] as String? ?? 'UNPAID';
}

/// Live list (not the offline cache) — license expiry warnings need
/// `licenseExpiryDate`, which the flat offline table doesn't carry.
final driversListProvider = FutureProvider<List<DriverSummary>>((ref) async {
  syncOn(ref, {SyncEntity.driver});
  final dio = ref.watch(apiClientProvider);
  final response = await dio.get('/drivers');
  return (response.data as List<dynamic>).map((j) => DriverSummary.fromJson(j as Map<String, dynamic>)).toList();
});

enum _AvailFilter { all, available, onJob, offDuty }

class DriverListScreen extends ConsumerWidget {
  const DriverListScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final user = ref.watch(currentUserProvider);
    final canManage = user?.isOwnerOrManager ?? false;
    final isDesktop = context.responsive.isDesktop;

    return AdaptiveScaffold(
      currentRoute: '/drivers',
      title: 'Drivers',
      actions: [
        IconButton(
          icon: const Icon(Icons.refresh),
          onPressed: () => ref.invalidate(driversListProvider),
        ),
        if (isDesktop && canManage)
          Padding(
            padding: const EdgeInsets.only(left: 8),
            child: FilledButton.icon(
              onPressed: () => context.go('/drivers/new'),
              icon: const Icon(Icons.add),
              label: const Text('New Driver'),
            ),
          ),
      ],
      // New Driver is inline in the compact search/action bar on phones (no FAB);
      // desktop keeps its top-bar button.
      bottomNavigationBar: isDesktop ? null : const QuickActionBar(),
      body: const DriverListBody(),
    );
  }
}

/// Search + availability-filter + list content of the Drivers screen, without
/// the scaffold — reused both as the standalone screen body and the Dashboard's
/// contextual "Drivers" workspace.
class DriverListBody extends ConsumerStatefulWidget {
  const DriverListBody({super.key});

  @override
  ConsumerState<DriverListBody> createState() => _DriverListBodyState();
}

class _DriverListBodyState extends ConsumerState<DriverListBody> {
  String _query = '';
  _AvailFilter _filter = _AvailFilter.all;

  bool _matchesFilter(DriverSummary d, _AvailFilter filter) {
    switch (filter) {
      case _AvailFilter.all:
        return true;
      case _AvailFilter.available:
        return d.availabilityStatus == 'AVAILABLE';
      case _AvailFilter.onJob:
        return d.availabilityStatus == 'ON_JOB';
      case _AvailFilter.offDuty:
        return d.availabilityStatus == 'OFF_DUTY';
    }
  }

  @override
  Widget build(BuildContext context) {
    final driversAsync = ref.watch(driversListProvider);
    final isDesktop = context.responsive.isDesktop;
    final canManage = ref.watch(currentUserProvider)?.isOwnerOrManager ?? false;

    return driversAsync.when(
      data: (drivers) {
        final counts = {for (final f in _AvailFilter.values) f: drivers.where((d) => _matchesFilter(d, f)).length};
        var filtered = drivers.where((d) => _matchesFilter(d, _filter)).toList();
        if (_query.isNotEmpty) {
          filtered = filtered
              .where((d) =>
                  d.name.toLowerCase().contains(_query) ||
                  (d.roleTitle?.toLowerCase().contains(_query) ?? false) ||
                  (d.phone?.toLowerCase().contains(_query) ?? false) ||
                  (d.licenseNumber?.toLowerCase().contains(_query) ?? false))
              .toList();
        }

        return Column(
          children: [
            ListActionBar(
              hintText: 'Search by Name, License, Phone...',
              onChanged: (value) => setState(() => _query = value.trim().toLowerCase()),
              actionLabel: (!isDesktop && canManage) ? 'New Driver' : null,
              onAction: (!isDesktop && canManage) ? () => context.go('/drivers/new') : null,
            ),
            FilterTabsRow<_AvailFilter>(
              selected: _filter,
              onSelected: (f) => setState(() => _filter = f),
              tabs: [
                (_AvailFilter.all, 'All', counts[_AvailFilter.all]!),
                (_AvailFilter.available, 'Available', counts[_AvailFilter.available]!),
                (_AvailFilter.onJob, 'On Job', counts[_AvailFilter.onJob]!),
                (_AvailFilter.offDuty, 'Off Duty', counts[_AvailFilter.offDuty]!),
              ],
            ),
            Expanded(
              child: filtered.isEmpty
                  ? const Center(child: Text('No drivers match this view.'))
                  : isDesktop
                      ? _desktopTable(context, filtered)
                      : ListView.builder(
                      itemCount: filtered.length,
                      itemBuilder: (context, index) {
                        final driver = filtered[index];
                        return Card(
            margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
            child: InkWell(
              onTap: () => context.go('/drivers/${driver.id}'),
              borderRadius: BorderRadius.circular(10),
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        CircleAvatar(
                          radius: 20,
                          backgroundColor: Colors.grey.shade200,
                          child: const Icon(Icons.person, color: Colors.grey),
                        ),
                        const SizedBox(width: 14),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(driver.name, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                              if (driver.phone != null) ...[
                                const SizedBox(height: 2),
                                Text(driver.phone!, style: const TextStyle(color: AppTheme.textMuted, fontSize: 13)),
                              ],
                            ],
                          ),
                        ),
                        DriverStatusBadge(status: driver.availabilityStatus),
                      ],
                    ),
                    const SizedBox(height: 12),
                    // Key operational metric + payable. RED = money to PAY OUT.
                    Row(
                      children: [
                        const Icon(Icons.schedule, size: 15, color: AppTheme.textMuted),
                        const SizedBox(width: 6),
                        Expanded(
                          child: Text('Worked ${driver.workedText}',
                              overflow: TextOverflow.ellipsis,
                              style: const TextStyle(fontSize: 13, color: AppTheme.textMuted)),
                        ),
                        const SizedBox(width: 8),
                        if (driver.remainingPayable > 0) ...[
                          const Text('Payable', style: TextStyle(fontSize: 12, color: AppTheme.textMuted)),
                          const SizedBox(width: 6),
                          Flexible(
                            child: Text(rupees(driver.remainingPayable),
                                overflow: TextOverflow.ellipsis,
                                style: const TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: AppTheme.payable)),
                          ),
                        ] else
                          const Text('Settled', style: TextStyle(fontSize: 13, color: AppTheme.textMuted)),
                      ],
                    ),
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

  /// Desktop presentation: a proper drivers data grid — same data as the phone
  /// card list, laid out for mouse/keyboard.
  Widget _desktopTable(BuildContext context, List<DriverSummary> drivers) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
      child: DesktopTable(
        columns: const [
          DataColumn(label: Text('Name')),
          DataColumn(label: Text('Phone')),
          DataColumn(label: Text('Availability')),
          DataColumn(label: Text('Worked')),
          DataColumn(label: Text('Payable'), numeric: true),
        ],
        rows: [
          for (final d in drivers)
            DataRow(
              onSelectChanged: (_) => context.go('/drivers/${d.id}'),
              cells: [
                DataCell(Text(d.name, style: const TextStyle(fontWeight: FontWeight.w600))),
                DataCell(Text(d.phone ?? '—')),
                DataCell(DriverStatusBadge(status: d.availabilityStatus)),
                DataCell(Text(d.workedText)),
                DataCell(d.remainingPayable > 0
                    ? Text(rupees(d.remainingPayable),
                        style: const TextStyle(color: AppTheme.payable, fontWeight: FontWeight.bold))
                    : const Text('—', style: TextStyle(color: AppTheme.textMuted))),
              ],
            ),
        ],
      ),
    );
  }
}
