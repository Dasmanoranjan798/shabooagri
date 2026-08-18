import 'package:go_router/go_router.dart';
import '../../features/auth/presentation/login_screen.dart';
import '../../features/dashboard/presentation/dashboard_screen.dart';
import '../../features/farmer/presentation/farmer_home_screen.dart';
import '../../features/jobs/presentation/job_list_screen.dart';
import '../../features/jobs/presentation/job_detail_screen.dart';
import '../../features/setup/presentation/setup_screen.dart';

/// Built once at startup (see main.dart) after resolving where this device
/// should land: `/setup` if no company slug is persisted yet, `/login` if a
/// slug exists but no session, or the role-appropriate home route if a
/// session was restored.
GoRouter buildAppRouter(String initialLocation) {
  return GoRouter(
    initialLocation: initialLocation,
    routes: [
      GoRoute(
        path: '/setup',
        builder: (context, state) => const SetupScreen(),
      ),
      GoRoute(
        path: '/login',
        builder: (context, state) => const LoginScreen(),
      ),
      GoRoute(
        path: '/dashboard',
        builder: (context, state) => const DashboardScreen(),
      ),
      GoRoute(
        path: '/jobs',
        builder: (context, state) => const JobListScreen(),
        routes: [
          GoRoute(
            path: ':id',
            builder: (context, state) {
              final jobId = state.pathParameters['id']!;
              return JobDetailScreen(jobId: jobId);
            },
          ),
        ],
      ),
      GoRoute(
        path: '/farmer',
        builder: (context, state) => const FarmerHomeScreen(),
      ),
    ],
  );
}
