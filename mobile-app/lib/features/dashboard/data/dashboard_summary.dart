/// Mirrors `backend/src/modules/dashboard/dashboard.service.ts`'s
/// `getSummary()` response exactly — real KPIs from the same endpoint the
/// website's DesktopDashboard/ReportsPage both already use.
class DeltaMetric {
  final double current;
  final double previous;
  final double delta;
  final double? deltaPercent;

  DeltaMetric.fromJson(Map<String, dynamic> json)
      : current = (json['current'] as num).toDouble(),
        previous = (json['previous'] as num).toDouble(),
        delta = (json['delta'] as num).toDouble(),
        deltaPercent = (json['deltaPercent'] as num?)?.toDouble();
}

class MachineWorkingMetric {
  final int working;
  final int activeUsable;
  final int total;
  final double percent;

  MachineWorkingMetric.fromJson(Map<String, dynamic> json)
      : working = json['working'] as int,
        activeUsable = json['activeUsable'] as int,
        total = json['total'] as int,
        percent = (json['percent'] as num).toDouble();
}

class DashboardKpis {
  final DeltaMetric todayRevenue;
  final DeltaMetric monthRevenue;
  final DeltaMetric pendingCollection;
  final MachineWorkingMetric machinesWorking;
  final DeltaMetric driversActive;
  final DeltaMetric jobsCompleted;

  DashboardKpis.fromJson(Map<String, dynamic> json)
      : todayRevenue = DeltaMetric.fromJson(json['todayRevenue'] as Map<String, dynamic>),
        monthRevenue = DeltaMetric.fromJson(json['monthRevenue'] as Map<String, dynamic>),
        pendingCollection = DeltaMetric.fromJson(json['pendingCollection'] as Map<String, dynamic>),
        machinesWorking = MachineWorkingMetric.fromJson(json['machinesWorking'] as Map<String, dynamic>),
        driversActive = DeltaMetric.fromJson(json['driversActive'] as Map<String, dynamic>),
        jobsCompleted = DeltaMetric.fromJson(json['jobsCompleted'] as Map<String, dynamic>);
}

class DashboardJobRow {
  final String jobId;
  final String jobStatus;
  final bool isReadyToStart;
  final String bookingNumber;
  final String customerName;

  DashboardJobRow.fromJson(Map<String, dynamic> json)
      : jobId = json['jobId'] as String,
        jobStatus = json['jobStatus'] as String,
        isReadyToStart = json['isReadyToStart'] as bool,
        bookingNumber = json['bookingNumber'] as String,
        customerName = (json['customer'] as Map<String, dynamic>?)?['name'] as String? ?? 'Unknown';
}

class DashboardPendingPayment {
  final String invoiceId;
  final String invoiceNumber;
  final String customerName;
  final double balanceAmount;
  final int daysOutstanding;

  DashboardPendingPayment.fromJson(Map<String, dynamic> json)
      : invoiceId = json['invoiceId'] as String,
        invoiceNumber = json['invoiceNumber'] as String,
        customerName = json['customerName'] as String,
        balanceAmount = (json['balanceAmount'] as num).toDouble(),
        daysOutstanding = json['daysOutstanding'] as int;
}

class DashboardSummary {
  final DashboardKpis kpis;
  final List<DashboardJobRow> todaysJobs;
  final List<DashboardPendingPayment> pendingPayments;

  DashboardSummary.fromJson(Map<String, dynamic> json)
      : kpis = DashboardKpis.fromJson(json['kpis'] as Map<String, dynamic>),
        todaysJobs = (json['todaysJobs'] as List<dynamic>)
            .map((j) => DashboardJobRow.fromJson(j as Map<String, dynamic>))
            .toList(),
        pendingPayments = (json['pendingPayments'] as List<dynamic>)
            .map((p) => DashboardPendingPayment.fromJson(p as Map<String, dynamic>))
            .toList();
}
