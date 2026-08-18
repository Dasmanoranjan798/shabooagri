import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:drift/drift.dart';
import 'package:uuid/uuid.dart';
import '../database/database.dart';
import '../providers/database_provider.dart';
import '../services/sync_service.dart';

final bookingRepositoryProvider = Provider<BookingRepository>((ref) {
  final db = ref.watch(databaseProvider);
  final syncService = ref.watch(syncServiceProvider);
  return BookingRepository(db, syncService);
});

class BookingRepository {
  final AppDatabase _db;
  final SyncService _syncService;

  BookingRepository(this._db, this._syncService);

  Future<List<OfflineBooking>> getBookings() async {
    return await _db.select(_db.bookings).get();
  }

  Future<void> createBookingOffline(BookingsCompanion bookingData) async {
    final bookingId = const Uuid().v4();
    final newBooking = bookingData.copyWith(
      id: Value(bookingId),
      isSynced: const Value(false),
      updatedAt: Value(DateTime.now()),
    );
    
    await _db.into(_db.bookings).insert(newBooking);
    
    final payload = {
      'id': bookingId,
      'companyId': newBooking.companyId.value,
      'bookingNumber': newBooking.bookingNumber.value,
      'customerId': newBooking.customerId.value,
      'villageId': newBooking.villageId.value,
      'machineId': newBooking.machineId.value,
      'driverId': newBooking.driverId.value,
      'scheduledDate': newBooking.scheduledDate.value?.toIso8601String(),
      'estimatedHours': newBooking.estimatedHours.value,
      'estimatedAcres': newBooking.estimatedAcres.value,
      'pricingMethodId': newBooking.pricingMethodId.value,
      'status': newBooking.status.value,
      'notes': newBooking.notes.value,
    };
    
    await _syncService.enqueueSync('booking', bookingId, 'CREATE', payload);
  }

  Future<void> updateBookingStatusOffline(String bookingId, String status) async {
    await (_db.update(_db.bookings)..where((t) => t.id.equals(bookingId))).write(
      BookingsCompanion(
        status: Value(status),
        isSynced: const Value(false),
        updatedAt: Value(DateTime.now()),
      ),
    );
    
    final payload = {
      'status': status,
    };
    
    await _syncService.enqueueSync('booking', bookingId, 'UPDATE', payload);
  }
}
