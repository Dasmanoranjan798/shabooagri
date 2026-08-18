import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import '../network/api_error.dart';

/// Shared confirm-then-delete flow, reused across every entity's kebab
/// menu. Surfaces the backend's real dependency-guard message (e.g.
/// "Cannot delete this machine — 3 bookings reference it.") in a dialog —
/// the website only shows this reactively via a plain `alert()`; this is
/// the same reactive pattern, just in a proper dialog instead of a native
/// alert.
Future<void> confirmAndDelete({
  required BuildContext context,
  required String entityLabel,
  required Future<void> Function() onDelete,
  required VoidCallback onSuccess,
}) async {
  final confirmed = await showDialog<bool>(
    context: context,
    builder: (context) => AlertDialog(
      title: Text('Delete $entityLabel?'),
      content: const Text('This cannot be undone.'),
      actions: [
        TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Cancel')),
        ElevatedButton(
          style: ElevatedButton.styleFrom(backgroundColor: Colors.red),
          onPressed: () => Navigator.pop(context, true),
          child: const Text('Delete'),
        ),
      ],
    ),
  );
  if (confirmed != true) return;

  try {
    await onDelete();
    onSuccess();
  } on DioException catch (e) {
    if (!context.mounted) return;
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text("Can't Delete"),
        content: Text(apiErrorMessage(e)),
        actions: [TextButton(onPressed: () => Navigator.pop(context), child: const Text('OK'))],
      ),
    );
  }
}
