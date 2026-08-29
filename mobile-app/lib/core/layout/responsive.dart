import 'package:flutter/foundation.dart' show kIsWeb, TargetPlatform;
import 'package:flutter/material.dart' show Theme;
import 'package:flutter/widgets.dart';

/// Form-factor breakpoints for the one Flutter codebase. The same widget tree
/// renders on phones and on Windows/desktop; these thresholds decide when the
/// desktop presentation (persistent sidebar, multi-column forms, data grids,
/// constrained content width) replaces the phone presentation.
///
/// Breakpoints are width-based, but the desktop shell is additionally gated on
/// the *platform*: a desktop OS (Windows/macOS/Linux) keeps a genuine desktop
/// layout down to [compactDesktop] (e.g. a 900×700 window), whereas an
/// Android/iOS phone only crosses into the desktop layout at [expanded]. This
/// is what lets a resized Windows window stay a compact ERP interface instead
/// of collapsing into the phone UI, while leaving mobile behaviour untouched.
class Breakpoints {
  Breakpoints._();

  /// Below this is a phone layout (drawer + bottom nav, single column).
  static const double compact = 700;

  /// Minimum width at which a *desktop OS* uses the desktop shell in its
  /// COMPACT tier (persistent rail + top bar, compacted spacing, single-column
  /// forms). Between here and [expanded] the window is a small desktop window,
  /// not a phone.
  static const double compactDesktop = 600;

  /// At/above [expanded] the full desktop shell is used on ANY platform
  /// (large window / tablet / desktop).
  static const double expanded = 1000;

  /// Maximum width a single content column is allowed to grow to, so text and
  /// forms don't stretch uncomfortably wide on large monitors.
  static const double contentMaxWidth = 1200;

  /// Fixed width of the desktop navigation sidebar.
  static const double sidebarWidth = 264;
}

/// Width- + platform-aware responsive helpers. Reads the width from the
/// nearest [MediaQuery] and the platform from the ambient [Theme] (which
/// defaults to the real `defaultTargetPlatform`, so production behaviour is
/// unchanged — a Windows build reports [TargetPlatform.windows]). Sourcing the
/// platform from the theme keeps it overridable per widget tree (e.g. tests set
/// `ThemeData.platform`) without touching a global debug flag.
class Responsive {
  final double width;
  final TargetPlatform platform;

  /// [platform] defaults to Android so headless/unit construction stays on the
  /// phone thresholds unless a caller says otherwise.
  const Responsive(this.width, {this.platform = TargetPlatform.android});

  factory Responsive.of(BuildContext context) =>
      Responsive(MediaQuery.sizeOf(context).width, platform: Theme.of(context).platform);

  /// A desktop operating system (mouse/keyboard, freely resizable window).
  /// Web is intentionally treated as non-desktop here so the width thresholds
  /// alone decide the web layout (unchanged from before this tier existed).
  bool get _isDesktopPlatform =>
      !kIsWeb &&
      (platform == TargetPlatform.windows ||
          platform == TargetPlatform.linux ||
          platform == TargetPlatform.macOS);

  /// True when the desktop shell (persistent sidebar/rail + top bar) should be
  /// shown: at [Breakpoints.expanded] on any platform, and additionally on a
  /// desktop OS down to [Breakpoints.compactDesktop]. Android/iOS phones are
  /// unaffected — they only get the shell at/above [Breakpoints.expanded].
  bool get isDesktop =>
      width >= Breakpoints.expanded ||
      (_isDesktopPlatform && width >= Breakpoints.compactDesktop);

  /// The desktop shell in its COMPACT tier (a small desktop window, e.g.
  /// 900×700 on Windows): keep the rail/top bar/desktop structure, but use
  /// compact spacing and single-column forms. False for full-size desktop
  /// (>= [Breakpoints.expanded]) and false on phones.
  bool get isDesktopCompact => isDesktop && width < Breakpoints.expanded;

  /// True for a phone-width layout. Never true when the desktop shell is shown
  /// (so a narrow *desktop* window is a compact desktop, not a phone).
  bool get isCompact => !isDesktop && width < Breakpoints.compact;

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

  /// True in the compact desktop tier (small desktop window). See
  /// [Responsive.isDesktopCompact].
  bool get isDesktopCompact => Responsive.of(this).isDesktopCompact;
}
