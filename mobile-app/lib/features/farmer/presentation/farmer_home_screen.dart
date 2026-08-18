import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../core/network/api_client.dart';
import '../../../core/repositories/auth_repository.dart';

class FarmerBooking {
  final String bookingNumber;
  final String status;
  final String scheduledDate;
  final double? estimatedAmount;

  FarmerBooking.fromJson(Map<String, dynamic> json)
      : bookingNumber = json['bookingNumber'] as String,
        status = json['status'] as String,
        scheduledDate = json['scheduledDate'] as String,
        estimatedAmount = (json['estimatedAmount'] as num?)?.toDouble();
}

class FarmerInvoice {
  final String invoiceNumber;
  final String status;
  final double totalAmount;
  final double balanceAmount;

  FarmerInvoice.fromJson(Map<String, dynamic> json)
      : invoiceNumber = json['invoiceNumber'] as String,
        status = json['status'] as String,
        totalAmount = (json['totalAmount'] as num).toDouble(),
        balanceAmount = (json['balanceAmount'] as num).toDouble();
}

final farmerBookingsProvider = FutureProvider<List<FarmerBooking>>((ref) async {
  final dio = ref.watch(apiClientProvider);
  final response = await dio.get('/bookings');
  return (response.data as List<dynamic>)
      .map((json) => FarmerBooking.fromJson(json as Map<String, dynamic>))
      .toList();
});

final farmerInvoicesProvider = FutureProvider<List<FarmerInvoice>>((ref) async {
  final dio = ref.watch(apiClientProvider);
  final response = await dio.get('/invoices');
  return (response.data as List<dynamic>)
      .map((json) => FarmerInvoice.fromJson(json as Map<String, dynamic>))
      .toList();
});

/// Read-only home for the Farmer/Customer role — own bookings and invoices
/// only, calling the same `GET /bookings` / `GET /invoices` endpoints the
/// website's Farmer portal uses (server-side scoped to this customer's own
/// records, and to zero write permissions, per `resolveCallerScope`).
class FarmerHomeScreen extends ConsumerWidget {
  const FarmerHomeScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final bookingsAsync = ref.watch(farmerBookingsProvider);
    final invoicesAsync = ref.watch(farmerInvoicesProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('My Bookings'),
        actions: [
          IconButton(
            icon: const Icon(Icons.logout),
            onPressed: () async {
              await ref.read(authRepositoryProvider).logout();
              if (context.mounted) context.go('/login');
            },
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: () async {
          ref.invalidate(farmerBookingsProvider);
          ref.invalidate(farmerInvoicesProvider);
        },
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            const Text('Bookings', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
            const SizedBox(height: 8),
            bookingsAsync.when(
              data: (bookings) {
                if (bookings.isEmpty) {
                  return const Padding(
                    padding: EdgeInsets.symmetric(vertical: 16),
                    child: Text('No bookings yet.'),
                  );
                }
                return Column(
                  children: bookings
                      .map((b) => Card(
                            child: ListTile(
                              title: Text('Booking ${b.bookingNumber}'),
                              subtitle: Text('${b.status} · ${b.scheduledDate}'),
                              trailing: b.estimatedAmount != null
                                  ? Text('₹${b.estimatedAmount!.toStringAsFixed(0)}')
                                  : null,
                            ),
                          ))
                      .toList(),
                );
              },
              loading: () => const Center(child: Padding(padding: EdgeInsets.all(16), child: CircularProgressIndicator())),
              error: (error, stack) => Text('Could not load bookings: $error'),
            ),
            const SizedBox(height: 24),
            const Text('Invoices', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
            const SizedBox(height: 8),
            invoicesAsync.when(
              data: (invoices) {
                if (invoices.isEmpty) {
                  return const Padding(
                    padding: EdgeInsets.symmetric(vertical: 16),
                    child: Text('No invoices yet.'),
                  );
                }
                return Column(
                  children: invoices
                      .map((inv) => Card(
                            child: ListTile(
                              title: Text('Invoice ${inv.invoiceNumber}'),
                              subtitle: Text(inv.status),
                              trailing: Text(
                                inv.balanceAmount > 0
                                    ? 'Due ₹${inv.balanceAmount.toStringAsFixed(0)}'
                                    : 'Paid',
                                style: TextStyle(
                                  color: inv.balanceAmount > 0 ? Colors.red : Colors.green,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                            ),
                          ))
                      .toList(),
                );
              },
              loading: () => const Center(child: Padding(padding: EdgeInsets.all(16), child: CircularProgressIndicator())),
              error: (error, stack) => Text('Could not load invoices: $error'),
            ),
          ],
        ),
      ),
    );
  }
}
