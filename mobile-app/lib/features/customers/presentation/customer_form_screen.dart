import 'package:flutter/material.dart';
import 'package:shabooagri_mobile/core/sync/data_sync.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../core/layout/responsive.dart';
import '../../../core/layout/responsive_form.dart';
import '../../../core/network/api_client.dart';
import '../../../core/network/api_error.dart';
import '../../../core/widgets/adaptive_scaffold.dart';
import 'customer_list_screen.dart';

final customerByIdProvider = FutureProvider.family<Map<String, dynamic>, String>((ref, id) async {
  syncOn(ref, {SyncEntity.customer});
  final dio = ref.watch(apiClientProvider);
  final response = await dio.get('/customers/$id');
  return response.data as Map<String, dynamic>;
});

/// Create/Edit Customer — name, village, phone, address, notes, GST toggle
/// + GSTIN. The website's optional "send Farmer portal invite" sub-flow is
/// deliberately not included here (same reasoning as Drivers: it's a
/// distinct feature, not core Customer data) — see BUILD_LOG.md.
class CustomerFormScreen extends ConsumerStatefulWidget {
  final String? customerId;

  const CustomerFormScreen({super.key, this.customerId});

  @override
  ConsumerState<CustomerFormScreen> createState() => _CustomerFormScreenState();
}

class _CustomerFormScreenState extends ConsumerState<CustomerFormScreen> {
  final _nameController = TextEditingController();
  final _phoneController = TextEditingController();
  // Address is part of the person now (the Village master was retired).
  final _villageController = TextEditingController();
  final _postOfficeController = TextEditingController();
  final _blockController = TextEditingController();
  final _districtController = TextEditingController();
  final _stateController = TextEditingController();
  final _pinController = TextEditingController();
  final _addressController = TextEditingController();
  final _notesController = TextEditingController();
  final _gstinController = TextEditingController();
  bool _isGstApplicable = false;
  bool _isActive = true;
  bool _saving = false;
  bool _prefilled = false;
  String? _error;

  bool get _isEdit => widget.customerId != null;

  void _prefillFrom(Map<String, dynamic> customer) {
    if (_prefilled) return;
    _prefilled = true;
    _nameController.text = customer['name'] as String? ?? '';
    _phoneController.text = customer['phone'] as String? ?? '';
    _villageController.text = customer['village'] as String? ?? '';
    _postOfficeController.text = customer['postOffice'] as String? ?? '';
    _blockController.text = customer['block'] as String? ?? '';
    _districtController.text = customer['district'] as String? ?? '';
    _stateController.text = customer['state'] as String? ?? '';
    _pinController.text = customer['pin'] as String? ?? '';
    _addressController.text = customer['address'] as String? ?? '';
    _notesController.text = customer['notes'] as String? ?? '';
    _gstinController.text = customer['gstin'] as String? ?? '';
    _isGstApplicable = customer['isGstApplicable'] as bool? ?? false;
    _isActive = customer['isActive'] as bool? ?? true;
  }

  @override
  void dispose() {
    _nameController.dispose();
    _phoneController.dispose();
    _villageController.dispose();
    _postOfficeController.dispose();
    _blockController.dispose();
    _districtController.dispose();
    _stateController.dispose();
    _pinController.dispose();
    _addressController.dispose();
    _notesController.dispose();
    _gstinController.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    final name = _nameController.text.trim();
    if (name.isEmpty) {
      setState(() => _error = 'Name is required.');
      return;
    }
    setState(() {
      _saving = true;
      _error = null;
    });
    final dio = ref.read(apiClientProvider);
    final data = {
      'name': name,
      if (_villageController.text.trim().isNotEmpty) 'village': _villageController.text.trim(),
      if (_postOfficeController.text.trim().isNotEmpty) 'postOffice': _postOfficeController.text.trim(),
      if (_blockController.text.trim().isNotEmpty) 'block': _blockController.text.trim(),
      if (_districtController.text.trim().isNotEmpty) 'district': _districtController.text.trim(),
      if (_stateController.text.trim().isNotEmpty) 'state': _stateController.text.trim(),
      if (_pinController.text.trim().isNotEmpty) 'pin': _pinController.text.trim(),
      if (_phoneController.text.trim().isNotEmpty) 'phone': _phoneController.text.trim(),
      if (_addressController.text.trim().isNotEmpty) 'address': _addressController.text.trim(),
      if (_notesController.text.trim().isNotEmpty) 'notes': _notesController.text.trim(),
      'isGstApplicable': _isGstApplicable,
      if (_isGstApplicable && _gstinController.text.trim().isNotEmpty) 'gstin': _gstinController.text.trim(),
      if (_isEdit) 'isActive': _isActive,
    };
    try {
      
      String? newId;
      if (_isEdit) {
        await dio.patch('/customers/${widget.customerId}', data: data);
      } else {
        final res = await dio.post('/customers', data: data);
        newId = res.data['id'];
      }
      ref.invalidate(customersListProvider);
      if (mounted) {
        if (context.canPop()) {
          context.pop(newId);
        } else {
          context.go('/customers');
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
    return AdaptiveScaffold(
      currentRoute: '/customers',
      title: _isEdit ? 'Edit Customer' : 'New Customer',
      showBack: true,
      body: (_isEdit && !_prefilled)
          ? ref.watch(customerByIdProvider(widget.customerId!)).when(
              data: (customer) {
                _prefillFrom(customer);
                return _buildForm(context);
              },
              loading: () => const Center(child: CircularProgressIndicator()),
              error: (e, s) => Center(child: Text('Could not load customer: ${apiErrorMessage(e)}')),
            )
          : _buildForm(context),
    );
  }

  Widget _buildForm(BuildContext context) {
    final form = Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        if (_error != null)
          Padding(
            padding: const EdgeInsets.only(bottom: 12),
            child: Text(_error!, style: const TextStyle(color: Colors.red)),
          ),
        ResponsiveFormGrid(
          children: [
            TextField(
              controller: _nameController,
              decoration: const InputDecoration(labelText: 'Name *', border: OutlineInputBorder()),
              enabled: !_saving,
            ),
            TextField(
              controller: _phoneController,
              decoration: const InputDecoration(labelText: 'Phone', border: OutlineInputBorder()),
              keyboardType: TextInputType.phone,
              enabled: !_saving,
            ),
            TextField(
              controller: _villageController,
              decoration: const InputDecoration(labelText: 'Village / Locality', border: OutlineInputBorder()),
              enabled: !_saving,
            ),
            TextField(
              controller: _postOfficeController,
              decoration: const InputDecoration(labelText: 'Post Office', border: OutlineInputBorder()),
              enabled: !_saving,
            ),
            TextField(
              controller: _blockController,
              decoration: const InputDecoration(labelText: 'Block / Tahasil', border: OutlineInputBorder()),
              enabled: !_saving,
            ),
            TextField(
              controller: _districtController,
              decoration: const InputDecoration(labelText: 'District', border: OutlineInputBorder()),
              enabled: !_saving,
            ),
            TextField(
              controller: _stateController,
              decoration: const InputDecoration(labelText: 'State', border: OutlineInputBorder()),
              enabled: !_saving,
            ),
            TextField(
              controller: _pinController,
              decoration: const InputDecoration(labelText: 'PIN Code', border: OutlineInputBorder()),
              keyboardType: TextInputType.number,
              enabled: !_saving,
            ),
            TextField(
              controller: _addressController,
              decoration: const InputDecoration(labelText: 'Full Address', border: OutlineInputBorder()),
              enabled: !_saving,
            ),
          ],
        ),
        if (_isEdit) ...[
          const SizedBox(height: 8),
          SwitchListTile(
            contentPadding: EdgeInsets.zero,
            title: const Text('Active (customer can be booked/assigned)'),
            value: _isActive,
            onChanged: _saving ? null : (value) => setState(() => _isActive = value),
          ),
        ],
        const SizedBox(height: 8),
        SwitchListTile(
          contentPadding: EdgeInsets.zero,
          title: const Text('GST Applicable'),
          value: _isGstApplicable,
          onChanged: _saving ? null : (value) => setState(() => _isGstApplicable = value),
        ),
        if (_isGstApplicable) ...[
          const SizedBox(height: 8),
          TextField(
            controller: _gstinController,
            decoration: const InputDecoration(labelText: 'GSTIN', border: OutlineInputBorder()),
            textCapitalization: TextCapitalization.characters,
            enabled: !_saving,
          ),
        ],
        const SizedBox(height: 16),
        TextField(
          controller: _notesController,
          decoration: const InputDecoration(labelText: 'Notes', border: OutlineInputBorder()),
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
                : Text(_isEdit ? 'Save Changes' : 'Create Customer'),
          ),
        ),
      ],
    );

    return SingleChildScrollView(
      padding: EdgeInsets.all(context.responsive.isDesktop ? 24.0 : 16.0),
      child: DesktopFormContainer(child: form),
    );
  }
}
