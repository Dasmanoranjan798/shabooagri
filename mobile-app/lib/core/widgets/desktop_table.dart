import 'package:flutter/material.dart';
import '../layout/responsive.dart';

/// A desktop data grid: a Material [DataTable] wrapped so it (a) never overflows
/// the viewport horizontally (its own horizontal scrollbar) and (b) scrolls
/// vertically within the page. Use on desktop list screens; phones keep their
/// card/list presentation. Rows are clickable for row-open navigation.
///
/// Owns its own vertical + horizontal [ScrollController]s so the two nested
/// always-visible [Scrollbar]s don't fight over the [PrimaryScrollController].
class DesktopTable extends StatefulWidget {
  final List<DataColumn> columns;
  final List<DataRow> rows;

  const DesktopTable({super.key, required this.columns, required this.rows});

  @override
  State<DesktopTable> createState() => _DesktopTableState();
}

class _DesktopTableState extends State<DesktopTable> {
  final _vCtrl = ScrollController();
  final _hCtrl = ScrollController();

  @override
  void dispose() {
    _vCtrl.dispose();
    _hCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Card(
      clipBehavior: Clip.antiAlias,
      child: Scrollbar(
        controller: _vCtrl,
        thumbVisibility: true,
        child: SingleChildScrollView(
          controller: _vCtrl,
          scrollDirection: Axis.vertical,
          child: Scrollbar(
            controller: _hCtrl,
            thumbVisibility: true,
            child: SingleChildScrollView(
              controller: _hCtrl,
              scrollDirection: Axis.horizontal,
              child: ConstrainedBox(
                constraints: BoxConstraints(
                  // Fill the available content width (minus the sidebar) so the
                  // grid uses the desktop real estate instead of hugging left.
                  minWidth: (MediaQuery.sizeOf(context).width -
                          Breakpoints.sidebarWidth -
                          64)
                      .clamp(0, double.infinity),
                ),
                child: DataTable(
                  columns: widget.columns,
                  rows: widget.rows,
                  headingRowColor: WidgetStateProperty.all(
                    Theme.of(context).colorScheme.surfaceContainerHighest,
                  ),
                  showCheckboxColumn: false,
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
