import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/network/api_client.dart';
import '../../../core/network/api_error.dart';
import '../../../core/widgets/app_drawer.dart';
import '../data/team_models.dart';

final teamUsersProvider = FutureProvider<List<TeamUser>>((ref) async {
  final dio = ref.watch(apiClientProvider);
  final response = await dio.get('/team/users');
  return (response.data as List<dynamic>).map((j) => TeamUser.fromJson(j as Map<String, dynamic>)).toList();
});

final teamInvitesProvider = FutureProvider<List<StaffInvite>>((ref) async {
  final dio = ref.watch(apiClientProvider);
  final response = await dio.get('/team/invites');
  return (response.data as List<dynamic>).map((j) => StaffInvite.fromJson(j as Map<String, dynamic>)).toList();
});

/// Company-wide staff/user-account management — mirrors `TeamPage.tsx`,
/// gated server-side by `user.manage` (Owner + Manager, confirmed against
/// `seedData.ts`). Distinct from Employees: this manages login accounts and
/// invites across every role, including deactivate/reactivate of existing
/// users, which the Employees module has no equivalent for.
class TeamScreen extends ConsumerStatefulWidget {
  const TeamScreen({super.key});

  @override
  ConsumerState<TeamScreen> createState() => _TeamScreenState();
}

class _TeamScreenState extends ConsumerState<TeamScreen> {
  String? _busyId;

  void _refresh() {
    ref.invalidate(teamUsersProvider);
    ref.invalidate(teamInvitesProvider);
  }

  Future<bool?> _confirm(String title, String body, {String confirmLabel = 'Confirm', Color? confirmColor}) {
    return showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(title),
        content: Text(body),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Cancel')),
          ElevatedButton(
            style: confirmColor != null ? ElevatedButton.styleFrom(backgroundColor: confirmColor) : null,
            onPressed: () => Navigator.pop(context, true),
            child: Text(confirmLabel),
          ),
        ],
      ),
    );
  }

  Future<void> _toggleUserStatus(TeamUser user) async {
    final nextStatus = user.status == 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    final confirmed = await _confirm(
      nextStatus == 'INACTIVE' ? 'Deactivate ${user.fullName}?' : 'Reactivate ${user.fullName}?',
      nextStatus == 'INACTIVE' ? 'They will no longer be able to log in.' : 'They will be able to log in again.',
      confirmLabel: nextStatus == 'INACTIVE' ? 'Deactivate' : 'Reactivate',
      confirmColor: nextStatus == 'INACTIVE' ? Colors.red : null,
    );
    if (confirmed != true) return;
    setState(() => _busyId = user.id);
    try {
      final dio = ref.read(apiClientProvider);
      await dio.patch('/team/users/${user.id}/status', data: {'status': nextStatus});
      _refresh();
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(apiErrorMessage(e))));
    } finally {
      if (mounted) setState(() => _busyId = null);
    }
  }

  Future<void> _revokeInvite(StaffInvite invite) async {
    final confirmed = await _confirm(
      'Revoke the invite for ${invite.fullName}?',
      'They will no longer be able to accept this invite.',
      confirmLabel: 'Revoke',
      confirmColor: Colors.red,
    );
    if (confirmed != true) return;
    setState(() => _busyId = invite.id);
    try {
      final dio = ref.read(apiClientProvider);
      await dio.patch('/team/invites/${invite.id}/revoke');
      _refresh();
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(apiErrorMessage(e))));
    } finally {
      if (mounted) setState(() => _busyId = null);
    }
  }

  Color _statusColor(String status) {
    switch (status) {
      case 'ACTIVE':
      case 'ACCEPTED':
        return Colors.green;
      case 'PENDING':
        return Colors.orange;
      case 'INACTIVE':
      case 'REVOKED':
        return Colors.red;
      default:
        return Colors.grey;
    }
  }

  Widget _statusBadge(String status) {
    final color = _statusColor(status);
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(color: color.withValues(alpha: 0.12), borderRadius: BorderRadius.circular(12)),
      child: Text(status, style: TextStyle(color: color, fontSize: 11, fontWeight: FontWeight.bold)),
    );
  }

  @override
  Widget build(BuildContext context) {
    final usersAsync = ref.watch(teamUsersProvider);
    final invitesAsync = ref.watch(teamInvitesProvider);

    return Scaffold(
      drawer: const AppDrawer(currentRoute: '/team'),
      appBar: AppBar(
        title: const Text('Team'),
        actions: [
          IconButton(icon: const Icon(Icons.refresh), onPressed: _refresh),
          IconButton(
            icon: const Icon(Icons.person_add_alt),
            tooltip: 'Invite Staff',
            onPressed: () => context.push('/team/invite'),
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: () async => _refresh(),
        child: ListView(
          padding: const EdgeInsets.all(16.0),
          children: [
            const Text(
              "Invite staff members and manage who has access to your company's software",
              style: TextStyle(color: Colors.grey),
            ),
            const SizedBox(height: 16),
            _sectionHeader('Current Staff', usersAsync.valueOrNull?.length),
            usersAsync.when(
              data: (users) => users.isEmpty
                  ? const _EmptyState(text: 'No staff accounts yet.')
                  : Column(
                      children: users
                          .map((u) => Card(
                                margin: const EdgeInsets.only(bottom: 8),
                                child: ListTile(
                                  title: Text(u.fullName, style: const TextStyle(fontWeight: FontWeight.bold)),
                                  subtitle: Text(
                                    '${u.roleName} · ${u.email ?? u.mobileNumber ?? 'N/A'}\nLast login: ${u.lastLoginAt != null ? u.lastLoginAt!.toIso8601String().split('T').first : 'Never'}',
                                  ),
                                  isThreeLine: true,
                                  trailing: Row(
                                    mainAxisSize: MainAxisSize.min,
                                    children: [
                                      _statusBadge(u.status),
                                      IconButton(
                                        icon: Icon(u.status == 'ACTIVE' ? Icons.block : Icons.restore, size: 20),
                                        tooltip: u.status == 'ACTIVE' ? 'Deactivate' : 'Reactivate',
                                        onPressed: _busyId == u.id ? null : () => _toggleUserStatus(u),
                                      ),
                                    ],
                                  ),
                                ),
                              ))
                          .toList(),
                    ),
              loading: () => const Padding(padding: EdgeInsets.all(24), child: Center(child: CircularProgressIndicator())),
              error: (e, s) => Text('Error: ${apiErrorMessage(e)}', style: const TextStyle(color: Colors.red)),
            ),
            const SizedBox(height: 24),
            invitesAsync.when(
              data: (invites) {
                final pending = invites.where((i) => i.status == 'PENDING').toList();
                final history = invites.where((i) => i.status != 'PENDING').toList();
                return Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    _sectionHeader('Pending Invites', pending.length),
                    pending.isEmpty
                        ? const _EmptyState(text: 'No pending invites.')
                        : Column(
                            children: pending
                                .map((i) => Card(
                                      margin: const EdgeInsets.only(bottom: 8),
                                      child: ListTile(
                                        title: Text(i.fullName, style: const TextStyle(fontWeight: FontWeight.bold)),
                                        subtitle: Text(
                                          '${i.roleName} · ${i.email ?? i.phone ?? 'N/A'}\nSent by ${i.invitedByName} · Expires ${i.expiresAt.toIso8601String().split('T').first}',
                                        ),
                                        isThreeLine: true,
                                        trailing: IconButton(
                                          icon: const Icon(Icons.block, size: 20, color: Colors.red),
                                          tooltip: 'Revoke Invite',
                                          onPressed: _busyId == i.id ? null : () => _revokeInvite(i),
                                        ),
                                      ),
                                    ))
                                .toList(),
                          ),
                    if (history.isNotEmpty) ...[
                      const SizedBox(height: 24),
                      _sectionHeader('Invite History', null),
                      Column(
                        children: history
                            .map((i) => Card(
                                  margin: const EdgeInsets.only(bottom: 8),
                                  child: ListTile(
                                    title: Text(i.fullName),
                                    subtitle: Text('${i.roleName} · ${i.email ?? i.phone ?? 'N/A'}'),
                                    trailing: _statusBadge(i.status),
                                  ),
                                ))
                            .toList(),
                      ),
                    ],
                  ],
                );
              },
              loading: () => const Padding(padding: EdgeInsets.all(24), child: Center(child: CircularProgressIndicator())),
              error: (e, s) => Text('Error: ${apiErrorMessage(e)}', style: const TextStyle(color: Colors.red)),
            ),
          ],
        ),
      ),
    );
  }

  Widget _sectionHeader(String title, int? count) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        children: [
          Text(title, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
          if (count != null) ...[
            const SizedBox(width: 8),
            Text('($count)', style: const TextStyle(color: Colors.grey)),
          ],
        ],
      ),
    );
  }
}

class _EmptyState extends StatelessWidget {
  final String text;
  const _EmptyState({required this.text});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 16),
      child: Text(text, style: const TextStyle(color: Colors.grey)),
    );
  }
}
