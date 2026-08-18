import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../core/network/api_client.dart';
import '../../../core/providers/session_provider.dart';
import '../../../core/widgets/app_drawer.dart';
import '../../../core/widgets/confirm_delete.dart';

/// No offline table exists for Employees either (same Stage 2 gap as
/// Payments) — this is back-office admin data with little offline field
/// value, so it stays live-only rather than adding a new sync table for it.
class EmployeeSummary {
  final String id;
  final String name;
  final String? phone;
  final String? roleTitle;
  final String employmentStatus;

  EmployeeSummary.fromJson(Map<String, dynamic> json)
      : id = json['id'] as String,
        name = json['name'] as String,
        phone = json['phone'] as String?,
        roleTitle = json['roleTitle'] as String?,
        employmentStatus = json['employmentStatus'] as String;
}

final employeesListProvider = FutureProvider<List<EmployeeSummary>>((ref) async {
  final dio = ref.watch(apiClientProvider);
  final response = await dio.get('/employees');
  return (response.data as List<dynamic>)
      .map((json) => EmployeeSummary.fromJson(json as Map<String, dynamic>))
      .toList();
});

class EmployeeListScreen extends ConsumerWidget {
  const EmployeeListScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final employeesAsync = ref.watch(employeesListProvider);
    final user = ref.watch(currentUserProvider);
    final canManage = user?.isOwnerOrManager ?? false;
    final canDelete = user?.roleSystemKey == 'owner';

    return Scaffold(
      drawer: const AppDrawer(currentRoute: '/employees'),
      appBar: AppBar(
        title: const Text('Employees'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () => ref.invalidate(employeesListProvider),
          ),
        ],
      ),
      floatingActionButton: canManage
          ? FloatingActionButton(onPressed: () => context.go('/employees/new'), child: const Icon(Icons.add))
          : null,
      body: employeesAsync.when(
        data: (employees) {
          if (employees.isEmpty) {
            return const Center(child: Text('No employees found.'));
          }
          return ListView.builder(
            itemCount: employees.length,
            itemBuilder: (context, index) {
              final employee = employees[index];
              return Card(
                margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                child: ListTile(
                  title: Text(employee.name),
                  subtitle: Text(employee.roleTitle ?? employee.employmentStatus),
                  onTap: () => context.go('/employees/${employee.id}'),
                  trailing: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      if (canManage || canDelete)
                        PopupMenuButton<String>(
                          onSelected: (action) async {
                            if (action == 'edit') {
                              context.go('/employees/${employee.id}/edit');
                            } else if (action == 'delete') {
                              final dio = ref.read(apiClientProvider);
                              await confirmAndDelete(
                                context: context,
                                entityLabel: employee.name,
                                onDelete: () => dio.delete('/employees/${employee.id}'),
                                onSuccess: () => ref.invalidate(employeesListProvider),
                              );
                            }
                          },
                          itemBuilder: (context) => [
                            if (canManage) const PopupMenuItem(value: 'edit', child: Text('Edit')),
                            if (canDelete)
                              const PopupMenuItem(value: 'delete', child: Text('Delete', style: TextStyle(color: Colors.red))),
                          ],
                        ),
                      const Icon(Icons.chevron_right),
                    ],
                  ),
                ),
              );
            },
          );
        },
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, stack) => Center(child: Text('Error: $error')),
      ),
    );
  }
}
