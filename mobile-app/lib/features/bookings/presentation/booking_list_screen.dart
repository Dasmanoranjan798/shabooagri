import 'package:flutter/material.dart';
import '../../../core/widgets/status_badge.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:share_plus/share_plus.dart';
import '../../../core/database/database.dart';
import '../../../core/network/api_client.dart';
import '../../../core/providers/session_provider.dart';
import '../../../core/repositories/booking_repository.dart';
import '../../../core/widgets/app_drawer.dart';
import '../../../core/widgets/confirm_delete.dart';
import '../../../core/widgets/search_field.dart';

final bookingsListProvider = FutureProvider<List<OfflineBooking>>((ref) async {
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

  @override
  Widget build(BuildContext context) {
    final bookingsAsync = ref.watch(bookingsListProvider);
    final user = ref.watch(currentUserProvider);
    final canManage = user?.isOwnerOrManager ?? false;
    final canDelete = user?.roleSystemKey == 'owner';

    return Scaffold(
      drawer: const AppDrawer(currentRoute: '/bookings'),
      appBar: AppBar(
        title: const Text('Bookings'),
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
        ],
      ),
      floatingActionButton: canManage
          ? FloatingActionButton(onPressed: () => context.go('/bookings/new'), child: const Icon(Icons.add))
          : null,
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
                                    final dio = ref.read(apiClientProvider);
                                    await confirmAndDelete(
                                      context: context,
                                      entityLabel: 'Booking ${booking.bookingNumber}',
                                      onDelete: () => dio.delete('/bookings/${booking.id}'),
                                      onSuccess: () => ref.invalidate(bookingsListProvider),
                                    );
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
              error: (error, stack) => Center(child: Text('Error: $error')),
            ),
          ),
        ],
      ),
    );
  }
}
