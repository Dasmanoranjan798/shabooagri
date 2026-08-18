import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:drift/drift.dart';
import 'package:uuid/uuid.dart';
import '../database/database.dart';
import '../providers/database_provider.dart';
import '../services/sync_service.dart';

final jobRepositoryProvider = Provider<JobRepository>((ref) {
  final db = ref.watch(databaseProvider);
  final syncService = ref.watch(syncServiceProvider);
  return JobRepository(db, syncService);
});

class JobRepository {
  final AppDatabase _db;
  final SyncService _syncService;

  JobRepository(this._db, this._syncService);

  Future<List<OfflineJob>> getJobs() async {
    return await _db.select(_db.jobs).get();
  }

  Future<void> createJobOffline(JobsCompanion jobData) async {
    final jobId = const Uuid().v4();
    final newJob = jobData.copyWith(
      id: Value(jobId),
      isSynced: const Value(false),
      updatedAt: Value(DateTime.now()),
    );
    
    await _db.into(_db.jobs).insert(newJob);
    
    // Prepare payload for backend
    final payload = {
      'id': jobId,
      'companyId': newJob.companyId.value,
      'bookingId': newJob.bookingId.value,
      'machineId': newJob.machineId.value,
      'driverId': newJob.driverId.value,
      'status': newJob.status.value,
    };
    
    await _syncService.enqueueSync('job', jobId, 'CREATE', payload);
  }

  Future<void> updateJobStatusOffline(String jobId, String status, {DateTime? time}) async {
    await (_db.update(_db.jobs)..where((t) => t.id.equals(jobId))).write(
      JobsCompanion(
        status: Value(status),
        isSynced: const Value(false),
        updatedAt: Value(DateTime.now()),
        startTime: status == 'WORKING' ? Value(time ?? DateTime.now()) : const Value.absent(),
        endTime: status == 'COMPLETED' ? Value(time ?? DateTime.now()) : const Value.absent(),
      ),
    );

    // Depending on the API, map status to operations
    String operation;
    if (status == 'WORKING') {
      operation = 'JOB_ACTION_START';
    } else if (status == 'PAUSED') {
      operation = 'JOB_ACTION_PAUSE';
    } else if (status == 'COMPLETED') {
      operation = 'JOB_ACTION_COMPLETE';
    } else {
      operation = 'UPDATE';
    }
    
    final payload = {
      'status': status,
      'time': (time ?? DateTime.now()).toIso8601String(),
    };
    
    await _syncService.enqueueSync('job', jobId, operation, payload);
  }
}
