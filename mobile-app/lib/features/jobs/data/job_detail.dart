/// Rich Job detail, matching the website's `JobExecutionModal` data needs —
/// unlike the flat offline `OfflineJob` (List screen), this is fetched live
/// from `GET /jobs/:id`, which includes the nested booking/pricingMethod/
/// machine/driver relations needed for the live price calculation.
class JobDetail {
  final String id;
  final String bookingId;
  final String status;
  final DateTime? startTime;
  final DateTime? endTime;
  final int totalPausedDurationSec;
  final double? actualHours;
  final double? completedAcres;
  final double? fuelUsedLitres;
  final String? notes;
  final String bookingNumber;
  final String customerName;
  final String villageName;
  final double? rate;
  final String? pricingUnit; // hour | minute | acre | null
  final String? pricingLabel;
  final String? machineRegistration;
  final String? driverName;

  JobDetail({
    required this.id,
    required this.bookingId,
    required this.status,
    required this.startTime,
    required this.endTime,
    required this.totalPausedDurationSec,
    required this.actualHours,
    required this.completedAcres,
    required this.fuelUsedLitres,
    required this.notes,
    required this.bookingNumber,
    required this.customerName,
    required this.villageName,
    required this.rate,
    required this.pricingUnit,
    required this.pricingLabel,
    required this.machineRegistration,
    required this.driverName,
  });

  factory JobDetail.fromJson(Map<String, dynamic> json) {
    final booking = json['booking'] as Map<String, dynamic>? ?? const {};
    final customer = booking['customer'] as Map<String, dynamic>? ?? const {};
    final village = booking['village'] as Map<String, dynamic>? ?? const {};
    final pricingMethod = booking['pricingMethod'] as Map<String, dynamic>?;
    final machine = json['machine'] as Map<String, dynamic>?;
    final driver = json['driver'] as Map<String, dynamic>?;
    final employee = driver?['employee'] as Map<String, dynamic>?;

    return JobDetail(
      id: json['id'] as String,
      bookingId: json['bookingId'] as String,
      status: json['status'] as String,
      startTime: json['startTime'] == null ? null : DateTime.parse(json['startTime'] as String),
      endTime: json['endTime'] == null ? null : DateTime.parse(json['endTime'] as String),
      totalPausedDurationSec: json['totalPausedDurationSec'] as int? ?? 0,
      actualHours: (json['actualHours'] as num?)?.toDouble(),
      completedAcres: (json['completedAcres'] as num?)?.toDouble(),
      fuelUsedLitres: (json['fuelUsedLitres'] as num?)?.toDouble(),
      notes: json['notes'] as String?,
      bookingNumber: booking['bookingNumber'] as String? ?? '—',
      customerName: customer['name'] as String? ?? 'Unknown',
      villageName: village['name'] as String? ?? '—',
      rate: (booking['rate'] as num?)?.toDouble(),
      pricingUnit: pricingMethod?['unit'] as String?,
      pricingLabel: pricingMethod?['label'] as String?,
      machineRegistration: machine?['registrationNumber'] as String?,
      driverName: employee?['name'] as String?,
    );
  }

  /// Elapsed worked seconds while WORKING — matches the website's exact
  /// formula: wall-clock minus recorded paused time. Only meaningful while
  /// actively WORKING; PAUSED/STOPPED/COMPLETED display a frozen value
  /// instead (see job_detail_screen.dart).
  int elapsedSecondsNow() {
    if (startTime == null) return 0;
    final rawSec = DateTime.now().difference(startTime!).inSeconds - totalPausedDurationSec;
    return rawSec < 0 ? 0 : rawSec;
  }

  /// Live estimated amount for hour/minute-rated jobs (updates as the
  /// counter ticks). Acre-priced or unset-pricing jobs return null — the
  /// website shows the flat rate instead in that case.
  double? liveAmountFor(int elapsedSec) {
    if (rate == null) return null;
    if (pricingUnit == 'hour') return rate! * (elapsedSec / 3600);
    if (pricingUnit == 'minute') return rate! * (elapsedSec / 60);
    return null;
  }

  /// Authoritative completed amount, matching the backend's invoice
  /// generation formula exactly (`computeFinalAmount` in
  /// `JobExecutionModal.tsx` / `pricing-calculator.ts`: `round2(rate *
  /// quantity)`), so the completion grid's Total always matches the
  /// invoice — never derived from the live ticking estimate.
  double? get finalAmount {
    if (rate == null) return null;
    double? raw;
    if (pricingUnit == null) {
      raw = rate;
    } else if (pricingUnit == 'hour') {
      raw = actualHours != null ? rate! * actualHours! : null;
    } else if (pricingUnit == 'minute') {
      raw = actualHours != null ? rate! * (actualHours! * 60) : null;
    } else if (pricingUnit == 'acre') {
      raw = completedAcres != null ? rate! * completedAcres! : null;
    }
    return raw == null ? null : (raw * 100).round() / 100;
  }
}
