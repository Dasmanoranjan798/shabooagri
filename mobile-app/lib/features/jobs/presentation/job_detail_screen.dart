import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../core/repositories/job_repository.dart';
import '../../../core/database/database.dart';
import 'job_list_screen.dart';

final jobDetailProvider = FutureProvider.family<OfflineJob, String>((ref, id) async {
  final jobs = await ref.watch(jobsListProvider.future);
  return jobs.firstWhere((job) => job.id == id);
});

class JobDetailScreen extends ConsumerWidget {
  final String jobId;

  const JobDetailScreen({super.key, required this.jobId});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final jobAsync = ref.watch(jobDetailProvider(jobId));

    return Scaffold(
      appBar: AppBar(
        title: const Text('Job Details'),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => context.go('/jobs'),
        ),
      ),
      body: jobAsync.when(
        data: (job) {
          return Padding(
            padding: const EdgeInsets.all(16.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                _buildInfoRow('Job ID', job.id),
                _buildInfoRow('Booking ID', job.bookingId),
                _buildInfoRow('Status', job.status),
                _buildInfoRow('Synced to Cloud', job.isSynced ? 'Yes' : 'No'),
                
                const Spacer(),
                
                // State machine buttons based on current status
                if (job.status == 'NOT_STARTED')
                  _buildActionButton(context, ref, 'START JOB', 'WORKING', Colors.green),
                
                if (job.status == 'WORKING') ...[
                  _buildActionButton(context, ref, 'PAUSE JOB', 'PAUSED', Colors.orange),
                  const SizedBox(height: 16),
                  _buildActionButton(context, ref, 'STOP & SUBMIT', 'COMPLETED', Colors.red),
                ],
                
                if (job.status == 'PAUSED')
                  _buildActionButton(context, ref, 'RESUME JOB', 'WORKING', Colors.green),
                
                if (job.status == 'COMPLETED')
                  const Center(
                    child: Text('Job Completed & Submitted', 
                      style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.blue)),
                  ),
                  
                const SizedBox(height: 24),
              ],
            ),
          );
        },
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, stack) => Center(child: Text('Error: $error')),
      ),
    );
  }

  Widget _buildInfoRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8.0),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: const TextStyle(color: Colors.grey, fontSize: 16)),
          Flexible(child: Text(value, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16), textAlign: TextAlign.right)),
        ],
      ),
    );
  }

  Widget _buildActionButton(BuildContext context, WidgetRef ref, String label, String nextStatus, Color color) {
    return ElevatedButton(
      style: ElevatedButton.styleFrom(
        backgroundColor: color,
        padding: const EdgeInsets.symmetric(vertical: 16),
      ),
      onPressed: () async {
        try {
          await ref.read(jobRepositoryProvider).updateJobStatusOffline(jobId, nextStatus);
          ref.invalidate(jobsListProvider);
          ref.invalidate(jobDetailProvider(jobId));
          if (!context.mounted) return;
          ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Status updated to $nextStatus')));
        } catch (e) {
          if (!context.mounted) return;
          ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Failed to update status')));
        }
      },
      child: Text(label, style: const TextStyle(fontSize: 16, color: Colors.white)),
    );
  }
}
