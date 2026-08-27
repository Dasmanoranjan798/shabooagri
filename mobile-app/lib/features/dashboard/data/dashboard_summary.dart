/// Mirrors `backend/src/modules/dashboard/dashboard.service.ts`'s
/// `getSummary()` response exactly — real KPIs from the same endpoint the
/// website's DesktopDashboard/ReportsPage both already use.
class DeltaMetric {
  final double current;
  final double previous;
  final double delta;
  final double? deltaPercent;

  DeltaMetric.fromJson(Map<String, dynamic> json)
      : current = (double.tryParse(json['current'].toString()) ?? 0.0),
        previous = (double.tryParse(json['previous'].toString()) ?? 0.0),
        delta = (double.tryParse(json['delta'].toString()) ?? 0.0),
        deltaPercent = (json['deltaPercent'] != null ? double.tryParse(json['deltaPercent'].toString()) : null);
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
        percent = (double.tryParse(json['percent'].toString()) ?? 0.0);
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

class DashboardPendingInvoice {
  final String invoiceId;
  final String invoiceNumber;
  final double balanceAmount;
  final int daysOutstanding;
  final String status;

  DashboardPendingInvoice.fromJson(Map<String, dynamic> json)
      : invoiceId = json['invoiceId'] as String,
        invoiceNumber = json['invoiceNumber'] as String,
        balanceAmount = (double.tryParse(json['balanceAmount'].toString()) ?? 0.0),
        daysOutstanding = json['daysOutstanding'] as int,
        status = json['status'] as String? ?? '';
}

class DashboardPendingPayment {
  final String customerId;
  final String customerName;
  final String villageName;
  final double totalOutstanding;
  final List<DashboardPendingInvoice> invoices;

  DashboardPendingPayment.fromJson(Map<String, dynamic> json)
      : customerId = json['customerId'] as String,
        customerName = json['customerName'] as String,
        villageName = json['villageName'] as String,
        totalOutstanding = (double.tryParse(json['totalOutstanding'].toString()) ?? 0.0),
        invoices = (json['invoices'] as List<dynamic>?)
                ?.map((i) => DashboardPendingInvoice.fromJson(i as Map<String, dynamic>))
                .toList() ??
            [];
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
