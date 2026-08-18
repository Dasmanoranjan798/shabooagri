import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../core/providers/session_provider.dart';
import '../../../core/repositories/auth_repository.dart';
import '../../../core/repositories/job_repository.dart';
import '../../../core/database/database.dart';
import '../../../core/widgets/app_drawer.dart';

final jobsListProvider = FutureProvider<List<OfflineJob>>((ref) async {
  final repository = ref.watch(jobRepositoryProvider);
  await repository.refreshFromApi();
  return repository.getJobs();
});

class JobListScreen extends ConsumerWidget {
  const JobListScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final jobsAsync = ref.watch(jobsListProvider);
    final user = ref.watch(currentUserProvider);
    // Owner/Manager get the full module drawer (Jobs is one of several
    // screens for them); Driver has no other screens, so no drawer or back
    // arrow — this Job List *is* their whole home.
    final isOwnerOrManager = user?.isOwnerOrManager ?? false;

    return Scaffold(
      drawer: isOwnerOrManager ? const AppDrawer(currentRoute: '/jobs') : null,
      appBar: AppBar(
        title: const Text('My Jobs'),
        actions: [
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
          if (jobs.isEmpty) {
            return const Center(child: Text('No assigned jobs found.'));
          }
          return ListView.builder(
            itemCount: jobs.length,
            itemBuilder: (context, index) {
              final job = jobs[index];
              return Card(
                margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                child: ListTile(
                  title: Text('Job ID: ${job.id.substring(0, 8)}...'),
                  subtitle: Text('Status: ${job.status}'),
                  trailing: const Icon(Icons.chevron_right),
                  onTap: () {
                    context.go('/jobs/${job.id}');
                  },
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
