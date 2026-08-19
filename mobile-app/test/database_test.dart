import 'package:drift/drift.dart';
import 'package:drift/native.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shabooagri_mobile/core/database/database.dart';

void main() {
  late AppDatabase db;

  setUp(() {
    db = AppDatabase.forTesting(NativeDatabase.memory());
  });

  tearDown(() async {
    await db.close();
  });

  test('Machines table can be written to and read from', () async {
    final machineId = '123e4567-e89b-12d3-a456-426614174000';
    await db.into(db.machines).insert(OfflineMachine(
      id: machineId,
      companyId: 'company-1',
      registrationNumber: 'TEST-123',
      status: 'AVAILABLE',
      hourMeter: 100.0,
      brand: 'KUBOTA',
      model: 'D113',
    ));

    final machines = await db.select(db.machines).get();
    expect(machines.length, 1);
    expect(machines.first.registrationNumber, 'TEST-123');
  });

  test('SyncQueue can queue items', () async {
    await db.into(db.syncQueue).insert(OfflineSyncQueue(
      id: 1,
      entityType: 'job',
      entityId: 'job-1',
      operation: 'create',
      payloadJson: '{"some":"data"}',
      retryCount: 0,
      createdAt: DateTime.now(),
    ));

    final queue = await db.select(db.syncQueue).get();
    expect(queue.length, 1);
    expect(queue.first.operation, 'create');
  });
}
