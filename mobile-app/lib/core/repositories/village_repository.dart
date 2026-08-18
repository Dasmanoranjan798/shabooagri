import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:drift/drift.dart';
import 'package:uuid/uuid.dart';
import '../database/database.dart';
import '../network/api_client.dart';
import '../providers/database_provider.dart';
import '../services/sync_service.dart';

final villageRepositoryProvider = Provider<VillageRepository>((ref) {
  final db = ref.watch(databaseProvider);
  final syncService = ref.watch(syncServiceProvider);
  final dio = ref.watch(apiClientProvider);
  return VillageRepository(db, syncService, dio);
});

class VillageRepository {
  final AppDatabase _db;
  final SyncService _syncService;
  final Dio _dio;

  VillageRepository(this._db, this._syncService, this._dio);

  Future<List<OfflineVillage>> getVillages() async {
    return await _db.select(_db.villages).get();
  }

  Future<void> refreshFromApi() async {
    try {
      final response = await _dio.get('/villages');
      final items = response.data as List<dynamic>;

      await _db.batch((batch) {
        for (final raw in items) {
          final json = raw as Map<String, dynamic>;
          batch.insert(
            _db.villages,
            VillagesCompanion.insert(
              id: json['id'] as String,
              companyId: json['companyId'] as String,
              name: json['name'] as String,
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

  Future<void> createVillageOffline(VillagesCompanion villageData) async {
    final villageId = const Uuid().v4();
    final newVillage = villageData.copyWith(
      id: Value(villageId),
      updatedAt: Value(DateTime.now()),
    );

    await _db.into(_db.villages).insert(newVillage);

    final payload = {
      'id': villageId,
      'companyId': newVillage.companyId.value,
      'name': newVillage.name.value,
    };

    await _syncService.enqueueSync('village', villageId, 'CREATE', payload);
  }
}
