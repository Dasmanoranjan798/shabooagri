import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:drift/drift.dart';
import 'package:uuid/uuid.dart';
import '../database/database.dart';
import '../network/api_client.dart';
import '../providers/database_provider.dart';
import '../services/sync_service.dart';

final driverRepositoryProvider = Provider<DriverRepository>((ref) {
  final db = ref.watch(databaseProvider);
  final syncService = ref.watch(syncServiceProvider);
  final dio = ref.watch(apiClientProvider);
  return DriverRepository(db, syncService, dio);
});

class DriverRepository {
  final AppDatabase _db;
  final SyncService _syncService;
  final Dio _dio;

  DriverRepository(this._db, this._syncService, this._dio);

  Future<List<OfflineDriver>> getDrivers() async {
    return await _db.select(_db.drivers).get();
  }

  /// Pulls `GET /drivers` and upserts into the local table. A Driver's
  /// name/phone live on its nested `employee` object on the backend, not
  /// directly on the Driver record — denormalized here for simple reads.
  Future<void> refreshFromApi() async {
    try {
      final response = await _dio.get('/drivers');
      final items = response.data as List<dynamic>;

      await _db.batch((batch) {
        for (final raw in items) {
          final json = raw as Map<String, dynamic>;
          final employee = json['employee'] as Map<String, dynamic>? ?? const {};
          batch.insert(
            _db.drivers,
            DriversCompanion.insert(
              id: json['id'] as String,
              companyId: json['companyId'] as String,
              employeeId: json['employeeId'] as String,
              name: employee['name'] as String? ?? 'Unknown',
              mobileNumber: Value(employee['phone'] as String?),
              availabilityStatus: json['availabilityStatus'] as String,
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
      'employeeId': newDriver.employeeId.value,
      'availabilityStatus': newDriver.availabilityStatus.value,
    };

    await _syncService.enqueueSync('driver', driverId, 'CREATE', payload);
  }
}
