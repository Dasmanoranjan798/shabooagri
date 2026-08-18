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
  TextColumn get pricingMethodId => text()();
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
  TextColumn get machineId => text()();
  TextColumn get driverId => text()();
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
  TextColumn get brand => text()();
  TextColumn get model => text()();
  TextColumn get status => text()(); // Working, Available, Repair, Offline
  RealColumn get hourMeter => real().nullable()();
  DateTimeColumn get updatedAt => dateTime().nullable()();

  @override
  Set<Column> get primaryKey => {id};
}

@DataClassName('OfflineDriver')
class Drivers extends Table {
  TextColumn get id => text()();
  TextColumn get companyId => text()();
  TextColumn get userId => text().nullable()();
  TextColumn get name => text()();
  TextColumn get mobileNumber => text()();
  TextColumn get status => text()();
  DateTimeColumn get updatedAt => dateTime().nullable()();

  @override
  Set<Column> get primaryKey => {id};
}

@DataClassName('OfflineCustomer')
class Customers extends Table {
  TextColumn get id => text()();
  TextColumn get companyId => text()();
  TextColumn get name => text()();
  TextColumn get mobileNumber => text()();
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
