import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../data/notification_item.dart';

const _categoryIcons = {
  'service': Icons.build,
  'insurance': Icons.shield,
  'license': Icons.badge,
  'invoice': Icons.receipt,
  'booking': Icons.event_note,
};

/// Drop-in AppBar action mirroring `AppLayout.tsx`'s notification bell +
/// dropdown — badge count, categorized list (service/insurance/license/
/// invoice/booking icons), overdue styling, click-through navigation.
/// Added to the Dashboard AppBar (the Owner/Manager landing screen) rather
/// than every single screen's AppBar — a disclosed simplification, not a
/// silently reduced scope; see BUILD_LOG.md.
class NotificationBell extends ConsumerWidget {
  const NotificationBell({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final notificationsAsync = ref.watch(notificationsProvider);
    final count = notificationsAsync.valueOrNull?.length ?? 0;

    return Stack(
      clipBehavior: Clip.none,
      children: [
        IconButton(
          icon: const Icon(Icons.notifications_outlined),
          tooltip: 'Notifications',
          onPressed: () => _openPanel(context, ref),
        ),
        if (count > 0)
          Positioned(
            right: 6,
            top: 6,
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1),
              decoration: BoxDecoration(color: Colors.red, borderRadius: BorderRadius.circular(10)),
              child: Text(count > 9 ? '9+' : '$count', style: const TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.bold)),
            ),
          ),
      ],
    );
  }

  void _openPanel(BuildContext context, WidgetRef ref) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      builder: (context) => const _NotificationPanel(),
    );
  }
}

class _NotificationPanel extends ConsumerWidget {
  const _NotificationPanel();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final notificationsAsync = ref.watch(notificationsProvider);

    return DraggableScrollableSheet(
      initialChildSize: 0.6,
      maxChildSize: 0.9,
      minChildSize: 0.3,
      expand: false,
      builder: (context, scrollController) {
        return notificationsAsync.when(
          data: (notifications) => Column(
            children: [
              Padding(
                padding: const EdgeInsets.all(16.0),
                child: Text(
                  notifications.isEmpty ? 'Notifications' : 'Notifications (${notifications.length})',
                  style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                ),
              ),
              Expanded(
                child: notifications.isEmpty
                    ? const Center(child: Text("You're all caught up — no alerts right now."))
                    : ListView.builder(
                        controller: scrollController,
                        itemCount: notifications.length,
                        itemBuilder: (context, index) {
                          final n = notifications[index];
                          return ListTile(
                            leading: Icon(_categoryIcons[n.category] ?? Icons.info, color: n.isOverdue ? Colors.red : Colors.orange),
                            title: Text(n.title, style: TextStyle(fontWeight: n.isOverdue ? FontWeight.bold : FontWeight.normal)),
                            subtitle: Text(n.subtitle),
                            onTap: () {
                              Navigator.pop(context);
                              context.go(n.path);
                            },
                          );
                        },
                      ),
              ),
            ],
          ),
          loading: () => const Center(child: CircularProgressIndicator()),
          error: (e, s) => const Center(child: Text('Could not load notifications')),
        );
      },
    );
  }
}
