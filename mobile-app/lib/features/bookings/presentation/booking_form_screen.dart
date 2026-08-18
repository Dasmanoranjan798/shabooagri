import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../core/network/api_client.dart';
import '../../../core/network/api_error.dart';
import '../../customers/presentation/customer_list_screen.dart';
import '../../machines/presentation/machine_list_screen.dart';
import '../../drivers/presentation/driver_list_screen.dart';
import '../../villages/presentation/village_list_screen.dart';
import 'booking_list_screen.dart';

final bookingByIdProvider = FutureProvider.family<Map<String, dynamic>, String>((ref, id) async {
  final dio = ref.watch(apiClientProvider);
  final response = await dio.get('/bookings/$id');
  return response.data as Map<String, dynamic>;
});

/// Create/Edit Booking. Machine/driver are optional at creation (the
/// backend decides "Ready to Start" vs "Awaiting Machine" from whether
/// they're set) — matches `createBookingSchema` exactly, and matches the
/// website's own dispatch-free flow (saving a Booking immediately creates
/// its Job Card; there's no separate Accept/On-the-way step anymore).
class BookingFormScreen extends ConsumerStatefulWidget {
  final String? bookingId;

  const BookingFormScreen({super.key, this.bookingId});

  @override
  ConsumerState<BookingFormScreen> createState() => _BookingFormScreenState();
}

class _BookingFormScreenState extends ConsumerState<BookingFormScreen> {
  final _workDescriptionController = TextEditingController();
  final _locationController = TextEditingController();
  final _estimatedHoursController = TextEditingController();
  final _estimatedAcresController = TextEditingController();
  final _notesController = TextEditingController();
  String? _customerId;
  String? _villageId;
  String? _machineId;
  String? _driverId;
  DateTime _scheduledDate = DateTime.now();
  TimeOfDay? _scheduledTime;
  bool _saving = false;
  bool _prefilled = false;
  String? _error;

  bool get _isEdit => widget.bookingId != null;

  void _prefillFrom(Map<String, dynamic> booking) {
    if (_prefilled) return;
    _prefilled = true;
    _customerId = booking['customerId'] as String?;
    _villageId = booking['villageId'] as String?;
    _machineId = booking['machineId'] as String?;
    _driverId = booking['driverId'] as String?;
    _workDescriptionController.text = booking['workDescription'] as String? ?? '';
    _locationController.text = booking['location'] as String? ?? '';
    _estimatedHoursController.text = (booking['estimatedHours'] as num?)?.toString() ?? '';
    _estimatedAcresController.text = (booking['estimatedAcres'] as num?)?.toString() ?? '';
    _notesController.text = booking['notes'] as String? ?? '';
    if (booking['scheduledDate'] != null) {
      _scheduledDate = DateTime.parse(booking['scheduledDate'] as String);
    }
    // scheduledTime comes back as a full ISO datetime anchored to an
    // epoch date (backend stores it as a Postgres TIME column) — only the
    // time-of-day part is meaningful.
    if (booking['scheduledTime'] != null) {
      final parsed = DateTime.parse(booking['scheduledTime'] as String);
      _scheduledTime = TimeOfDay(hour: parsed.hour, minute: parsed.minute);
    }
  }

  Future<void> _pickTime() async {
    final picked = await showTimePicker(context: context, initialTime: _scheduledTime ?? TimeOfDay.now());
    if (picked != null) setState(() => _scheduledTime = picked);
  }

  @override
  void dispose() {
    _workDescriptionController.dispose();
    _locationController.dispose();
    _estimatedHoursController.dispose();
    _estimatedAcresController.dispose();
    _notesController.dispose();
    super.dispose();
  }

  Future<void> _pickDate() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: _scheduledDate,
      firstDate: DateTime.now().subtract(const Duration(days: 365)),
      lastDate: DateTime.now().add(const Duration(days: 365)),
    );
    if (picked != null) setState(() => _scheduledDate = picked);
  }

  Future<void> _save() async {
    final workDescription = _workDescriptionController.text.trim();
    if (workDescription.isEmpty || _customerId == null || _villageId == null) {
      setState(() => _error = 'Customer, village, and work description are required.');
      return;
    }
    setState(() {
      _saving = true;
      _error = null;
    });
    final dio = ref.read(apiClientProvider);
    final data = {
      'customerId': _customerId,
      'villageId': _villageId,
      'workDescription': workDescription,
      'scheduledDate': _scheduledDate.toIso8601String(),
      if (_scheduledTime != null)
        'scheduledTime':
            '${_scheduledTime!.hour.toString().padLeft(2, '0')}:${_scheduledTime!.minute.toString().padLeft(2, '0')}',
      if (_locationController.text.trim().isNotEmpty) 'location': _locationController.text.trim(),
      if (_estimatedHoursController.text.trim().isNotEmpty)
        'estimatedHours': double.tryParse(_estimatedHoursController.text.trim()),
      if (_estimatedAcresController.text.trim().isNotEmpty)
        'estimatedAcres': double.tryParse(_estimatedAcresController.text.trim()),
      if (_notesController.text.trim().isNotEmpty) 'notes': _notesController.text.trim(),
      // Only sent on create — updateBookingSchema omits machine/driver
      // (dedicated assign endpoints handle those on Edit, called separately
      // below once the booking already exists).
      if (!_isEdit) ...{
        if (_machineId != null) 'machineId': _machineId,
        if (_driverId != null) 'driverId': _driverId,
      },
    };
    try {
      String bookingId;
      if (_isEdit) {
        bookingId = widget.bookingId!;
        await dio.patch('/bookings/$bookingId', data: data);
        // Machine/driver assignment on Edit goes through their own
        // dedicated endpoints (machine.assign / driver.assign permissions),
        // matching the backend's separation exactly.
        await dio.patch('/bookings/$bookingId/machine', data: {'machineId': _machineId});
        await dio.patch('/bookings/$bookingId/driver', data: {'driverId': _driverId});
      } else {
        final response = await dio.post('/bookings', data: data);
        bookingId = response.data['id'] as String;
      }
      ref.invalidate(bookingsListProvider);
      if (mounted) context.go('/bookings');
    } catch (e) {
      setState(() => _error = apiErrorMessage(e));
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_isEdit && !_prefilled) {
      final bookingAsync = ref.watch(bookingByIdProvider(widget.bookingId!));
      return Scaffold(
        appBar: AppBar(title: const Text('Edit Booking')),
        body: bookingAsync.when(
          data: (booking) {
            _prefillFrom(booking);
            return _buildForm();
          },
          loading: () => const Center(child: CircularProgressIndicator()),
          error: (e, s) => Center(child: Text('Could not load booking: ${apiErrorMessage(e)}')),
        ),
      );
    }

    return Scaffold(
      appBar: AppBar(
        title: Text(_isEdit ? 'Edit Booking' : 'New Booking'),
        leading: IconButton(icon: const Icon(Icons.arrow_back), onPressed: () => context.go('/bookings')),
      ),
      body: _buildForm(),
    );
  }

  Widget _buildForm() {
    final customersAsync = ref.watch(customersListProvider);
    final villagesAsync = ref.watch(villagesListProvider);
    final machinesAsync = ref.watch(machinesListProvider);
    final driversAsync = ref.watch(driversListProvider);

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
          customersAsync.when(
            data: (customers) => DropdownButtonFormField<String>(
              initialValue: _customerId,
              decoration: const InputDecoration(labelText: 'Customer *', border: OutlineInputBorder()),
              items: customers.map((c) => DropdownMenuItem(value: c.id, child: Text(c.name))).toList(),
              onChanged: _saving ? null : (value) => setState(() => _customerId = value),
            ),
            loading: () => const LinearProgressIndicator(),
            error: (e, s) => Text('Could not load customers: ${apiErrorMessage(e)}'),
          ),
          const SizedBox(height: 16),
          villagesAsync.when(
            data: (villages) => DropdownButtonFormField<String>(
              initialValue: _villageId,
              decoration: const InputDecoration(labelText: 'Village *', border: OutlineInputBorder()),
              items: villages.map((v) => DropdownMenuItem(value: v.id, child: Text(v.name))).toList(),
              onChanged: _saving ? null : (value) => setState(() => _villageId = value),
            ),
            loading: () => const LinearProgressIndicator(),
            error: (e, s) => Text('Could not load villages: ${apiErrorMessage(e)}'),
          ),
          const SizedBox(height: 16),
          TextField(
            controller: _workDescriptionController,
            decoration: const InputDecoration(labelText: 'Work Needed *', border: OutlineInputBorder()),
            maxLines: 2,
            enabled: !_saving,
          ),
          const SizedBox(height: 16),
          ListTile(
            contentPadding: EdgeInsets.zero,
            title: const Text('Scheduled Date'),
            subtitle: Text('${_scheduledDate.year}-${_scheduledDate.month.toString().padLeft(2, '0')}-${_scheduledDate.day.toString().padLeft(2, '0')}'),
            trailing: const Icon(Icons.calendar_today),
            onTap: _saving ? null : _pickDate,
          ),
          ListTile(
            contentPadding: EdgeInsets.zero,
            title: const Text('Scheduled Time'),
            subtitle: Text(_scheduledTime == null ? 'Not set' : _scheduledTime!.format(context)),
            trailing: const Icon(Icons.access_time),
            onTap: _saving ? null : _pickTime,
          ),
          const SizedBox(height: 8),
          TextField(
            controller: _locationController,
            decoration: const InputDecoration(labelText: 'Location', border: OutlineInputBorder()),
            enabled: !_saving,
          ),
          const SizedBox(height: 16),
          Row(children: [
            Expanded(
              child: TextField(
                controller: _estimatedHoursController,
                decoration: const InputDecoration(labelText: 'Est. Hours', border: OutlineInputBorder()),
                keyboardType: const TextInputType.numberWithOptions(decimal: true),
                enabled: !_saving,
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: TextField(
                controller: _estimatedAcresController,
                decoration: const InputDecoration(labelText: 'Est. Acres', border: OutlineInputBorder()),
                keyboardType: const TextInputType.numberWithOptions(decimal: true),
                enabled: !_saving,
              ),
            ),
          ]),
          const SizedBox(height: 16),
          machinesAsync.when(
            data: (machines) => DropdownButtonFormField<String>(
              initialValue: _machineId,
              decoration: const InputDecoration(labelText: 'Machine (optional)', border: OutlineInputBorder()),
              items: [
                const DropdownMenuItem(value: null, child: Text('Not assigned yet')),
                ...machines.map((m) => DropdownMenuItem(value: m.id, child: Text(m.registrationNumber))),
              ],
              onChanged: _saving ? null : (value) => setState(() => _machineId = value),
            ),
            loading: () => const LinearProgressIndicator(),
            error: (e, s) => Text('Could not load machines: ${apiErrorMessage(e)}'),
          ),
          const SizedBox(height: 16),
          driversAsync.when(
            data: (drivers) => DropdownButtonFormField<String>(
              initialValue: _driverId,
              decoration: const InputDecoration(labelText: 'Driver (optional)', border: OutlineInputBorder()),
              items: [
                const DropdownMenuItem(value: null, child: Text('Not assigned yet')),
                ...drivers.map((d) => DropdownMenuItem(value: d.id, child: Text(d.name))),
              ],
              onChanged: _saving ? null : (value) => setState(() => _driverId = value),
            ),
            loading: () => const LinearProgressIndicator(),
            error: (e, s) => Text('Could not load drivers: ${apiErrorMessage(e)}'),
          ),
          const SizedBox(height: 16),
          TextField(
            controller: _notesController,
            decoration: const InputDecoration(labelText: 'Notes', border: OutlineInputBorder()),
            maxLines: 2,
            enabled: !_saving,
          ),
          const SizedBox(height: 24),
          ElevatedButton(
            onPressed: _saving ? null : _save,
            style: ElevatedButton.styleFrom(padding: const EdgeInsets.symmetric(vertical: 16)),
            child: _saving
                ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                : Text(_isEdit ? 'Save Changes' : 'Create Booking'),
          ),
        ],
      ),
    );
  }
}
