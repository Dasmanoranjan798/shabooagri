import 'package:flutter/widgets.dart';

/// Form-factor breakpoints for the one Flutter codebase. The same widget tree
/// renders on phones and on Windows/desktop; these thresholds decide when the
/// desktop presentation (persistent sidebar, multi-column forms, data grids,
/// constrained content width) replaces the phone presentation.
///
/// Breakpoints are deliberately width-based (not platform-based) so a resized
/// desktop window, a tablet, and a phone all get the right layout, and so the
/// layout can be verified headlessly at any size.
class Breakpoints {
  Breakpoints._();

  /// Below this is a phone layout (drawer + bottom nav, single column).
  static const double compact = 700;

  /// At/above [expanded] the full desktop shell is used (persistent sidebar).
  static const double expanded = 1000;

  /// Maximum width a single content column is allowed to grow to, so text and
  /// forms don't stretch uncomfortably wide on large monitors.
  static const double contentMaxWidth = 1200;

  /// Fixed width of the desktop navigation sidebar.
  static const double sidebarWidth = 264;
}

/// Width-based responsive helpers. Read from the nearest [MediaQuery].
class Responsive {
  final double width;
  const Responsive(this.width);

  factory Responsive.of(BuildContext context) =>
      Responsive(MediaQuery.sizeOf(context).width);

  /// True when the desktop shell (persistent sidebar) should be shown.
  bool get isDesktop => width >= Breakpoints.expanded;

  /// True for a phone-width layout.
  bool get isCompact => width < Breakpoints.compact;

  /// In-between (large phone / small tablet): desktop-ish content, but no
  /// persistent sidebar.
  bool get isMedium => !isCompact && !isDesktop;

  /// Pick a value by form factor. [desktop]/[medium] fall back to [compact].
  T pick<T>({required T compact, T? medium, T? desktop}) {
    if (isDesktop) return desktop ?? medium ?? compact;
    if (isMedium) return medium ?? compact;
    return compact;
  }

  /// Column count for a responsive card grid (e.g. dashboard KPIs).
  int gridColumns({int compact = 2, int medium = 3, int desktop = 4}) =>
      pick(compact: compact, medium: medium, desktop: desktop);
}

/// Convenience: `context.responsive.isDesktop`.
extension ResponsiveContext on BuildContext {
  Responsive get responsive => Responsive.of(this);
  bool get isDesktop => Responsive.of(this).isDesktop;
}
