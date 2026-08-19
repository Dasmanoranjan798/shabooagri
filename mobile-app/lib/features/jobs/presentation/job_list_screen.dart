import 'package:flutter/material.dart';
import '../../../core/widgets/quick_action_bar.dart';
import '../../../core/widgets/status_badge.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import '../../../core/network/api_error.dart';
import '../../../core/providers/session_provider.dart';
import '../../../core/widgets/app_drawer.dart';
import '../../../core/widgets/search_field.dart';
import '../data/job_actions_repository.dart';
import '../data/job_detail.dart';

/// Live list (not the offline cache) so rows can show real booking number /
/// customer name / machine, matching the website's Jobs list — the flat
/// offline `OfflineJob` table doesn't carry those fields.
final jobsListProvider = FutureProvider<List<JobDetail>>((ref) async {
  return ref.watch(jobActionsRepositoryProvider).list();
});

enum _JobFilter { all, awaitingMachine, readyToStart, inProgress, completed, cancelled }

/// Matches `DriverJobsPage.tsx`'s filter semantics exactly — distinct from
/// Owner/Manager's `_JobFilter` above, which keys off machine/driver
/// assignment readiness rather than a driver's own schedule.
enum _DriverFilter { all, active, upcoming, done }

String _fmtDateRelative(DateTime? date) {
  if (date == null) return '—';
  final now = DateTime.now();
  final today = DateTime(now.year, now.month, now.day);
  final tomorrow = today.add(const Duration(days: 1));
  final d = DateTime(date.year, date.month, date.day);
  if (d == today) return 'Today';
  if (d == tomorrow) return 'Tomorrow';
  return DateFormat('d MMM yyyy').format(date);
}

class JobListScreen extends ConsumerStatefulWidget {
  const JobListScreen({super.key});

  @override
  ConsumerState<JobListScreen> createState() => _JobListScreenState();
}

class _JobListScreenState extends ConsumerState<JobListScreen> {
  String _query = '';
  _JobFilter _filter = _JobFilter.all;
  _DriverFilter _driverFilter = _DriverFilter.all;

  bool _matchesFilter(JobDetail job, _JobFilter filter) {
    final isReady = job.machineRegistration != null && job.driverName != null;
    switch (filter) {
      case _JobFilter.all:
        return true;
      case _JobFilter.awaitingMachine:
        return job.status == 'NOT_STARTED' && !isReady;
      case _JobFilter.readyToStart:
        return job.status == 'NOT_STARTED' && isReady;
      case _JobFilter.inProgress:
        return ['WORKING', 'PAUSED', 'STOPPED'].contains(job.status);
      case _JobFilter.completed:
        return job.status == 'COMPLETED';
      case _JobFilter.cancelled:
        return job.status == 'CANCELLED';
    }
  }

  bool _isToday(DateTime? date) {
    if (date == null) return false;
    final now = DateTime.now();
    return date.year == now.year && date.month == now.month && date.day == now.day;
  }

  bool _isFutureDate(DateTime? date) {
    if (date == null) return false;
    final now = DateTime.now();
    final today = DateTime(now.year, now.month, now.day);
    return DateTime(date.year, date.month, date.day).isAfter(today);
  }

  bool _matchesDriverFilter(JobDetail job, _DriverFilter filter) {
    switch (filter) {
      case _DriverFilter.all:
        return true;
      case _DriverFilter.active:
        return ['WORKING', 'PAUSED', 'STOPPED'].contains(job.status) || _isToday(job.scheduledDate);
      case _DriverFilter.upcoming:
        return _isFutureDate(job.scheduledDate) && job.status == 'NOT_STARTED';
      case _DriverFilter.done:
        return job.status == 'COMPLETED';
    }
  }

  String _statusLabel(JobDetail job) {
    if (job.status == 'NOT_STARTED') {
      final isReady = job.machineRegistration != null && job.driverName != null;
      return isReady ? 'Ready to Start' : 'Awaiting Machine';
    }
    return job.status;
  }

  /// Plain status label for Driver rows — matches `DriverJobsPage.tsx`'s
  /// own `statusLabel()`, deliberately NOT the Owner/Manager
  /// "Awaiting Machine"/"Ready to Start" framing above (a driver's own
  /// jobs are already assigned to them by the time they see them here).
  String _driverStatusLabel(String status) {
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

  @override
  Widget build(BuildContext context) {
    final jobsAsync = ref.watch(jobsListProvider);
    final user = ref.watch(currentUserProvider);
    final isOwnerOrManager = user?.isOwnerOrManager ?? false;

    return Scaffold(
      drawer: isOwnerOrManager ? const AppDrawer(currentRoute: '/jobs') : null,
      appBar: AppBar(
        title: const Text('Job Cards'),
        actions: [
          if (isOwnerOrManager)
            IconButton(
              icon: const Icon(Icons.add_task),
              tooltip: 'Log After-Work Entry',
              onPressed: () => context.go('/jobs/manual'),
            ),
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () => ref.invalidate(jobsListProvider),
          ),
        ],
      ),
      bottomNavigationBar: const QuickActionBar(),
      body: jobsAsync.when(
        data: (jobs) {
          List<JobDetail> filtered;
          Widget filterRow;
          if (isOwnerOrManager) {
            final counts = {for (final f in _JobFilter.values) f: jobs.where((j) => _matchesFilter(j, f)).length};
            filtered = jobs.where((j) => _matchesFilter(j, _filter)).toList();
            filterRow = FilterTabsRow<_JobFilter>(
              selected: _filter,
              onSelected: (f) => setState(() => _filter = f),
              tabs: [
                (_JobFilter.all, 'All', counts[_JobFilter.all]!),
                (_JobFilter.awaitingMachine, 'Awaiting Machine', counts[_JobFilter.awaitingMachine]!),
                (_JobFilter.readyToStart, 'Ready to Start', counts[_JobFilter.readyToStart]!),
                (_JobFilter.inProgress, 'In Progress', counts[_JobFilter.inProgress]!),
                (_JobFilter.completed, 'Completed', counts[_JobFilter.completed]!),
                (_JobFilter.cancelled, 'Cancelled', counts[_JobFilter.cancelled]!),
              ],
            );
          } else {
            final counts = {for (final f in _DriverFilter.values) f: jobs.where((j) => _matchesDriverFilter(j, f)).length};
            filtered = jobs.where((j) => _matchesDriverFilter(j, _driverFilter)).toList();
            filterRow = FilterTabsRow<_DriverFilter>(
              selected: _driverFilter,
              onSelected: (f) => setState(() => _driverFilter = f),
              tabs: [
                (_DriverFilter.all, 'All', counts[_DriverFilter.all]!),
                (_DriverFilter.active, 'Active', counts[_DriverFilter.active]!),
                (_DriverFilter.upcoming, 'Upcoming', counts[_DriverFilter.upcoming]!),
                (_DriverFilter.done, 'Done', counts[_DriverFilter.done]!),
              ],
            );
          }
          if (_query.isNotEmpty) {
            filtered = filtered
                .where((j) =>
                    j.bookingNumber.toLowerCase().contains(_query) ||
                    j.customerName.toLowerCase().contains(_query) ||
                    (j.machineRegistration?.toLowerCase().contains(_query) ?? false) ||
                    (j.driverName?.toLowerCase().contains(_query) ?? false))
                .toList();
          }

          return Column(
            children: [
              SearchField(
                hintText: 'Search by #, customer, machine, driver...',
                onChanged: (value) => setState(() => _query = value.trim().toLowerCase()),
              ),
              filterRow,
              Expanded(
                child: filtered.isEmpty
                    ? const Center(child: Text('No job cards match this view.'))
                    : ListView.builder(
                        itemCount: filtered.length,
                        itemBuilder: (context, index) {
                          final job = filtered[index];
                          return Card(
                            margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
                            child: InkWell(
                              onTap: () => context.go('/jobs/${job.id}'),
                              borderRadius: BorderRadius.circular(10),
                              child: Padding(
                                padding: const EdgeInsets.all(16),
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Row(
                                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                      children: [
                                        Text(job.bookingNumber, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                                        JobStatusBadge(status: job.status),
                                      ],
                                    ),
                                    const SizedBox(height: 8),
                                    Row(
                                      children: [
                                        const Icon(Icons.person, size: 16, color: Colors.grey),
                                        const SizedBox(width: 8),
                                        Expanded(child: Text(job.customerName, style: const TextStyle(fontSize: 14))),
                                      ],
                                    ),
                                    const SizedBox(height: 4),
                                    Row(
                                      children: [
                                        const Icon(Icons.location_on, size: 16, color: Colors.grey),
                                        const SizedBox(width: 8),
                                        Expanded(child: Text(job.villageName, style: const TextStyle(fontSize: 14))),
                                      ],
                                    ),
                                    if (job.machineRegistration != null) ...[
                                      const SizedBox(height: 4),
                                      Row(
                                        children: [
                                          const Icon(Icons.agriculture, size: 16, color: Colors.grey),
                                          const SizedBox(width: 8),
                                          Expanded(child: Text(job.machineRegistration!, style: const TextStyle(fontSize: 14))),
                                        ],
                                      ),
                                    ]
                                  ],
                                ),
                              ),
                            ),
                          );
                        },
                      ),
              ),
            ],
          );
        },
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, stack) => Center(child: Text('Error: ${apiErrorMessage(error)}')),
      ),
    );
  }
}
