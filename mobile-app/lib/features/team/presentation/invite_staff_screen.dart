import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../../core/network/api_client.dart';
import '../../../core/network/api_error.dart';
import '../../villages/presentation/village_list_screen.dart';
import '../data/team_models.dart';
import 'team_screen.dart';

final _rolesProvider = FutureProvider<List<RoleOption>>((ref) async {
  final dio = ref.watch(apiClientProvider);
  final response = await dio.get('/rbac/roles');
  return (response.data as List<dynamic>).map((j) => RoleOption.fromJson(j as Map<String, dynamic>)).toList();
});

/// "+ Invite Staff" — matches `InviteStaffModal.tsx` field-for-field,
/// posting to `POST /team/invites` (`createInviteSchema`: fullName,
/// roleId, email? or phone? (at least one required), villageId required
/// only for a farmer-role invite).
class InviteStaffScreen extends ConsumerStatefulWidget {
  const InviteStaffScreen({super.key});

  @override
  ConsumerState<InviteStaffScreen> createState() => _InviteStaffScreenState();
}

class _InviteStaffScreenState extends ConsumerState<InviteStaffScreen> {
  final _nameController = TextEditingController();
  final _emailController = TextEditingController();
  final _phoneController = TextEditingController();
  String? _roleId;
  String? _villageId;
  bool _saving = false;
  String? _error;
  CreateInviteResult? _result;
  bool _linkCopied = false;

  @override
  void dispose() {
    _nameController.dispose();
    _emailController.dispose();
    _phoneController.dispose();
    super.dispose();
  }

  Future<void> _submit(bool isFarmerRole) async {
    final name = _nameController.text.trim();
    final email = _emailController.text.trim();
    final phone = _phoneController.text.trim();
    if (name.isEmpty) {
      setState(() => _error = 'Please enter their full name');
      return;
    }
    if (_roleId == null) {
      setState(() => _error = 'Please select a role');
      return;
    }
    if (email.isEmpty && phone.isEmpty) {
      setState(() => _error = 'Please provide an email or phone number');
      return;
    }
    if (isFarmerRole && (_villageId == null || _villageId!.isEmpty)) {
      setState(() => _error = 'Please select a village for a farmer invite');
      return;
    }

    setState(() {
      _saving = true;
      _error = null;
    });
    try {
      final dio = ref.read(apiClientProvider);
      final response = await dio.post('/team/invites', data: {
        'fullName': name,
        'roleId': _roleId,
        if (email.isNotEmpty) 'email': email,
        if (phone.isNotEmpty) 'phone': phone,
        if (isFarmerRole && _villageId != null) 'villageId': _villageId,
      });
      final data = response.data as Map<String, dynamic>;
      setState(() => _result = CreateInviteResult.fromJson(data));
      ref.invalidate(teamInvitesProvider);
    } catch (e) {
      setState(() => _error = apiErrorMessage(e));
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  Future<void> _copyLink() async {
    if (_result == null) return;
    await Clipboard.setData(ClipboardData(text: _result!.inviteLink));
    setState(() => _linkCopied = true);
    Future.delayed(const Duration(seconds: 2), () {
      if (mounted) setState(() => _linkCopied = false);
    });
  }

  Future<void> _shareWhatsApp() async {
    if (_result == null) return;
    final phone = _phoneController.text.trim().replaceAll(RegExp(r'\D'), '');
    if (phone.isEmpty) return;
    final message = 'Hi ${_nameController.text.trim()}, you have been invited to join ShabooAgri. '
        'Click here to activate your account: ${_result!.inviteLink}';
    final uri = Uri.parse('https://wa.me/91$phone?text=${Uri.encodeComponent(message)}');
    if (await canLaunchUrl(uri)) await launchUrl(uri, mode: LaunchMode.externalApplication);
  }

  @override
  Widget build(BuildContext context) {
    final rolesAsync = ref.watch(_rolesProvider);
    final roles = rolesAsync.valueOrNull ?? const <RoleOption>[];
    final selectedRoleMatches = roles.where((r) => r.id == _roleId);
    final selectedRole = selectedRoleMatches.isEmpty ? null : selectedRoleMatches.first;
    final isFarmerRole = selectedRole?.systemKey == 'farmer';

    return Scaffold(
      appBar: AppBar(
        title: const Text('Invite Staff Member'),
        leading: IconButton(icon: const Icon(Icons.arrow_back), onPressed: () => context.pop()),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16.0),
        child: _result != null ? _buildResult(_result!) : _buildForm(rolesAsync, isFarmerRole),
      ),
    );
  }

  Widget _buildForm(AsyncValue<List<RoleOption>> rolesAsync, bool isFarmerRole) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        if (_error != null)
          Padding(padding: const EdgeInsets.only(bottom: 12), child: Text(_error!, style: const TextStyle(color: Colors.red))),
        TextField(
          controller: _nameController,
          decoration: const InputDecoration(labelText: 'Full Name *', hintText: 'e.g. Ramesh Kumar', border: OutlineInputBorder()),
          enabled: !_saving,
        ),
        const SizedBox(height: 16),
        rolesAsync.when(
          data: (roles) => DropdownButtonFormField<String>(
            initialValue: _roleId,
            decoration: const InputDecoration(labelText: 'Role *', border: OutlineInputBorder()),
            items: roles.map((r) => DropdownMenuItem(value: r.id, child: Text(r.name))).toList(),
            onChanged: _saving ? null : (v) => setState(() => _roleId = v),
          ),
          loading: () => const LinearProgressIndicator(),
          error: (e, s) => Text('Could not load roles: ${apiErrorMessage(e)}'),
        ),
        const SizedBox(height: 16),
        TextField(
          controller: _emailController,
          decoration: const InputDecoration(labelText: 'Email (optional if phone given)', hintText: 'name@example.com', border: OutlineInputBorder()),
          keyboardType: TextInputType.emailAddress,
          enabled: !_saving,
        ),
        const SizedBox(height: 16),
        TextField(
          controller: _phoneController,
          decoration: const InputDecoration(labelText: 'Phone (optional if email given)', hintText: '9876543210', border: OutlineInputBorder()),
          keyboardType: TextInputType.phone,
          enabled: !_saving,
        ),
        if (isFarmerRole) ...[
          const SizedBox(height: 16),
          Consumer(builder: (context, ref, _) {
            final villagesAsync = ref.watch(villagesListProvider);
            return villagesAsync.when(
              data: (villages) => DropdownButtonFormField<String>(
                initialValue: _villageId,
                decoration: const InputDecoration(labelText: 'Village *', border: OutlineInputBorder()),
                items: villages.map((v) => DropdownMenuItem(value: v.id, child: Text(v.name))).toList(),
                onChanged: _saving ? null : (v) => setState(() => _villageId = v),
              ),
              loading: () => const LinearProgressIndicator(),
              error: (e, s) => Text('Could not load villages: ${apiErrorMessage(e)}'),
            );
          }),
        ],
        const SizedBox(height: 24),
        ElevatedButton(
          onPressed: _saving ? null : () => _submit(isFarmerRole),
          style: ElevatedButton.styleFrom(padding: const EdgeInsets.symmetric(vertical: 16)),
          child: _saving
              ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
              : const Text('Send Invite'),
        ),
      ],
    );
  }

  Widget _buildResult(CreateInviteResult result) {
    Widget deliveryNotice;
    if (result.deliveryMethod == 'email') {
      deliveryNotice = _successAlert('Invite emailed to ${_emailController.text.trim()}. They can click the link to set their password and get started.');
    } else if (result.deliveryMethod == 'sms') {
      deliveryNotice = _successAlert('SMS invite sent to ${_phoneController.text.trim()}. They can click the link to set their password and get started.');
    } else {
      deliveryNotice = Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(color: Colors.blue.shade50, borderRadius: BorderRadius.circular(8)),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Invite link generated — copy or share it directly with them (WhatsApp, SMS, etc.):'),
            const SizedBox(height: 8),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
              decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(8)),
              child: Row(children: [
                Expanded(child: Text(result.inviteLink, style: const TextStyle(fontSize: 12))),
                IconButton(
                  icon: Icon(_linkCopied ? Icons.check_circle : Icons.copy, size: 18),
                  tooltip: 'Copy link',
                  onPressed: _copyLink,
                ),
              ]),
            ),
          ],
        ),
      );
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        deliveryNotice,
        if (_phoneController.text.trim().isNotEmpty) ...[
          const SizedBox(height: 16),
          OutlinedButton(onPressed: _shareWhatsApp, child: const Text('Share via WhatsApp')),
        ],
        const SizedBox(height: 16),
        ElevatedButton(
          onPressed: () => context.pop(),
          style: ElevatedButton.styleFrom(padding: const EdgeInsets.symmetric(vertical: 16)),
          child: const Text('Done'),
        ),
      ],
    );
  }

  Widget _successAlert(String text) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(color: Colors.green.shade50, borderRadius: BorderRadius.circular(8)),
      child: Row(children: [
        Icon(Icons.check_circle, size: 16, color: Colors.green.shade700),
        const SizedBox(width: 8),
        Expanded(child: Text(text, style: TextStyle(color: Colors.green.shade700))),
      ]),
    );
  }
}
