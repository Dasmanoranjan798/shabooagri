import 'package:flutter/material.dart';
import '../layout/responsive.dart';
import 'app_drawer.dart';
import 'desktop_sidebar.dart';

/// The one shell used by every owner/manager operational screen. It renders a
/// **professional desktop layout** (persistent left sidebar + top bar +
/// width-constrained content) when there is desktop width available, and falls
/// back to the existing **phone layout** (drawer + app bar + bottom quick-action
/// bar) on narrow screens — from the *same* screen code and the *same* business
/// logic. Screens supply their content via [body]; they never build their own
/// [Scaffold]/[AppDrawer] chrome, so navigation stays consistent everywhere.
class AdaptiveScaffold extends StatelessWidget {
  /// Current route, used to highlight the active module in the sidebar/drawer.
  final String currentRoute;

  /// Page title shown in the app bar (mobile) and desktop top bar.
  final String title;

  /// The page content (typically a scrollable). Rendered inside the shell.
  final Widget body;

  /// App bar / top bar trailing actions (icons, buttons). Shown on both layouts.
  final List<Widget>? actions;

  /// Optional FAB (both layouts).
  final Widget? floatingActionButton;

  /// Mobile-only bottom bar (e.g. the QuickActionBar). Ignored on desktop,
  /// where those actions belong in [actions] or the page body.
  final Widget? bottomNavigationBar;

  /// When true (default) the desktop content is centered and capped at
  /// [Breakpoints.contentMaxWidth] so it doesn't stretch awkwardly wide.
  /// Data-grid screens that want the full width can set this false.
  final bool constrainContentWidth;

  const AdaptiveScaffold({
    super.key,
    required this.currentRoute,
    required this.title,
    required this.body,
    this.actions,
    this.floatingActionButton,
    this.bottomNavigationBar,
    this.constrainContentWidth = true,
  });

  @override
  Widget build(BuildContext context) {
    if (context.isDesktop) return _buildDesktop(context);
    return _buildMobile(context);
  }

  Widget _buildMobile(BuildContext context) {
    return Scaffold(
      drawer: AppDrawer(currentRoute: currentRoute),
      appBar: AppBar(title: Text(title), actions: actions),
      bottomNavigationBar: bottomNavigationBar,
      floatingActionButton: floatingActionButton,
      body: body,
    );
  }

  Widget _buildDesktop(BuildContext context) {
    Widget content = body;
    if (constrainContentWidth) {
      content = Align(
        alignment: Alignment.topCenter,
        child: ConstrainedBox(
          constraints:
              const BoxConstraints(maxWidth: Breakpoints.contentMaxWidth),
          child: content,
        ),
      );
    }
    return Scaffold(
      floatingActionButton: floatingActionButton,
      body: Row(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          DesktopSidebar(currentRoute: currentRoute),
          Expanded(
            child: Column(
              children: [
                _DesktopTopBar(title: title, actions: actions),
                Expanded(child: content),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

/// A slim desktop header: page title on the left, [actions] on the right, with
/// a bottom divider. Deliberately not an [AppBar] (no hamburger/back affordance
/// needed — the sidebar is always present).
class _DesktopTopBar extends StatelessWidget {
  final String title;
  final List<Widget>? actions;

  const _DesktopTopBar({required this.title, this.actions});

  @override
  Widget build(BuildContext context) {
    return Container(
      height: 64,
      padding: const EdgeInsets.symmetric(horizontal: 24),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surface,
        border: Border(
          bottom: BorderSide(color: Theme.of(context).dividerColor),
        ),
      ),
      child: Row(
        children: [
          Expanded(
            child: Text(
              title,
              style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
              overflow: TextOverflow.ellipsis,
            ),
          ),
          if (actions != null)
            Row(mainAxisSize: MainAxisSize.min, children: actions!),
        ],
      ),
    );
  }
}
