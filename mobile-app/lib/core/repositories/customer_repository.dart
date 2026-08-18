import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:drift/drift.dart';
import 'package:uuid/uuid.dart';
import '../database/database.dart';
import '../network/api_client.dart';
import '../providers/database_provider.dart';
import '../services/sync_service.dart';

final customerRepositoryProvider = Provider<CustomerRepository>((ref) {
  final db = ref.watch(databaseProvider);
  final syncService = ref.watch(syncServiceProvider);
  final dio = ref.watch(apiClientProvider);
  return CustomerRepository(db, syncService, dio);
});

class CustomerRepository {
  final AppDatabase _db;
  final SyncService _syncService;
  final Dio _dio;

  CustomerRepository(this._db, this._syncService, this._dio);

  Future<List<OfflineCustomer>> getCustomers() async {
    return await _db.select(_db.customers).get();
  }

  Future<void> refreshFromApi() async {
    try {
      final response = await _dio.get('/customers');
      final items = response.data as List<dynamic>;

      await _db.batch((batch) {
        for (final raw in items) {
          final json = raw as Map<String, dynamic>;
          batch.insert(
            _db.customers,
            CustomersCompanion.insert(
              id: json['id'] as String,
              companyId: json['companyId'] as String,
              name: json['name'] as String,
              mobileNumber: Value(json['phone'] as String?),
              villageId: json['villageId'] as String,
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

  Future<void> createCustomerOffline(CustomersCompanion customerData) async {
    final customerId = const Uuid().v4();
    final newCustomer = customerData.copyWith(
      id: Value(customerId),
      updatedAt: Value(DateTime.now()),
    );

    await _db.into(_db.customers).insert(newCustomer);

    final payload = {
      'id': customerId,
      'companyId': newCustomer.companyId.value,
      'name': newCustomer.name.value,
      'phone': newCustomer.mobileNumber.value,
      'villageId': newCustomer.villageId.value,
    };

    await _syncService.enqueueSync('customer', customerId, 'CREATE', payload);
  }
}
