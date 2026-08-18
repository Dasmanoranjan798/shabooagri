import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/company_profile.dart';
import '../network/api_client.dart';

final companyProfileProvider = FutureProvider<CompanyProfile>((ref) async {
  final dio = ref.watch(apiClientProvider);
  final response = await dio.get('/settings/profile');
  return CompanyProfile.fromJson(response.data as Map<String, dynamic>);
});

/// Machine-service-due warning, mirroring `operationalWarnings.ts`'s
/// `getMachineServiceWarning` exactly: overdue if hours remaining <= 0,
/// due-soon if remaining is within the company's configured threshold.
(bool isOverdue, bool isDueSoon, String message)? machineServiceWarning({
  required double? hourMeterReading,
  required double? nextServiceDueHours,
  required int serviceAlertHours,
}) {
  if (nextServiceDueHours == null || hourMeterReading == null) return null;
  final remaining = nextServiceDueHours - hourMeterReading;
  if (remaining <= 0) {
    return (true, false, 'Service Overdue by ${(-remaining).toStringAsFixed(0)}h');
  }
  if (remaining <= serviceAlertHours) {
    return (false, true, 'Service Due in ${remaining.toStringAsFixed(0)}h');
  }
  return null;
}

/// Insurance/document expiry warning, mirroring
/// `getMachineInsuranceWarning`/license-expiry logic: overdue if already
/// past expiry, due-soon if within the company's configured day threshold.
(bool isOverdue, bool isDueSoon, String message)? expiryWarning({
  required DateTime? expiryDate,
  required int alertDays,
  required String overdueLabel,
  required String dueSoonLabel,
}) {
  if (expiryDate == null) return null;
  final daysLeft = expiryDate.difference(DateTime.now()).inDays;
  if (daysLeft < 0) {
    return (true, false, '$overdueLabel (${-daysLeft}d ago)');
  }
  if (daysLeft <= alertDays) {
    return (false, true, '$dueSoonLabel in ${daysLeft}d');
  }
  return null;
}
