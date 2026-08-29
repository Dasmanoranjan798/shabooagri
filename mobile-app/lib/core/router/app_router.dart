import 'package:go_router/go_router.dart';
import '../../features/auth/presentation/login_screen.dart';
import '../../features/auth/presentation/reset_password_screen.dart';
import '../../features/auth/presentation/accept_invite_screen.dart';
import '../../features/bookings/presentation/booking_detail_screen.dart';
import '../../features/bookings/presentation/booking_form_screen.dart';
import '../../features/bookings/presentation/booking_list_screen.dart';
import '../../features/customers/presentation/customer_detail_screen.dart';
import '../../features/customers/presentation/customer_form_screen.dart';
import '../../features/customers/presentation/customer_list_screen.dart';
import '../../features/dashboard/presentation/dashboard_screen.dart';
import '../../features/driver/presentation/driver_shell_screen.dart';
import '../../features/drivers/presentation/driver_detail_screen.dart';
import '../../features/drivers/presentation/driver_form_screen.dart';
import '../../features/drivers/presentation/driver_list_screen.dart';
import '../../features/employees/presentation/employee_detail_screen.dart';
import '../../features/employees/presentation/employee_form_screen.dart';
import '../../features/employees/presentation/employee_list_screen.dart';
import '../../features/expenses/presentation/expense_detail_screen.dart';
import '../../features/expenses/presentation/expense_form_screen.dart';
import '../../features/expenses/presentation/expense_list_screen.dart';
import '../../features/farmer/presentation/farmer_shell_screen.dart';
import '../../features/fuel/presentation/fuel_screen.dart';
import '../../features/jobs/presentation/job_list_screen.dart';
import '../../features/jobs/presentation/fast_job_create_screen.dart';
import '../../features/jobs/presentation/job_detail_screen.dart';
import '../../features/jobs/presentation/manual_job_entry_screen.dart';
import '../../features/machines/presentation/machine_detail_screen.dart';
import '../../features/machines/presentation/machine_form_screen.dart';
import '../../features/machines/presentation/machine_list_screen.dart';
import '../../features/maintenance/presentation/maintenance_record_form_screen.dart';
import '../../features/maintenance/presentation/maintenance_schedules_screen.dart';
import '../../features/maintenance/presentation/maintenance_screen.dart';
import '../../features/payments/presentation/new_invoice_screen.dart';
import '../../features/payments/presentation/payment_detail_screen.dart';
import '../../features/payments/presentation/payment_list_screen.dart';
import '../../features/payments/presentation/record_advance_screen.dart';
import '../../features/payments/presentation/take_payment_screen.dart';
import '../../features/reports/presentation/reports_screen.dart';
import '../../features/settings/presentation/settings_screen.dart';
import '../../features/setup/presentation/setup_screen.dart';
import '../../features/team/presentation/invite_staff_screen.dart';
import '../../features/team/presentation/team_screen.dart';
import '../../features/villages/presentation/village_list_screen.dart';
import '../../features/villages/presentation/village_form_screen.dart';

import 'package:flutter/material.dart';

final GlobalKey<NavigatorState> rootNavigatorKey = GlobalKey<NavigatorState>();

/// Built once at startup (see main.dart) after resolving where this device
/// should land: `/setup` if no company slug is persisted yet, `/login` if a
/// slug exists but no session, or the role-appropriate home route if a
/// session was restored.
GoRouter buildAppRouter(String initialLocation) {
  return GoRouter(
    navigatorKey: rootNavigatorKey,
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
      // Deep-link + in-app entry: the emailed reset link is
      // /reset-password?token=..&email=.. (see auth.service). Query params are
      // prefilled into the confirm step; no params => request step.
      GoRoute(
        path: '/reset-password',
        builder: (context, state) => ResetPasswordScreen(
          initialEmail: state.uri.queryParameters['email'],
          initialToken: state.uri.queryParameters['token'],
        ),
      ),
      // Deep-link + in-app entry: the emailed/SMSed invite link is
      // /accept-invite?token=.. (see staffInvite.service).
      GoRoute(
        path: '/accept-invite',
        builder: (context, state) => AcceptInviteScreen(
          initialToken: state.uri.queryParameters['token'],
        ),
      ),
      GoRoute(
        path: '/dashboard',
        builder: (context, state) => const DashboardScreen(),
      ),
      GoRoute(
        path: '/driver',
        builder: (context, state) => const DriverShellScreen(),
      ),
      GoRoute(
        path: '/jobs',
        builder: (context, state) => const JobListScreen(),
        routes: [
          GoRoute(
            path: 'fast-create',
            builder: (context, state) => const FastJobCreateScreen(),
          ),
          GoRoute(
            path: 'manual',
            builder: (context, state) => const ManualJobEntryScreen(),
          ),
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
            path: 'new',
            builder: (context, state) => const BookingFormScreen(),
          ),
          GoRoute(
            path: ':id',
            builder: (context, state) => BookingDetailScreen(bookingId: state.pathParameters['id']!),
          ),
          GoRoute(
            path: ':id/edit',
            builder: (context, state) => BookingFormScreen(bookingId: state.pathParameters['id']!),
          ),
        ],
      ),
      GoRoute(
        path: '/machines',
        builder: (context, state) => const MachineListScreen(),
        routes: [
          GoRoute(
            path: 'new',
            builder: (context, state) => const MachineFormScreen(),
          ),
          GoRoute(
            path: ':id',
            builder: (context, state) => MachineDetailScreen(machineId: state.pathParameters['id']!),
          ),
          GoRoute(
            path: ':id/edit',
            builder: (context, state) => MachineFormScreen(machineId: state.pathParameters['id']!),
          ),
        ],
      ),
      GoRoute(
        path: '/drivers',
        builder: (context, state) => const DriverListScreen(),
        routes: [
          GoRoute(
            path: 'new',
            builder: (context, state) => const DriverFormScreen(),
          ),
          GoRoute(
            path: ':id',
            builder: (context, state) => DriverDetailScreen(driverId: state.pathParameters['id']!),
          ),
          GoRoute(
            path: ':id/edit',
            builder: (context, state) => DriverFormScreen(driverId: state.pathParameters['id']!),
          ),
        ],
      ),
      GoRoute(
        path: '/customers',
        builder: (context, state) => const CustomerListScreen(),
        routes: [
          GoRoute(
            path: 'new',
            builder: (context, state) => const CustomerFormScreen(),
          ),
          GoRoute(
            path: ':id',
            builder: (context, state) => CustomerDetailScreen(customerId: state.pathParameters['id']!),
          ),
          GoRoute(
            path: ':id/edit',
            builder: (context, state) => CustomerFormScreen(customerId: state.pathParameters['id']!),
          ),
        ],
      ),
      GoRoute(
        path: '/villages',
        builder: (context, state) => const VillageListScreen(),
        routes: [
          GoRoute(
            path: 'new',
            builder: (context, state) => const VillageFormScreen(),
          ),
          GoRoute(
            path: ':id/edit',
            builder: (context, state) => VillageFormScreen(
              villageId: state.pathParameters['id']!,
              initialName: state.extra as String?,
            ),
          ),
        ],
      ),
      GoRoute(
        path: '/payments',
        builder: (context, state) {
        final statuses = state.uri.queryParametersAll['status'];
        return PaymentListScreen(initialStatuses: statuses);
      },
        routes: [
          GoRoute(
            path: 'take',
            builder: (context, state) => TakePaymentScreen(preselectedCustomerId: state.extra as String?),
          ),
          GoRoute(
            path: 'advance/new',
            builder: (context, state) => const RecordAdvanceScreen(),
          ),
          GoRoute(
            path: 'invoice/new',
            builder: (context, state) => const NewInvoiceScreen(),
          ),
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
            path: 'new',
            builder: (context, state) => const EmployeeFormScreen(),
          ),
          GoRoute(
            path: ':id',
            builder: (context, state) => EmployeeDetailScreen(employeeId: state.pathParameters['id']!),
          ),
          GoRoute(
            path: ':id/edit',
            builder: (context, state) => EmployeeFormScreen(employeeId: state.pathParameters['id']!),
          ),
        ],
      ),
      GoRoute(
        path: '/maintenance',
        builder: (context, state) => const MaintenanceScreen(),
        routes: [
          GoRoute(
            path: 'schedules',
            builder: (context, state) => const MaintenanceSchedulesScreen(),
          ),
          GoRoute(
            path: 'records/new',
            builder: (context, state) => const MaintenanceRecordFormScreen(),
          ),
          GoRoute(
            path: 'records/:id/edit',
            builder: (context, state) => MaintenanceRecordFormScreen(recordId: state.pathParameters['id']!),
          ),
        ],
      ),
      GoRoute(
        path: '/expenses',
        builder: (context, state) => const ExpenseListScreen(),
        routes: [
          GoRoute(
            path: 'new',
            builder: (context, state) => const ExpenseFormScreen(),
          ),
          GoRoute(
            path: ':id',
            builder: (context, state) => ExpenseDetailScreen(expenseId: state.pathParameters['id']!),
          ),
          GoRoute(
            path: ':id/edit',
            builder: (context, state) => ExpenseFormScreen(expenseId: state.pathParameters['id']!),
          ),
        ],
      ),
      GoRoute(
        path: '/settings',
        builder: (context, state) => const SettingsScreen(),
      ),
      GoRoute(
        path: '/team',
        builder: (context, state) => const TeamScreen(),
        routes: [
          GoRoute(
            path: 'invite',
            builder: (context, state) => const InviteStaffScreen(),
          ),
        ],
      ),
      GoRoute(
        path: '/farmer',
        builder: (context, state) => const FarmerShellScreen(),
      ),
      GoRoute(
        path: '/fuel',
        builder: (context, state) => const FuelScreen(),
      ),
      GoRoute(
        path: '/reports',
        builder: (context, state) => const ReportsScreen(),
      ),
    ],
  );
}
