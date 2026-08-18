import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
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

    return Scaffold(
      appBar: AppBar(
        title: const Text('Employee Details'),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => context.go('/employees'),
        ),
      ),
      body: employeeAsync.when(
        data: (employee) => Padding(
          padding: const EdgeInsets.all(16.0),
          child: ListView(
            children: [
              InfoRow('Name', employee.name),
              if (employee.phone != null) InfoRow('Phone', employee.phone!),
              if (employee.roleTitle != null) InfoRow('Role', employee.roleTitle!),
              InfoRow('Employment Status', employee.employmentStatus),
            ],
          ),
        ),
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, stack) => Center(child: Text('Error: $error')),
      ),
    );
  }
}
