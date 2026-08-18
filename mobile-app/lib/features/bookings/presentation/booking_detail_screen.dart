import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../core/database/database.dart';
import '../../../core/widgets/info_row.dart';
import 'booking_list_screen.dart';

final bookingDetailProvider = FutureProvider.family<OfflineBooking, String>((ref, id) async {
  final bookings = await ref.watch(bookingsListProvider.future);
  return bookings.firstWhere((b) => b.id == id);
});

class BookingDetailScreen extends ConsumerWidget {
  final String bookingId;

  const BookingDetailScreen({super.key, required this.bookingId});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final bookingAsync = ref.watch(bookingDetailProvider(bookingId));

    return Scaffold(
      appBar: AppBar(
        title: const Text('Booking Details'),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => context.go('/bookings'),
        ),
      ),
      body: bookingAsync.when(
        data: (booking) => Padding(
          padding: const EdgeInsets.all(16.0),
          child: ListView(
            children: [
              InfoRow('Booking Number', booking.bookingNumber),
              InfoRow('Status', booking.status),
              if (booking.scheduledDate != null)
                InfoRow('Scheduled Date', booking.scheduledDate!.toLocal().toString().split(' ').first),
              if (booking.estimatedHours != null)
                InfoRow('Estimated Hours', booking.estimatedHours!.toStringAsFixed(1)),
              if (booking.estimatedAcres != null)
                InfoRow('Estimated Acres', booking.estimatedAcres!.toStringAsFixed(1)),
              InfoRow('Machine Assigned', booking.machineId != null ? 'Yes' : 'Not yet'),
              InfoRow('Driver Assigned', booking.driverId != null ? 'Yes' : 'Not yet'),
              if (booking.notes != null && booking.notes!.isNotEmpty) InfoRow('Notes', booking.notes!),
              InfoRow('Synced to Cloud', booking.isSynced ? 'Yes' : 'No'),
            ],
          ),
        ),
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, stack) => Center(child: Text('Error: $error')),
      ),
    );
  }
}
