import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../core/network/api_error.dart';
import '../../../core/providers/session_provider.dart';
import '../../../core/repositories/auth_repository.dart';
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

class JobListScreen extends ConsumerStatefulWidget {
  const JobListScreen({super.key});

  @override
  ConsumerState<JobListScreen> createState() => _JobListScreenState();
}

class _JobListScreenState extends ConsumerState<JobListScreen> {
  String _query = '';
  _JobFilter _filter = _JobFilter.all;

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

  String _statusLabel(JobDetail job) {
    if (job.status == 'NOT_STARTED') {
      final isReady = job.machineRegistration != null && job.driverName != null;
      return isReady ? 'Ready to Start' : 'Awaiting Machine';
    }
    return job.status;
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
          if (!isOwnerOrManager)
            IconButton(
              icon: const Icon(Icons.logout),
              onPressed: () async {
                await ref.read(authRepositoryProvider).logout();
                if (context.mounted) context.go('/login');
              },
            ),
        ],
      ),
      body: jobsAsync.when(
        data: (jobs) {
          final counts = {for (final f in _JobFilter.values) f: jobs.where((j) => _matchesFilter(j, f)).length};
          var filtered = jobs.where((j) => _matchesFilter(j, _filter)).toList();
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
              FilterTabsRow<_JobFilter>(
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
              ),
              Expanded(
                child: filtered.isEmpty
                    ? const Center(child: Text('No job cards match this view.'))
                    : ListView.builder(
                        itemCount: filtered.length,
                        itemBuilder: (context, index) {
                          final job = filtered[index];
                          return Card(
                            margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                            child: ListTile(
                              title: Text('${job.bookingNumber} · ${job.customerName}'),
                              subtitle: Text(job.machineRegistration != null
                                  ? '${job.machineRegistration} · ${_statusLabel(job)}'
                                  : _statusLabel(job)),
                              trailing: const Icon(Icons.chevron_right),
                              onTap: () => context.go('/jobs/${job.id}'),
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
