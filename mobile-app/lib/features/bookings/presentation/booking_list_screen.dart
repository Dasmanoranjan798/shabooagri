import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../core/database/database.dart';
import '../../../core/repositories/booking_repository.dart';
import '../../../core/widgets/app_drawer.dart';

final bookingsListProvider = FutureProvider<List<OfflineBooking>>((ref) async {
  final repository = ref.watch(bookingRepositoryProvider);
  await repository.refreshFromApi();
  return repository.getBookings();
});

class BookingListScreen extends ConsumerWidget {
  const BookingListScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final bookingsAsync = ref.watch(bookingsListProvider);

    return Scaffold(
      drawer: const AppDrawer(currentRoute: '/bookings'),
      appBar: AppBar(
        title: const Text('Bookings'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () => ref.invalidate(bookingsListProvider),
          ),
        ],
      ),
      body: bookingsAsync.when(
        data: (bookings) {
          if (bookings.isEmpty) {
            return const Center(child: Text('No bookings found.'));
          }
          return ListView.builder(
            itemCount: bookings.length,
            itemBuilder: (context, index) {
              final booking = bookings[index];
              return Card(
                margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                child: ListTile(
                  title: Text('Booking ${booking.bookingNumber}'),
                  subtitle: Text(
                    booking.scheduledDate != null
                        ? '${booking.status} · ${booking.scheduledDate!.toLocal().toString().split(' ').first}'
                        : booking.status,
                  ),
                  trailing: const Icon(Icons.chevron_right),
                  onTap: () => context.go('/bookings/${booking.id}'),
                ),
              );
            },
          );
        },
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, stack) => Center(child: Text('Error: $error')),
      ),
    );
  }
}
