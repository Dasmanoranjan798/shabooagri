import 'dart:io';
import 'package:drift/drift.dart';
import 'package:drift/native.dart';
import 'package:path_provider/path_provider.dart';
import 'package:path/path.dart' as p;
import 'tables.dart';

part 'database.g.dart';

@DriftDatabase(tables: [
  Bookings,
  Jobs,
  Machines,
  Drivers,
  Customers,
  SyncQueue,
  OutboxOps,
  HttpCache,
])
class AppDatabase extends _$AppDatabase {
  AppDatabase() : super(_openConnection());
  AppDatabase.forTesting(super.e);

  @override
  int get schemaVersion => 3;

  @override
  MigrationStrategy get migration => MigrationStrategy(
        onCreate: (m) => m.createAll(),
        onUpgrade: (m, from, to) async {
          // v2 adds the offline-first durable outbox + read cache. Purely
          // additive — existing mirror tables and their data are untouched.
          if (from < 2) {
            await m.createTable(outboxOps);
            await m.createTable(httpCache);
          }
          // v3 retires the standalone Village master: address (village/
          // district/…) is now an attribute of the Customer. Recreate the
          // affected cache tables with their new shape (villageId dropped) —
          // any unsynced offline writes live in the durable outbox, not these
          // display-cache tables, so nothing pending is lost; the next sync
          // pull repopulates them from the server.
          if (from < 3) {
            await m.alterTable(TableMigration(
              customers,
              newColumns: [customers.village, customers.district, customers.address],
            ));
            await m.alterTable(TableMigration(
              bookings,
              newColumns: [bookings.location],
            ));
            await m.deleteTable('villages');
          }
        },
      );
}

LazyDatabase _openConnection() {
  return LazyDatabase(() async {
    final dbFolder = await getApplicationDocumentsDirectory();
    final file = File(p.join(dbFolder.path, 'db.sqlite'));
    return NativeDatabase.createInBackground(file);
  });
}
