import 'package:flutter/material.dart';
import 'responsive.dart';

/// Lays a list of form fields into a **single column on phones** and into
/// **two columns on desktop** — so long forms read as compact desktop forms
/// instead of an endlessly-stacked phone form. Each child occupies one cell;
/// pass [FormSpan.full] via [fullWidth] indices for fields (notes, addresses)
/// that should span the whole row.
class ResponsiveFormGrid extends StatelessWidget {
  final List<Widget> children;

  /// Indices in [children] that should span both columns on desktop.
  final Set<int> fullWidthIndices;

  /// Horizontal gap between columns and vertical gap between rows.
  final double gap;

  const ResponsiveFormGrid({
    super.key,
    required this.children,
    this.fullWidthIndices = const {},
    this.gap = 16,
  });

  @override
  Widget build(BuildContext context) {
    final columns = Responsive.of(context).pick(compact: 1, desktop: 2);
    if (columns == 1) {
      return Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          for (int i = 0; i < children.length; i++) ...[
            children[i],
            if (i != children.length - 1) SizedBox(height: gap),
          ],
        ],
      );
    }

    // Two-column desktop flow. Full-width items break the current row.
    final rows = <Widget>[];
    var pending = <Widget>[];

    void flushPair() {
      if (pending.isEmpty) return;
      rows.add(Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Expanded(child: pending[0]),
          SizedBox(width: gap),
          Expanded(child: pending.length > 1 ? pending[1] : const SizedBox()),
        ],
      ));
      pending = [];
    }

    for (int i = 0; i < children.length; i++) {
      if (fullWidthIndices.contains(i)) {
        flushPair();
        rows.add(children[i]);
      } else {
        pending.add(children[i]);
        if (pending.length == 2) flushPair();
      }
    }
    flushPair();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        for (int i = 0; i < rows.length; i++) ...[
          rows[i],
          if (i != rows.length - 1) SizedBox(height: gap),
        ],
      ],
    );
  }
}
