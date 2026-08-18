import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:drift/drift.dart';
import 'package:uuid/uuid.dart';
import '../database/database.dart';
import '../network/api_client.dart';
import '../providers/database_provider.dart';
import '../services/sync_service.dart';

final bookingRepositoryProvider = Provider<BookingRepository>((ref) {
  final db = ref.watch(databaseProvider);
  final syncService = ref.watch(syncServiceProvider);
  final dio = ref.watch(apiClientProvider);
  return BookingRepository(db, syncService, dio);
});

class BookingRepository {
  final AppDatabase _db;
  final SyncService _syncService;
  final Dio _dio;

  BookingRepository(this._db, this._syncService, this._dio);

  Future<List<OfflineBooking>> getBookings() async {
    return await _db.select(_db.bookings).get();
  }

  /// Pulls `GET /bookings` (scoped server-side: company-wide for
  /// Owner/Manager) and upserts into the local table.
  Future<void> refreshFromApi() async {
    try {
      final response = await _dio.get('/bookings');
      final items = response.data as List<dynamic>;

      await _db.batch((batch) {
        for (final raw in items) {
          final json = raw as Map<String, dynamic>;
          batch.insert(
            _db.bookings,
            BookingsCompanion.insert(
              id: json['id'] as String,
              companyId: json['companyId'] as String,
              bookingNumber: json['bookingNumber'] as String,
              customerId: json['customerId'] as String,
              villageId: json['villageId'] as String,
              machineId: Value(json['machineId'] as String?),
              driverId: Value(json['driverId'] as String?),
              scheduledDate: Value(_parseDate(json['scheduledDate'])),
              estimatedHours: Value(_parseDouble(json['estimatedHours'])),
              estimatedAcres: Value(_parseDouble(json['estimatedAcres'])),
              pricingMethodId: Value(json['pricingMethodId'] as String?),
              status: json['status'] as String,
              notes: Value(json['workDescription'] as String?),
              isSynced: const Value(true),
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

  DateTime? _parseDate(dynamic value) => value == null ? null : DateTime.parse(value as String);

  double? _parseDouble(dynamic value) =>
      value == null ? null : (value is num ? value.toDouble() : double.tryParse(value.toString()));

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
