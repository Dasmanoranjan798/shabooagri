import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../../core/layout/responsive_form.dart';
import '../../../core/network/api_error.dart';
import '../../jobs/data/job_detail.dart';
import '../../jobs/presentation/job_list_screen.dart';
import '../data/farmer_models.dart';

enum _BookingFilter { all, active, awaiting, done }

/// Matches `FarmerBookingsPage.tsx`: filter chips (All/Active/Awaiting/
/// Done, keyed off the linked Job's status, not the booking's own legacy
/// status) and expandable cards revealing Work Needed/Village/Machine/
/// Pricing/Rate/Total/Notes.
class FarmerBookingsScreen extends ConsumerStatefulWidget {
  const FarmerBookingsScreen({super.key});

  @override
  ConsumerState<FarmerBookingsScreen> createState() => _FarmerBookingsScreenState();
}

class _FarmerBookingsScreenState extends ConsumerState<FarmerBookingsScreen> {
  _BookingFilter _filter = _BookingFilter.all;
  String? _expandedId;

  bool _matchesFilter(JobDetail? job, _BookingFilter filter) {
    switch (filter) {
      case _BookingFilter.all:
        return true;
      case _BookingFilter.awaiting:
        return job == null || job.status == 'NOT_STARTED';
      case _BookingFilter.active:
        return job != null && ['WORKING', 'PAUSED', 'STOPPED'].contains(job.status);
      case _BookingFilter.done:
        return job != null && job.status == 'COMPLETED';
    }
  }

  @override
  Widget build(BuildContext context) {
    final bookingsAsync = ref.watch(farmerBookingsProvider);
    final jobsAsync = ref.watch(jobsListProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('My Bookings'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () {
              ref.invalidate(farmerBookingsProvider);
              ref.invalidate(jobsListProvider);
            },
          ),
        ],
      ),
      body: bookingsAsync.when(
        data: (bookings) {
          final jobsById = {for (final j in (jobsAsync.valueOrNull ?? const [])) j.bookingId: j};
          final filtered = bookings.where((b) => _matchesFilter(jobsById[b.id], _filter)).toList()
            ..sort((a, b) => b.scheduledDate.compareTo(a.scheduledDate));

          return DesktopContentColumn(
            child: Column(
            children: [
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                child: Wrap(
                  spacing: 8,
                  children: [
                    ChoiceChip(label: const Text('All'), selected: _filter == _BookingFilter.all, onSelected: (_) => setState(() => _filter = _BookingFilter.all)),
                    ChoiceChip(label: const Text('Active'), selected: _filter == _BookingFilter.active, onSelected: (_) => setState(() => _filter = _BookingFilter.active)),
                    ChoiceChip(label: const Text('Awaiting'), selected: _filter == _BookingFilter.awaiting, onSelected: (_) => setState(() => _filter = _BookingFilter.awaiting)),
                    ChoiceChip(label: const Text('Done'), selected: _filter == _BookingFilter.done, onSelected: (_) => setState(() => _filter = _BookingFilter.done)),
                  ],
                ),
              ),
              Expanded(
                child: filtered.isEmpty
                    ? const Center(child: Text('No bookings found'))
                    : ListView.builder(
                        padding: const EdgeInsets.symmetric(horizontal: 12),
                        itemCount: filtered.length,
                        itemBuilder: (context, index) {
                          final b = filtered[index];
                          final job = jobsById[b.id];
                          final badge = farmerJobBadge(job);
                          final expanded = _expandedId == b.id;
                          final finalAmount = farmerBookingFinalAmount(job);

                          return Card(
                            margin: const EdgeInsets.only(bottom: 10),
                            child: Column(
                              children: [
                                InkWell(
                                  onTap: () => setState(() => _expandedId = expanded ? null : b.id),
                                  child: Padding(
                                    padding: const EdgeInsets.all(14.0),
                                    child: Row(
                                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                      children: [
                                        Column(
                                          crossAxisAlignment: CrossAxisAlignment.start,
                                          children: [
                                            Text(b.bookingNumber, style: const TextStyle(fontWeight: FontWeight.bold)),
                                            Text(DateFormat('d MMM yyyy').format(b.scheduledDate), style: const TextStyle(color: Colors.grey, fontSize: 12)),
                                          ],
                                        ),
                                        Column(
                                          crossAxisAlignment: CrossAxisAlignment.end,
                                          children: [
                                            Container(
                                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                              decoration: BoxDecoration(color: badge.$2.withValues(alpha: 0.12), borderRadius: BorderRadius.circular(12)),
                                              child: Text(badge.$1, style: TextStyle(color: badge.$2, fontSize: 11, fontWeight: FontWeight.bold)),
                                            ),
                                            Icon(expanded ? Icons.expand_less : Icons.expand_more, size: 18, color: Colors.grey),
                                          ],
                                        ),
                                      ],
                                    ),
                                  ),
                                ),
                                if (expanded)
                                  Padding(
                                    padding: const EdgeInsets.fromLTRB(14, 0, 14, 14),
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        const Divider(),
                                        _detailGrid([
                                          ('Work Needed', b.workDescription ?? '—'),
                                          ('Village', b.villageName),
                                          ('Machine', b.machineRegistration != null ? '${b.machineRegistration}${b.machineBrand != null ? ' — ${b.machineBrand}' : ''}' : 'Not assigned'),
                                          ('Pricing', b.pricingLabel != null ? '${b.pricingLabel}${b.pricingUnit != null ? ' / ${b.pricingUnit}' : ''}' : 'Not set yet'),
                                          ('Rate', b.rate != null ? '₹${b.rate!.toStringAsFixed(0)}' : 'Not set yet'),
                                          ('Total', finalAmount != null ? '₹${finalAmount.toStringAsFixed(2)}' : 'Pending'),
                                        ]),
                                        if (b.notes != null && b.notes!.isNotEmpty) ...[
                                          const SizedBox(height: 8),
                                          Text('Notes: ${b.notes}', style: const TextStyle(fontSize: 13)),
                                        ],
                                      ],
                                    ),
                                  ),
                              ],
                            ),
                          );
                        },
                      ),
              ),
            ],
          ),
          );
        },
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, s) => Center(child: Text('Error: ${apiErrorMessage(e)}')),
      ),
    );
  }

  Widget _detailGrid(List<(String, String)> items) {
    return Wrap(
      spacing: 20,
      runSpacing: 10,
      children: items
          .map((item) => SizedBox(
                width: 140,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(item.$1, style: const TextStyle(fontSize: 10, color: Colors.grey, fontWeight: FontWeight.bold)),
                    Text(item.$2, style: const TextStyle(fontSize: 13)),
                  ],
                ),
              ))
          .toList(),
    );
  }
}
