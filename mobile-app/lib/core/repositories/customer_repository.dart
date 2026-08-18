import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:drift/drift.dart';
import 'package:uuid/uuid.dart';
import '../database/database.dart';
import '../providers/database_provider.dart';
import '../services/sync_service.dart';

final customerRepositoryProvider = Provider<CustomerRepository>((ref) {
  final db = ref.watch(databaseProvider);
  final syncService = ref.watch(syncServiceProvider);
  return CustomerRepository(db, syncService);
});

class CustomerRepository {
  final AppDatabase _db;
  final SyncService _syncService;

  CustomerRepository(this._db, this._syncService);

  Future<List<OfflineCustomer>> getCustomers() async {
    return await _db.select(_db.customers).get();
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
      'mobileNumber': newCustomer.mobileNumber.value,
      'villageId': newCustomer.villageId.value,
    };
    
    await _syncService.enqueueSync('customer', customerId, 'CREATE', payload);
  }
}
