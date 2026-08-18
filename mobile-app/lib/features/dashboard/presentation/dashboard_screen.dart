import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../core/providers/network_provider.dart';
import '../../../core/providers/session_provider.dart';
import '../../../core/repositories/auth_repository.dart';
import '../../../core/repositories/job_repository.dart';
import '../../../core/database/database.dart';

/// Owner/Manager home. `GET /jobs` is already scoped server-side to the
/// whole company for these roles (vs. a Driver's own jobs only), so the
/// same repository call used by the Driver's job list produces the right
/// company-wide counts here.
final dashboardJobsProvider = FutureProvider<List<OfflineJob>>((ref) async {
  final repository = ref.watch(jobRepositoryProvider);
  await repository.refreshFromApi();
  return repository.getJobs();
});

class DashboardScreen extends ConsumerWidget {
  const DashboardScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final networkStatusAsync = ref.watch(networkStatusProvider);
    final isOnline = networkStatusAsync.valueOrNull ?? false;
    final jobsAsync = ref.watch(dashboardJobsProvider);
    final user = ref.watch(currentUserProvider);

    final activeCount = jobsAsync.valueOrNull?.where((j) => j.status == 'WORKING' || j.status == 'PAUSED').length;
    final completedCount = jobsAsync.valueOrNull?.where((j) => j.status == 'COMPLETED').length;

    return Scaffold(
      appBar: AppBar(
        title: Text(user?.fullName ?? 'Dashboard'),
        actions: [
          Icon(
            isOnline ? Icons.cloud_done : Icons.cloud_off,
            color: isOnline ? Colors.green : Colors.red,
          ),
          const SizedBox(width: 8),
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
        onRefresh: () async => ref.invalidate(dashboardJobsProvider),
        child: ListView(
          padding: const EdgeInsets.all(16.0),
          children: [
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16.0),
                child: Column(
                  children: [
                    const Text('Job Overview', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                    const SizedBox(height: 16),
                    if (jobsAsync.isLoading)
                      const Padding(
                        padding: EdgeInsets.symmetric(vertical: 8),
                        child: CircularProgressIndicator(),
                      )
                    else if (jobsAsync.hasError)
                      const Text('Could not load job data.', style: TextStyle(color: Colors.red))
                    else
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                        children: [
                          _StatWidget(title: 'Active Jobs', value: '${activeCount ?? 0}'),
                          _StatWidget(title: 'Completed', value: '${completedCount ?? 0}'),
                        ],
                      ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 24),
            ElevatedButton.icon(
              icon: const Icon(Icons.work),
              label: const Text('VIEW JOBS', style: TextStyle(fontSize: 16)),
              style: ElevatedButton.styleFrom(
                padding: const EdgeInsets.symmetric(vertical: 24),
              ),
              onPressed: () {
                context.go('/jobs');
              },
            ),
          ],
        ),
      ),
    );
  }
}

class _StatWidget extends StatelessWidget {
  final String title;
  final String value;

  const _StatWidget({required this.title, required this.value});

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Text(value, style: const TextStyle(fontSize: 32, fontWeight: FontWeight.bold, color: Colors.blue)),
        Text(title, style: const TextStyle(fontSize: 14, color: Colors.grey)),
      ],
    );
  }
}
