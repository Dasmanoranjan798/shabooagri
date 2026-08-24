import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../../core/layout/responsive_form.dart';
import '../../../core/network/api_error.dart';
import '../../../core/providers/session_provider.dart';
import '../../jobs/presentation/job_list_screen.dart';
import '../data/farmer_models.dart';
import 'farmer_shell_screen.dart';

/// Matches `FarmerHomePage.tsx`: greeting/date banner, 3 KPI cards (Total
/// Bookings, Active, Balance Due), and the 3 most-recently-created bookings
/// with a "See all" link into the Bookings tab.
class FarmerHomeScreen extends ConsumerWidget {
  const FarmerHomeScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final bookingsAsync = ref.watch(farmerBookingsProvider);
    final invoicesAsync = ref.watch(farmerInvoicesProvider);
    final jobsAsync = ref.watch(jobsListProvider);
    final user = ref.watch(currentUserProvider);
    final firstName = (user?.fullName.split(' ').first) ?? 'Customer';
    final dateStr = DateFormat('EEEE, d MMMM yyyy').format(DateTime.now());

    return Scaffold(
      appBar: AppBar(
        title: const Text('Home'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () {
              ref.invalidate(farmerBookingsProvider);
              ref.invalidate(farmerInvoicesProvider);
              ref.invalidate(jobsListProvider);
            },
          ),
        ],
      ),
      body: bookingsAsync.when(
        data: (bookings) {
          final invoices = invoicesAsync.valueOrNull ?? const [];
          final jobsById = {for (final j in (jobsAsync.valueOrNull ?? const [])) j.bookingId: j};

          final activeBookings = bookings.where((b) {
            final job = jobsById[b.id];
            return job == null || (job.status != 'COMPLETED' && job.status != 'CANCELLED');
          }).length;
          final pendingBalance = invoices.fold<double>(0, (acc, inv) => acc + inv.balanceAmount);
          final recent = [...bookings]..sort((a, b) => b.createdAt.compareTo(a.createdAt));
          final recentBookings = recent.take(3).toList();

          return RefreshIndicator(
            onRefresh: () async {
              ref.invalidate(farmerBookingsProvider);
              ref.invalidate(farmerInvoicesProvider);
              ref.invalidate(jobsListProvider);
            },
            child: DesktopContentColumn(
              child: ListView(
              padding: const EdgeInsets.all(16.0),
              children: [
                Card(
                  color: Theme.of(context).colorScheme.primaryContainer,
                  child: Padding(
                    padding: const EdgeInsets.all(16.0),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text('Hello, $firstName', style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
                            const SizedBox(height: 4),
                            Text(dateStr, style: const TextStyle(fontSize: 12)),
                          ],
                        ),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                          decoration: BoxDecoration(color: Colors.white.withValues(alpha: 0.6), borderRadius: BorderRadius.circular(12)),
                          child: const Text('Customer Portal', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
                        ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 20),
                Row(children: [
                  Expanded(child: _kpiCard('Total Bookings', '${bookings.length}')),
                  const SizedBox(width: 12),
                  Expanded(child: _kpiCard('Active', '$activeBookings')),
                  const SizedBox(width: 12),
                  Expanded(child: _kpiCard('Balance Due', '₹${pendingBalance.toStringAsFixed(0)}', alert: pendingBalance > 0)),
                ]),
                if (recentBookings.isNotEmpty) ...[
                  const SizedBox(height: 24),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text('Recent Bookings', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                      TextButton(
                        onPressed: () => ref.read(farmerTabIndexProvider.notifier).state = 1,
                        child: const Text('See all →'),
                      ),
                    ],
                  ),
                  ...recentBookings.map((b) {
                    final job = jobsById[b.id];
                    final badge = farmerJobBadge(job);
                    return Card(
                      margin: const EdgeInsets.only(bottom: 8),
                      child: Padding(
                        padding: const EdgeInsets.all(12.0),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Text(b.bookingNumber, style: const TextStyle(fontWeight: FontWeight.bold)),
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                  decoration: BoxDecoration(color: badge.$2.withValues(alpha: 0.12), borderRadius: BorderRadius.circular(12)),
                                  child: Text(badge.$1, style: TextStyle(color: badge.$2, fontSize: 11, fontWeight: FontWeight.bold)),
                                ),
                              ],
                            ),
                            const SizedBox(height: 4),
                            Text(
                              [
                                DateFormat('d MMM yyyy').format(b.scheduledDate),
                                if (b.machineRegistration != null) b.machineRegistration!,
                              ].join(' · '),
                              style: const TextStyle(color: Colors.grey, fontSize: 12),
                            ),
                          ],
                        ),
                      ),
                    );
                  }),
                ],
              ],
            ),
            ),
          );
        },
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, s) => Center(child: Text('Error: ${apiErrorMessage(e)}')),
      ),
    );
  }

  Widget _kpiCard(String label, String value, {bool alert = false}) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 4),
        child: Column(children: [
          Text(value, style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: alert ? Colors.red : null)),
          const SizedBox(height: 4),
          Text(label, style: const TextStyle(fontSize: 11, color: Colors.grey), textAlign: TextAlign.center),
        ]),
      ),
    );
  }
}
