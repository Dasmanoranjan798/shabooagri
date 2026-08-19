import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../core/network/api_client.dart';
import '../../../core/network/api_error.dart';
import 'driver_list_screen.dart';

class EmployeeOption {
  final String id;
  final String name;
  EmployeeOption.fromJson(Map<String, dynamic> json)
      : id = json['id'] as String,
        name = json['name'] as String;
}

final employeeOptionsProvider = FutureProvider<List<EmployeeOption>>((ref) async {
  final dio = ref.watch(apiClientProvider);
  final response = await dio.get('/employees');
  return (response.data as List<dynamic>).map((j) => EmployeeOption.fromJson(j as Map<String, dynamic>)).toList();
});

final driverByIdProvider = FutureProvider.family<Map<String, dynamic>, String>((ref, id) async {
  final dio = ref.watch(apiClientProvider);
  final response = await dio.get('/drivers/$id');
  return response.data as Map<String, dynamic>;
});

const _availabilityOptions = ['AVAILABLE', 'ON_JOB', 'OFF_DUTY'];

/// Create/Edit Driver. The website supports two modes — link an existing
/// Employee, or create a brand-new one inline. Mobile only supports
/// linking an existing Employee for now: inline Employee creation needs
/// the Employee form, which doesn't exist yet until Stage 6 lands. See
/// BUILD_LOG.md — this is a disclosed sequencing gap, not a silent one.
class DriverFormScreen extends ConsumerStatefulWidget {
  final String? driverId;

  const DriverFormScreen({super.key, this.driverId});

  @override
  ConsumerState<DriverFormScreen> createState() => _DriverFormScreenState();
}

class _DriverFormScreenState extends ConsumerState<DriverFormScreen> {
  final _licenseController = TextEditingController();
  String? _employeeId;
  String _availability = 'AVAILABLE';
  DateTime? _licenseExpiryDate;
  bool _saving = false;
  bool _prefilled = false;
  String? _error;

  bool get _isEdit => widget.driverId != null;

  void _prefillFrom(Map<String, dynamic> driver) {
    if (_prefilled) return;
    _prefilled = true;
    _employeeId = driver['employeeId'] as String?;
    _licenseController.text = driver['licenseNumber'] as String? ?? '';
    _availability = driver['availabilityStatus'] as String? ?? 'AVAILABLE';
    if (driver['licenseExpiryDate'] != null) {
      _licenseExpiryDate = DateTime.parse(driver['licenseExpiryDate'] as String);
    }
  }

  @override
  void dispose() {
    _licenseController.dispose();
    super.dispose();
  }

  Future<void> _pickLicenseExpiry() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: _licenseExpiryDate ?? DateTime.now(),
      firstDate: DateTime.now().subtract(const Duration(days: 365 * 10)),
      lastDate: DateTime.now().add(const Duration(days: 365 * 20)),
    );
    if (picked != null) setState(() => _licenseExpiryDate = picked);
  }

  Future<void> _save() async {
    if (_employeeId == null) {
      setState(() => _error = 'Select an employee to link this driver to.');
      return;
    }
    setState(() {
      _saving = true;
      _error = null;
    });
    final dio = ref.read(apiClientProvider);
    final data = {
      'employeeId': _employeeId,
      if (_licenseController.text.trim().isNotEmpty) 'licenseNumber': _licenseController.text.trim(),
      if (_licenseExpiryDate != null) 'licenseExpiryDate': _licenseExpiryDate!.toIso8601String(),
      'availabilityStatus': _availability,
    };
    try {
      
      String? newId;
      if (_isEdit) {
        await dio.patch('/drivers/${widget.driverId}', data: data);
      } else {
        final res = await dio.post('/drivers', data: data);
        newId = res.data['id'];
      }
      ref.invalidate(driversListProvider);
      if (mounted) {
        if (context.canPop()) {
          context.pop(newId);
        } else {
          context.go('/drivers');
        }
      }
    } catch (e) {
      setState(() => _error = apiErrorMessage(e));
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_isEdit && !_prefilled) {
      final driverAsync = ref.watch(driverByIdProvider(widget.driverId!));
      return Scaffold(
        appBar: AppBar(title: const Text('Edit Driver')),
        body: driverAsync.when(
          data: (driver) {
            _prefillFrom(driver);
            return _buildForm();
          },
          loading: () => const Center(child: CircularProgressIndicator()),
          error: (e, s) => Center(child: Text('Could not load driver: ${apiErrorMessage(e)}')),
        ),
      );
    }

    return Scaffold(
      appBar: AppBar(
        title: Text(_isEdit ? 'Edit Driver' : 'New Driver'),
        leading: IconButton(icon: const Icon(Icons.arrow_back), onPressed: () => context.canPop() ? context.pop() : context.go('/drivers')),
      ),
      body: _buildForm(),
    );
  }

  Widget _buildForm() {
    final employeesAsync = ref.watch(employeeOptionsProvider);

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
          employeesAsync.when(
            data: (employees) => DropdownButtonFormField<String>(
              initialValue: _employeeId,
              decoration: const InputDecoration(labelText: 'Employee *', border: OutlineInputBorder()),
              items: employees.map((e) => DropdownMenuItem(value: e.id, child: Text(e.name))).toList(),
              onChanged: _saving ? null : (value) => setState(() => _employeeId = value),
            ),
            loading: () => const LinearProgressIndicator(),
            error: (e, s) => Text('Could not load employees: ${apiErrorMessage(e)}'),
          ),
          const SizedBox(height: 16),
          TextField(
            controller: _licenseController,
            decoration: const InputDecoration(labelText: 'License Number', border: OutlineInputBorder()),
            enabled: !_saving,
          ),
          const SizedBox(height: 16),
          ListTile(
            contentPadding: EdgeInsets.zero,
            title: const Text('License Expiry Date'),
            subtitle: Text(_licenseExpiryDate == null ? 'Not set' : _licenseExpiryDate!.toIso8601String().split('T').first),
            trailing: const Icon(Icons.calendar_today),
            onTap: _saving ? null : _pickLicenseExpiry,
          ),
          const SizedBox(height: 8),
          DropdownButtonFormField<String>(
            initialValue: _availability,
            decoration: const InputDecoration(labelText: 'Availability', border: OutlineInputBorder()),
            items: _availabilityOptions.map((s) => DropdownMenuItem(value: s, child: Text(s))).toList(),
            onChanged: _saving ? null : (value) => setState(() => _availability = value!),
          ),
          const SizedBox(height: 24),
          ElevatedButton(
            onPressed: _saving ? null : _save,
            style: ElevatedButton.styleFrom(padding: const EdgeInsets.symmetric(vertical: 16)),
            child: _saving
                ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                : Text(_isEdit ? 'Save Changes' : 'Create Driver'),
          ),
        ],
      ),
    );
  }
}
