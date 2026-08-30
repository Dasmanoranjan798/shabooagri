import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../database/database.dart';
import '../theme/app_theme.dart';
import 'connectivity.dart';
import 'outbox.dart';

/// App-wide offline/sync status. Wraps the whole navigator (via
/// `MaterialApp.router`'s `builder`) so it shows on every screen regardless of
/// route, and reserves its own space above the page rather than overlapping it.
///
/// It surfaces the three states the user needs to trust an offline-first app:
///   * **Offline** — "you're offline, your changes are saved here".
///   * **Syncing** — a live count of writes still queued to reach the cloud.
///   * **Needs attention** — writes the server permanently rejected, so the
///     user can retry or discard them (never a silent data loss).
class SyncOverlay extends ConsumerWidget {
  final Widget child;
  const SyncOverlay({super.key, required this.child});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final online = ref.watch(isOnlineProvider);
    final pending = ref.watch(outboxPendingCountProvider).valueOrNull ?? 0;
    final failed = ref.watch(outboxFailedProvider).valueOrNull ?? const [];

    final show = !online || pending > 0 || failed.isNotEmpty;

    return Column(
      children: [
        if (show)
          _Banner(
            online: online,
            pending: pending,
            failedCount: failed.length,
            onTap: () => _openSheet(context),
          ),
        Expanded(child: child),
      ],
    );
  }

  void _openSheet(BuildContext context) {
    showModalBottomSheet(
      context: context,
      showDragHandle: true,
      isScrollControlled: true,
      builder: (_) => const _SyncSheet(),
    );
  }
}

class _Banner extends StatelessWidget {
  final bool online;
  final int pending;
  final int failedCount;
  final VoidCallback onTap;

  const _Banner({
    required this.online,
    required this.pending,
    required this.failedCount,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    late final Color bg;
    late final IconData icon;
    late final String text;

    if (failedCount > 0) {
      bg = Colors.red.shade700;
      icon = Icons.error_outline;
      text = '$failedCount change${failedCount == 1 ? '' : 's'} need attention';
    } else if (!online) {
      bg = Colors.blueGrey.shade700;
      icon = Icons.cloud_off;
      text = pending > 0
          ? "Offline — $pending change${pending == 1 ? '' : 's'} saved here, will sync"
          : 'Offline — your changes are saved on this device';
    } else {
      bg = AppTheme.primary;
      icon = Icons.sync;
      text = 'Syncing $pending change${pending == 1 ? '' : 's'}…';
    }

    return Material(
      color: bg,
      child: SafeArea(
        bottom: false,
        child: InkWell(
          onTap: onTap,
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            child: Row(
              children: [
                if (online && pending > 0 && failedCount == 0)
                  const SizedBox(
                    width: 16,
                    height: 16,
                    child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                  )
                else
                  Icon(icon, color: Colors.white, size: 18),
                const SizedBox(width: 12),
                Expanded(
                  child: Text(text,
                      style: const TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.w500)),
                ),
                const Icon(Icons.chevron_right, color: Colors.white70, size: 18),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _SyncSheet extends ConsumerWidget {
  const _SyncSheet();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final online = ref.watch(isOnlineProvider);
    final pending = ref.watch(outboxPendingCountProvider).valueOrNull ?? 0;
    final failed = ref.watch(outboxFailedProvider).valueOrNull ?? const <OutboxOp>[];

    return SafeArea(
      child: Padding(
        padding: const EdgeInsets.fromLTRB(20, 4, 20, 20),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(online ? Icons.cloud_done : Icons.cloud_off,
                    color: online ? AppTheme.primary : Colors.blueGrey),
                const SizedBox(width: 10),
                Text(online ? 'Online' : 'Offline',
                    style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                const Spacer(),
                if (pending > 0 && online)
                  TextButton.icon(
                    onPressed: () => ref.read(outboxServiceProvider).drain(),
                    icon: const Icon(Icons.sync, size: 18),
                    label: const Text('Sync now'),
                  ),
              ],
            ),
            const SizedBox(height: 8),
            Text(
              online
                  ? (pending > 0
                      ? '$pending change${pending == 1 ? '' : 's'} still syncing to the cloud.'
                      : 'Everything is synced.')
                  : 'Your changes are saved on this device and will sync automatically when you\'re back online.',
              style: const TextStyle(color: AppTheme.textMuted),
            ),
            if (failed.isNotEmpty) ...[
              const SizedBox(height: 20),
              const Text('Needs attention',
                  style: TextStyle(fontWeight: FontWeight.bold, color: Colors.red)),
              const SizedBox(height: 4),
              const Text(
                'The server rejected these changes. Retry them, or discard if they\'re no longer needed.',
                style: TextStyle(color: AppTheme.textMuted, fontSize: 12),
              ),
              const SizedBox(height: 8),
              Flexible(
                child: ListView.separated(
                  shrinkWrap: true,
                  itemCount: failed.length,
                  separatorBuilder: (_, _) => const Divider(height: 1),
                  itemBuilder: (_, i) {
                    final op = failed[i];
                    return ListTile(
                      contentPadding: EdgeInsets.zero,
                      title: Text(op.label ?? '${op.method} ${op.path}'),
                      subtitle: Text(op.lastError ?? 'Rejected',
                          maxLines: 2, overflow: TextOverflow.ellipsis,
                          style: const TextStyle(fontSize: 12, color: Colors.red)),
                      trailing: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          IconButton(
                            icon: const Icon(Icons.refresh, color: AppTheme.primary),
                            tooltip: 'Retry',
                            onPressed: () => ref.read(outboxServiceProvider).retryFailed(op.id),
                          ),
                          IconButton(
                            icon: const Icon(Icons.delete_outline, color: Colors.red),
                            tooltip: 'Discard',
                            onPressed: () => ref.read(outboxServiceProvider).discardFailed(op.id),
                          ),
                        ],
                      ),
                    );
                  },
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
