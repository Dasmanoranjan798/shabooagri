import 'package:go_router/go_router.dart';
import '../../features/auth/presentation/login_screen.dart';
import '../../features/bookings/presentation/booking_detail_screen.dart';
import '../../features/bookings/presentation/booking_list_screen.dart';
import '../../features/customers/presentation/customer_detail_screen.dart';
import '../../features/customers/presentation/customer_list_screen.dart';
import '../../features/dashboard/presentation/dashboard_screen.dart';
import '../../features/drivers/presentation/driver_detail_screen.dart';
import '../../features/drivers/presentation/driver_list_screen.dart';
import '../../features/employees/presentation/employee_detail_screen.dart';
import '../../features/employees/presentation/employee_list_screen.dart';
import '../../features/farmer/presentation/farmer_home_screen.dart';
import '../../features/jobs/presentation/job_list_screen.dart';
import '../../features/jobs/presentation/job_detail_screen.dart';
import '../../features/machines/presentation/machine_detail_screen.dart';
import '../../features/machines/presentation/machine_list_screen.dart';
import '../../features/payments/presentation/payment_detail_screen.dart';
import '../../features/payments/presentation/payment_list_screen.dart';
import '../../features/setup/presentation/setup_screen.dart';
import '../../features/villages/presentation/village_list_screen.dart';

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
        path: '/bookings',
        builder: (context, state) => const BookingListScreen(),
        routes: [
          GoRoute(
            path: ':id',
            builder: (context, state) => BookingDetailScreen(bookingId: state.pathParameters['id']!),
          ),
        ],
      ),
      GoRoute(
        path: '/machines',
        builder: (context, state) => const MachineListScreen(),
        routes: [
          GoRoute(
            path: ':id',
            builder: (context, state) => MachineDetailScreen(machineId: state.pathParameters['id']!),
          ),
        ],
      ),
      GoRoute(
        path: '/drivers',
        builder: (context, state) => const DriverListScreen(),
        routes: [
          GoRoute(
            path: ':id',
            builder: (context, state) => DriverDetailScreen(driverId: state.pathParameters['id']!),
          ),
        ],
      ),
      GoRoute(
        path: '/customers',
        builder: (context, state) => const CustomerListScreen(),
        routes: [
          GoRoute(
            path: ':id',
            builder: (context, state) => CustomerDetailScreen(customerId: state.pathParameters['id']!),
          ),
        ],
      ),
      GoRoute(
        path: '/villages',
        builder: (context, state) => const VillageListScreen(),
      ),
      GoRoute(
        path: '/payments',
        builder: (context, state) => const PaymentListScreen(),
        routes: [
          GoRoute(
            path: ':id',
            builder: (context, state) => PaymentDetailScreen(invoiceId: state.pathParameters['id']!),
          ),
        ],
      ),
      GoRoute(
        path: '/employees',
        builder: (context, state) => const EmployeeListScreen(),
        routes: [
          GoRoute(
            path: ':id',
            builder: (context, state) => EmployeeDetailScreen(employeeId: state.pathParameters['id']!),
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
