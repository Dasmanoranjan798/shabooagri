import 'dart:async';

import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

/// Online/offline state that is correct *from the first frame*.
///
/// The stock `onConnectivityChanged` stream only emits on a *change*, so an app
/// that starts already-offline (or already-online) would never learn its state
/// until connectivity next flipped. This wraps it to seed the current state via
/// `checkConnectivity()` up front, then keep it live — so the offline banner and
/// the sync engine both know the truth immediately at launch.
class ConnectivityStatus extends StateNotifier<bool> {
  final Connectivity _connectivity;
  StreamSubscription<List<ConnectivityResult>>? _sub;

  ConnectivityStatus(this._connectivity) : super(true) {
    _init();
  }

  Future<void> _init() async {
    try {
      final results = await _connectivity.checkConnectivity();
      state = _isOnline(results);
    } catch (_) {
      // Assume online if the platform can't tell us — a real request will
      // correct us via the offline interceptor if it's wrong.
      state = true;
    }
    _sub = _connectivity.onConnectivityChanged.listen((results) {
      state = _isOnline(results);
    });
  }

  static bool _isOnline(List<ConnectivityResult> results) =>
      results.isNotEmpty && !results.every((r) => r == ConnectivityResult.none);

  @override
  void dispose() {
    _sub?.cancel();
    super.dispose();
  }
}

final connectivityInstanceProvider = Provider<Connectivity>((ref) => Connectivity());

/// `true` when the device currently has a network path. Seeded synchronously
/// enough that the first `build` sees the real state.
final isOnlineProvider = StateNotifierProvider<ConnectivityStatus, bool>(
  (ref) => ConnectivityStatus(ref.watch(connectivityInstanceProvider)),
);
