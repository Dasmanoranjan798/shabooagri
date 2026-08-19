import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import "package:dio/dio.dart";
import 'package:go_router/go_router.dart';

import '../../../core/network/api_client.dart';
import '../../../core/network/api_error.dart';
import '../../../core/theme/app_theme.dart';
import '../../customers/presentation/customer_list_screen.dart';
import '../../drivers/presentation/driver_list_screen.dart';
import '../../machines/presentation/machine_list_screen.dart';
import '../../villages/presentation/village_list_screen.dart';
import '../data/job_actions_repository.dart';

class FastJobCreateScreen extends ConsumerStatefulWidget {
  const FastJobCreateScreen({super.key});

  @override
  ConsumerState<FastJobCreateScreen> createState() => _FastJobCreateScreenState();
}

class _FastJobCreateScreenState extends ConsumerState<FastJobCreateScreen> {
  String? _customerId;
  String? _villageId;
  String? _machineId;
  String? _driverId;
  final _workController = TextEditingController();
  final _rateController = TextEditingController();
  final _estimateHoursController = TextEditingController();
  
  bool _saving = false;
  bool _ignoreConflict = false;
  String? _error;

  @override
  void dispose() {
    _workController.dispose();
    _rateController.dispose();
    _estimateHoursController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (_customerId == null || _villageId == null || _machineId == null || _driverId == null || _workController.text.trim().isEmpty) {
      setState(() => _error = 'Please fill all required fields (Farmer, Village, Machine, Driver, Work Type)');
      return;
    }

    setState(() {
      _saving = true;
      _error = null;
    });

    try {
      final dio = ref.read(apiClientProvider);
      final res = await dio.post('/bookings', data: {
        'customerId': _customerId,
        'villageId': _villageId,
        'workDescription': _workController.text.trim(),
        'machineId': _machineId,
        'driverId': _driverId,
        'scheduledDate': DateTime.now().toIso8601String(),
        'estimatedHours': _estimateHoursController.text.trim().isNotEmpty ? double.tryParse(_estimateHoursController.text.trim()) : null,
        'ignoreConflict': _ignoreConflict,
      });

      final bookingId = res.data['id'] as String;
      
      // Attempt to set pricing if provided
      if (_rateController.text.trim().isNotEmpty) {
        final rate = double.tryParse(_rateController.text.trim());
        if (rate != null) {
          await dio.put('/jobs/by-booking/$bookingId/pricing', data: {
            'pricingMethodId': 'HOURLY', // Simplified default based on standard
            'rate': rate,
          });
        }
      }

      // Automatically fetch the jobId and go to it
      final jobActions = ref.read(jobActionsRepositoryProvider);
      
      if (mounted) {
        // Wait briefly for triggers/sync
        await Future.delayed(const Duration(milliseconds: 500));
        
        // Find the job ID by booking ID (we know booking = job 1:1 generally)
        final getBooking = await dio.get('/bookings/$bookingId');
        final jobCards = getBooking.data['jobCards'] as List;
        if (jobCards.isNotEmpty) {
           final jobId = jobCards.first['id'] as String;
           context.go('/jobs/$jobId');
        } else {
           context.go('/bookings/$bookingId'); // Fallback
        }
      }
    } catch (e) {
      if (e is DioException && e.response?.statusCode == 409) {
        final errorMsg = e.response?.data?['error']?.toString() ?? '';
        final match = RegExp(r'(BK-\d+)').firstMatch(errorMsg);
        final bkNumber = match?.group(1) ?? 'Unknown';
        
        setState(() => _saving = false);
        final confirm = await showDialog<bool>(
          context: context,
          builder: (context) => AlertDialog(
            title: const Text('Machine & Driver Currently Working'),
            content: Text('This machine and driver are currently assigned to another job.\n\nCurrent Job: $bkNumber\n\nDo you want to book them for this?'),
            actions: [
              TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('CANCEL')),
              ElevatedButton(onPressed: () => Navigator.pop(context, true), child: const Text('BOOK ANYWAY')),
            ],
          ),
        );
        
        if (confirm == true) {
          setState(() => _ignoreConflict = true);
          return _submit(); // Retry
        } else {
          return; // Cancelled
        }
      }
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

    return Scaffold(
      appBar: AppBar(title: const Text('Create Job Card')),
      body: customersAsync.when(
        data: (customers) => villagesAsync.when(
          data: (villages) => machinesAsync.when(
            data: (machines) => driversAsync.when(
              data: (drivers) => ListView(
                padding: const EdgeInsets.all(16),
                children: [
                  if (_error != null)
                    Container(
                      padding: const EdgeInsets.all(12),
                      margin: const EdgeInsets.only(bottom: 16),
                      decoration: BoxDecoration(color: Colors.red.shade50, borderRadius: BorderRadius.circular(8)),
                      child: Text(_error!, style: TextStyle(color: Colors.red.shade700)),
                    ),
                  
                  // 1. Farmer Selection
                  DropdownButtonFormField<String>(
                    value: _customerId,
                    decoration: const InputDecoration(labelText: 'Farmer (Customer) *'),
                    items: [const DropdownMenuItem(value: 'NEW', child: Text('+ Add Farmer', style: TextStyle(color: AppTheme.primary, fontWeight: FontWeight.bold))), ...customers.map((c) => DropdownMenuItem(value: c.id, child: Text(c.name)))],
                    onChanged: (v) {
                       setState(() {
                         _customerId = v;
                         // Smart linked data: Auto-select village based on customer
                         final customer = customers.firstWhere((c) => c.id == v);
                         if (customer.villageName != null) {
                           final villageMatch = villages.firstWhere((vil) => vil.name == customer.villageName, orElse: () => villages.first);
                           _villageId = villageMatch.id;
                         }
                       });
                    },
                  ),
                  const SizedBox(height: 16),

                  // 2. Village
                  DropdownButtonFormField<String>(
                    value: _villageId,
                    decoration: const InputDecoration(labelText: 'Village *'),
                    items: [const DropdownMenuItem(value: 'NEW', child: Text('+ Add Village', style: TextStyle(color: AppTheme.primary, fontWeight: FontWeight.bold))), ...villages.map((v) => DropdownMenuItem(value: v.id, child: Text(v.name)))],
                    onChanged: (v) async {
                      if (v == 'NEW') {
                        final newId = await context.push('/villages/new'); ref.invalidate(villagesListProvider); if (newId != null && newId is String) setState(() => _villageId = newId); return;
                      }
                      setState(() => _villageId = v);
                    },
                  ),
                  const SizedBox(height: 16),
                  
                  // 3. Work Type
                  TextField(
                    controller: _workController,
                    decoration: const InputDecoration(labelText: 'Work Type (e.g. Harvesting) *'),
                  ),
                  const SizedBox(height: 16),
                  
                  // 4. Machine
                  DropdownButtonFormField<String>(
                    value: _machineId,
                    decoration: const InputDecoration(labelText: 'Machine *'),
                    items: [const DropdownMenuItem(value: 'NEW', child: Text('+ Add Machine', style: TextStyle(color: AppTheme.primary, fontWeight: FontWeight.bold))), ...machines.map((m) => DropdownMenuItem(value: m.id, child: Text('${m.registrationNumber} - ${m.status}')))],
                    onChanged: (v) async {
                      if (v == 'NEW') {
                        final newId = await context.push('/machines/new'); ref.invalidate(machinesListProvider); if (newId != null && newId is String) setState(() => _machineId = newId); return;
                      }
                      setState(() => _machineId = v);
                    },
                  ),
                  const SizedBox(height: 16),

                  // 5. Driver
                  DropdownButtonFormField<String>(
                    value: _driverId,
                    decoration: const InputDecoration(labelText: 'Driver *'),
                    items: [const DropdownMenuItem(value: 'NEW', child: Text('+ Add Driver', style: TextStyle(color: AppTheme.primary, fontWeight: FontWeight.bold))), ...drivers.map((d) => DropdownMenuItem(value: d.id, child: Text('${d.name} - ${d.availabilityStatus}')))],
                    onChanged: (v) async {
                      if (v == 'NEW') {
                        final newId = await context.push('/drivers/new'); ref.invalidate(driversListProvider); if (newId != null && newId is String) setState(() => _driverId = newId); return;
                      }
                      setState(() => _driverId = v);
                    },
                  ),
                  const SizedBox(height: 16),

                  // 6. Rate & Estimates
                  Row(
                    children: [
                      Expanded(
                        child: TextField(
                          controller: _rateController,
                          decoration: const InputDecoration(labelText: 'Hourly Rate (₹)'),
                          keyboardType: TextInputType.number,
                        ),
                      ),
                      const SizedBox(width: 16),
                      Expanded(
                        child: TextField(
                          controller: _estimateHoursController,
                          decoration: const InputDecoration(labelText: 'Est. Hours'),
                          keyboardType: TextInputType.number,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 32),

                  // Summary / Review
                  if (_customerId != null && _villageId != null && _machineId != null && _driverId != null)
                    Card(
                      color: AppTheme.primaryLight,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12), side: const BorderSide(color: AppTheme.primary)),
                      child: Padding(
                        padding: const EdgeInsets.all(16),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text('JOB SUMMARY', style: TextStyle(fontWeight: FontWeight.bold, color: AppTheme.primaryDark)),
                            const SizedBox(height: 8),
                            Text('Farmer: ${customers.firstWhere((c) => c.id == _customerId).name}'),
                            Text('Village: ${villages.firstWhere((v) => v.id == _villageId).name}'),
                            Text('Machine: ${machines.firstWhere((m) => m.id == _machineId).registrationNumber}'),
                            Text('Driver: ${drivers.firstWhere((d) => d.id == _driverId).name}'),
                          ],
                        ),
                      ),
                    ),
                  
                  const SizedBox(height: 24),
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton(
                      onPressed: _saving ? null : _submit,
                      style: ElevatedButton.styleFrom(
                        padding: const EdgeInsets.symmetric(vertical: 16),
                        backgroundColor: AppTheme.success,
                      ),
                      child: _saving ? const CircularProgressIndicator(color: Colors.white) : const Text('READY TO START JOB', style: TextStyle(fontSize: 16)),
                    ),
                  ),
                  const SizedBox(height: 48), // Bottom padding
                ],
              ),
              loading: () => const Center(child: CircularProgressIndicator()),
              error: (e, s) => Center(child: Text(e.toString())),
            ),
            loading: () => const Center(child: CircularProgressIndicator()),
            error: (e, s) => Center(child: Text(e.toString())),
          ),
          loading: () => const Center(child: CircularProgressIndicator()),
          error: (e, s) => Center(child: Text(e.toString())),
        ),
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, s) => Center(child: Text(e.toString())),
      ),
    );
  }
}
