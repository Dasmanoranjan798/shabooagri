import 'dart:async';

import 'package:flutter/foundation.dart' show visibleForTesting;
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../network/api_client.dart';
import '../storage/local_storage.dart';
import '../repositories/booking_repository.dart';
import '../repositories/customer_repository.dart';
import '../repositories/driver_repository.dart';
import '../repositories/job_repository.dart';
import '../repositories/machine_repository.dart';
import 'connectivity.dart';
import 'outbox.dart';

/// Cloud → device synchronization (the pull half of two-way sync).
///
/// Phase 1 gave the app a durable **push** path (offline writes → outbox →
/// cloud) and a read cache that serves whatever a screen last fetched. This
/// service closes the loop:
///
///   * **Fresh install / login:** proactively downloads the core business
///     collections so the whole app is usable offline immediately — the user
///     doesn't have to visit every screen online first to "prime" it.
///   * **Reconnect convergence:** re-pulls so changes another user/device made
///     while this device was offline reach the local database. The backend is
///     the business authority, so a pull is **server-authoritative** — it
///     overwrites the local cached reads (never the other way around).
///
/// It reuses the existing GET endpoints through the shared intercepted client
/// (which caches every successful GET) and the SQLite-mirror repositories'
/// `refreshFromApi()` — so it needs **no new backend** and re-runs the same
/// role-scoped queries the screens already use (tenant isolation/permissions
/// unchanged).
///
/// Ordering safety: on reconnect it waits for the outbox to finish draining
/// **before** pulling, so a still-pending local write is never transiently
/// hidden by an authoritative snapshot that predates it.
class SyncPullService {
  final Ref _ref;
  SyncPullService(this._ref);

  bool _pulling = false;

  /// Extra read-only collections (beyond the mirror repositories) worth warming
  /// into the offline cache at login. Each is best-effort; a 404/permission
  /// scope simply skips it. Kept intentionally small and role-safe.
  static const _extraCollections = <String>[
    '/employees',
    '/drivers',
    '/pricing-methods',
    '/machine-types',
  ];

  /// Pulls the authoritative cloud state for every core entity into the local
  /// database/cache. Safe to call repeatedly; a no-op while offline (the GETs
  /// fail and the interceptor keeps serving the last snapshot).
  Future<void> pullAll() async {
    if (_pulling) return;
    // Cloud→device pull is authenticated, server-authoritative business data, so
    // it only makes sense once this device has a session. On a fresh install the
    // reconnect listener fires `fireImmediately` at launch while the user is
    // still on Company Setup (no company, no token); pulling then would only
    // send guaranteed-401 background traffic. Skip until there's a session — the
    // login path (main.dart) re-invokes pullAll the moment one exists.
    final token = await AuthStorage.getAccessToken();
    if (token == null) return;
    _pulling = true;
    try {
      // Mirror-backed entities: refreshFromApi() upserts into the SQLite mirror
      // AND (because it goes through the intercepted client) warms the read
      // cache. Each is independently guarded so one failure can't abort the
      // rest.
      final refreshers = <Future<void> Function()>[
        () => _ref.read(customerRepositoryProvider).refreshFromApi(),
        () => _ref.read(machineRepositoryProvider).refreshFromApi(),
        () => _ref.read(driverRepositoryProvider).refreshFromApi(),
        () => _ref.read(jobRepositoryProvider).refreshFromApi(),
        () => _ref.read(bookingRepositoryProvider).refreshFromApi(),
      ];
      for (final r in refreshers) {
        try {
          await r();
        } catch (_) {/* offline or scoped-out — keep going */}
      }

      // Cache-only collections consumed by direct-Dio screens.
      final dio = _ref.read(apiClientProvider);
      for (final path in _extraCollections) {
        try {
          await dio.get(path);
        } catch (_) {/* best-effort */}
      }
    } finally {
      _pulling = false;
    }
  }

  /// Reconnect-safe pull: let the outbox flush local writes first, then pull the
  /// authoritative snapshot so it already reflects them.
  Future<void> pullAfterDrain() async {
    try {
      await _ref.read(outboxServiceProvider).flush(immediate: true);
    } catch (_) {}
    await pullAll();
  }

  @visibleForTesting
  bool get isPulling => _pulling;
}

final syncPullServiceProvider = Provider<SyncPullService>((ref) {
  final svc = SyncPullService(ref);
  // Converge on every reconnect. `fireImmediately` so a session that starts
  // online pulls once at launch; the outbox listener (also fireImmediately)
  // drains first, and pullAfterDrain awaits that.
  ref.listen<bool>(isOnlineProvider, (prev, next) {
    if (next) svc.pullAfterDrain();
  }, fireImmediately: true);
  return svc;
});
