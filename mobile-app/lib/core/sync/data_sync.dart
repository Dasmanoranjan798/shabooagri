import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

/// Global real-time data synchronization.
///
/// The stale-data problem this solves: every list/detail screen used to
/// `ref.invalidate(itsOwnProvider)` after a mutation — so the screen that made
/// the change refreshed, but every *other* open screen that shows the same
/// entity (the dashboard KPIs, a customer's ledger, the job list after a
/// booking is created, …) kept showing stale numbers until the user pulled to
/// refresh. Invalidation was local, manual, and did not cascade across the
/// entities a single mutation actually affects.
///
/// The fix is one coherent mechanism, in two halves:
///
///  * **Write side (automatic):** [DataSyncInterceptor] sits on the shared Dio
///    client. After any *successful* non-GET request it reads the request path,
///    maps it to the affected [SyncEntity]s, and bumps their revision counters
///    (following a dependency [_cascade], and always refreshing the aggregate
///    dashboard/report views). No screen has to remember to publish anything —
///    a new mutation on a new screen is covered for free.
///
///  * **Read side:** every data provider calls [syncOn] with the entities it
///    displays. That watches those revisions, so the provider re-runs (refetches
///    authoritative data from the backend) whenever *any* screen mutates a
///    related entity. The backend stays the single source of truth — we refetch,
///    we never recompute business values on the client.
enum SyncEntity {
  booking,
  job,
  machine,
  driver,
  customer,
  village,
  employee,
  payment,
  invoice,
  maintenance,
  fuel,
  expense,
  pricingMethod,
  settings,
  team,
  dashboard,
  report,
  notification,
}

/// What each entity's mutation *also* affects. A booking create spawns a job
/// and moves dashboard counters; a payment moves the invoice, the customer
/// ledger, KPIs and reports; etc. [DataSync.bump] always folds in
/// dashboard+report on top of this, since those aggregate everything.
const Map<SyncEntity, Set<SyncEntity>> _cascade = {
  SyncEntity.booking: {SyncEntity.job},
  SyncEntity.job: {SyncEntity.booking, SyncEntity.machine, SyncEntity.driver},
  SyncEntity.payment: {SyncEntity.invoice, SyncEntity.customer},
  SyncEntity.invoice: {SyncEntity.payment, SyncEntity.customer},
  SyncEntity.machine: {SyncEntity.maintenance},
  SyncEntity.driver: {SyncEntity.employee},
  SyncEntity.employee: {SyncEntity.driver, SyncEntity.team},
  SyncEntity.maintenance: {SyncEntity.machine},
  SyncEntity.fuel: {SyncEntity.job, SyncEntity.machine},
  SyncEntity.pricingMethod: {SyncEntity.booking, SyncEntity.job},
  SyncEntity.customer: {},
  SyncEntity.village: {},
  SyncEntity.expense: {},
  SyncEntity.settings: {},
  SyncEntity.team: {},
  SyncEntity.notification: {},
  SyncEntity.dashboard: {},
  SyncEntity.report: {},
};

/// Maps a leading REST path segment to the entity it mutates. Keyed by the
/// backend's actual route mounts (see `backend/src/app.ts`). A request path is
/// scanned for *any* of these segments, so a nested route like
/// `/invoices/:id/payments` correctly marks both invoice and payment dirty.
const Map<String, SyncEntity> _segmentEntity = {
  'bookings': SyncEntity.booking,
  'jobs': SyncEntity.job,
  'machines': SyncEntity.machine,
  'machine-types': SyncEntity.machine,
  'drivers': SyncEntity.driver,
  'customers': SyncEntity.customer,
  'villages': SyncEntity.village,
  'employees': SyncEntity.employee,
  'payments': SyncEntity.payment,
  'invoices': SyncEntity.invoice,
  'maintenance': SyncEntity.maintenance,
  'fuel': SyncEntity.fuel,
  'expenses': SyncEntity.expense,
  'pricing-methods': SyncEntity.pricingMethod,
  'settings': SyncEntity.settings,
  'team': SyncEntity.team,
  'rbac': SyncEntity.team,
};

/// Parses a request path into the set of entities it mutated. Returns an empty
/// set only when nothing recognizable is found (the caller still refreshes the
/// aggregates, so an unmapped write is safe rather than silently stale).
Set<SyncEntity> entitiesForPath(String path) {
  final result = <SyncEntity>{};
  for (final raw in path.split('/')) {
    final seg = raw.split('?').first;
    final entity = _segmentEntity[seg];
    if (entity != null) result.add(entity);
  }
  return result;
}

/// Holds a monotonically increasing revision per entity. Bumping an entity's
/// revision re-runs every provider that watches it via [syncOn].
class DataSync extends StateNotifier<Map<SyncEntity, int>> {
  DataSync() : super({for (final e in SyncEntity.values) e: 0});

  /// Marks [entities] (plus their cascade, plus the dashboard/report
  /// aggregates) as changed, so every subscribed screen refetches.
  void bump(Set<SyncEntity> entities) {
    if (entities.isEmpty) return;
    final affected = <SyncEntity>{SyncEntity.dashboard, SyncEntity.report};
    for (final e in entities) {
      affected.add(e);
      affected.addAll(_cascade[e] ?? const {});
    }
    final next = Map<SyncEntity, int>.from(state);
    for (final e in affected) {
      next[e] = (next[e] ?? 0) + 1;
    }
    state = next;
  }

  /// Convenience for the write interceptor: bump straight from a request path.
  void bumpPath(String path) {
    final entities = entitiesForPath(path);
    // Even an unrecognized write should refresh the aggregate views.
    bump(entities.isEmpty ? {SyncEntity.dashboard} : entities);
  }
}

final dataSyncProvider =
    StateNotifierProvider<DataSync, Map<SyncEntity, int>>((ref) => DataSync());

/// Subscribes the calling provider to changes in [entities]. Call it at the top
/// of a data provider's body; the provider re-runs whenever any of those
/// entities' revisions bump. Uses `select` so an unrelated entity's bump does
/// not needlessly refetch this provider.
void syncOn(Ref ref, Set<SyncEntity> entities) {
  ref.watch(dataSyncProvider.select((m) {
    var sum = 0;
    for (final e in entities) {
      sum += m[e] ?? 0;
    }
    return sum;
  }));
}

/// Dio interceptor that turns every successful mutating request into a bump of
/// the affected entities. Attached to the shared tenant client, so it observes
/// every write the app makes without any per-screen wiring.
class DataSyncInterceptor extends Interceptor {
  final Ref _ref;
  DataSyncInterceptor(this._ref);

  @override
  void onResponse(Response response, ResponseInterceptorHandler handler) {
    final method = response.requestOptions.method.toUpperCase();
    final status = response.statusCode ?? 0;
    final isMutation = method != 'GET' && method != 'HEAD' && method != 'OPTIONS';
    final isSuccess = status >= 200 && status < 300;
    if (isMutation && isSuccess) {
      // Never let a bookkeeping failure break a real API response.
      try {
        _ref.read(dataSyncProvider.notifier).bumpPath(response.requestOptions.path);
      } catch (_) {}
    }
    handler.next(response);
  }
}
