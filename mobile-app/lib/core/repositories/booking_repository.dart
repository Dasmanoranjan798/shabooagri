import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:drift/drift.dart';
import '../database/database.dart';
import '../network/api_client.dart';
import '../providers/database_provider.dart';

final bookingRepositoryProvider = Provider<BookingRepository>((ref) {
  final db = ref.watch(databaseProvider);
  final dio = ref.watch(apiClientProvider);
  return BookingRepository(db, dio);
});

/// Local-first read for bookings: [getBookings] reads SQLite so the list works
/// offline; [refreshFromApi] pulls authoritative data into SQLite when online.
/// Offline *writes* go through the shared offline interceptor + durable outbox
/// (see `core/sync/`), which is the single sync engine — this repository no
/// longer maintains its own queue.
class BookingRepository {
  final AppDatabase _db;
  final Dio _dio;

  BookingRepository(this._db, this._dio);

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
}
