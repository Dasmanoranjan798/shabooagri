import 'package:flutter_test/flutter_test.dart';
import 'package:shabooagri_mobile/core/models/company_profile.dart';
import 'package:shabooagri_mobile/features/reports/presentation/report_export.dart';

/// Verifies the shared professional export layer generates valid, non-empty
/// PDF and Excel (.xlsx) output from a [ReportDoc] — the riskiest part of the
/// export feature (real file generation), exercised without platform channels.
void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  final company = CompanyProfile.fromJson({
    'id': 'company-1',
    'slug': 'pilot',
    'name': 'Shaboo Agri Services',
    'address': 'Main Road',
    'city': 'Cuttack',
    'district': 'Cuttack',
    'state': 'Odisha',
    'pincode': '753001',
    'phone': '9876543210',
    'email': 'ops@shabooagri.com',
    'gstin': '21ABCDE1234F1Z5',
    'currency': 'INR',
  });

  ReportDoc narrow() => ReportDoc(
        title: 'Customer Outstanding Report',
        filters: const [('Status', 'UNPAID'), ('From', '2026-09-01')],
        columns: const [
          ReportColumn('Customer', width: 26),
          ReportColumn('Invoiced', type: ColType.currency, width: 16),
          ReportColumn('Paid', type: ColType.currency, width: 16),
          ReportColumn('Outstanding', type: ColType.currency, width: 16),
        ],
        rows: [
          ['Ramesh Behera (a very long customer name to test wrapping)', 125000.0, 50000.0, 75000.0],
          ['Sunita Devi', 8000, 8000, 0],
        ],
        totals: [null, 133000.0, 58000.0, 75000.0],
      );

  // 9 columns -> exercises the landscape path; mixed types + dates.
  ReportDoc wide() => ReportDoc(
        title: 'Payments / Transactions Report',
        subtitle: 'All time',
        columns: const [
          ReportColumn('Invoice'),
          ReportColumn('Customer'),
          ReportColumn('Village'),
          ReportColumn('Date', type: ColType.date),
          ReportColumn('Due', type: ColType.date),
          ReportColumn('Total', type: ColType.currency),
          ReportColumn('Paid', type: ColType.currency),
          ReportColumn('Balance', type: ColType.currency),
          ReportColumn('Status'),
        ],
        rows: List.generate(
          60, // multiple pages
          (i) => [
            'INV-${1000 + i}',
            'Customer $i',
            'Village ${i % 5}',
            '2026-09-${(i % 28) + 1}T00:00:00.000Z',
            null,
            10000 + i,
            (i.isEven) ? 10000 + i : 0,
            (i.isEven) ? 0 : 10000 + i,
            i.isEven ? 'PAID' : 'UNPAID',
          ],
        ),
        totals: [null, null, null, null, null, 600000, 300000, 300000, null],
      );

  // Business Summary style: multiple typed sections in one document.
  ReportDoc multiSection() => ReportDoc.multi(
        title: 'Business Summary',
        subtitle: 'Income range: 30d',
        filters: const [('Income Range', '30d')],
        sections: [
          const ReportSection(
            heading: 'Financial Summary',
            columns: [
              ReportColumn('Metric', width: 28),
              ReportColumn('Amount', type: ColType.currency, width: 18),
            ],
            rows: [
              ["Today's Revenue", 12500.0],
              ['This Month Revenue', 480000.0],
              ['Pending Collection', 92000.0],
            ],
          ),
          const ReportSection(
            heading: 'Operational Summary',
            columns: [
              ReportColumn('Metric', width: 28),
              ReportColumn('Count', type: ColType.number, width: 14),
            ],
            rows: [
              ['Machines Working', 3],
              ['Machines Usable', 5],
              ['Drivers Active', 4],
              ['Jobs Completed', 18],
            ],
          ),
          ReportSection(
            heading: 'Income Overview (30d)',
            columns: const [
              ReportColumn('Period', width: 22),
              ReportColumn('Amount', type: ColType.currency, width: 18),
            ],
            rows: List.generate(30, (i) => ['2026-09-${i + 1}', 1000.0 * (i + 1)]),
            totals: const [null, 465000.0],
          ),
        ],
      );

  test('multi-section (Business Summary) exports valid XLSX and PDF', () async {
    final doc = multiSection();
    final xlsx = buildReportXlsxBytes(doc, company);
    expect(xlsx.length, greaterThan(600));
    expect(xlsx[0], 0x50);
    expect(xlsx[1], 0x4B);
    final pdf = await buildReportPdfBytes(doc, company);
    expect(pdf.length, greaterThan(1000));
    expect(String.fromCharCodes(pdf.take(4)), '%PDF');
  });

  test('XLSX bytes are a valid non-empty zip (xlsx = zip, starts with PK)', () {
    for (final doc in [narrow(), wide()]) {
      final bytes = buildReportXlsxBytes(doc, company);
      expect(bytes.length, greaterThan(500));
      expect(bytes[0], 0x50); // 'P'
      expect(bytes[1], 0x4B); // 'K'
    }
  });

  test('PDF bytes are a valid non-empty document (starts with %PDF)', () async {
    for (final doc in [narrow(), wide()]) {
      final bytes = await buildReportPdfBytes(doc, company);
      expect(bytes.length, greaterThan(1000));
      expect(String.fromCharCodes(bytes.take(4)), '%PDF');
    }
  });

  test('handles an empty-rows doc without throwing', () async {
    final doc = ReportDoc(
      title: 'Empty Report',
      columns: const [ReportColumn('A'), ReportColumn('B', type: ColType.currency)],
      rows: const [],
    );
    expect(buildReportXlsxBytes(doc, company).length, greaterThan(300));
    expect((await buildReportPdfBytes(doc, company)).length, greaterThan(500));
  });
}
