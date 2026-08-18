import 'package:flutter/material.dart';

/// Shared search box for list screens — local/client-side filtering of an
/// already-fetched list (matches the offline-first read pattern; no new
/// network calls). Reused across every list screen that needs one.
class SearchField extends StatelessWidget {
  final String hintText;
  final ValueChanged<String> onChanged;

  const SearchField({super.key, required this.hintText, required this.onChanged});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 4),
      child: TextField(
        decoration: InputDecoration(
          hintText: hintText,
          prefixIcon: const Icon(Icons.search),
          border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
          isDense: true,
          contentPadding: const EdgeInsets.symmetric(vertical: 10, horizontal: 12),
        ),
        onChanged: onChanged,
      ),
    );
  }
}

/// Shared horizontal filter-tab row (single-select, with a count badge per
/// tab) — reused across every list screen that has status filter tabs.
class FilterTabsRow<T> extends StatelessWidget {
  final List<(T value, String label, int count)> tabs;
  final T selected;
  final ValueChanged<T> onSelected;

  const FilterTabsRow({super.key, required this.tabs, required this.selected, required this.onSelected});

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 44,
      child: ListView(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
        children: tabs.map((tab) {
          final isSelected = tab.$1 == selected;
          return Padding(
            padding: const EdgeInsets.symmetric(horizontal: 4),
            child: ChoiceChip(
              label: Text('${tab.$2} (${tab.$3})'),
              selected: isSelected,
              onSelected: (_) => onSelected(tab.$1),
            ),
          );
        }).toList(),
      ),
    );
  }
}
