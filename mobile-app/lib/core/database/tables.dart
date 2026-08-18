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
