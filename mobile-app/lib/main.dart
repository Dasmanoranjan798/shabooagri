import 'core/theme/app_theme.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'core/models/app_user.dart';
import 'core/providers/session_provider.dart';
import 'core/router/app_router.dart';
import 'core/storage/local_storage.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();

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
    );
  }
}
