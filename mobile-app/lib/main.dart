import 'core/theme/app_theme.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'core/models/app_user.dart';
import 'core/providers/session_provider.dart';
import 'core/router/app_router.dart';
import 'core/storage/local_storage.dart';
import 'core/sync/outbox.dart';
import 'core/sync/sync_pull.dart';
import 'core/sync/sync_status_banner.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Warm the in-memory session cache from secure storage once, up front, so
  // every later token read (the Dio interceptor reads one per request) is
  // served from memory rather than a per-request disk read — the latter is
  // unreliable under the dashboard's burst of concurrent requests on Windows.
  await AuthStorage.hydrate();

  final slug = await TenantStorage.getSlug();
  AppUser? restoredUser;
  String initialLocation;

  if (slug == null) {
    initialLocation = '/setup';
  } else {
    final accessToken = await AuthStorage.getAccessToken();
    final cachedUser = await AuthStorage.getUser();
    if (accessToken != null && cachedUser != null) {
      restoredUser = AppUser.fromJson(cachedUser);
      initialLocation = restoredUser.homeRoute;
    } else {
      initialLocation = '/login';
    }
  }

  final container = ProviderContainer(
    overrides: [
      tenantSlugProvider.overrideWith((ref) => slug),
      currentUserProvider.overrideWith((ref) => restoredUser),
    ],
  );

  // Bring the durable offline outbox to life at launch. Reading it starts its
  // connectivity listener (fireImmediately), so any writes queued in a previous
  // session begin draining as soon as the device has a network path — the user
  // doesn't have to open any particular screen for a pending payment to sync.
  container.read(outboxServiceProvider);

  // Bring cloud→device pull to life: warms the offline database at launch (if
  // online) and re-converges on every reconnect (after the outbox drains).
  container.read(syncPullServiceProvider);

  // And pull the moment a user signs in, so a freshly-authenticated session has
  // its data available offline without visiting every screen first. Covers all
  // login paths (password / PIN / invite) at one shared point.
  container.listen<AppUser?>(currentUserProvider, (prev, next) {
    if (prev == null && next != null) {
      container.read(syncPullServiceProvider).pullAll();
    }
  });

  runApp(
    UncontrolledProviderScope(
      container: container,
      child: MyApp(router: buildAppRouter(initialLocation)),
    ),
  );
}

class MyApp extends StatelessWidget {
  final GoRouter router;

  const MyApp({super.key, required this.router});

  @override
  Widget build(BuildContext context) {
    return MaterialApp.router(
      title: 'ShabooAgri',
      theme: AppTheme.themeData,
      routerConfig: router,
      // Wrap every route in the app-wide offline/sync status banner. It lives
      // above the Navigator so it shows on any screen and reserves its own
      // space rather than overlapping page content.
      builder: (context, child) => SyncOverlay(child: child ?? const SizedBox.shrink()),
    );
  }
}
