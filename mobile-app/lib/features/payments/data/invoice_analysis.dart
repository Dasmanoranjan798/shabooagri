import '../presentation/payment_list_screen.dart';

class AnalysisSummary {
  final int invoicesCount;
  final double totalInvoiced;
  final double totalPaid;
  final double totalOutstanding;
  final double overdueAmount;
  final int paidCount;
  final int partialCount;
  final int unpaidCount;
  final int overdueCount;
  final int dueTodayCount;
  final int dueSoonCount;

  AnalysisSummary.fromJson(Map<String, dynamic> json)
      : invoicesCount = json['invoicesCount'] ?? 0,
        totalInvoiced = (double.tryParse(json['totalInvoiced']?.toString() ?? '0') ?? 0.0),
        totalPaid = (double.tryParse(json['totalPaid']?.toString() ?? '0') ?? 0.0),
        totalOutstanding = (double.tryParse(json['totalOutstanding']?.toString() ?? '0') ?? 0.0),
        overdueAmount = (double.tryParse(json['overdueAmount']?.toString() ?? '0') ?? 0.0),
        paidCount = json['paidCount'] ?? 0,
        partialCount = json['partialCount'] ?? 0,
        unpaidCount = json['unpaidCount'] ?? 0,
        overdueCount = json['overdueCount'] ?? 0,
        dueTodayCount = json['dueTodayCount'] ?? 0,
        dueSoonCount = json['dueSoonCount'] ?? 0;
}

class InvoiceAnalysisResponse {
  final List<InvoiceSummary> invoices;
  final AnalysisSummary summary;
  final List<Map<String, dynamic>> dayWiseCollection;
  final List<Map<String, dynamic>> methodWiseCollection;
  final List<Map<String, dynamic>> customerWise;
  final List<Map<String, dynamic>> villageWise;

  InvoiceAnalysisResponse.fromJson(Map<String, dynamic> json)
      : invoices = (json['invoices'] as List<dynamic>?)
            ?.map((j) => InvoiceSummary.fromJson(j as Map<String, dynamic>))
            .toList() ?? [],
        summary = AnalysisSummary.fromJson(json['summary'] ?? {}),
        dayWiseCollection = List<Map<String, dynamic>>.from(json['dayWiseCollection'] ?? []),
        methodWiseCollection = List<Map<String, dynamic>>.from(json['methodWiseCollection'] ?? []),
        customerWise = List<Map<String, dynamic>>.from(json['customerWise'] ?? []),
        villageWise = List<Map<String, dynamic>>.from(json['villageWise'] ?? []);
}
