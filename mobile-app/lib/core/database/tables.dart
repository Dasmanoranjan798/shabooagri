import 'package:drift/drift.dart';

@DataClassName('OfflineBooking')
class Bookings extends Table {
  TextColumn get id => text()();
  TextColumn get companyId => text()();
  TextColumn get bookingNumber => text()();
  TextColumn get customerId => text()();
  TextColumn get villageId => text()();
  TextColumn get machineId => text().nullable()();
  TextColumn get driverId => text().nullable()();
  DateTimeColumn get scheduledDate => dateTime().nullable()();
  RealColumn get estimatedHours => real().nullable()();
  RealColumn get estimatedAcres => real().nullable()();
  // Nullable — pricing is assigned on the Live Job screen right before
  // Start, not at booking time, so it's null on every fresh booking.
  TextColumn get pricingMethodId => text().nullable()();
  TextColumn get status => text()(); // PENDING, ACCEPTED, ON_THE_WAY, WORKING, COMPLETED, CANCELLED
  TextColumn get notes => text().nullable()();
  BoolColumn get isSynced => boolean().withDefault(const Constant(true))();
  DateTimeColumn get updatedAt => dateTime().nullable()();
  
  @override
  Set<Column> get primaryKey => {id};
}

@DataClassName('OfflineJob')
class Jobs extends Table {
  TextColumn get id => text()();
  TextColumn get companyId => text()();
  TextColumn get bookingId => text()();
  // Nullable to match the backend's Job-Card rework: a job exists as soon
  // as its booking is saved, before a machine/driver may be assigned yet.
  TextColumn get machineId => text().nullable()();
  TextColumn get driverId => text().nullable()();
  DateTimeColumn get startTime => dateTime().nullable()();
  DateTimeColumn get endTime => dateTime().nullable()();
  IntColumn get totalPausedDurationSec => integer().withDefault(const Constant(0))();
  RealColumn get actualHours => real().nullable()();
  RealColumn get completedAcres => real().nullable()();
  RealColumn get fuelUsedLitres => real().nullable()();
  TextColumn get status => text()(); // NOT_STARTED, WORKING, PAUSED, COMPLETED
  BoolColumn get isSynced => boolean().withDefault(const Constant(true))();
  DateTimeColumn get updatedAt => dateTime().nullable()();

  @override
  Set<Column> get primaryKey => {id};
}

@DataClassName('OfflineMachine')
class Machines extends Table {
  TextColumn get id => text()();
  TextColumn get companyId => text()();
  TextColumn get registrationNumber => text()();
  // Nullable — the real backend Machine.brand/model are optional fields.
  TextColumn get brand => text().nullable()();
  TextColumn get model => text().nullable()();
  TextColumn get status => text()(); // AVAILABLE, WORKING, MAINTENANCE, ...
  // Maps from the backend's `hourMeterReading` field.
  RealColumn get hourMeter => real().nullable()();
  DateTimeColumn get updatedAt => dateTime().nullable()();

  @override
  Set<Column> get primaryKey => {id};
}

@DataClassName('OfflineDriver')
class Drivers extends Table {
  TextColumn get id => text()();
  TextColumn get companyId => text()();
  // A Driver doesn't carry name/phone directly on the backend — those live
  // on its linked Employee record (`driver.employee.name`/`.phone`), so
  // this table denormalizes them at sync time for simple offline reads.
  TextColumn get employeeId => text()();
  TextColumn get name => text()();
  TextColumn get mobileNumber => text().nullable()();
  TextColumn get availabilityStatus => text()(); // AVAILABLE, ON_DUTY, OFF_DUTY, ...
  DateTimeColumn get updatedAt => dateTime().nullable()();

  @override
  Set<Column> get primaryKey => {id};
}

@DataClassName('OfflineCustomer')
class Customers extends Table {
  TextColumn get id => text()();
  TextColumn get companyId => text()();
  TextColumn get name => text()();
  // Maps from the backend's `phone` field.
  TextColumn get mobileNumber => text().nullable()();
  TextColumn get villageId => text()();
  DateTimeColumn get updatedAt => dateTime().nullable()();

  @override
  Set<Column> get primaryKey => {id};
}

@DataClassName('OfflineVillage')
class Villages extends Table {
  TextColumn get id => text()();
  TextColumn get companyId => text()();
  TextColumn get name => text()();
  DateTimeColumn get updatedAt => dateTime().nullable()();

  @override
  Set<Column> get primaryKey => {id};
}

@DataClassName('OfflineSyncQueue')
class SyncQueue extends Table {
  IntColumn get id => integer().autoIncrement()();
  TextColumn get entityType => text()(); // 'booking', 'job', 'fuel_entry', etc.
  TextColumn get entityId => text()();
  TextColumn get operation => text()(); // 'CREATE', 'UPDATE', 'DELETE'
  TextColumn get payloadJson => text()();
  IntColumn get retryCount => integer().withDefault(const Constant(0))();
  DateTimeColumn get createdAt => dateTime().withDefault(currentDateAndTime)();
}

/// The durable outbox for offline-first writes. Every mutation made while
/// offline is captured here as the exact HTTP request to replay, and drained
/// FIFO when connectivity returns. Rows survive app close/restart (this is a
/// real SQLite table, never an in-memory queue), so a pending transaction is
/// never lost. The `idempotencyKey` is sent as the `Idempotency-Key` header on
/// every replay, so a retry after a lost acknowledgement can never create a
/// duplicate record or a double payment (the backend dedupes on it).
///
/// `status`: `pending` (awaiting/eligible for sync) or `failed` (permanently
/// rejected by the server — a dead-letter surfaced to the user, never silently
/// dropped). `nextAttemptAt` implements exponential backoff between retries.
@DataClassName('OutboxOp')
class OutboxOps extends Table {
  // Auto-increment id doubles as the FIFO sequence — earlier ops sync first,
  // so a create is sent before an edit that depends on it.
  IntColumn get id => integer().autoIncrement()();
  TextColumn get idempotencyKey => text()();
  TextColumn get method => text()(); // POST | PATCH | PUT | DELETE
  TextColumn get path => text()(); // e.g. /payments, /jobs/abc/start
  TextColumn get bodyJson => text().nullable()();
  // Entity topics this op affects (comma-separated SyncEntity names), so the
  // real-time bus can refresh the right screens after the op syncs.
  TextColumn get entities => text().nullable()();
  // Human label for the pending/failed list, e.g. "Record payment".
  TextColumn get label => text().nullable()();
  TextColumn get status => text().withDefault(const Constant('pending'))();
  IntColumn get retryCount => integer().withDefault(const Constant(0))();
  DateTimeColumn get nextAttemptAt => dateTime().nullable()();
  TextColumn get lastError => text().nullable()();
  DateTimeColumn get createdAt => dateTime().withDefault(currentDateAndTime)();
}

/// Offline read cache: the body of every successful GET, keyed by full path
/// (including query string). When a GET fails because the device is offline,
/// the interceptor serves the last cached body so lists and detail screens keep
/// working with the most recent data instead of showing a network error.
@DataClassName('CachedResponse')
class HttpCache extends Table {
  TextColumn get path => text()(); // full request path incl. query
  TextColumn get bodyJson => text()();
  DateTimeColumn get updatedAt => dateTime().withDefault(currentDateAndTime)();

  @override
  Set<Column> get primaryKey => {path};
}
