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

class DriverSummary {
  final String id;
  final String name;
  final String? phone;
  final String? roleTitle;
  final String availabilityStatus;
  final String? licenseNumber;
  final DateTime? licenseExpiryDate;

  DriverSummary.fromJson(Map<String, dynamic> json)
      : id = json['id'] as String,
        name = (json['employee'] as Map<String, dynamic>?)?['name'] as String? ?? 'Unknown',
        phone = (json['employee'] as Map<String, dynamic>?)?['phone'] as String?,
        roleTitle = (json['employee'] as Map<String, dynamic>?)?['roleTitle'] as String?,
        availabilityStatus = json['availabilityStatus'] as String,
        licenseNumber = json['licenseNumber'] as String?,
        licenseExpiryDate =
            json['licenseExpiryDate'] == null ? null : DateTime.parse(json['licenseExpiryDate'] as String);
}

/// Live list (not the offline cache) — license expiry warnings need
/// `licenseExpiryDate`, which the flat offline table doesn't carry.
final driversListProvider = FutureProvider<List<DriverSummary>>((ref) async {
  final dio = ref.watch(apiClientProvider);
  final response = await dio.get('/drivers');
  return (response.data as List<dynamic>).map((j) => DriverSummary.fromJson(j as Map<String, dynamic>)).toList();
});

enum _AvailFilter { all, available, onJob, offDuty }

class DriverListScreen extends ConsumerStatefulWidget {
  const DriverListScreen({super.key});

  @override
  ConsumerState<DriverListScreen> createState() => _DriverListScreenState();
}

class _DriverListScreenState extends ConsumerState<DriverListScreen> {
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
    final profileAsync = ref.watch(companyProfileProvider);
    final user = ref.watch(currentUserProvider);
    final canManage = user?.isOwnerOrManager ?? false;
    final canDelete = user?.roleSystemKey == 'owner';
    final licenseAlertDays = profileAsync.valueOrNull?.licenseAlertDays ?? 30;

    return Scaffold(
      drawer: const AppDrawer(currentRoute: '/drivers'),
      appBar: AppBar(
        title: const Text('Drivers'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () => ref.invalidate(driversListProvider),
          ),
        ],
      ),
      floatingActionButton: canManage
          ? FloatingActionButton(onPressed: () => context.go('/drivers/new'), child: const Icon(Icons.add))
          : null,
      body: driversAsync.when(
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
              SearchField(
                hintText: 'Search by Name, License, Phone...',
                onChanged: (value) => setState(() => _query = value.trim().toLowerCase()),
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
                    : ListView.builder(
                        itemCount: filtered.length,
                        itemBuilder: (context, index) {
                          final driver = filtered[index];
                          final licenseWarn = expiryWarning(
                            expiryDate: driver.licenseExpiryDate,
                            alertDays: licenseAlertDays,
                            overdueLabel: 'License Expired',
                            dueSoonLabel: 'License Expires',
                          );
                          return Card(
                            margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                            child: ListTile(
                              title: Text(driver.name),
                              subtitle: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(driver.availabilityStatus),
                                  if (licenseWarn != null)
                                    Text(licenseWarn.$3,
                                        style:
                                            TextStyle(color: licenseWarn.$1 ? Colors.red : Colors.orange, fontSize: 12)),
                                ],
                              ),
                              onTap: () => context.go('/drivers/${driver.id}'),
                              trailing: Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  if (canManage || canDelete)
                                    PopupMenuButton<String>(
                                      onSelected: (action) async {
                                        if (action == 'edit') {
                                          context.go('/drivers/${driver.id}/edit');
                                        } else if (action == 'delete') {
                                          final dio = ref.read(apiClientProvider);
                                          await confirmAndDelete(
                                            context: context,
                                            entityLabel: driver.name,
                                            onDelete: () => dio.delete('/drivers/${driver.id}'),
                                            onSuccess: () => ref.invalidate(driversListProvider),
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
