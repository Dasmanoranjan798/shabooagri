import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shabooagri_mobile/core/sync/data_sync.dart';

import '../../../core/network/api_client.dart';
import '../../../core/providers/company_profile_provider.dart';
import '../../drivers/presentation/driver_list_screen.dart';
import '../../machines/presentation/machine_list_screen.dart';

class NotificationItem {
  final String id;
  final String category; // service | insurance | license | invoice | booking
  final String title;
  final String subtitle;
  final bool isOverdue;
  final String path;

  NotificationItem({
    required this.id,
    required this.category,
    required this.title,
    required this.subtitle,
    required this.isOverdue,
    required this.path,
  });
}

/// Matches `useNotifications.ts` exactly — same 5 sources (machines,
/// drivers, invoices, bookings, company profile), same warning formulas
/// (reusing the already-built `machineServiceWarning`/`expiryWarning`
/// helpers), same overdue-first sort. Deliberately does not introduce a
/// new backend endpoint — the website itself computes this entirely
/// client-side from 5 existing list calls, so mobile does the same.
final notificationsProvider = FutureProvider<List<NotificationItem>>((ref) async {
  syncOn(ref, {SyncEntity.dashboard});
  final dio = ref.watch(apiClientProvider);

  final machines = await ref.watch(machinesListProvider.future);
  final drivers = await ref.watch(driversListProvider.future);
  final company = await ref.watch(companyProfileProvider.future);
  final invoicesResponse = await dio.get('/invoices');
  final bookingsResponse = await dio.get('/bookings');

  final result = <NotificationItem>[];

  for (final m in machines) {
    final service = machineServiceWarning(
      hourMeterReading: m.hourMeterReading,
      nextServiceDueHours: m.nextServiceDueHours,
      serviceAlertHours: company.serviceAlertHours,
    );
    if (service != null) {
      result.add(NotificationItem(
        id: 'service-${m.id}',
        category: 'service',
        title: '${m.registrationNumber} — ${service.$3}',
        subtitle: 'Equipment service',
        isOverdue: service.$1,
        path: '/machines',
      ));
    }

    final insurance = expiryWarning(
      expiryDate: m.insuranceExpiryDate,
      alertDays: company.insuranceAlertDays,
      overdueLabel: 'Insurance Expired',
      dueSoonLabel: 'Insurance Expires',
    );
    if (insurance != null) {
      result.add(NotificationItem(
        id: 'insurance-${m.id}',
        category: 'insurance',
        title: '${m.registrationNumber} — ${insurance.$3}',
        subtitle: 'Insurance / documents',
        isOverdue: insurance.$1,
        path: '/machines',
      ));
    }
  }

  for (final d in drivers) {
    final license = expiryWarning(
      expiryDate: d.licenseExpiryDate,
      alertDays: company.licenseAlertDays,
      overdueLabel: 'License Expired',
      dueSoonLabel: 'License Expires',
    );
    if (license != null) {
      result.add(NotificationItem(
        id: 'license-${d.id}',
        category: 'license',
        title: '${d.name} — ${license.$3}',
        subtitle: 'Driver license',
        isOverdue: license.$1,
        path: '/drivers',
      ));
    }
  }

  final now = DateTime.now();
  for (final json in (invoicesResponse.data as List<dynamic>)) {
    final inv = json as Map<String, dynamic>;
    final status = inv['status'] as String;
    final dueDateStr = inv['dueDate'] as String?;
    if (status == 'PAID' || dueDateStr == null) continue;
    final dueDate = DateTime.parse(dueDateStr);
    if (!dueDate.isBefore(now)) continue;
    final daysOverdue = now.difference(dueDate).inDays;
    final customerName = (inv['customer'] as Map<String, dynamic>?)?['name'] as String?;
    result.add(NotificationItem(
      id: 'invoice-${inv['id']}',
      category: 'invoice',
      title: 'Invoice ${inv['invoiceNumber']} — Overdue by ${daysOverdue}d',
      subtitle: customerName ?? 'Payment overdue',
      isOverdue: true,
      path: '/payments',
    ));
  }

  for (final json in (bookingsResponse.data as List<dynamic>)) {
    final b = json as Map<String, dynamic>;
    if (b['status'] != 'PENDING') continue;
    final customerName = (b['customer'] as Map<String, dynamic>?)?['name'] as String?;
    result.add(NotificationItem(
      id: 'booking-${b['id']}',
      category: 'booking',
      title: 'Booking ${b['bookingNumber']} — Awaiting acceptance',
      subtitle: customerName ?? 'New booking',
      isOverdue: false,
      path: '/bookings',
    ));
  }

  result.sort((a, b) => (b.isOverdue ? 1 : 0) - (a.isOverdue ? 1 : 0));
  return result;
});
