import 'dart:io';
import 'dart:typed_data';

import 'package:excel/excel.dart' as xls;
import 'package:flutter/material.dart';
import 'package:flutter/services.dart' show rootBundle;
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import 'package:path_provider/path_provider.dart';
import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart' as pw;
import 'package:printing/printing.dart';
import 'package:share_plus/share_plus.dart';

import '../../../core/models/company_profile.dart';
import '../../../core/providers/company_profile_provider.dart';

/// One shared, professional export layer for the canonical Reports module.
///
/// Every report builds a [ReportDoc] from the SAME filtered data it renders on
/// screen; the PDF, Excel (.xlsx) and CSV exporters all consume that one
/// structure, so screen == Excel == PDF == CSV by construction. No exporter
/// re-queries or re-calculates anything.
///
/// A [ReportDoc] is one or more [ReportSection]s. Most reports have a single
/// section (the `ReportDoc(...)` convenience constructor); a report whose data
/// is genuinely several typed tables (e.g. Business Summary: financial KPIs,
/// operational KPIs, income series) uses `ReportDoc.multi(...)`.

enum ColType { text, number, currency, date }

class ReportColumn {
  final String header;
  final ColType type;

  /// Relative width hint (≈ characters): drives PDF flex + Excel column width.
  final double width;

  const ReportColumn(this.header, {this.type = ColType.text, this.width = 16});

  bool get isNumeric => type == ColType.number || type == ColType.currency;
}

/// One titled table within a report. [rows] hold raw values (String / num /
/// DateTime) aligned to [columns]; each column keeps its own value type so
/// numbers, currency and dates stay correctly typed in Excel (sortable,
/// summable) and correctly formatted everywhere.
class ReportSection {
  final String? heading;
  final List<ReportColumn> columns;
  final List<List<Object?>> rows;
  final List<Object?>? totals; // aligned to columns; null cells render blank

  const ReportSection({
    this.heading,
    required this.columns,
    required this.rows,
    this.totals,
  });
}

/// A fully-formed report ready to render or export.
class ReportDoc {
  final String title;
  final String? subtitle; // e.g. the date range
  final List<(String, String)> filters; // (label, value)
  final List<ReportSection> sections;

  const ReportDoc._({
    required this.title,
    required this.sections,
    this.subtitle,
    this.filters = const [],
  });

  /// Single-section report (the common case).
  factory ReportDoc({
    required String title,
    required List<ReportColumn> columns,
    required List<List<Object?>> rows,
    String? subtitle,
    List<(String, String)> filters = const [],
    List<Object?>? totals,
  }) =>
      ReportDoc._(
        title: title,
        subtitle: subtitle,
        filters: filters,
        sections: [ReportSection(columns: columns, rows: rows, totals: totals)],
      );

  /// Multi-section report — each section keeps its own typed columns.
  factory ReportDoc.multi({
    required String title,
    required List<ReportSection> sections,
    String? subtitle,
    List<(String, String)> filters = const [],
  }) =>
      ReportDoc._(title: title, subtitle: subtitle, filters: filters, sections: sections);

  bool get hasRows => sections.any((s) => s.rows.isNotEmpty);
  int get maxColumns => sections.fold(0, (m, s) => s.columns.length > m ? s.columns.length : m);
}

// --------------------------------------------------------------- formatting

String _currencySymbol(String currency) {
  switch (currency) {
    case 'INR':
      return '₹';
    case 'USD':
      return '\$';
    case 'EUR':
      return '€';
    case 'GBP':
      return '£';
    default:
      return '';
  }
}

final NumberFormat _amount = NumberFormat('#,##0.00');
final NumberFormat _decimal = NumberFormat.decimalPattern();
final DateFormat _dateFmt = DateFormat('d MMM yyyy');

String _formatCell(Object? v, ColType type, String currencySymbol) {
  if (v == null) return '';
  switch (type) {
    case ColType.currency:
      final n = v is num ? v : num.tryParse(v.toString()) ?? 0;
      return '$currencySymbol${_amount.format(n)}';
    case ColType.number:
      final n = v is num ? v : num.tryParse(v.toString());
      return n == null ? v.toString() : _decimal.format(n);
    case ColType.date:
      final d = v is DateTime ? v : DateTime.tryParse(v.toString());
      return d == null ? v.toString() : _dateFmt.format(d);
    case ColType.text:
      return v.toString();
  }
}

List<String> _companyLines(CompanyProfile co) {
  final address = [co.address, co.city, co.district, co.state, co.pincode]
      .where((e) => e != null && e.trim().isNotEmpty)
      .join(', ');
  final contact = [
    if (co.phone != null && co.phone!.trim().isNotEmpty) 'Ph: ${co.phone}',
    if (co.email != null && co.email!.trim().isNotEmpty) co.email!,
    if (co.gstin != null && co.gstin!.trim().isNotEmpty) 'GSTIN: ${co.gstin}',
  ].join('   •   ');
  return [if (address.isNotEmpty) address, if (contact.isNotEmpty) contact];
}

String _fileName(ReportDoc doc, String ext) {
  final safe = doc.title.replaceAll(RegExp(r'[^A-Za-z0-9]+'), '_').replaceAll(RegExp(r'^_|_$'), '');
  final stamp = DateFormat('d_MMM_yyyy').format(DateTime.now());
  return 'ShabooAgri_${safe}_$stamp.$ext';
}

// --------------------------------------------------------------------- PDF

/// The default PDF font (Helvetica) has NO Unicode support, so ₹, — and •
/// won't render. We embed DejaVu Sans (bundled asset) once, cached, and apply
/// it as the document theme so every glyph — especially the rupee sign —
/// renders correctly and fully offline.
pw.ThemeData? _pdfThemeCache;
Future<pw.ThemeData> _pdfTheme() async {
  if (_pdfThemeCache != null) return _pdfThemeCache!;
  final base = pw.Font.ttf(await rootBundle.load('assets/fonts/DejaVuSans.ttf'));
  final bold = pw.Font.ttf(await rootBundle.load('assets/fonts/DejaVuSans-Bold.ttf'));
  return _pdfThemeCache = pw.ThemeData.withFont(base: base, bold: bold);
}

/// Builds the PDF bytes for [doc]. Public so it can be unit-tested directly
/// (pure computation — no platform channels).
Future<Uint8List> buildReportPdfBytes(ReportDoc doc, CompanyProfile co) async {
  final symbol = _currencySymbol(co.currency);
  final landscape = doc.maxColumns > 5;
  final generated = DateFormat('d MMM yyyy, h:mm a').format(DateTime.now());
  final pdf = pw.Document(theme: await _pdfTheme());

  pdf.addPage(
    pw.MultiPage(
      pageFormat: landscape ? PdfPageFormat.a4.landscape : PdfPageFormat.a4,
      margin: const pw.EdgeInsets.fromLTRB(28, 28, 28, 36),
      header: (ctx) => ctx.pageNumber == 1
          ? _pdfTitleBlock(doc, co, generated)
          : pw.Container(
              alignment: pw.Alignment.centerLeft,
              margin: const pw.EdgeInsets.only(bottom: 8),
              child: pw.Text('${co.name} — ${doc.title}',
                  style: pw.TextStyle(fontSize: 9, color: PdfColors.grey700)),
            ),
      footer: (ctx) => pw.Container(
        alignment: pw.Alignment.centerRight,
        margin: const pw.EdgeInsets.only(top: 8),
        child: pw.Text('Page ${ctx.pageNumber} of ${ctx.pagesCount}',
            style: pw.TextStyle(fontSize: 9, color: PdfColors.grey700)),
      ),
      build: (ctx) => [
        for (final section in doc.sections) ..._pdfSection(section, symbol),
      ],
    ),
  );
  return pdf.save();
}

pw.Widget _pdfTitleBlock(ReportDoc doc, CompanyProfile co, String generated) {
  return pw.Container(
    margin: const pw.EdgeInsets.only(bottom: 12),
    child: pw.Column(
      crossAxisAlignment: pw.CrossAxisAlignment.start,
      children: [
        pw.Text(co.name, style: pw.TextStyle(fontSize: 18, fontWeight: pw.FontWeight.bold)),
        for (final line in _companyLines(co))
          pw.Text(line, style: pw.TextStyle(fontSize: 9, color: PdfColors.grey800)),
        pw.SizedBox(height: 8),
        pw.Divider(thickness: 1, color: PdfColors.grey400),
        pw.Text(doc.title, style: pw.TextStyle(fontSize: 14, fontWeight: pw.FontWeight.bold)),
        if (doc.subtitle != null && doc.subtitle!.isNotEmpty)
          pw.Text(doc.subtitle!, style: const pw.TextStyle(fontSize: 10)),
        if (doc.filters.isNotEmpty)
          pw.Text('Filters: ${doc.filters.map((f) => '${f.$1}: ${f.$2}').join('   |   ')}',
              style: pw.TextStyle(fontSize: 9, color: PdfColors.grey700)),
        pw.Text('Generated: $generated', style: pw.TextStyle(fontSize: 9, color: PdfColors.grey700)),
        pw.SizedBox(height: 8),
      ],
    ),
  );
}

List<pw.Widget> _pdfSection(ReportSection s, String symbol) {
  final alignments = <int, pw.Alignment>{
    for (var i = 0; i < s.columns.length; i++)
      i: s.columns[i].isNumeric ? pw.Alignment.centerRight : pw.Alignment.centerLeft,
  };
  final columnWidths = <int, pw.TableColumnWidth>{
    for (var i = 0; i < s.columns.length; i++) i: pw.FlexColumnWidth(s.columns[i].width),
  };
  return [
    if (s.heading != null)
      pw.Padding(
        padding: const pw.EdgeInsets.only(top: 4, bottom: 6),
        child: pw.Text(s.heading!, style: pw.TextStyle(fontSize: 12, fontWeight: pw.FontWeight.bold)),
      ),
    pw.TableHelper.fromTextArray(
      headers: s.columns.map((c) => c.header).toList(),
      data: s.rows
          .map((row) => [
                for (var i = 0; i < s.columns.length; i++)
                  _formatCell(i < row.length ? row[i] : null, s.columns[i].type, symbol),
              ])
          .toList(),
      headerCount: 1, // repeats on every page
      border: pw.TableBorder.all(color: PdfColors.grey400, width: 0.5),
      headerStyle: pw.TextStyle(fontWeight: pw.FontWeight.bold, fontSize: 9.5, color: PdfColors.white),
      headerDecoration: const pw.BoxDecoration(color: PdfColor.fromInt(0xFF1B7A3E)),
      cellStyle: const pw.TextStyle(fontSize: 9),
      oddRowDecoration: const pw.BoxDecoration(color: PdfColor.fromInt(0xFFF3F7F4)),
      cellAlignments: alignments,
      columnWidths: columnWidths,
      cellPadding: const pw.EdgeInsets.symmetric(horizontal: 5, vertical: 3.5),
    ),
    if (s.totals != null) _pdfTotalsRow(s, symbol, columnWidths, alignments),
    pw.SizedBox(height: 16),
  ];
}

pw.Widget _pdfTotalsRow(ReportSection s, String symbol, Map<int, pw.TableColumnWidth> widths,
    Map<int, pw.Alignment> alignments) {
  return pw.Table(
    columnWidths: widths,
    children: [
      pw.TableRow(
        decoration: const pw.BoxDecoration(color: PdfColor.fromInt(0xFFE6F4EA)),
        children: [
          for (var i = 0; i < s.columns.length; i++)
            pw.Container(
              alignment: alignments[i],
              padding: const pw.EdgeInsets.symmetric(horizontal: 5, vertical: 4),
              child: pw.Text(
                i == 0 && (s.totals![0] == null) ? 'TOTAL' : _formatCell(s.totals![i], s.columns[i].type, symbol),
                style: pw.TextStyle(fontSize: 9.5, fontWeight: pw.FontWeight.bold),
              ),
            ),
        ],
      ),
    ],
  );
}

// -------------------------------------------------------------------- XLSX

/// Builds the .xlsx bytes for [doc]. Public so it can be unit-tested directly
/// (pure computation — no platform channels).
Uint8List buildReportXlsxBytes(ReportDoc doc, CompanyProfile co) {
  final symbol = _currencySymbol(co.currency);
  final excel = xls.Excel.createExcel();
  final sheetName = (doc.title.length > 28 ? doc.title.substring(0, 28) : doc.title)
      .replaceAll(RegExp(r'[\\/*?:\[\]]'), ' ');
  final defaultSheet = excel.getDefaultSheet();
  if (defaultSheet != null && defaultSheet != sheetName) {
    excel.rename(defaultSheet, sheetName);
  }
  final sheet = excel[sheetName];
  final spanCols = (doc.maxColumns - 1).clamp(0, 1 << 20);

  final currencyFmt = xls.CustomNumericNumFormat(formatCode: '"$symbol"#,##0.00');
  final numberFmt = xls.CustomNumericNumFormat(formatCode: '#,##0.##');

  xls.CellValue cellFor(Object? v, ColType t) {
    switch (t) {
      case ColType.currency:
      case ColType.number:
        final n = v is num ? v : num.tryParse(v?.toString() ?? '');
        return n == null ? xls.TextCellValue(v?.toString() ?? '') : xls.DoubleCellValue(n.toDouble());
      case ColType.date:
      case ColType.text:
        return xls.TextCellValue(_formatCell(v, t, symbol));
    }
  }

  xls.CellStyle styleFor(ColType t, {bool bold = false, String? bg}) => xls.CellStyle(
        bold: bold,
        backgroundColorHex: bg == null ? xls.ExcelColor.none : xls.ExcelColor.fromHexString(bg),
        numberFormat: t == ColType.currency
            ? currencyFmt
            : t == ColType.number
                ? numberFmt
                : xls.NumFormat.standard_0,
        horizontalAlign: (t == ColType.currency || t == ColType.number)
            ? xls.HorizontalAlign.Right
            : xls.HorizontalAlign.Left,
      );

  var r = 0;
  void merged(String text, {required int size, required bool bold, xls.ExcelColor color = xls.ExcelColor.black}) {
    final idx = xls.CellIndex.indexByColumnRow(columnIndex: 0, rowIndex: r);
    if (spanCols > 0) {
      excel.merge(sheetName, idx, xls.CellIndex.indexByColumnRow(columnIndex: spanCols, rowIndex: r));
    }
    sheet.updateCell(idx, xls.TextCellValue(text),
        cellStyle: xls.CellStyle(bold: bold, fontSize: size, fontColorHex: color));
    r++;
  }

  // Company + report header block.
  merged(co.name, size: 15, bold: true);
  for (final line in _companyLines(co)) {
    merged(line, size: 10, bold: false, color: xls.ExcelColor.fromHexString('#555555'));
  }
  r++; // blank
  merged(doc.title, size: 13, bold: true);
  if (doc.subtitle != null && doc.subtitle!.isNotEmpty) merged(doc.subtitle!, size: 10, bold: false);
  if (doc.filters.isNotEmpty) {
    merged('Filters: ${doc.filters.map((f) => '${f.$1}: ${f.$2}').join('   |   ')}', size: 9, bold: false);
  }
  merged('Generated: ${DateFormat('d MMM yyyy, h:mm a').format(DateTime.now())}',
      size: 9, bold: false, color: xls.ExcelColor.fromHexString('#555555'));
  r++; // blank

  final headerStyle = xls.CellStyle(
    bold: true,
    fontColorHex: xls.ExcelColor.fromHexString('#FFFFFF'),
    backgroundColorHex: xls.ExcelColor.fromHexString('#1B7A3E'),
    horizontalAlign: xls.HorizontalAlign.Center,
  );

  for (final s in doc.sections) {
    if (s.heading != null) {
      merged(s.heading!, size: 11, bold: true, color: xls.ExcelColor.fromHexString('#1B7A3E'));
    }
    // Column headers.
    for (var c = 0; c < s.columns.length; c++) {
      sheet.updateCell(
        xls.CellIndex.indexByColumnRow(columnIndex: c, rowIndex: r),
        xls.TextCellValue(s.columns[c].header),
        cellStyle: headerStyle,
      );
    }
    r++;
    // Data rows.
    for (final row in s.rows) {
      for (var c = 0; c < s.columns.length; c++) {
        final t = s.columns[c].type;
        sheet.updateCell(
          xls.CellIndex.indexByColumnRow(columnIndex: c, rowIndex: r),
          cellFor(c < row.length ? row[c] : null, t),
          cellStyle: styleFor(t),
        );
      }
      r++;
    }
    // Totals row (bold).
    if (s.totals != null) {
      for (var c = 0; c < s.columns.length; c++) {
        final t = s.columns[c].type;
        final v = c < s.totals!.length ? s.totals![c] : null;
        final display = (c == 0 && v == null) ? xls.TextCellValue('TOTAL') : cellFor(v, t);
        sheet.updateCell(
          xls.CellIndex.indexByColumnRow(columnIndex: c, rowIndex: r),
          display,
          cellStyle: styleFor(t, bold: true, bg: '#E6F4EA'),
        );
      }
      r++;
    }
    r++; // blank between sections
  }

  // Column widths: widest of that column index across all sections.
  final widths = <int, double>{};
  for (final s in doc.sections) {
    for (var c = 0; c < s.columns.length; c++) {
      final w = s.columns[c].width.clamp(8, 48).toDouble();
      if ((widths[c] ?? 0) < w) widths[c] = w;
    }
  }
  widths.forEach(sheet.setColumnWidth);

  final bytes = excel.encode();
  return Uint8List.fromList(bytes ?? const []);
}

// --------------------------------------------------------------------- CSV

String _buildCsv(ReportDoc doc, String symbol) {
  String cell(String v) =>
      (v.contains(',') || v.contains('"') || v.contains('\n')) ? '"${v.replaceAll('"', '""')}"' : v;
  final b = StringBuffer();
  for (final s in doc.sections) {
    if (s.heading != null) b.writeln(cell(s.heading!));
    b.writeln(s.columns.map((c) => cell(c.header)).join(','));
    for (final row in s.rows) {
      b.writeln([
        for (var i = 0; i < s.columns.length; i++)
          cell(_formatCell(i < row.length ? row[i] : null, s.columns[i].type, symbol)),
      ].join(','));
    }
    if (s.totals != null) {
      b.writeln([
        for (var i = 0; i < s.columns.length; i++)
          cell(i == 0 && s.totals![i] == null
              ? 'TOTAL'
              : _formatCell(s.totals![i], s.columns[i].type, symbol)),
      ].join(','));
    }
    b.writeln();
  }
  return b.toString();
}

// --------------------------------------------------------------- run/share

Future<void> _share(Uint8List bytes, String fileName, String subject) async {
  final dir = await getTemporaryDirectory();
  final file = File('${dir.path}/$fileName');
  await file.writeAsBytes(bytes);
  await Share.shareXFiles([XFile(file.path)], subject: subject);
}

enum ReportFormat { pdf, excel, csv, print }

Future<void> _run(ReportFormat fmt, ReportDoc doc, CompanyProfile co) async {
  switch (fmt) {
    case ReportFormat.pdf:
      await _share(await buildReportPdfBytes(doc, co), _fileName(doc, 'pdf'), doc.title);
    case ReportFormat.print:
      final bytes = await buildReportPdfBytes(doc, co);
      await Printing.layoutPdf(onLayout: (_) async => bytes, name: _fileName(doc, 'pdf'));
    case ReportFormat.excel:
      await _share(buildReportXlsxBytes(doc, co), _fileName(doc, 'xlsx'), doc.title);
    case ReportFormat.csv:
      await _share(
        Uint8List.fromList(_buildCsv(doc, _currencySymbol(co.currency)).codeUnits),
        _fileName(doc, 'csv'),
        doc.title,
      );
  }
}

/// Export action for a report's app-bar. Given a builder that returns the
/// currently-displayed [ReportDoc] (or null while data is loading), it offers
/// Excel / PDF / Print / CSV — all from that one dataset, with the company
/// header pulled from [companyProfileProvider].
class ReportExportMenu extends ConsumerWidget {
  final ReportDoc? Function() docBuilder;

  const ReportExportMenu({super.key, required this.docBuilder});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return PopupMenuButton<ReportFormat>(
      icon: const Icon(Icons.download),
      tooltip: 'Export / Print',
      onSelected: (fmt) async {
        final messenger = ScaffoldMessenger.of(context);
        final doc = docBuilder();
        if (doc == null) {
          messenger.showSnackBar(const SnackBar(content: Text('Report is still loading…')));
          return;
        }
        if (!doc.hasRows) {
          messenger.showSnackBar(const SnackBar(content: Text('Nothing to export for the current filters.')));
          return;
        }
        try {
          final co = await ref.read(companyProfileProvider.future);
          await _run(fmt, doc, co);
        } catch (e) {
          messenger.showSnackBar(SnackBar(content: Text('Export failed: $e')));
        }
      },
      itemBuilder: (_) => const [
        PopupMenuItem(value: ReportFormat.excel, child: ListTile(leading: Icon(Icons.table_chart), title: Text('Excel (.xlsx)'))),
        PopupMenuItem(value: ReportFormat.pdf, child: ListTile(leading: Icon(Icons.picture_as_pdf), title: Text('PDF'))),
        PopupMenuItem(value: ReportFormat.print, child: ListTile(leading: Icon(Icons.print), title: Text('Print'))),
        PopupMenuItem(value: ReportFormat.csv, child: ListTile(leading: Icon(Icons.description), title: Text('CSV'))),
      ],
    );
  }
}
