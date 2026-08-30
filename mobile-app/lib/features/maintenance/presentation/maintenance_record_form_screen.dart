import 'package:flutter/material.dart';
import 'package:shabooagri_mobile/core/sync/data_sync.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../core/layout/responsive.dart';
import '../../../core/layout/responsive_form.dart';
import '../../../core/network/api_client.dart';
import '../../../core/network/api_error.dart';
import '../../../core/widgets/adaptive_scaffold.dart';
import '../../machines/presentation/machine_list_screen.dart';
import 'maintenance_screen.dart';

final maintenanceRecordByIdProvider = FutureProvider.family<Map<String, dynamic>, String>((ref, id) async {
  syncOn(ref, {SyncEntity.maintenance});
  final dio = ref.watch(apiClientProvider);
  final response = await dio.get('/maintenance/records/$id');
  return response.data as Map<String, dynamic>;
});

/// Log Service Record — matches `MaintenanceLogModal.tsx`: machine,
/// service date, cost, plus service-type/notes.
class MaintenanceRecordFormScreen extends ConsumerStatefulWidget {
  final String? recordId;

  const MaintenanceRecordFormScreen({super.key, this.recordId});

  @override
  ConsumerState<MaintenanceRecordFormScreen> createState() => _MaintenanceRecordFormScreenState();
}

class _MaintenanceRecordFormScreenState extends ConsumerState<MaintenanceRecordFormScreen> {
  final _hourMeterController = TextEditingController();
  final _descriptionController = TextEditingController();
  final _costController = TextEditingController();
  final _performedByController = TextEditingController();
  String? _machineId;
  DateTime _serviceDate = DateTime.now();
  bool _saving = false;
  bool _prefilled = false;
  String? _error;

  bool get _isEdit => widget.recordId != null;

  void _prefillFrom(Map<String, dynamic> record) {
    if (_prefilled) return;
    _prefilled = true;
    _machineId = (record['machine'] as Map<String, dynamic>?)?['id'] as String?;
    _hourMeterController.text = record['hourMeterAtService']?.toString() ?? '';
    _descriptionController.text = record['description'] as String? ?? '';
    _costController.text = record['cost']?.toString() ?? '';
    _performedByController.text = record['performedBy'] as String? ?? '';
    if (record['serviceDate'] != null) {
      _serviceDate = DateTime.parse(record['serviceDate'] as String);
    }
  }

  @override
  void dispose() {
    _hourMeterController.dispose();
    _descriptionController.dispose();
    _costController.dispose();
    _performedByController.dispose();
    super.dispose();
  }

  Future<void> _pickDate() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: _serviceDate,
      firstDate: DateTime.now().subtract(const Duration(days: 365 * 3)),
      lastDate: DateTime.now(),
    );
    if (picked != null) setState(() => _serviceDate = picked);
  }

  String _isoDate(DateTime d) => '${d.year}-${d.month.toString().padLeft(2, '0')}-${d.day.toString().padLeft(2, '0')}';

  Future<void> _save() async {
    if (_machineId == null && !_isEdit) {
      setState(() => _error = 'Select a machine.');
      return;
    }
    setState(() {
      _saving = true;
      _error = null;
    });
    final dio = ref.read(apiClientProvider);
    final data = {
      if (_machineId != null && !_isEdit) 'machineId': _machineId,
      'serviceDate': _isoDate(_serviceDate),
      if (_hourMeterController.text.trim().isNotEmpty)
        'hourMeterAtService': double.tryParse(_hourMeterController.text.trim()),
      if (_descriptionController.text.trim().isNotEmpty) 'description': _descriptionController.text.trim(),
      if (_costController.text.trim().isNotEmpty) 'cost': double.tryParse(_costController.text.trim()),
      if (_performedByController.text.trim().isNotEmpty) 'performedBy': _performedByController.text.trim(),
    };
    try {
      if (_isEdit) {
        await dio.patch('/maintenance/records/${widget.recordId}', data: data);
      } else {
        await dio.post('/maintenance/records', data: data);
      }
      ref.invalidate(maintenanceRecordsProvider);
      ref.invalidate(maintenanceAlertsProvider);
      if (mounted) context.go('/maintenance');
    } catch (e) {
      setState(() => _error = apiErrorMessage(e));
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return AdaptiveScaffold(
      currentRoute: '/maintenance',
      title: _isEdit ? 'Edit Service Record' : 'Log Service Record',
      showBack: true,
      body: (_isEdit && !_prefilled)
          ? ref.watch(maintenanceRecordByIdProvider(widget.recordId!)).when(
              data: (record) {
                _prefillFrom(record);
                return _buildForm(context);
              },
              loading: () => const Center(child: CircularProgressIndicator()),
              error: (e, s) => Center(child: Text('Could not load record: ${apiErrorMessage(e)}')),
            )
          : _buildForm(context),
    );
  }

  Widget _buildForm(BuildContext context) {
    final machinesAsync = ref.watch(machinesListProvider);

    return SingleChildScrollView(
      padding: EdgeInsets.all(context.responsive.isDesktop ? 24.0 : 16.0),
      child: DesktopFormContainer(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            if (_error != null)
              Padding(
                padding: const EdgeInsets.only(bottom: 12),
                child: Text(_error!, style: const TextStyle(color: Colors.red)),
              ),
            ResponsiveFormGrid(
              children: [
                if (!_isEdit)
                  machinesAsync.when(
                    data: (machines) => DropdownButtonFormField<String>(
                      initialValue: _machineId,
                      decoration: const InputDecoration(labelText: 'Machine *', border: OutlineInputBorder()),
                      items: machines.map((m) => DropdownMenuItem(value: m.id, child: Text(m.registrationNumber))).toList(),
                      onChanged: _saving ? null : (value) => setState(() => _machineId = value),
                    ),
                    loading: () => const LinearProgressIndicator(),
                    error: (e, s) => Text('Could not load machines: ${apiErrorMessage(e)}'),
                  ),
                InputDecorator(
                  decoration: const InputDecoration(labelText: 'Service Date', border: OutlineInputBorder()),
                  child: InkWell(
                    onTap: _saving ? null : _pickDate,
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(_isoDate(_serviceDate)),
                        const Icon(Icons.calendar_today, size: 18),
                      ],
                    ),
                  ),
                ),
                TextField(
                  controller: _hourMeterController,
                  decoration: const InputDecoration(labelText: 'Hour Meter at Service', border: OutlineInputBorder()),
                  keyboardType: const TextInputType.numberWithOptions(decimal: true),
                  enabled: !_saving,
                ),
                TextField(
                  controller: _costController,
                  decoration: const InputDecoration(labelText: 'Cost', border: OutlineInputBorder(), prefixText: '₹ '),
                  keyboardType: const TextInputType.numberWithOptions(decimal: true),
                  enabled: !_saving,
                ),
                TextField(
                  controller: _performedByController,
                  decoration: const InputDecoration(labelText: 'Performed By', border: OutlineInputBorder()),
                  enabled: !_saving,
                ),
              ],
            ),
            const SizedBox(height: 16),
            TextField(
              controller: _descriptionController,
              decoration: const InputDecoration(labelText: 'Description / Notes', border: OutlineInputBorder()),
              maxLines: 3,
              enabled: !_saving,
            ),
            const SizedBox(height: 24),
            DesktopFormActions(
              child: ElevatedButton(
                onPressed: _saving ? null : _save,
                style: ElevatedButton.styleFrom(padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 32)),
                child: _saving
                    ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                    : Text(_isEdit ? 'Save Changes' : 'Log Service Record'),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
