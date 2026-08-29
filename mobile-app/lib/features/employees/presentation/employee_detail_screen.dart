import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../core/widgets/adaptive_scaffold.dart';
import '../../../core/widgets/info_row.dart';
import 'employee_list_screen.dart';

final employeeDetailProvider = FutureProvider.family<EmployeeSummary, String>((ref, id) async {
  final employees = await ref.watch(employeesListProvider.future);
  return employees.firstWhere((e) => e.id == id);
});

class EmployeeDetailScreen extends ConsumerWidget {
  final String employeeId;

  const EmployeeDetailScreen({super.key, required this.employeeId});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final employeeAsync = ref.watch(employeeDetailProvider(employeeId));

    return AdaptiveScaffold(
      currentRoute: '/employees',
      title: 'Employee Details',
      showBack: true,
      actions: [
        IconButton(
          icon: const Icon(Icons.edit),
          tooltip: 'Edit',
          onPressed: () => context.go('/employees/$employeeId/edit'),
        ),
      ],
      body: employeeAsync.when(
        data: (employee) => ListView(
          padding: const EdgeInsets.all(16.0),
          children: [
            Card(
              margin: EdgeInsets.zero,
              child: Padding(
                padding: const EdgeInsets.all(16.0),
                child: Column(
                  children: [
                    InfoRow('Name', employee.name),
                    if (employee.phone != null) InfoRow('Phone', employee.phone!),
                    if (employee.roleTitle != null) InfoRow('Role', employee.roleTitle!),
                    InfoRow('Joined Date',
                        employee.joinedDate != null ? employee.joinedDate!.toIso8601String().split('T').first : 'N/A'),
                    InfoRow('Employment Status', employee.employmentStatus),
                    InfoRow('System Account', employee.userId != null ? 'Linked User Account' : 'Staff Record Only'),
                  ],
                ),
              ),
            ),
          ],
        ),
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, stack) => Center(child: Text('Error: $error')),
      ),
    );
  }
}
