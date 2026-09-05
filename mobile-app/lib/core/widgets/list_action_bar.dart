import 'package:flutter/material.dart';

/// Compact search + primary-action header for list screens (§ mobile space).
///
/// Replaces the old "big heading + separate full-width search + FAB" stack with
/// ONE row: [ Search … ] [ + New ]. This recovers vertical space for the list
/// data itself. On very narrow screens the action button drops its label and
/// shows just the "+" icon, so the search box never gets squeezed unreadable.
///
/// Shared by Customers / Drivers / Machines so the pattern stays identical.
class ListActionBar extends StatelessWidget {
  final String hintText;
  final ValueChanged<String> onChanged;

  /// Primary action (e.g. "New Customer"). Omitted for non-managers.
  final String? actionLabel;
  final IconData actionIcon;
  final VoidCallback? onAction;

  const ListActionBar({
    super.key,
    required this.hintText,
    required this.onChanged,
    this.actionLabel,
    this.actionIcon = Icons.add,
    this.onAction,
  });

  @override
  Widget build(BuildContext context) {
    final searchField = TextField(
      decoration: InputDecoration(
        hintText: hintText,
        prefixIcon: const Icon(Icons.search),
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
        isDense: true,
        contentPadding: const EdgeInsets.symmetric(vertical: 10, horizontal: 12),
      ),
      onChanged: onChanged,
    );

    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 4),
      child: LayoutBuilder(
        builder: (context, constraints) {
          if (actionLabel == null || onAction == null) {
            return searchField;
          }
          // Below ~360px of header width, collapse the button to icon-only so
          // the search box keeps a usable width.
          final iconOnly = constraints.maxWidth < 360;
          return Row(
            children: [
              Expanded(child: searchField),
              const SizedBox(width: 8),
              if (iconOnly)
                SizedBox(
                  height: 44,
                  child: FilledButton(
                    onPressed: onAction,
                    style: FilledButton.styleFrom(padding: const EdgeInsets.symmetric(horizontal: 14)),
                    child: Icon(actionIcon),
                  ),
                )
              else
                SizedBox(
                  height: 44,
                  child: FilledButton.icon(
                    onPressed: onAction,
                    icon: Icon(actionIcon, size: 20),
                    label: Text(actionLabel!),
                  ),
                ),
            ],
          );
        },
      ),
    );
  }
}
