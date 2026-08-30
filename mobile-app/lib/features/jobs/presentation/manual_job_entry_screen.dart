import 'package:flutter/material.dart';
import 'package:shabooagri_mobile/core/sync/data_sync.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../core/layout/responsive_form.dart';
import '../../../core/network/api_client.dart';
import '../../../core/network/api_error.dart';
import '../../../core/widgets/adaptive_scaffold.dart';
import '../../customers/presentation/customer_list_screen.dart';
import '../../drivers/presentation/driver_list_screen.dart';
import '../../machines/presentation/machine_list_screen.dart';
import '../../villages/presentation/village_list_screen.dart';
import 'job_list_screen.dart';

class PricingMethodOption {
  final String id;
  final String label;
  // hour | minute | acre | null (fixed/custom). Minimum Charge is a floor on
  // metered methods only, so the UI keys off this.
  final String? unit;
  PricingMethodOption.fromJson(Map<String, dynamic> json)
      : id = json['id'] as String,
        label = json['label'] as String,
        unit = json['unit'] as String?;
}

final pricingMethodsListProvider = FutureProvider<List<PricingMethodOption>>((ref) async {
  syncOn(ref, {SyncEntity.pricingMethod});
  final dio = ref.watch(apiClientProvider);
  final response = await dio.get('/pricing-methods');
  return (response.data as List<dynamic>).map((j) => PricingMethodOption.fromJson(j as Map<String, dynamic>)).toList();
});

/// "Log After-Work Entry" — records field work completed without the
/// phone-based live workflow (e.g. logged by the Manager after the fact).
/// Matches `ManualJobEntryModal.tsx`'s fields, minus its inline
/// quick-create-Farmer sub-form (create the Customer first via the
/// Customers screen, already built).
class ManualJobEntryScreen extends ConsumerStatefulWidget {
  const ManualJobEntryScreen({super.key});

  @override
  ConsumerState<ManualJobEntryScreen> createState() => _ManualJobEntryScreenState();
}

class _ManualJobEntryScreenState extends ConsumerState<ManualJobEntryScreen> {
  final _rateController = TextEditingController(text: '500');
  final _acresController = TextEditingController();
  final _fuelController = TextEditingController();
  final _notesController = TextEditingController();
  final _hoursOverrideController = TextEditingController();
  String? _customerId;
  String? _villageId;
  String? _machineId;
  String? _driverId;
  String? _pricingMethodId;
  String? _selectedUnit; // unit of selected pricing method (metered => show minimum)
  final _minChargeController = TextEditingController();
  DateTime _workDate = DateTime.now();
  TimeOfDay _startTime = const TimeOfDay(hour: 8, minute: 0);
  TimeOfDay _endTime = const TimeOfDay(hour: 12, minute: 0);
  bool _saving = false;
  String? _error;

  @override
  void dispose() {
    _rateController.dispose();
    _minChargeController.dispose();
    _acresController.dispose();
    _fuelController.dispose();
    _notesController.dispose();
    _hoursOverrideController.dispose();
    super.dispose();
  }

  double get _calculatedHours {
    final start = _startTime.hour + _startTime.minute / 60;
    final end = _endTime.hour + _endTime.minute / 60;
    final diff = end - start;
    return diff > 0 ? diff : 0;
  }

  DateTime _combine(DateTime date, TimeOfDay time) =>
      DateTime(date.year, date.month, date.day, time.hour, time.minute);

  Future<void> _pickDate() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: _workDate,
      firstDate: DateTime.now().subtract(const Duration(days: 365)),
      lastDate: DateTime.now(),
    );
    if (picked != null) setState(() => _workDate = picked);
  }

  Future<void> _pickStartTime() async {
    final picked = await showTimePicker(context: context, initialTime: _startTime);
    if (picked != null) setState(() => _startTime = picked);
  }

  Future<void> _pickEndTime() async {
    final picked = await showTimePicker(context: context, initialTime: _endTime);
    if (picked != null) setState(() => _endTime = picked);
  }

  Future<void> _save() async {
    final rate = double.tryParse(_rateController.text.trim());
    if (_customerId == null || _villageId == null || _machineId == null || _driverId == null || _pricingMethodId == null || rate == null) {
      setState(() => _error = 'Please complete all required fields (Customer, Village, Machine, Driver, Pricing Method).');
      return;
    }
    setState(() {
      _saving = true;
      _error = null;
    });
    final overrideHours = double.tryParse(_hoursOverrideController.text.trim());
    try {
      final dio = ref.read(apiClientProvider);
      await dio.post('/jobs/manual', data: {
        'customerId': _customerId,
        'villageId': _villageId,
        'machineId': _machineId,
        'driverId': _driverId,
        'scheduledDate': _workDate.toIso8601String(),
        'pricingMethodId': _pricingMethodId,
        'rate': rate,
        // Optional minimum billable floor (§8.2) — metered methods only; backend
        // applies the authoritative max(metered, minimumCharge).
        if (_selectedUnit != null && _minChargeController.text.trim().isNotEmpty)
          'minimumCharge': double.tryParse(_minChargeController.text.trim()),
        'startTime': _combine(_workDate, _startTime).toIso8601String(),
        'endTime': _combine(_workDate, _endTime).toIso8601String(),
        'actualHours': ?overrideHours,
        if (_acresController.text.trim().isNotEmpty) 'completedAcres': double.tryParse(_acresController.text.trim()),
        if (_fuelController.text.trim().isNotEmpty) 'fuelUsedLitres': double.tryParse(_fuelController.text.trim()),
        if (_notesController.text.trim().isNotEmpty) 'notes': _notesController.text.trim(),
      });
      ref.invalidate(jobsListProvider);
      if (mounted) context.go('/jobs');
    } catch (e) {
      setState(() => _error = apiErrorMessage(e));
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final customersAsync = ref.watch(customersListProvider);
    final villagesAsync = ref.watch(villagesListProvider);
    final machinesAsync = ref.watch(machinesListProvider);
    final driversAsync = ref.watch(driversListProvider);
    final pricingAsync = ref.watch(pricingMethodsListProvider);

    return AdaptiveScaffold(
      currentRoute: '/jobs',
      title: 'Log After-Work Entry',
      showBack: true,
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16.0),
        child: DesktopFormContainer(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const Text(
              'Enter field work details after completion when the live phone workflow wasn\'t used. Duration, pricing, and the invoice are calculated automatically.',
              style: TextStyle(color: Colors.grey),
            ),
            const SizedBox(height: 16),
            if (_error != null)
              Padding(padding: const EdgeInsets.only(bottom: 12), child: Text(_error!, style: const TextStyle(color: Colors.red))),
            ResponsiveFormGrid(
              children: [
                customersAsync.when(
                  data: (customers) => DropdownButtonFormField<String>(
                    initialValue: _customerId,
                    decoration: const InputDecoration(labelText: 'Customer *', border: OutlineInputBorder()),
                    items: customers.map((c) => DropdownMenuItem(value: c.id, child: Text(c.name))).toList(),
                    onChanged: _saving ? null : (v) => setState(() => _customerId = v),
                  ),
                  loading: () => const LinearProgressIndicator(),
                  error: (e, s) => Text('Could not load customers: ${apiErrorMessage(e)}'),
                ),
                villagesAsync.when(
                  data: (villages) => DropdownButtonFormField<String>(
                    initialValue: _villageId,
                    decoration: const InputDecoration(labelText: 'Village *', border: OutlineInputBorder()),
                    items: villages.map((v) => DropdownMenuItem(value: v.id, child: Text(v.name))).toList(),
                    onChanged: _saving ? null : (v) => setState(() => _villageId = v),
                  ),
                  loading: () => const LinearProgressIndicator(),
                  error: (e, s) => Text('Could not load villages: ${apiErrorMessage(e)}'),
                ),
                machinesAsync.when(
                  data: (machines) => DropdownButtonFormField<String>(
                    initialValue: _machineId,
                    decoration: const InputDecoration(labelText: 'Machine *', border: OutlineInputBorder()),
                    items: machines.map((m) => DropdownMenuItem(value: m.id, child: Text(m.registrationNumber))).toList(),
                    onChanged: _saving ? null : (v) => setState(() => _machineId = v),
                  ),
                  loading: () => const LinearProgressIndicator(),
                  error: (e, s) => Text('Could not load machines: ${apiErrorMessage(e)}'),
                ),
                driversAsync.when(
                  data: (drivers) => DropdownButtonFormField<String>(
                    initialValue: _driverId,
                    decoration: const InputDecoration(labelText: 'Driver *', border: OutlineInputBorder()),
                    items: drivers.map((d) => DropdownMenuItem(value: d.id, child: Text(d.name))).toList(),
                    onChanged: _saving ? null : (v) => setState(() => _driverId = v),
                  ),
                  loading: () => const LinearProgressIndicator(),
                  error: (e, s) => Text('Could not load drivers: ${apiErrorMessage(e)}'),
                ),
              ],
            ),
            const SizedBox(height: 16),
            ListTile(
              contentPadding: EdgeInsets.zero,
              title: const Text('Work Date *'),
              subtitle: Text(_workDate.toIso8601String().split('T').first),
              trailing: const Icon(Icons.calendar_today),
              onTap: _saving ? null : _pickDate,
            ),
            Row(children: [
              Expanded(
                child: ListTile(
                  contentPadding: EdgeInsets.zero,
                  title: const Text('Start Time *'),
                  subtitle: Text(_startTime.format(context)),
                  onTap: _saving ? null : _pickStartTime,
                ),
              ),
              Expanded(
                child: ListTile(
                  contentPadding: EdgeInsets.zero,
                  title: const Text('End Time *'),
                  subtitle: Text(_endTime.format(context)),
                  onTap: _saving ? null : _pickEndTime,
                ),
              ),
            ]),
            Text('Calculated Duration: ${_calculatedHours.toStringAsFixed(2)} hours', style: const TextStyle(color: Colors.grey)),
            const SizedBox(height: 8),
            TextField(
              controller: _hoursOverrideController,
              decoration: InputDecoration(labelText: 'Override Hours', hintText: _calculatedHours.toStringAsFixed(2), border: const OutlineInputBorder()),
              keyboardType: const TextInputType.numberWithOptions(decimal: true),
              enabled: !_saving,
            ),
            const SizedBox(height: 16),
            pricingAsync.when(
              data: (methods) => DropdownButtonFormField<String>(
                initialValue: _pricingMethodId,
                decoration: const InputDecoration(labelText: 'Pricing Method *', border: OutlineInputBorder()),
                items: methods.map((m) => DropdownMenuItem(value: m.id, child: Text(m.label))).toList(),
                onChanged: _saving
                    ? null
                    : (v) => setState(() {
                          _pricingMethodId = v;
                          _selectedUnit =
                              v == null ? null : methods.firstWhere((m) => m.id == v).unit;
                        }),
              ),
              loading: () => const LinearProgressIndicator(),
              error: (e, s) => Text('Could not load pricing methods: ${apiErrorMessage(e)}'),
            ),
            const SizedBox(height: 16),
            TextField(
              controller: _rateController,
              decoration: const InputDecoration(labelText: 'Rate (₹) *', border: OutlineInputBorder()),
              keyboardType: const TextInputType.numberWithOptions(decimal: true),
              enabled: !_saving,
            ),
            if (_selectedUnit != null) ...[
              const SizedBox(height: 16),
              TextField(
                controller: _minChargeController,
                decoration: const InputDecoration(
                  labelText: 'Minimum Charge (₹)',
                  helperText: 'Optional. Lowest amount that will be charged.',
                  border: OutlineInputBorder(),
                ),
                keyboardType: const TextInputType.numberWithOptions(decimal: true),
                enabled: !_saving,
              ),
            ],
            const SizedBox(height: 16),
            TextField(
              controller: _acresController,
              decoration: const InputDecoration(labelText: 'Acres Worked', border: OutlineInputBorder()),
              keyboardType: const TextInputType.numberWithOptions(decimal: true),
              enabled: !_saving,
            ),
            const SizedBox(height: 16),
            TextField(
              controller: _fuelController,
              decoration: const InputDecoration(labelText: 'Fuel Used (Litres)', border: OutlineInputBorder()),
              keyboardType: const TextInputType.numberWithOptions(decimal: true),
              enabled: !_saving,
            ),
            const SizedBox(height: 16),
            TextField(
              controller: _notesController,
              decoration: const InputDecoration(labelText: 'Work Notes / Comments', border: OutlineInputBorder()),
              maxLines: 2,
              enabled: !_saving,
            ),
            const SizedBox(height: 24),
            DesktopFormActions(
              child: ElevatedButton(
                onPressed: _saving ? null : _save,
                style: ElevatedButton.styleFrom(padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 32)),
                child: _saving
                    ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                    : const Text('Log Completed Work & Generate Invoice'),
              ),
            ),
          ],
        ),
        ),
      ),
    );
  }
}
