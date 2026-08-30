import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shabooagri_mobile/core/sync/data_sync.dart';

void main() {
  group('entitiesForPath', () {
    test('maps simple and id paths to the entity', () {
      expect(entitiesForPath('/bookings'), {SyncEntity.booking});
      expect(entitiesForPath('/bookings/abc-123'), {SyncEntity.booking});
      expect(entitiesForPath('/machine-types'), {SyncEntity.machine});
      expect(entitiesForPath('/jobs/1/start'), {SyncEntity.job});
    });

    test('nested payment-under-invoice path marks BOTH entities', () {
      expect(
        entitiesForPath('/invoices/inv-1/payments'),
        {SyncEntity.invoice, SyncEntity.payment},
      );
    });

    test('unrecognized paths map to nothing', () {
      expect(entitiesForPath('/auth/login'), isEmpty);
      expect(entitiesForPath('/dashboard/summary'), isEmpty);
    });
  });

  group('DataSync.bump', () {
    test('booking bump cascades to job and always to dashboard+report', () {
      final ds = DataSync();
      ds.bump({SyncEntity.booking});
      expect(ds.state[SyncEntity.booking], 1);
      expect(ds.state[SyncEntity.job], 1, reason: 'cascade');
      expect(ds.state[SyncEntity.dashboard], 1);
      expect(ds.state[SyncEntity.report], 1);
      expect(ds.state[SyncEntity.customer], 0, reason: 'untouched entity stays put');
    });

    test('payment bump reaches invoice, customer, dashboard, report', () {
      final ds = DataSync();
      ds.bump({SyncEntity.payment});
      expect(ds.state[SyncEntity.payment], 1);
      expect(ds.state[SyncEntity.invoice], 1);
      expect(ds.state[SyncEntity.customer], 1);
      expect(ds.state[SyncEntity.dashboard], 1);
      expect(ds.state[SyncEntity.report], 1);
    });

    test('empty bump is a no-op (no phantom refresh)', () {
      final ds = DataSync();
      ds.bump({});
      expect(ds.state.values.every((v) => v == 0), isTrue);
    });

    test('bumpPath on an unmapped write still refreshes the aggregates', () {
      final ds = DataSync();
      ds.bumpPath('/auth/login');
      expect(ds.state[SyncEntity.dashboard], 1);
      expect(ds.state[SyncEntity.booking], 0);
    });

    test('bumpPath on a real mutation path bumps the right entity + cascade', () {
      final ds = DataSync();
      ds.bumpPath('/invoices/inv-1/payments');
      expect(ds.state[SyncEntity.payment], 1);
      expect(ds.state[SyncEntity.invoice], 1);
      expect(ds.state[SyncEntity.customer], 1);
    });
  });

  group('read side: a provider watching syncOn refetches on related bumps only', () {
    test('related bump refetches, unrelated bump does not', () async {
      var fetches = 0;
      final probe = FutureProvider<int>((ref) async {
        syncOn(ref, {SyncEntity.booking});
        fetches += 1;
        return fetches;
      });
      final container = ProviderContainer();
      addTearDown(container.dispose);

      // Keep the provider alive so dependency changes trigger a rebuild.
      final sub = container.listen(probe, (_, __) {});
      addTearDown(sub.close);

      await container.read(probe.future);
      expect(fetches, 1);

      // A customer change (also bumps dashboard/report, but NOT booking) must
      // not refetch a booking-only screen.
      container.read(dataSyncProvider.notifier).bump({SyncEntity.customer});
      await Future<void>.delayed(Duration.zero);
      await container.read(probe.future);
      expect(fetches, 1, reason: 'unrelated entity change must not refetch');

      // A booking change must refetch.
      container.read(dataSyncProvider.notifier).bump({SyncEntity.booking});
      await Future<void>.delayed(Duration.zero);
      await container.read(probe.future);
      expect(fetches, 2, reason: 'related entity change must refetch');
    });
  });
}
