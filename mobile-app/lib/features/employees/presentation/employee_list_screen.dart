import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../core/network/api_client.dart';
import '../../../core/network/api_error.dart';
import '../../../core/providers/session_provider.dart';
import '../../../core/widgets/app_drawer.dart';
import '../../../core/widgets/confirm_delete.dart';
import '../../../core/widgets/search_field.dart';

/// No offline table exists for Employees either (same Stage 2 gap as
/// Payments) — this is back-office admin data with little offline field
/// value, so it stays live-only rather than adding a new sync table for it.
class EmployeeSummary {
  final String id;
  final String name;
  final String? phone;
  final String? roleTitle;
  final String employmentStatus;
  final DateTime? joinedDate;
  final String? userId;

  EmployeeSummary.fromJson(Map<String, dynamic> json)
      : id = json['id'] as String,
        name = json['name'] as String,
        phone = json['phone'] as String?,
        roleTitle = json['roleTitle'] as String?,
        employmentStatus = json['employmentStatus'] as String,
        joinedDate = json['joinedDate'] == null ? null : DateTime.parse(json['joinedDate'] as String),
        userId = json['userId'] as String?;
}

final employeesListProvider = FutureProvider<List<EmployeeSummary>>((ref) async {
  final dio = ref.watch(apiClientProvider);
  final response = await dio.get('/employees');
  return (response.data as List<dynamic>)
      .map((json) => EmployeeSummary.fromJson(json as Map<String, dynamic>))
      .toList();
});

enum _StatusFilter { all, active, inactive }

class EmployeeListScreen extends ConsumerStatefulWidget {
  const EmployeeListScreen({super.key});

  @override
  ConsumerState<EmployeeListScreen> createState() => _EmployeeListScreenState();
}

class _EmployeeListScreenState extends ConsumerState<EmployeeListScreen> {
  String _query = '';
  _StatusFilter _filter = _StatusFilter.all;

  bool _matchesFilter(EmployeeSummary e, _StatusFilter filter) {
    switch (filter) {
      case _StatusFilter.all:
        return true;
      case _StatusFilter.active:
        return e.employmentStatus == 'ACTIVE';
      case _StatusFilter.inactive:
        return e.employmentStatus == 'INACTIVE';
    }
  }

  @override
  Widget build(BuildContext context) {
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
          final counts = {for (final f in _StatusFilter.values) f: employees.where((e) => _matchesFilter(e, f)).length};
          var filtered = employees.where((e) => _matchesFilter(e, _filter)).toList();
          if (_query.isNotEmpty) {
            filtered = filtered
                .where((e) =>
                    e.name.toLowerCase().contains(_query) ||
                    (e.roleTitle?.toLowerCase().contains(_query) ?? false) ||
                    (e.phone?.toLowerCase().contains(_query) ?? false))
                .toList();
          }
          return Column(
            children: [
              SearchField(
                hintText: 'Search by Name, Role Title, Phone...',
                onChanged: (value) => setState(() => _query = value.trim().toLowerCase()),
              ),
              FilterTabsRow<_StatusFilter>(
                selected: _filter,
                onSelected: (f) => setState(() => _filter = f),
                tabs: [
                  (_StatusFilter.all, 'All', counts[_StatusFilter.all]!),
                  (_StatusFilter.active, 'Active', counts[_StatusFilter.active]!),
                  (_StatusFilter.inactive, 'Inactive', counts[_StatusFilter.inactive]!),
                ],
              ),
              Expanded(
                child: filtered.isEmpty
                    ? const Center(child: Text('No staff records match this view.'))
                    : ListView.builder(
                        itemCount: filtered.length,
                        itemBuilder: (context, index) {
                          final employee = filtered[index];
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
                                          const PopupMenuItem(
                                              value: 'delete', child: Text('Delete', style: TextStyle(color: Colors.red))),
                                      ],
                                    ),
                                  const Icon(Icons.chevron_right),
                                ],
                              ),
                            ),
                          );
                        },
                      ),
              ),
            ],
          );
        },
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, stack) => Center(child: Text('Error: ${apiErrorMessage(error)}')),
      ),
    );
  }
}
