import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:drift/drift.dart';
import 'package:uuid/uuid.dart';
import '../database/database.dart';
import '../providers/database_provider.dart';
import '../services/sync_service.dart';

final machineRepositoryProvider = Provider<MachineRepository>((ref) {
  final db = ref.watch(databaseProvider);
  final syncService = ref.watch(syncServiceProvider);
  return MachineRepository(db, syncService);
});

class MachineRepository {
  final AppDatabase _db;
  final SyncService _syncService;

  MachineRepository(this._db, this._syncService);

  Future<List<OfflineMachine>> getMachines() async {
    return await _db.select(_db.machines).get();
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
      'hourMeter': newMachine.hourMeter.value,
    };
    
    await _syncService.enqueueSync('machine', machineId, 'CREATE', payload);
  }
}
