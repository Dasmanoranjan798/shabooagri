import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../core/network/api_client.dart';
import '../../../core/network/api_error.dart';
import 'employee_list_screen.dart';

final employeeByIdProvider = FutureProvider.family<Map<String, dynamic>, String>((ref, id) async {
  final dio = ref.watch(apiClientProvider);
  final response = await dio.get('/employees/$id');
  return response.data as Map<String, dynamic>;
});

class RoleOption {
  final String id;
  final String name;
  RoleOption.fromJson(Map<String, dynamic> json)
      : id = json['id'] as String,
        name = json['name'] as String;
}

final rolesProvider = FutureProvider<List<RoleOption>>((ref) async {
  final dio = ref.watch(apiClientProvider);
  final response = await dio.get('/rbac/roles');
  return (response.data as List<dynamic>).map((j) => RoleOption.fromJson(j as Map<String, dynamic>)).toList();
});

const _compensationTypes = ['HOURLY', 'MONTHLY', 'YEARLY'];

/// Create/Edit Employee, plus the optional "Send Login Invite" flow —
/// matches `EmployeeFormModal.tsx`: the invite is a separate action
/// (POST /team/invites) fired after the Employee record itself is saved,
/// only offered for employees without an existing linked user account.
class EmployeeFormScreen extends ConsumerStatefulWidget {
  final String? employeeId;

  const EmployeeFormScreen({super.key, this.employeeId});

  @override
  ConsumerState<EmployeeFormScreen> createState() => _EmployeeFormScreenState();
}

class _EmployeeFormScreenState extends ConsumerState<EmployeeFormScreen> {
  final _nameController = TextEditingController();
  final _phoneController = TextEditingController();
  final _roleTitleController = TextEditingController();
  final _rateController = TextEditingController();
  final _inviteEmailController = TextEditingController();
  final _invitePhoneController = TextEditingController();
  String _employmentStatus = 'ACTIVE';
  String _compensationType = 'MONTHLY';
  DateTime? _joinedDate;
  bool _hasExistingUser = false;
  bool _sendInvite = false;
  String? _inviteRoleId;
  bool _saving = false;
  bool _prefilled = false;
  String? _error;

  bool get _isEdit => widget.employeeId != null;

  void _prefillFrom(Map<String, dynamic> employee) {
    if (_prefilled) return;
    _prefilled = true;
    _nameController.text = employee['name'] as String? ?? '';
    _phoneController.text = employee['phone'] as String? ?? '';
    _roleTitleController.text = employee['roleTitle'] as String? ?? '';
    _employmentStatus = employee['employmentStatus'] as String? ?? 'ACTIVE';
    _compensationType = employee['compensationType'] as String? ?? 'MONTHLY';
    _hasExistingUser = employee['userId'] != null;
    if (employee['joinedDate'] != null) {
      _joinedDate = DateTime.parse(employee['joinedDate'] as String);
    }
    final rate = employee['hourlyRate'] ?? employee['monthlySalary'] ?? employee['yearlySalary'];
    _rateController.text = rate != null ? double.tryParse(rate.toString())?.toString() ?? '' : '';
  }

  Future<void> _pickJoinedDate() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: _joinedDate ?? DateTime.now(),
      firstDate: DateTime.now().subtract(const Duration(days: 365 * 30)),
      lastDate: DateTime.now(),
    );
    if (picked != null) setState(() => _joinedDate = picked);
  }

  @override
  void dispose() {
    _nameController.dispose();
    _phoneController.dispose();
    _roleTitleController.dispose();
    _rateController.dispose();
    _inviteEmailController.dispose();
    _invitePhoneController.dispose();
    super.dispose();
  }

  String get _rateFieldKey {
    switch (_compensationType) {
      case 'HOURLY':
        return 'hourlyRate';
      case 'YEARLY':
        return 'yearlySalary';
      default:
        return 'monthlySalary';
    }
  }

  Future<void> _save() async {
    final name = _nameController.text.trim();
    if (name.isEmpty) {
      setState(() => _error = 'Enter a name.');
      return;
    }
    if (_sendInvite && _inviteRoleId == null) {
      setState(() => _error = 'Select an account role for the invite.');
      return;
    }
    if (_sendInvite && _inviteEmailController.text.trim().isEmpty && _invitePhoneController.text.trim().isEmpty) {
      setState(() => _error = 'Enter an email or phone to send the invite to.');
      return;
    }

    setState(() {
      _saving = true;
      _error = null;
    });
    final dio = ref.read(apiClientProvider);
    final rate = double.tryParse(_rateController.text.trim());
    final data = {
      'name': name,
      if (_phoneController.text.trim().isNotEmpty) 'phone': _phoneController.text.trim(),
      if (_roleTitleController.text.trim().isNotEmpty) 'roleTitle': _roleTitleController.text.trim(),
      'employmentStatus': _employmentStatus,
      'compensationType': _compensationType,
      if (rate != null) _rateFieldKey: rate,
      if (_joinedDate != null) 'joinedDate': _joinedDate!.toIso8601String(),
    };
    try {
      String employeeId;
      if (_isEdit) {
        employeeId = widget.employeeId!;
        await dio.patch('/employees/$employeeId', data: data);
      } else {
        final response = await dio.post('/employees', data: data);
        employeeId = response.data['id'] as String;
      }

      if (_sendInvite) {
        await dio.post('/team/invites', data: {
          'fullName': name,
          'roleId': _inviteRoleId,
          'employeeId': employeeId,
          if (_inviteEmailController.text.trim().isNotEmpty) 'email': _inviteEmailController.text.trim(),
          if (_invitePhoneController.text.trim().isNotEmpty) 'phone': _invitePhoneController.text.trim(),
        });
      }

      ref.invalidate(employeesListProvider);
      if (mounted) context.go('/employees');
    } catch (e) {
      setState(() => _error = apiErrorMessage(e));
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_isEdit && !_prefilled) {
      final employeeAsync = ref.watch(employeeByIdProvider(widget.employeeId!));
      return Scaffold(
        appBar: AppBar(title: const Text('Edit Employee')),
        body: employeeAsync.when(
          data: (employee) {
            _prefillFrom(employee);
            return _buildForm();
          },
          loading: () => const Center(child: CircularProgressIndicator()),
          error: (e, s) => Center(child: Text('Could not load employee: ${apiErrorMessage(e)}')),
        ),
      );
    }

    return Scaffold(
      appBar: AppBar(
        title: Text(_isEdit ? 'Edit Employee' : 'New Employee'),
        leading: IconButton(icon: const Icon(Icons.arrow_back), onPressed: () => context.go('/employees')),
      ),
      body: _buildForm(),
    );
  }

  Widget _buildForm() {
    final canSendInvite = !_isEdit || !_hasExistingUser;

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          if (_error != null)
            Padding(
              padding: const EdgeInsets.only(bottom: 12),
              child: Text(_error!, style: const TextStyle(color: Colors.red)),
            ),
          TextField(
            controller: _nameController,
            decoration: const InputDecoration(labelText: 'Full Name *', border: OutlineInputBorder()),
            enabled: !_saving,
          ),
          const SizedBox(height: 16),
          TextField(
            controller: _roleTitleController,
            decoration: const InputDecoration(labelText: 'Designation / Role Title', border: OutlineInputBorder()),
            enabled: !_saving,
          ),
          const SizedBox(height: 16),
          TextField(
            controller: _phoneController,
            decoration: const InputDecoration(labelText: 'Mobile Phone', border: OutlineInputBorder()),
            keyboardType: TextInputType.phone,
            enabled: !_saving,
          ),
          const SizedBox(height: 16),
          DropdownButtonFormField<String>(
            initialValue: _employmentStatus,
            decoration: const InputDecoration(labelText: 'Employment Status', border: OutlineInputBorder()),
            items: const [
              DropdownMenuItem(value: 'ACTIVE', child: Text('ACTIVE')),
              DropdownMenuItem(value: 'INACTIVE', child: Text('INACTIVE')),
            ],
            onChanged: _saving ? null : (value) => setState(() => _employmentStatus = value!),
          ),
          const SizedBox(height: 16),
          ListTile(
            contentPadding: EdgeInsets.zero,
            title: const Text('Joined Date'),
            subtitle: Text(_joinedDate == null ? 'Not set' : _joinedDate!.toIso8601String().split('T').first),
            trailing: const Icon(Icons.calendar_today),
            onTap: _saving ? null : _pickJoinedDate,
          ),
          const SizedBox(height: 8),
          DropdownButtonFormField<String>(
            initialValue: _compensationType,
            decoration: const InputDecoration(labelText: 'Compensation Type', border: OutlineInputBorder()),
            items: _compensationTypes.map((c) => DropdownMenuItem(value: c, child: Text(c))).toList(),
            onChanged: _saving ? null : (value) => setState(() => _compensationType = value!),
          ),
          const SizedBox(height: 16),
          TextField(
            controller: _rateController,
            decoration: InputDecoration(
              labelText: _compensationType == 'HOURLY'
                  ? 'Hourly Rate'
                  : _compensationType == 'YEARLY'
                      ? 'Yearly Salary'
                      : 'Monthly Salary',
              border: const OutlineInputBorder(),
              prefixText: '₹ ',
            ),
            keyboardType: const TextInputType.numberWithOptions(decimal: true),
            enabled: !_saving,
          ),
          if (canSendInvite) ...[
            const Divider(height: 32),
            SwitchListTile(
              title: const Text('Send ShabooAgri Login Invite'),
              value: _sendInvite,
              onChanged: _saving ? null : (value) => setState(() => _sendInvite = value),
            ),
            if (_sendInvite) ...[
              const SizedBox(height: 8),
              Consumer(builder: (context, ref, _) {
                final rolesAsync = ref.watch(rolesProvider);
                return rolesAsync.when(
                  data: (roles) => DropdownButtonFormField<String>(
                    initialValue: _inviteRoleId,
                    decoration: const InputDecoration(labelText: 'Account Role *', border: OutlineInputBorder()),
                    items: roles.map((r) => DropdownMenuItem(value: r.id, child: Text(r.name))).toList(),
                    onChanged: _saving ? null : (value) => setState(() => _inviteRoleId = value),
                  ),
                  loading: () => const LinearProgressIndicator(),
                  error: (e, s) => Text('Could not load roles: ${apiErrorMessage(e)}'),
                );
              }),
              const SizedBox(height: 12),
              TextField(
                controller: _inviteEmailController,
                decoration: const InputDecoration(labelText: 'Invite Email', border: OutlineInputBorder()),
                keyboardType: TextInputType.emailAddress,
                enabled: !_saving,
              ),
              const SizedBox(height: 12),
              TextField(
                controller: _invitePhoneController,
                decoration: const InputDecoration(labelText: 'Invite Phone (SMS delivery not yet connected)', border: OutlineInputBorder()),
                keyboardType: TextInputType.phone,
                enabled: !_saving,
              ),
            ],
          ],
          const SizedBox(height: 24),
          ElevatedButton(
            onPressed: _saving ? null : _save,
            style: ElevatedButton.styleFrom(padding: const EdgeInsets.symmetric(vertical: 16)),
            child: _saving
                ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                : Text(_isEdit ? 'Save Changes' : 'Create Employee'),
          ),
        ],
      ),
    );
  }
}
