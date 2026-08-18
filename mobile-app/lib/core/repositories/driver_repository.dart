import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:drift/drift.dart';
import 'package:uuid/uuid.dart';
import '../database/database.dart';
import '../providers/database_provider.dart';
import '../services/sync_service.dart';

final driverRepositoryProvider = Provider<DriverRepository>((ref) {
  final db = ref.watch(databaseProvider);
  final syncService = ref.watch(syncServiceProvider);
  return DriverRepository(db, syncService);
});

class DriverRepository {
  final AppDatabase _db;
  final SyncService _syncService;

  DriverRepository(this._db, this._syncService);

  Future<List<OfflineDriver>> getDrivers() async {
    return await _db.select(_db.drivers).get();
  }

  Future<void> createDriverOffline(DriversCompanion driverData) async {
    final driverId = const Uuid().v4();
    final newDriver = driverData.copyWith(
      id: Value(driverId),
      updatedAt: Value(DateTime.now()),
    );
    
    await _db.into(_db.drivers).insert(newDriver);
    
    final payload = {
      'id': driverId,
      'companyId': newDriver.companyId.value,
      'userId': newDriver.userId.value,
      'name': newDriver.name.value,
      'mobileNumber': newDriver.mobileNumber.value,
      'status': newDriver.status.value,
    };
    
    await _syncService.enqueueSync('driver', driverId, 'CREATE', payload);
  }
}
