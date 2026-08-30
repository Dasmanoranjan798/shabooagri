import 'package:flutter/material.dart';
import 'package:shabooagri_mobile/core/sync/data_sync.dart';
import 'package:shabooagri_mobile/core/network/api_error.dart';
import '../../../core/widgets/quick_action_bar.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:share_plus/share_plus.dart';
import '../../../core/database/database.dart';
import '../../../core/layout/responsive.dart';
import '../../../core/network/api_client.dart';
import '../../../core/providers/session_provider.dart';
import '../../../core/repositories/booking_repository.dart';
import '../../../core/widgets/adaptive_scaffold.dart';
import '../../../core/widgets/confirm_delete.dart';
import '../../../core/widgets/desktop_table.dart';
import '../../../core/widgets/search_field.dart';

final bookingsListProvider = FutureProvider<List<OfflineBooking>>((ref) async {
  syncOn(ref, {SyncEntity.booking});
  final repository = ref.watch(bookingRepositoryProvider);
  await repository.refreshFromApi();
  return repository.getBookings();
});

class BookingListScreen extends ConsumerStatefulWidget {
  const BookingListScreen({super.key});

  @override
  ConsumerState<BookingListScreen> createState() => _BookingListScreenState();
}

class _BookingListScreenState extends ConsumerState<BookingListScreen> {
  String _query = '';

  Future<void> _delete(OfflineBooking booking) async {
    final dio = ref.read(apiClientProvider);
    await confirmAndDelete(
      context: context,
      entityLabel: 'Booking ${booking.bookingNumber}',
      onDelete: () => dio.delete('/bookings/${booking.id}'),
      onSuccess: () => ref.invalidate(bookingsListProvider),
    );
  }

  @override
  Widget build(BuildContext context) {
    final bookingsAsync = ref.watch(bookingsListProvider);
    final user = ref.watch(currentUserProvider);
    final canManage = user?.isOwnerOrManager ?? false;
    final canDelete = user?.roleSystemKey == 'owner';
    final isDesktop = context.responsive.isDesktop;

    return AdaptiveScaffold(
      currentRoute: '/bookings',
      title: 'Bookings',
      actions: [
        IconButton(
          icon: const Icon(Icons.download),
          tooltip: 'Export CSV',
          onPressed: bookingsAsync.maybeWhen(
            data: (bookings) => () async {
              final buffer = StringBuffer('Booking Number,Status,Date\n');
              for (final b in bookings) {
                buffer.writeln('${b.bookingNumber},${b.status},${b.scheduledDate?.toIso8601String() ?? ""}');
              }
              try {
                await Share.share(buffer.toString(), subject: 'Bookings Export');
              } catch (e) {
                if (context.mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Export failed: $e')));
                }
              }
            },
            orElse: () => null,
          ),
        ),
        IconButton(
          icon: const Icon(Icons.refresh),
          onPressed: () => ref.invalidate(bookingsListProvider),
        ),
        if (isDesktop && canManage)
          Padding(
            padding: const EdgeInsets.only(left: 8),
            child: FilledButton.icon(
              onPressed: () => context.go('/bookings/new'),
              icon: const Icon(Icons.add),
              label: const Text('New Booking'),
            ),
          ),
      ],
      floatingActionButton: (!isDesktop && canManage)
          ? FloatingActionButton(onPressed: () => context.go('/bookings/new'), child: const Icon(Icons.add))
          : null,
      bottomNavigationBar: isDesktop ? null : const QuickActionBar(),
      body: Column(
        children: [
          SearchField(
            hintText: 'Search by #, status...',
            onChanged: (value) => setState(() => _query = value.trim().toLowerCase()),
          ),
          Expanded(
            child: bookingsAsync.when(
              data: (bookings) {
                final filtered = _query.isEmpty
                    ? bookings
                    : bookings
                        .where((b) =>
                            b.bookingNumber.toLowerCase().contains(_query) || b.status.toLowerCase().contains(_query))
                        .toList();
                if (filtered.isEmpty) {
                  return Center(child: Text(_query.isEmpty ? 'No bookings found.' : 'No bookings match your search.'));
                }
                if (isDesktop) {
                  return _desktopTable(context, filtered, canManage: canManage, canDelete: canDelete);
                }
                return ListView.builder(
                  itemCount: filtered.length,
                  itemBuilder: (context, index) {
                    final booking = filtered[index];
                    return Card(
                      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                      child: ListTile(
                        title: Text('Booking ${booking.bookingNumber}'),
                        subtitle: Text(
                          booking.scheduledDate != null
                              ? '${booking.status} · ${booking.scheduledDate!.toLocal().toString().split(' ').first}'
                              : booking.status,
                        ),
                        onTap: () => context.go('/bookings/${booking.id}'),
                        trailing: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            if (canManage || canDelete)
                              PopupMenuButton<String>(
                                onSelected: (action) async {
                                  if (action == 'edit') {
                                    context.go('/bookings/${booking.id}/edit');
                                  } else if (action == 'delete') {
                                    await _delete(booking);
                                  }
                                },
                                itemBuilder: (context) => [
                                  if (canManage) const PopupMenuItem(value: 'edit', child: Text('Edit')),
                                  if (canDelete)
                                    const PopupMenuItem(
                                        value: 'delete', child: Text('Delete', style: TextStyle(color: Colors.red))),
                                ],
                              ),
                            const Icon(Icons.chevron_right),
                          ],
                        ),
                      ),
                    );
                  },
                );
              },
              loading: () => const Center(child: CircularProgressIndicator()),
              error: (error, stack) => Center(child: Text(apiErrorMessage(error))),
            ),
          ),
        ],
      ),
    );
  }

  /// Desktop presentation: a proper bookings data grid. Same data + same
  /// navigation (row click → detail) + same RBAC (edit/delete) as the phone
  /// list.
  Widget _desktopTable(
    BuildContext context,
    List<OfflineBooking> bookings, {
    required bool canManage,
    required bool canDelete,
  }) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
      child: DesktopTable(
        columns: const [
          DataColumn(label: Text('Booking #')),
          DataColumn(label: Text('Status')),
          DataColumn(label: Text('Scheduled Date')),
          DataColumn(label: Text('Actions')),
        ],
        rows: [
          for (final b in bookings)
            DataRow(
              onSelectChanged: (_) => context.go('/bookings/${b.id}'),
              cells: [
                DataCell(Text(b.bookingNumber, style: const TextStyle(fontWeight: FontWeight.w600))),
                DataCell(Text(b.status)),
                DataCell(Text(b.scheduledDate != null
                    ? b.scheduledDate!.toLocal().toString().split(' ').first
                    : '—')),
                DataCell(
                  (canManage || canDelete)
                      ? Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            if (canManage)
                              IconButton(
                                icon: const Icon(Icons.edit, size: 18),
                                tooltip: 'Edit',
                                onPressed: () => context.go('/bookings/${b.id}/edit'),
                              ),
                            if (canDelete)
                              IconButton(
                                icon: const Icon(Icons.delete, size: 18, color: Colors.red),
                                tooltip: 'Delete',
                                onPressed: () => _delete(b),
                              ),
                          ],
                        )
                      : const Text('—'),
                ),
              ],
            ),
        ],
      ),
    );
  }
}
