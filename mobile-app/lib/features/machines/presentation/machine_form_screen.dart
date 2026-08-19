import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../core/network/api_client.dart';
import '../../../core/network/api_error.dart';
import '../../drivers/presentation/driver_list_screen.dart';
import 'machine_list_screen.dart';

class MachineTypeOption {
  final String id;
  final String name;
  MachineTypeOption.fromJson(Map<String, dynamic> json)
      : id = json['id'] as String,
        name = json['name'] as String;
}

final machineTypesProvider = FutureProvider<List<MachineTypeOption>>((ref) async {
  final dio = ref.watch(apiClientProvider);
  final response = await dio.get('/machine-types');
  return (response.data as List<dynamic>).map((j) => MachineTypeOption.fromJson(j as Map<String, dynamic>)).toList();
});

/// Fetches the full live record for editing — the local offline cache
/// doesn't carry every field (e.g. `machineTypeId`), so Edit always reads
/// fresh from the server rather than risk prefilling from stale/partial
/// local data.
final machineByIdProvider = FutureProvider.family<Map<String, dynamic>, String>((ref, id) async {
  final dio = ref.watch(apiClientProvider);
  final response = await dio.get('/machines/$id');
  return response.data as Map<String, dynamic>;
});

const _statusOptions = ['AVAILABLE', 'WORKING', 'REPAIR', 'OFFLINE'];

/// Create/Edit Machine — covers the core fields (type, registration,
/// brand/model, status, hour meter). Insurance/service-schedule fields
/// from the website's fuller form are deliberately left for the
/// Maintenance stage, which owns that data — see BUILD_LOG.md.
class MachineFormScreen extends ConsumerStatefulWidget {
  final String? machineId;

  const MachineFormScreen({super.key, this.machineId});

  @override
  ConsumerState<MachineFormScreen> createState() => _MachineFormScreenState();
}

class _MachineFormScreenState extends ConsumerState<MachineFormScreen> {
  final _registrationController = TextEditingController();
  final _brandController = TextEditingController();
  final _modelController = TextEditingController();
  final _hourMeterController = TextEditingController();
  final _nextServiceDueController = TextEditingController();
  final _insuranceNumberController = TextEditingController();
  final _purchaseYearController = TextEditingController();
  String? _machineTypeId;
  String _status = 'AVAILABLE';
  String? _assignedDriverId;
  DateTime? _insuranceExpiryDate;
  bool _saving = false;
  bool _prefilled = false;
  String? _error;

  bool get _isEdit => widget.machineId != null;

  void _prefillFrom(Map<String, dynamic> machine) {
    if (_prefilled) return;
    _prefilled = true;
    _registrationController.text = machine['registrationNumber'] as String? ?? '';
    _brandController.text = machine['brand'] as String? ?? '';
    _modelController.text = machine['model'] as String? ?? '';
    _hourMeterController.text = (machine['hourMeterReading'] as num?)?.toString() ?? '';
    _nextServiceDueController.text = (machine['nextServiceDueHours'] as num?)?.toString() ?? '';
    _insuranceNumberController.text = machine['insuranceNumber'] as String? ?? '';
    _purchaseYearController.text = (machine['purchaseYear'] as num?)?.toString() ?? '';
    _machineTypeId = machine['machineTypeId'] as String?;
    _status = machine['status'] as String? ?? 'AVAILABLE';
    _assignedDriverId = machine['assignedDriverId'] as String?;
    if (machine['insuranceExpiryDate'] != null) {
      _insuranceExpiryDate = DateTime.parse(machine['insuranceExpiryDate'] as String);
    }
  }

  @override
  void dispose() {
    _registrationController.dispose();
    _brandController.dispose();
    _modelController.dispose();
    _hourMeterController.dispose();
    _nextServiceDueController.dispose();
    _insuranceNumberController.dispose();
    _purchaseYearController.dispose();
    super.dispose();
  }

  Future<void> _pickInsuranceExpiry() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: _insuranceExpiryDate ?? DateTime.now(),
      firstDate: DateTime.now().subtract(const Duration(days: 365 * 5)),
      lastDate: DateTime.now().add(const Duration(days: 365 * 10)),
    );
    if (picked != null) setState(() => _insuranceExpiryDate = picked);
  }

  Future<void> _createMachineType(String name) async {
    final dio = ref.read(apiClientProvider);
    try {
      final res = await dio.post('/machine-types', data: {'name': name});
      ref.invalidate(machineTypesProvider);
      setState(() {
        _machineTypeId = res.data['id'] as String;
      });
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(apiErrorMessage(e))));
      }
    }
  }

  Future<void> _showCreateMachineTypeDialog() async {
    final ctrl = TextEditingController();
    final name = await showDialog<String>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('New Machine Type'),
        content: TextField(
          controller: ctrl,
          decoration: const InputDecoration(hintText: 'e.g. Tractor, Harvester'),
          autofocus: true,
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
          TextButton(
            onPressed: () {
              if (ctrl.text.trim().isNotEmpty) {
                Navigator.pop(ctx, ctrl.text.trim());
              }
            },
            child: const Text('Create'),
          ),
        ],
      ),
    );
    if (name != null && name.isNotEmpty) {
      await _createMachineType(name);
    }
  }

  Future<void> _save() async {
    final registration = _registrationController.text.trim();
    if (registration.isEmpty || (_machineTypeId == null && !_isEdit)) {
      setState(() => _error = 'Registration number and machine type are required.');
      return;
    }
    setState(() {
      _saving = true;
      _error = null;
    });
    final dio = ref.read(apiClientProvider);
    final data = {
      if (_machineTypeId != null) 'machineTypeId': _machineTypeId,
      'registrationNumber': registration,
      if (_brandController.text.trim().isNotEmpty) 'brand': _brandController.text.trim(),
      if (_modelController.text.trim().isNotEmpty) 'model': _modelController.text.trim(),
      'status': _status,
      if (_hourMeterController.text.trim().isNotEmpty)
        'hourMeterReading': double.tryParse(_hourMeterController.text.trim()),
      if (_assignedDriverId != null) 'assignedDriverId': _assignedDriverId,
      if (_nextServiceDueController.text.trim().isNotEmpty)
        'nextServiceDueHours': double.tryParse(_nextServiceDueController.text.trim()),
      if (_insuranceNumberController.text.trim().isNotEmpty) 'insuranceNumber': _insuranceNumberController.text.trim(),
      if (_insuranceExpiryDate != null) 'insuranceExpiryDate': _insuranceExpiryDate!.toIso8601String(),
      if (_purchaseYearController.text.trim().isNotEmpty)
        'purchaseYear': int.tryParse(_purchaseYearController.text.trim()),
    };
    try {
      if (_isEdit) {
        await dio.patch('/machines/${widget.machineId}', data: data);
      } else {
        await dio.post('/machines', data: data);
      }
      ref.invalidate(machinesListProvider);
      if (mounted) context.go('/machines');
    } catch (e) {
      setState(() => _error = apiErrorMessage(e));
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final typesAsync = ref.watch(machineTypesProvider);

    if (_isEdit && !_prefilled) {
      final machineAsync = ref.watch(machineByIdProvider(widget.machineId!));
      return Scaffold(
        appBar: AppBar(title: const Text('Edit Machine')),
        body: machineAsync.when(
          data: (machine) {
            _prefillFrom(machine);
            return _buildForm(typesAsync);
          },
          loading: () => const Center(child: CircularProgressIndicator()),
          error: (e, s) => Center(child: Text('Could not load machine: ${apiErrorMessage(e)}')),
        ),
      );
    }

    return Scaffold(
      appBar: AppBar(
        title: Text(_isEdit ? 'Edit Machine' : 'New Machine'),
        leading: IconButton(icon: const Icon(Icons.arrow_back), onPressed: () => context.go('/machines')),
      ),
      body: _buildForm(typesAsync),
    );
  }

  Widget _buildForm(AsyncValue<List<MachineTypeOption>> typesAsync) {
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
            typesAsync.when(
              data: (types) => Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Expanded(
                    child: DropdownButtonFormField<String>(
                      initialValue: _machineTypeId,
                      decoration: const InputDecoration(labelText: 'Machine Type *', border: OutlineInputBorder()),
                      items: types.map((t) => DropdownMenuItem(value: t.id, child: Text(t.name))).toList(),
                      onChanged: _saving ? null : (value) => setState(() => _machineTypeId = value),
                    ),
                  ),
                  const SizedBox(width: 8),
                  IconButton(
                    icon: const Icon(Icons.add_circle, color: Colors.green, size: 40),
                    onPressed: _saving ? null : _showCreateMachineTypeDialog,
                    tooltip: 'Add new Machine Type',
                  ),
                ],
              ),
              loading: () => const LinearProgressIndicator(),
              error: (e, s) => Text('Could not load machine types: ${apiErrorMessage(e)}'),
            ),
            const SizedBox(height: 16),
            TextField(
              controller: _registrationController,
              decoration: const InputDecoration(labelText: 'Registration Number *', border: OutlineInputBorder()),
              enabled: !_saving,
            ),
            const SizedBox(height: 16),
            TextField(
              controller: _brandController,
              decoration: const InputDecoration(labelText: 'Brand', border: OutlineInputBorder()),
              enabled: !_saving,
            ),
            const SizedBox(height: 16),
            TextField(
              controller: _modelController,
              decoration: const InputDecoration(labelText: 'Model', border: OutlineInputBorder()),
              enabled: !_saving,
            ),
            const SizedBox(height: 16),
            DropdownButtonFormField<String>(
              initialValue: _status,
              decoration: const InputDecoration(labelText: 'Status', border: OutlineInputBorder()),
              items: _statusOptions.map((s) => DropdownMenuItem(value: s, child: Text(s))).toList(),
              onChanged: _saving ? null : (value) => setState(() => _status = value!),
            ),
            const SizedBox(height: 16),
            TextField(
              controller: _hourMeterController,
              decoration: const InputDecoration(labelText: 'Hour Meter Reading', border: OutlineInputBorder()),
              keyboardType: const TextInputType.numberWithOptions(decimal: true),
              enabled: !_saving,
            ),
            const SizedBox(height: 16),
            Consumer(builder: (context, ref, _) {
              final driversAsync = ref.watch(driversListProvider);
              return driversAsync.when(
                data: (drivers) => DropdownButtonFormField<String>(
                  initialValue: _assignedDriverId,
                  decoration: const InputDecoration(labelText: 'Assigned Default Driver', border: OutlineInputBorder()),
                  items: [
                    const DropdownMenuItem(value: null, child: Text('Unassigned')),
                    ...drivers.map((d) => DropdownMenuItem(value: d.id, child: Text(d.name))),
                  ],
                  onChanged: _saving ? null : (value) => setState(() => _assignedDriverId = value),
                ),
                loading: () => const LinearProgressIndicator(),
                error: (e, s) => Text('Could not load drivers: ${apiErrorMessage(e)}'),
              );
            }),
            const SizedBox(height: 16),
            TextField(
              controller: _nextServiceDueController,
              decoration: const InputDecoration(labelText: 'Next Service Due (hrs)', border: OutlineInputBorder()),
              keyboardType: const TextInputType.numberWithOptions(decimal: true),
              enabled: !_saving,
            ),
            const SizedBox(height: 16),
            TextField(
              controller: _insuranceNumberController,
              decoration: const InputDecoration(labelText: 'Insurance Number', border: OutlineInputBorder()),
              enabled: !_saving,
            ),
            const SizedBox(height: 16),
            ListTile(
              contentPadding: EdgeInsets.zero,
              title: const Text('Insurance Expiry Date'),
              subtitle: Text(_insuranceExpiryDate == null
                  ? 'Not set'
                  : _insuranceExpiryDate!.toIso8601String().split('T').first),
              trailing: const Icon(Icons.calendar_today),
              onTap: _saving ? null : _pickInsuranceExpiry,
            ),
            const SizedBox(height: 8),
            TextField(
              controller: _purchaseYearController,
              decoration: const InputDecoration(labelText: 'Purchase Year', border: OutlineInputBorder()),
              keyboardType: TextInputType.number,
              enabled: !_saving,
            ),
            const SizedBox(height: 24),
            ElevatedButton(
              onPressed: _saving ? null : _save,
              style: ElevatedButton.styleFrom(padding: const EdgeInsets.symmetric(vertical: 16)),
              child: _saving
                  ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                  : Text(_isEdit ? 'Save Changes' : 'Create Machine'),
            ),
          ],
        ),
      );
  }
}
