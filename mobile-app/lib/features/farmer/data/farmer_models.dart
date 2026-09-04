import 'package:flutter/material.dart';
import 'package:shabooagri_mobile/core/sync/data_sync.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/network/api_client.dart';
import '../../jobs/data/job_detail.dart';

/// Farmer's own read-only view of `GET /bookings` — richer than the
/// Owner/Manager offline-cache-backed `OfflineBooking` (which lacks work
/// description, pricing method label, and machine brand), matching what
/// `FarmerBookingsPage.tsx`'s expandable detail panel actually needs.
/// Server-side scoped to this customer's own bookings only, same as the
/// website (`resolveCallerScope`) — no client-side filtering by customer
/// needed.
class FarmerBooking {
  final String id;
  final String bookingNumber;
  final DateTime scheduledDate;
  final DateTime createdAt;
  final String? workDescription;
  final String villageName;
  final String? machineRegistration;
  final String? machineBrand;
  final String? pricingLabel;
  final String? pricingUnit;
  final double? rate;
  final String? notes;

  FarmerBooking.fromJson(Map<String, dynamic> json)
      : id = json['id'] as String,
        bookingNumber = json['bookingNumber'] as String,
        scheduledDate = DateTime.parse(json['scheduledDate'] as String),
        createdAt = DateTime.parse(json['createdAt'] as String),
        workDescription = json['workDescription'] as String?,
        villageName = (json['location'] as String?) ?? '—',
        machineRegistration = (json['machine'] as Map<String, dynamic>?)?['registrationNumber'] as String?,
        machineBrand = (json['machine'] as Map<String, dynamic>?)?['brand'] as String?,
        pricingLabel = (json['pricingMethod'] as Map<String, dynamic>?)?['label'] as String?,
        pricingUnit = (json['pricingMethod'] as Map<String, dynamic>?)?['unit'] as String?,
        rate = (json['rate'] != null ? double.tryParse(json['rate'].toString()) : null),
        notes = json['notes'] as String?;
}

class FarmerInvoice {
  final String id;
  final String invoiceNumber;
  final DateTime createdAt;
  final DateTime? dueDate;
  final double totalAmount;
  final double paidAmount;
  final double balanceAmount;
  final String status; // UNPAID | PARTIALLY_PAID | PAID | VOIDED
  final String? bookingNumber;

  FarmerInvoice.fromJson(Map<String, dynamic> json)
      : id = json['id'] as String,
        invoiceNumber = json['invoiceNumber'] as String,
        createdAt = DateTime.parse(json['createdAt'] as String),
        dueDate = json['dueDate'] == null ? null : DateTime.parse(json['dueDate'] as String),
        totalAmount = (double.tryParse(json['totalAmount'].toString()) ?? 0.0),
        paidAmount = (double.tryParse(json['paidAmount'].toString()) ?? 0.0),
        balanceAmount = (double.tryParse(json['balanceAmount'].toString()) ?? 0.0),
        status = json['status'] as String,
        bookingNumber = (json['booking'] as Map<String, dynamic>?)?['bookingNumber'] as String?;
}

final farmerBookingsProvider = FutureProvider<List<FarmerBooking>>((ref) async {
  syncOn(ref, {SyncEntity.booking, SyncEntity.job});
  final dio = ref.watch(apiClientProvider);
  final response = await dio.get('/bookings');
  return (response.data as List<dynamic>).map((j) => FarmerBooking.fromJson(j as Map<String, dynamic>)).toList();
});

final farmerInvoicesProvider = FutureProvider<List<FarmerInvoice>>((ref) async {
  syncOn(ref, {SyncEntity.invoice, SyncEntity.payment});
  final dio = ref.watch(apiClientProvider);
  final response = await dio.get('/invoices');
  return (response.data as List<dynamic>).map((j) => FarmerInvoice.fromJson(j as Map<String, dynamic>)).toList();
});

/// Matches `jobBadge()` in `FarmerBookingsPage.tsx` exactly — badge label
/// keyed off the linked Job's status (not the legacy `booking.status`
/// pipeline), since a booking with no job yet started shows "Ready to
/// Start"/"Awaiting Machine" depending on machine+driver assignment.
(String label, Color color) farmerJobBadge(JobDetail? job) {
  if (job == null) return ('Pending', const Color(0xFFF59E0B));
  if (job.status == 'NOT_STARTED') {
    final isReady = job.machineRegistration != null && job.driverName != null;
    return isReady ? ('Ready to Start', const Color(0xFF16A34A)) : ('Awaiting Machine', const Color(0xFFF59E0B));
  }
  final label = job.status.replaceAll('_', ' ');
  switch (job.status) {
    case 'COMPLETED':
      return (label, const Color(0xFF16A34A));
    case 'CANCELLED':
      return (label, const Color(0xFFDC2626));
    default:
      return (label, const Color(0xFF2563EB));
  }
}

/// Matches `computeFinalAmount()` in `FarmerBookingsPage.tsx` — only
/// meaningful once the job is COMPLETED (an estimate isn't collected at
/// booking time anymore; pricing itself isn't even assigned until Start).
double? farmerBookingFinalAmount(JobDetail? job) {
  if (job == null || job.status != 'COMPLETED') return null;
  return job.finalAmount;
}
