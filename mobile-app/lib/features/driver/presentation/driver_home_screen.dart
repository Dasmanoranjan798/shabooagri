import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../../core/network/api_error.dart';
import '../../../core/providers/session_provider.dart';
import '../../../core/layout/responsive_form.dart';
import '../../jobs/data/job_detail.dart';
import '../../jobs/presentation/job_list_screen.dart';
import 'driver_shell_screen.dart';

/// Mirrors `DriverHomePage.tsx`: greeting/date banner, a spotlight card for
/// today's active job, and a KPI row. The website embeds the full
/// `DriverJobActions` (Start/Pause/Stop/Submit) directly inside the
/// spotlight card; mobile instead links the card to the existing, already
/// fully-verified `job_detail_screen.dart` for those actions (via "Manage
/// Job") rather than re-implementing the same action state machine a
/// second time in two places — a deliberate simplification, disclosed in
/// PARITY_INVENTORY.md, not a silently dropped feature. The full workflow
/// remains exactly one tap away.
class DriverHomeScreen extends ConsumerStatefulWidget {
  const DriverHomeScreen({super.key});

  @override
  ConsumerState<DriverHomeScreen> createState() => _DriverHomeScreenState();
}

class _DriverHomeScreenState extends ConsumerState<DriverHomeScreen> {
  Timer? _ticker;

  @override
  void dispose() {
    _ticker?.cancel();
    super.dispose();
  }

  bool _isSameDay(DateTime? a, DateTime b) {
    if (a == null) return false;
    return a.year == b.year && a.month == b.month && a.day == b.day;
  }

  Future<void> _navigate(JobDetail job) async {
    final query = job.location ?? job.villageName;
    final uri = Uri.parse('https://www.google.com/maps/search/?api=1&query=${Uri.encodeComponent(query)}');
    if (await canLaunchUrl(uri)) await launchUrl(uri, mode: LaunchMode.externalApplication);
  }

  String _statusLabel(String status) {
    switch (status) {
      case 'NOT_STARTED':
        return 'Not Started';
      case 'WORKING':
        return 'Working';
      case 'PAUSED':
        return 'Paused';
      case 'STOPPED':
        return 'Stopped';
      case 'COMPLETED':
        return 'Completed';
      default:
        return status;
    }
  }

  String _fmtDuration(int sec) {
    final h = sec ~/ 3600;
    final m = (sec % 3600) ~/ 60;
    if (h > 0) return '${h}h ${m}m';
    return '${m}m';
  }

  @override
  Widget build(BuildContext context) {
    final jobsAsync = ref.watch(jobsListProvider);
    final user = ref.watch(currentUserProvider);
    final firstName = (user?.fullName.split(' ').first) ?? 'Driver';
    final dateStr = DateFormat('EEEE, d MMMM yyyy').format(DateTime.now());

    return Scaffold(
      appBar: AppBar(
        title: const Text('Home'),
        actions: [IconButton(icon: const Icon(Icons.refresh), onPressed: () => ref.invalidate(jobsListProvider))],
      ),
      body: jobsAsync.when(
        data: (jobs) {
          final now = DateTime.now();
          final todayJobs = jobs.where((j) => _isSameDay(j.scheduledDate, now) && j.status != 'COMPLETED').toList();
          final activeJob = todayJobs.where((j) => ['WORKING', 'PAUSED', 'STOPPED'].contains(j.status)).isNotEmpty
              ? todayJobs.firstWhere((j) => ['WORKING', 'PAUSED', 'STOPPED'].contains(j.status))
              : (todayJobs.isNotEmpty ? todayJobs.first : null);
          final upcomingJobs = jobs.where((j) => j.scheduledDate != null && j.scheduledDate!.isAfter(DateTime(now.year, now.month, now.day))).toList();

          // Re-fetch the authoritative job list every 5s so a transition made
          // on another device (a Manager/Owner starting, pausing, resuming or
          // stopping this driver's job) is reconciled here automatically — the
          // active-job card status and its elapsed counter (derived from the
          // server's startTime, not an independent stopwatch) both follow the
          // refetched state. Riverpod keeps the current list on screen during
          // the refetch, so there is no spinner flash.
          _ticker ??= Timer.periodic(const Duration(seconds: 5), (_) {
            if (mounted) ref.invalidate(jobsListProvider);
          });

          return RefreshIndicator(
            onRefresh: () async => ref.invalidate(jobsListProvider),
            // On desktop the driver's home is a centred column (not a full-
            // width stretch); on phone this is a no-op.
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
                          child: const Text('Driver', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
                        ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 20),
                const Text("Today's Job", style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                const SizedBox(height: 8),
                activeJob != null ? _todayJobCard(context, activeJob) : _emptyTodayCard(),
                const SizedBox(height: 20),
                Row(children: [
                  Expanded(child: _kpiCard('Today', todayJobs.length)),
                  const SizedBox(width: 12),
                  Expanded(child: _kpiCard('Upcoming', upcomingJobs.length)),
                  const SizedBox(width: 12),
                  Expanded(child: _kpiCard('Total', jobs.length)),
                ]),
                const SizedBox(height: 20),
                OutlinedButton(
                  onPressed: () => ref.read(driverTabIndexProvider.notifier).state = 1,
                  style: OutlinedButton.styleFrom(padding: const EdgeInsets.symmetric(vertical: 14)),
                  child: const Text('View All Job Cards →'),
                ),
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

  Widget _kpiCard(String label, int value) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 16),
        child: Column(children: [
          Text('$value', style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold)),
          const SizedBox(height: 4),
          Text(label, style: const TextStyle(fontSize: 11, color: Colors.grey)),
        ]),
      ),
    );
  }

  Widget _emptyTodayCard() {
    return const Card(
      child: Padding(
        padding: EdgeInsets.all(24.0),
        child: Center(
          child: Column(children: [
            Icon(Icons.event_available, size: 40, color: Colors.grey),
            SizedBox(height: 8),
            Text('No Active Job Today', style: TextStyle(fontWeight: FontWeight.bold)),
            SizedBox(height: 4),
            Text('Check the Job Cards tab for your schedule.', style: TextStyle(fontSize: 12, color: Colors.grey)),
          ]),
        ),
      ),
    );
  }

  Widget _todayJobCard(BuildContext context, JobDetail job) {
    final elapsed = job.status == 'WORKING' ? job.elapsedSecondsNow() : null;
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(job.customerName, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                      Text(job.villageName, style: const TextStyle(color: Colors.grey, fontSize: 12)),
                    ],
                  ),
                ),
                Chip(label: Text(_statusLabel(job.status)), visualDensity: VisualDensity.compact),
              ],
            ),
            const SizedBox(height: 12),
            Wrap(
              spacing: 20,
              runSpacing: 8,
              children: [
                _metaItem('Machine', job.machineRegistration ?? 'Not assigned yet'),
                if (_isSameDay(job.scheduledDate, DateTime.now())) _metaItem('Date', 'Today'),
                if (job.startTime != null) _metaItem('Start Time', DateFormat('h:mm a').format(job.startTime!.toLocal())),
                if (elapsed != null) _metaItem('Running', _fmtDuration(elapsed)),
                if (job.completedAcres != null) _metaItem('Acres Done', '${job.completedAcres} ac'),
                if (job.fuelUsedLitres != null) _metaItem('Fuel Used', '${job.fuelUsedLitres} L'),
              ],
            ),
            const SizedBox(height: 16),
            Row(children: [
              Expanded(
                child: OutlinedButton.icon(
                  onPressed: () => _navigate(job),
                  icon: const Icon(Icons.directions, size: 16),
                  label: const Text('Navigate'),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: ElevatedButton.icon(
                  onPressed: () => context.go('/jobs/${job.id}'),
                  icon: const Icon(Icons.play_circle_outline, size: 16),
                  label: const Text('Manage Job'),
                ),
              ),
            ]),
          ],
        ),
      ),
    );
  }

  Widget _metaItem(String label, String value) {
    return SizedBox(
      width: 110,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(label, style: const TextStyle(fontSize: 10, color: Colors.grey, fontWeight: FontWeight.bold)),
          Text(value, style: const TextStyle(fontSize: 13)),
        ],
      ),
    );
  }
}
