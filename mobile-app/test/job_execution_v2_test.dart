// Pass 2 client-model tests for Job Execution V2 — verifies the read-only
// parsing and the final-breakdown math the UI relies on. Business rules and
// the authoritative transport total are the backend's (Pass 1); here we only
// confirm the client reads them faithfully and never recomputes work pricing.
import 'package:flutter_test/flutter_test.dart';
import 'package:shabooagri_mobile/features/jobs/data/job_execution_models.dart';
import 'package:shabooagri_mobile/features/jobs/data/job_detail.dart';
import 'package:shabooagri_mobile/features/jobs/presentation/job_detail_screen.dart';

void main() {
  group('JobWorkSession.fromJson', () {
    test('parses embedded machine/driver names + duration', () {
      final s = JobWorkSession.fromJson({
        'id': 's1',
        'machineId': 'm1',
        'driverId': 'd1',
        'startedAt': '2026-09-02T09:00:00.000Z',
        'endedAt': '2026-09-02T10:30:00.000Z',
        'durationSec': 5400,
        'machine': {'id': 'm1', 'registrationNumber': 'KA-05-AG-1234'},
        'driver': {'id': 'd1', 'employee': {'id': 'e1', 'name': 'Ranjan Das'}},
      });
      expect(s.machineRegistration, 'KA-05-AG-1234');
      expect(s.driverName, 'Ranjan Das');
      expect(s.durationSec, 5400);
      expect(s.endedAt, isNotNull);
    });

    test('open session (no endedAt) parses as null', () {
      final s = JobWorkSession.fromJson({
        'id': 's2', 'machineId': 'm1', 'driverId': 'd1',
        'startedAt': '2026-09-02T11:00:00.000Z', 'endedAt': null, 'durationSec': null,
      });
      expect(s.endedAt, isNull);
      expect(s.durationSec, isNull);
    });
  });

  group('JobAssignmentChange.fromJson', () {
    test('parses MACHINE change old/new + reason', () {
      final c = JobAssignmentChange.fromJson({
        'id': 'c1', 'field': 'MACHINE',
        'oldMachineId': 'm1', 'newMachineId': 'm2',
        'oldDriverId': null, 'newDriverId': null,
        'reason': 'Machine breakdown', 'changedAt': '2026-09-02T12:15:00.000Z',
      });
      expect(c.field, 'MACHINE');
      expect(c.oldMachineId, 'm1');
      expect(c.newMachineId, 'm2');
      expect(c.reason, 'Machine breakdown');
    });
  });

  group('JobTransportCharge + JobHistory total', () {
    test('parses server-computed total; JobHistory sums charges', () {
      final c1 = JobTransportCharge.fromJson({
        'id': 't1', 'transportTypeId': 'tt1', 'transportTypeName': 'Tractor',
        'trips': 2, 'ratePerTrip': '1000', 'totalAmount': '2000',
      });
      final c2 = JobTransportCharge.fromJson({
        'id': 't2', 'transportTypeId': 'tt2', 'transportTypeName': 'Pickup',
        'trips': 1, 'ratePerTrip': '500', 'totalAmount': '500',
      });
      expect(c1.totalAmount, 2000);
      expect(c1.transportTypeName, 'Tractor');
      final history = JobHistory(const [], const [], [c1, c2]);
      // Client SUMS the authoritative per-charge totals — it never recomputes.
      expect(history.transportTotal, 2500);
    });
  });

  group('Final breakdown math (work + transport, work calc untouched)', () {
    JobDetail hourJob({required double actualHours, required double rate}) => JobDetail(
          id: 'j', bookingId: 'b', status: 'COMPLETED',
          startTime: null, endTime: null, totalPausedDurationSec: 0,
          actualHours: actualHours, completedAcres: null, fuelUsedLitres: null, notes: null,
          bookingNumber: 'BK-1', scheduledDate: null, customerName: 'C', villageName: 'V', location: null,
          rate: rate, minimumCharge: null, pricingUnit: 'hour', pricingLabel: 'Per Hour',
          machineId: 'm', driverId: 'd', machineRegistration: 'KA-05-AG-1234', driverName: 'Ranjan',
        );

    test('work amount uses the existing unchanged formula (rate × hours)', () {
      final job = hourJob(actualHours: 2.5, rate: 500);
      expect(job.finalAmount, 1250); // unchanged: 2.5h × ₹500
    });

    test('grand total = work + transportation', () {
      final job = hourJob(actualHours: 3, rate: 500); // work = ₹1500
      final history = JobHistory(const [], const [], [
        JobTransportCharge(id: 't', transportTypeId: 'tt', transportTypeName: 'Tractor', trips: 2, ratePerTrip: 1000, totalAmount: 2000),
      ]);
      final grand = job.finalAmount! + history.transportTotal;
      expect(job.finalAmount, 1500); // work untouched
      expect(history.transportTotal, 2000); // transport separate
      expect(grand, 3500); // work + transport
    });
  });
}
