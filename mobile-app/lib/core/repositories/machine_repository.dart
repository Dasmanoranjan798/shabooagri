import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:drift/drift.dart';
import 'package:uuid/uuid.dart';
import '../database/database.dart';
import '../network/api_client.dart';
import '../providers/database_provider.dart';
import '../services/sync_service.dart';

final machineRepositoryProvider = Provider<MachineRepository>((ref) {
  final db = ref.watch(databaseProvider);
  final syncService = ref.watch(syncServiceProvider);
  final dio = ref.watch(apiClientProvider);
  return MachineRepository(db, syncService, dio);
});

class MachineRepository {
  final AppDatabase _db;
  final SyncService _syncService;
  final Dio _dio;

  MachineRepository(this._db, this._syncService, this._dio);

  Future<List<OfflineMachine>> getMachines() async {
    return await _db.select(_db.machines).get();
  }

  /// Pulls `GET /machines` (company-wide, scoped server-side to
  /// Owner/Manager via `operations.view`) and upserts into the local table.
  Future<void> refreshFromApi() async {
    try {
      final response = await _dio.get('/machines');
      final items = response.data as List<dynamic>;

      await _db.batch((batch) {
        for (final raw in items) {
          final json = raw as Map<String, dynamic>;
          batch.insert(
            _db.machines,
            MachinesCompanion.insert(
              id: json['id'] as String,
              companyId: json['companyId'] as String,
              registrationNumber: json['registrationNumber'] as String,
              brand: Value(json['brand'] as String?),
              model: Value(json['model'] as String?),
              status: json['status'] as String,
              hourMeter: Value((json['hourMeterReading'] != null ? double.tryParse(json['hourMeterReading'].toString()) : null)),
              updatedAt: Value(DateTime.now()),
            ),
            mode: InsertMode.insertOrReplace,
          );
        }
      });
    } on DioException {
      // Offline or server error — keep showing the last locally synced data.
    }
  }

  Future<void> createMachineOffline(MachinesCompanion machineData) async {
    final machineId = const Uuid().v4();
    final newMachine = machineData.copyWith(
      id: Value(machineId),
      updatedAt: Value(DateTime.now()),
    );

    await _db.into(_db.machines).insert(newMachine);

    final payload = {
      'id': machineId,
      'companyId': newMachine.companyId.value,
      'registrationNumber': newMachine.registrationNumber.value,
      'brand': newMachine.brand.value,
      'model': newMachine.model.value,
      'status': newMachine.status.value,
      'hourMeterReading': newMachine.hourMeter.value,
    };

    await _syncService.enqueueSync('machine', machineId, 'CREATE', payload);
  }
}
