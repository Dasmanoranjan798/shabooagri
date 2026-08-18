import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:drift/drift.dart';
import 'package:uuid/uuid.dart';
import '../database/database.dart';
import '../network/api_client.dart';
import '../providers/database_provider.dart';
import '../services/sync_service.dart';

final jobRepositoryProvider = Provider<JobRepository>((ref) {
  final db = ref.watch(databaseProvider);
  final syncService = ref.watch(syncServiceProvider);
  final dio = ref.watch(apiClientProvider);
  return JobRepository(db, syncService, dio);
});

class JobRepository {
  final AppDatabase _db;
  final SyncService _syncService;
  final Dio _dio;

  JobRepository(this._db, this._syncService, this._dio);

  Future<List<OfflineJob>> getJobs() async {
    return await _db.select(_db.jobs).get();
  }

  /// Pulls this user's jobs from the real backend (`GET /jobs`, already
  /// scoped server-side to the caller's role — company-wide for
  /// Owner/Manager, own assigned jobs only for Driver) and upserts them
  /// into the local Drift table. Without this, the offline-first read path
  /// only ever shows an empty local table, since nothing populated it.
  /// Silently no-ops when offline — the screen just keeps showing whatever
  /// was last synced.
  Future<void> refreshFromApi() async {
    try {
      final response = await _dio.get('/jobs');
      final jobsJson = response.data as List<dynamic>;

      await _db.batch((batch) {
        for (final raw in jobsJson) {
          final json = raw as Map<String, dynamic>;
          batch.insert(
            _db.jobs,
            JobsCompanion.insert(
              id: json['id'] as String,
              companyId: json['companyId'] as String,
              bookingId: json['bookingId'] as String,
              machineId: Value(json['machineId'] as String?),
              driverId: Value(json['driverId'] as String?),
              startTime: Value(_parseDate(json['startTime'])),
              endTime: Value(_parseDate(json['endTime'])),
              totalPausedDurationSec: Value(json['totalPausedDurationSec'] as int? ?? 0),
              actualHours: Value(_parseDouble(json['actualHours'])),
              completedAcres: Value(_parseDouble(json['completedAcres'])),
              fuelUsedLitres: Value(_parseDouble(json['fuelUsedLitres'])),
              status: json['status'] as String,
              isSynced: const Value(true),
              updatedAt: Value(_parseDate(json['updatedAt']) ?? DateTime.now()),
            ),
            mode: InsertMode.insertOrReplace,
          );
        }
      });
    } on DioException {
      // Offline or server error — keep showing the last locally synced data.
    }
  }

  DateTime? _parseDate(dynamic value) => value == null ? null : DateTime.parse(value as String);

  double? _parseDouble(dynamic value) =>
      value == null ? null : (value is num ? value.toDouble() : double.tryParse(value.toString()));

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
}
