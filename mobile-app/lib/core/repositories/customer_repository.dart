import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:drift/drift.dart';
import '../database/database.dart';
import '../network/api_client.dart';
import '../providers/database_provider.dart';

final customerRepositoryProvider = Provider<CustomerRepository>((ref) {
  final db = ref.watch(databaseProvider);
  final dio = ref.watch(apiClientProvider);
  return CustomerRepository(db, dio);
});

/// Local-first read for customers. Offline writes go through the shared offline
/// interceptor + durable outbox (the single sync engine).
class CustomerRepository {
  final AppDatabase _db;
  final Dio _dio;

  CustomerRepository(this._db, this._dio);

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
              village: Value(json['village'] as String?),
              district: Value(json['district'] as String?),
              address: Value(json['address'] as String?),
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

}
