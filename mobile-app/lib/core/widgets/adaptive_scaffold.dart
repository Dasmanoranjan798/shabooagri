import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
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

  /// For detail/create/edit sub-pages: show a back affordance. On desktop this
  /// renders a leading back button in the top bar (the sidebar is still shown,
  /// with [currentRoute]'s module highlighted); on mobile the [AppBar] already
  /// shows its automatic back button, so this only adds an explicit one when
  /// there is nothing to pop. Back pops the navigation stack, falling back to
  /// [currentRoute] (the module's list page) when the stack can't pop.
  final bool showBack;

  const AdaptiveScaffold({
    super.key,
    required this.currentRoute,
    required this.title,
    required this.body,
    this.actions,
    this.floatingActionButton,
    this.bottomNavigationBar,
    this.constrainContentWidth = true,
    this.showBack = false,
  });

  void _onBack(BuildContext context) {
    if (context.canPop()) {
      context.pop();
    } else {
      context.go(currentRoute);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (context.isDesktop) return _buildDesktop(context);
    return _buildMobile(context);
  }

  Widget _buildMobile(BuildContext context) {
    // On a sub-page (showBack) the AppBar's automatic back button already
    // handles it; only when the stack can't pop do we add an explicit one so a
    // back affordance is always present. On a top-level module page the drawer
    // is shown instead.
    final bool needsExplicitBack = showBack && !context.canPop();
    return Scaffold(
      drawer: showBack ? null : AppDrawer(currentRoute: currentRoute),
      appBar: AppBar(
        title: Text(title),
        actions: actions,
        leading: needsExplicitBack
            ? IconButton(
                icon: const Icon(Icons.arrow_back),
                onPressed: () => _onBack(context),
              )
            : null,
      ),
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
                _DesktopTopBar(
                  title: title,
                  actions: actions,
                  onBack: showBack ? () => _onBack(context) : null,
                ),
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
  final VoidCallback? onBack;

  const _DesktopTopBar({required this.title, this.actions, this.onBack});

  @override
  Widget build(BuildContext context) {
    return Container(
      height: 64,
      padding: EdgeInsets.only(left: onBack != null ? 8 : 24, right: 24),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surface,
        border: Border(
          bottom: BorderSide(color: Theme.of(context).dividerColor),
        ),
      ),
      child: Row(
        children: [
          if (onBack != null)
            Padding(
              padding: const EdgeInsets.only(right: 8),
              child: IconButton(
                icon: const Icon(Icons.arrow_back),
                tooltip: 'Back',
                onPressed: onBack,
              ),
            ),
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
