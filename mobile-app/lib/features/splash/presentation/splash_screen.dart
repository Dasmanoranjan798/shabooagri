import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../../../core/models/app_user.dart';
import '../../../core/providers/session_provider.dart';
import '../../../core/theme/app_theme.dart';

/// Branded app-opening experience shown as the initial route.
///
/// Startup auth/session state is already resolved synchronously in `main()`
/// (which seeds [tenantSlugProvider] and [currentUserProvider] from storage),
/// so this screen does NOT re-authenticate or add artificial loading — it only
/// reads that already-resolved session, shows ShabooAgri branding, and routes:
///
///  * No company set up on this device  → `/setup`
///  * A company but no session          → `/login`  (brief branding only)
///  * A restored session                → a short personalized "Hello, {name}"
///    welcome, then the role's home route ([AppUser.homeRoute]).
///
/// The greeting reuses the existing authenticated user; it is deliberately NOT
/// a Dashboard section. The date uses the same `DateTime.now()` the rest of the
/// app uses — no second timezone system is introduced.
class SplashScreen extends ConsumerStatefulWidget {
  const SplashScreen({super.key});

  @override
  ConsumerState<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends ConsumerState<SplashScreen> {
  Timer? _navTimer;
  bool _visible = false;

  @override
  void initState() {
    super.initState();
    // Fade the branding in on the first frame, and schedule the transition to
    // the resolved destination once that destination has been read.
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      setState(() => _visible = true);
      _scheduleNavigation();
    });
  }

  void _scheduleNavigation() {
    final slug = ref.read(tenantSlugProvider);
    final user = ref.read(currentUserProvider);

    // Derive the destination with the SAME rules main.dart uses to seed the
    // session — no duplicate auth/session mechanism, just the resolved state.
    final String destination;
    if (slug == null) {
      destination = '/setup';
    } else if (user != null) {
      destination = user.homeRoute;
    } else {
      destination = '/login';
    }

    // An authenticated user gets a moment to read the personalized welcome;
    // everyone else sees only a brief brand flash before continuing to the
    // existing auth/setup flow. Neither is an artificial "hold" — the welcome
    // display time IS the feature, and the unauthenticated path is minimal.
    final delay = user != null
        ? const Duration(milliseconds: 1800)
        : const Duration(milliseconds: 700);

    _navTimer = Timer(delay, () {
      if (!mounted) return;
      context.go(destination);
    });
  }

  @override
  void dispose() {
    _navTimer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final user = ref.watch(currentUserProvider);
    final firstName = user?.fullName.trim().split(RegExp(r'\s+')).first;
    final dateStr = DateFormat('EEEE, d MMMM yyyy').format(DateTime.now());

    return Scaffold(
      backgroundColor: AppTheme.surface,
      body: SafeArea(
        child: Center(
          child: AnimatedOpacity(
            opacity: _visible ? 1 : 0,
            duration: const Duration(milliseconds: 400),
            curve: Curves.easeOut,
            child: SingleChildScrollView(
              padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 24),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  // ---- Brand mark (consistent with the app's icon language:
                  // green primary, white glyph — no separate logo asset exists).
                  Container(
                    width: 96,
                    height: 96,
                    decoration: const BoxDecoration(
                      color: AppTheme.primary,
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(Icons.agriculture, color: Colors.white, size: 52),
                  ),
                  const SizedBox(height: 20),
                  const Text(
                    'ShabooAgri',
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      fontSize: 28,
                      fontWeight: FontWeight.bold,
                      color: AppTheme.primary,
                      letterSpacing: 0.5,
                    ),
                  ),

                  // ---- Personalized welcome (authenticated sessions only).
                  if (user != null && firstName != null && firstName.isNotEmpty) ...[
                    const SizedBox(height: 40),
                    const Text(
                      'Hello,',
                      textAlign: TextAlign.center,
                      style: TextStyle(fontSize: 20, color: AppTheme.textMuted),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      firstName,
                      textAlign: TextAlign.center,
                      style: const TextStyle(
                        fontSize: 30,
                        fontWeight: FontWeight.bold,
                        color: AppTheme.text,
                      ),
                    ),
                    const SizedBox(height: 12),
                    Text(
                      dateStr,
                      textAlign: TextAlign.center,
                      style: const TextStyle(fontSize: 15, color: AppTheme.textMuted),
                    ),
                  ] else ...[
                    // Unauthenticated startup: minimal loading affordance only.
                    const SizedBox(height: 32),
                    const SizedBox(
                      width: 22,
                      height: 22,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    ),
                  ],
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
