import 'package:flutter/material.dart';
import 'responsive.dart';

/// Centres a form and caps its width on desktop so fields don't stretch to the
/// full (up to 1200px) content area — long single-line inputs are unpleasant to
/// scan when they're that wide. On phones it's a no-op (full width).
class DesktopFormContainer extends StatelessWidget {
  final Widget child;

  /// Max width the form is allowed to grow to on desktop.
  final double maxWidth;

  const DesktopFormContainer({super.key, required this.child, this.maxWidth = 880});

  @override
  Widget build(BuildContext context) {
    if (!Responsive.of(context).isDesktop) return child;
    return Align(
      alignment: Alignment.topCenter,
      child: ConstrainedBox(constraints: BoxConstraints(maxWidth: maxWidth), child: child),
    );
  }
}

/// Lays out a form's primary action(s): right-aligned on desktop (conventional
/// for desktop dialogs/forms), full-width stretched on phones (thumb-friendly).
/// Pass a single button as [child], or use [children] for Cancel + Save pairs.
class DesktopFormActions extends StatelessWidget {
  final Widget? child;
  final List<Widget>? children;

  const DesktopFormActions({super.key, this.child, this.children})
      : assert(child != null || children != null);

  @override
  Widget build(BuildContext context) {
    final items = children ?? [child!];
    if (Responsive.of(context).isDesktop) {
      return Row(
        mainAxisAlignment: MainAxisAlignment.end,
        children: [
          for (int i = 0; i < items.length; i++) ...[
            if (i != 0) const SizedBox(width: 12),
            items[i],
          ],
        ],
      );
    }
    // Phone: stretch each action full width, stacked.
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        for (int i = 0; i < items.length; i++) ...[
          if (i != 0) const SizedBox(height: 12),
          items[i],
        ],
      ],
    );
  }
}

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
