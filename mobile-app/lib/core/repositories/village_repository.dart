import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:drift/drift.dart';
import 'package:uuid/uuid.dart';
import '../database/database.dart';
import '../providers/database_provider.dart';
import '../services/sync_service.dart';

final villageRepositoryProvider = Provider<VillageRepository>((ref) {
  final db = ref.watch(databaseProvider);
  final syncService = ref.watch(syncServiceProvider);
  return VillageRepository(db, syncService);
});

class VillageRepository {
  final AppDatabase _db;
  final SyncService _syncService;

  VillageRepository(this._db, this._syncService);

  Future<List<OfflineVillage>> getVillages() async {
    return await _db.select(_db.villages).get();
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
