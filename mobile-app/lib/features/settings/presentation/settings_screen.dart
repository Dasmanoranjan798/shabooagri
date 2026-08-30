import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/models/company_profile.dart';
import '../../../core/network/api_client.dart';
import '../../../core/network/api_error.dart';
import '../../../core/layout/responsive_form.dart';
import '../../../core/providers/company_profile_provider.dart';
import '../../../core/providers/session_provider.dart';
import '../../../core/widgets/adaptive_scaffold.dart';
import '../../../core/widgets/change_password_card.dart';
import '../../../core/widgets/change_pin_card.dart';

/// Settings Control Center — mirrors `SettingsPage.tsx`'s 4 tabs exactly.
/// Gated server-side by `settings.manage` on the PATCH (confirmed
/// Owner-only via `seedData.ts`'s `ROLE_PERMISSIONS.manager` list, which
/// does NOT include `settings.manage` — unlike most other admin modules in
/// this app, Manager does not get write access here). GET is open to any
/// authenticated role (with bank/UPI fields redacted server-side for
/// non-Owner viewers), so all 4 tabs render read-only for Manager rather
/// than being hidden entirely.
class SettingsScreen extends ConsumerStatefulWidget {
  const SettingsScreen({super.key});

  @override
  ConsumerState<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends ConsumerState<SettingsScreen> {
  @override
  Widget build(BuildContext context) {
    final user = ref.watch(currentUserProvider);
    final canManage = user?.roleSystemKey == 'owner';
    final profileAsync = ref.watch(companyProfileProvider);

    // The tabbed control-center lives inside the AdaptiveScaffold body (desktop
    // sidebar + top bar / phone drawer + app bar), with the TabBar as the first
    // row of the content rather than pinned under an AppBar — so the desktop
    // shell (persistent sidebar) is used on Windows/desktop just like every
    // other module, while the 4 tabs and their forms stay identical.
    return DefaultTabController(
      length: 4,
      child: AdaptiveScaffold(
        currentRoute: '/settings',
        title: 'Settings',
        actions: [
          IconButton(icon: const Icon(Icons.refresh), onPressed: () => ref.invalidate(companyProfileProvider)),
        ],
        body: Column(
          children: [
            Material(
              color: Theme.of(context).colorScheme.surface,
              child: Column(
                children: [
                  const TabBar(
                    isScrollable: true,
                    tabAlignment: TabAlignment.start,
                    tabs: [
                      Tab(text: 'Business Profile'),
                      Tab(text: 'Invoicing & Payments'),
                      Tab(text: 'Equipment & Operational Rules'),
                      Tab(text: 'My Account & Security'),
                    ],
                  ),
                  Divider(height: 1, color: Theme.of(context).dividerColor),
                ],
              ),
            ),
            Expanded(
              child: profileAsync.when(
                data: (profile) => TabBarView(
                  children: [
                    _BusinessProfileTab(profile: profile, canManage: canManage),
                    _InvoicingTab(profile: profile, canManage: canManage),
                    _OperationsTab(profile: profile, canManage: canManage),
                    const SingleChildScrollView(
                      padding: EdgeInsets.all(16.0),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          ChangePasswordCard(),
                          SizedBox(height: 16),
                          ChangePinCard(),
                        ],
                      ),
                    ),
                  ],
                ),
                loading: () => const Center(child: CircularProgressIndicator()),
                error: (e, s) => Center(child: Text('Error: ${apiErrorMessage(e)}')),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

Widget _readOnlyBanner(String text) {
  return Container(
    margin: const EdgeInsets.only(bottom: 16),
    padding: const EdgeInsets.all(12),
    decoration: BoxDecoration(color: Colors.blue.shade50, borderRadius: BorderRadius.circular(8)),
    child: Row(children: [
      const Icon(Icons.lock, size: 16, color: Colors.blueGrey),
      const SizedBox(width: 8),
      Expanded(child: Text(text, style: const TextStyle(fontSize: 13))),
    ]),
  );
}

class _BusinessProfileTab extends ConsumerStatefulWidget {
  final CompanyProfile profile;
  final bool canManage;
  const _BusinessProfileTab({required this.profile, required this.canManage});

  @override
  ConsumerState<_BusinessProfileTab> createState() => _BusinessProfileTabState();
}

class _BusinessProfileTabState extends ConsumerState<_BusinessProfileTab> {
  late final TextEditingController _name;
  late final TextEditingController _phone;
  late final TextEditingController _email;
  late final TextEditingController _address;
  late final TextEditingController _city;
  late final TextEditingController _district;
  late final TextEditingController _state;
  late final TextEditingController _pincode;
  late final TextEditingController _country;
  late bool _isGstRegistered;
  late final TextEditingController _gstin;
  late final TextEditingController _pan;
  bool _saving = false;
  String? _error;
  bool _saved = false;

  @override
  void initState() {
    super.initState();
    final p = widget.profile;
    _name = TextEditingController(text: p.name);
    _phone = TextEditingController(text: p.phone ?? '');
    _email = TextEditingController(text: p.email ?? '');
    _address = TextEditingController(text: p.address ?? '');
    _city = TextEditingController(text: p.city ?? '');
    _district = TextEditingController(text: p.district ?? '');
    _state = TextEditingController(text: p.state ?? '');
    _pincode = TextEditingController(text: p.pincode ?? '');
    _country = TextEditingController(text: p.country ?? 'India');
    _isGstRegistered = p.isGstRegistered;
    _gstin = TextEditingController(text: p.gstin ?? '');
    _pan = TextEditingController(text: p.pan ?? '');
  }

  @override
  void dispose() {
    for (final c in [_name, _phone, _email, _address, _city, _district, _state, _pincode, _country, _gstin, _pan]) {
      c.dispose();
    }
    super.dispose();
  }

  Future<void> _save() async {
    setState(() {
      _saving = true;
      _error = null;
      _saved = false;
    });
    try {
      final dio = ref.read(apiClientProvider);
      await dio.patch('/settings/profile', data: {
        'name': _name.text.trim(),
        'address': _address.text.trim().isEmpty ? null : _address.text.trim(),
        'city': _city.text.trim().isEmpty ? null : _city.text.trim(),
        'district': _district.text.trim().isEmpty ? null : _district.text.trim(),
        'state': _state.text.trim().isEmpty ? null : _state.text.trim(),
        'pincode': _pincode.text.trim().isEmpty ? null : _pincode.text.trim(),
        'country': _country.text.trim().isEmpty ? null : _country.text.trim(),
        'phone': _phone.text.trim().isEmpty ? null : _phone.text.trim(),
        'email': _email.text.trim().isEmpty ? null : _email.text.trim(),
        'isGstRegistered': _isGstRegistered,
        'gstin': _gstin.text.trim().isEmpty ? null : _gstin.text.trim().toUpperCase(),
        'pan': _pan.text.trim().isEmpty ? null : _pan.text.trim().toUpperCase(),
      });
      ref.invalidate(companyProfileProvider);
      setState(() => _saved = true);
      Future.delayed(const Duration(seconds: 3), () {
        if (mounted) setState(() => _saved = false);
      });
    } catch (e) {
      setState(() => _error = apiErrorMessage(e));
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final enabled = widget.canManage && !_saving;
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16.0),
      child: DesktopFormContainer(
        maxWidth: 960,
        child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          if (!widget.canManage) _readOnlyBanner('Read-only — only the Owner can edit company profile settings.'),
          if (_error != null) Padding(padding: const EdgeInsets.only(bottom: 12), child: Text(_error!, style: const TextStyle(color: Colors.red))),
          if (_saved) const Padding(padding: EdgeInsets.only(bottom: 12), child: Text('Business profile saved successfully.', style: TextStyle(color: Colors.green))),
          ResponsiveFormGrid(
            gap: 0,
            fullWidthIndices: const {0, 3},
            children: [
              _field('Business Name *', _name, enabled),
              _field('Primary Phone', _phone, enabled),
              _field('Official Email', _email, enabled),
              _field('Business Address', _address, enabled),
              _field('City / Town', _city, enabled),
              _field('District', _district, enabled),
              _field('State', _state, enabled),
              _field('PIN / Postal Code', _pincode, enabled),
              _field('Country', _country, enabled),
            ],
          ),
          const SizedBox(height: 8),
          Card(
            color: Colors.grey.shade50,
            child: Padding(
              padding: const EdgeInsets.all(12.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('Tax & Business Identifiers (Optional)', style: TextStyle(fontWeight: FontWeight.bold)),
                  SwitchListTile(
                    contentPadding: EdgeInsets.zero,
                    title: const Text('GST Registered Business'),
                    subtitle: const Text('GST is optional and is NOT forced on every farmer booking.', style: TextStyle(fontSize: 11)),
                    value: _isGstRegistered,
                    onChanged: enabled ? (v) => setState(() => _isGstRegistered = v) : null,
                  ),
                  _field('GSTIN (15 Alphanumeric)', _gstin, enabled, maxLength: 15),
                  _field('PAN Number (10 Alphanumeric)', _pan, enabled, maxLength: 10),
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),
          _readOnlyField('Currency', widget.profile.currency),
          _readOnlyField('Timezone', widget.profile.timezone),
          _readOnlyField('Language', widget.profile.language),
          if (widget.canManage) ...[
            const SizedBox(height: 16),
            ElevatedButton(
              onPressed: _saving ? null : _save,
              child: _saving
                  ? const SizedBox(height: 18, width: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                  : const Text('Save Profile & Identity'),
            ),
          ],
          const SizedBox(height: 24),
          Card(
            child: Padding(
              padding: const EdgeInsets.all(12.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('Company Metadata', style: TextStyle(fontWeight: FontWeight.bold)),
                  const SizedBox(height: 8),
                  _readOnlyField('Company ID', widget.profile.id),
                  _readOnlyField('Slug', widget.profile.slug),
                  _readOnlyField('Status', widget.profile.isActive ? 'Active' : 'Inactive'),
                  _readOnlyField(
                    'Created',
                    widget.profile.createdAt != null ? widget.profile.createdAt!.toIso8601String().split('T').first : '—',
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
      ),
    );
  }

  Widget _field(String label, TextEditingController controller, bool enabled, {int? maxLength}) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: TextField(
        controller: controller,
        maxLength: maxLength,
        decoration: InputDecoration(labelText: label, border: const OutlineInputBorder()),
        enabled: enabled,
      ),
    );
  }

  Widget _readOnlyField(String label, String value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        children: [
          SizedBox(width: 90, child: Text(label, style: const TextStyle(color: Colors.grey, fontSize: 12))),
          Expanded(child: Text(value, style: const TextStyle(fontFamily: 'monospace', fontSize: 12))),
        ],
      ),
    );
  }
}

class _InvoicingTab extends ConsumerStatefulWidget {
  final CompanyProfile profile;
  final bool canManage;
  const _InvoicingTab({required this.profile, required this.canManage});

  @override
  ConsumerState<_InvoicingTab> createState() => _InvoicingTabState();
}

class _InvoicingTabState extends ConsumerState<_InvoicingTab> {
  late final TextEditingController _invoicePrefix;
  late final TextEditingController _bankName;
  late final TextEditingController _accountNumber;
  late final TextEditingController _ifscCode;
  late final TextEditingController _upiId;
  late final TextEditingController _taxRate;
  late bool _taxInclusive;
  bool _saving = false;
  String? _error;
  bool _saved = false;

  @override
  void initState() {
    super.initState();
    final p = widget.profile;
    _invoicePrefix = TextEditingController(text: p.invoicePrefix ?? 'INV');
    _bankName = TextEditingController(text: p.bankName ?? '');
    _accountNumber = TextEditingController(text: p.accountNumber ?? '');
    _ifscCode = TextEditingController(text: p.ifscCode ?? '');
    _upiId = TextEditingController(text: p.upiId ?? '');
    _taxRate = TextEditingController(text: (p.defaultTaxRate ?? 18).toString());
    _taxInclusive = p.taxInclusive;
  }

  @override
  void dispose() {
    for (final c in [_invoicePrefix, _bankName, _accountNumber, _ifscCode, _upiId, _taxRate]) {
      c.dispose();
    }
    super.dispose();
  }

  Future<void> _save() async {
    setState(() {
      _saving = true;
      _error = null;
      _saved = false;
    });
    try {
      final dio = ref.read(apiClientProvider);
      await dio.patch('/settings/profile', data: {
        'invoicePrefix': _invoicePrefix.text.trim().isEmpty ? null : _invoicePrefix.text.trim(),
        'bankName': _bankName.text.trim().isEmpty ? null : _bankName.text.trim(),
        'accountNumber': _accountNumber.text.trim().isEmpty ? null : _accountNumber.text.trim(),
        'ifscCode': _ifscCode.text.trim().isEmpty ? null : _ifscCode.text.trim().toUpperCase(),
        'upiId': _upiId.text.trim().isEmpty ? null : _upiId.text.trim(),
        'defaultTaxRate': double.tryParse(_taxRate.text.trim()) ?? 0,
        'taxInclusive': _taxInclusive,
      });
      ref.invalidate(companyProfileProvider);
      setState(() => _saved = true);
      Future.delayed(const Duration(seconds: 3), () {
        if (mounted) setState(() => _saved = false);
      });
    } catch (e) {
      setState(() => _error = apiErrorMessage(e));
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final enabled = widget.canManage && !_saving;
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16.0),
      child: DesktopFormContainer(
        maxWidth: 960,
        child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          if (!widget.canManage) _readOnlyBanner('Read-only — only the Owner can edit invoice & payment settings.'),
          if (_error != null) Padding(padding: const EdgeInsets.only(bottom: 12), child: Text(_error!, style: const TextStyle(color: Colors.red))),
          if (_saved)
            const Padding(padding: EdgeInsets.only(bottom: 12), child: Text('Invoicing and payment settings saved successfully.', style: TextStyle(color: Colors.green))),
          TextField(
            controller: _invoicePrefix,
            maxLength: 10,
            decoration: const InputDecoration(labelText: 'Invoice Prefix', border: OutlineInputBorder()),
            enabled: enabled,
          ),
          Padding(
            padding: const EdgeInsets.only(bottom: 12),
            child: Text('Invoice numbers auto-generate as ${_invoicePrefix.text.isEmpty ? 'INV' : _invoicePrefix.text}-000001, etc.',
                style: const TextStyle(fontSize: 11, color: Colors.grey)),
          ),
          Card(
            color: Colors.grey.shade50,
            child: Padding(
              padding: const EdgeInsets.all(12.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('Business Bank & UPI Payment Details', style: TextStyle(fontWeight: FontWeight.bold)),
                  const Text('Rendered on customer invoices and payment receipts for direct payment collection.',
                      style: TextStyle(fontSize: 11, color: Colors.grey)),
                  const SizedBox(height: 8),
                  TextField(controller: _bankName, decoration: const InputDecoration(labelText: 'Bank Name', border: OutlineInputBorder()), enabled: enabled),
                  const SizedBox(height: 12),
                  TextField(controller: _accountNumber, decoration: const InputDecoration(labelText: 'Account Number', border: OutlineInputBorder()), enabled: enabled),
                  const SizedBox(height: 12),
                  TextField(
                    controller: _ifscCode,
                    maxLength: 11,
                    decoration: const InputDecoration(labelText: 'IFSC Code', border: OutlineInputBorder()),
                    enabled: enabled,
                  ),
                  const SizedBox(height: 12),
                  TextField(controller: _upiId, decoration: const InputDecoration(labelText: 'UPI ID / VPA', border: OutlineInputBorder()), enabled: enabled),
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),
          Card(
            color: Colors.grey.shade50,
            child: Padding(
              padding: const EdgeInsets.all(12.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('Tax Defaults & Pricing Preference', style: TextStyle(fontWeight: FontWeight.bold)),
                  const Text('Applied when GST is explicitly enabled on an invoice. Normal farmer bookings default to GST OFF.',
                      style: TextStyle(fontSize: 11, color: Colors.grey)),
                  const SizedBox(height: 8),
                  TextField(
                    controller: _taxRate,
                    decoration: const InputDecoration(labelText: 'Default Tax Rate (%)', border: OutlineInputBorder()),
                    keyboardType: const TextInputType.numberWithOptions(decimal: true),
                    enabled: enabled,
                  ),
                  SwitchListTile(
                    contentPadding: EdgeInsets.zero,
                    title: const Text('Tax-Inclusive Pricing Preference'),
                    value: _taxInclusive,
                    onChanged: enabled ? (v) => setState(() => _taxInclusive = v) : null,
                  ),
                ],
              ),
            ),
          ),
          if (widget.canManage) ...[
            const SizedBox(height: 16),
            ElevatedButton(
              onPressed: _saving ? null : _save,
              child: _saving
                  ? const SizedBox(height: 18, width: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                  : const Text('Save Invoicing & Payment Settings'),
            ),
          ],
        ],
      ),
      ),
    );
  }
}

class _OperationsTab extends ConsumerStatefulWidget {
  final CompanyProfile profile;
  final bool canManage;
  const _OperationsTab({required this.profile, required this.canManage});

  @override
  ConsumerState<_OperationsTab> createState() => _OperationsTabState();
}

class _OperationsTabState extends ConsumerState<_OperationsTab> {
  late final TextEditingController _serviceAlertHours;
  late final TextEditingController _insuranceAlertDays;
  late final TextEditingController _licenseAlertDays;
  late bool _requireJobPhoto;
  late bool _requireJobFuelLog;
  bool _saving = false;
  String? _error;
  bool _saved = false;

  @override
  void initState() {
    super.initState();
    final p = widget.profile;
    _serviceAlertHours = TextEditingController(text: p.serviceAlertHours.toString());
    _insuranceAlertDays = TextEditingController(text: p.insuranceAlertDays.toString());
    _licenseAlertDays = TextEditingController(text: p.licenseAlertDays.toString());
    _requireJobPhoto = p.requireJobPhoto;
    _requireJobFuelLog = p.requireJobFuelLog;
  }

  @override
  void dispose() {
    for (final c in [_serviceAlertHours, _insuranceAlertDays, _licenseAlertDays]) {
      c.dispose();
    }
    super.dispose();
  }

  Future<void> _save() async {
    setState(() {
      _saving = true;
      _error = null;
      _saved = false;
    });
    try {
      final dio = ref.read(apiClientProvider);
      await dio.patch('/settings/profile', data: {
        'serviceAlertHours': int.tryParse(_serviceAlertHours.text.trim()) ?? 50,
        'insuranceAlertDays': int.tryParse(_insuranceAlertDays.text.trim()) ?? 30,
        'licenseAlertDays': int.tryParse(_licenseAlertDays.text.trim()) ?? 30,
        'requireJobPhoto': _requireJobPhoto,
        'requireJobFuelLog': _requireJobFuelLog,
      });
      ref.invalidate(companyProfileProvider);
      setState(() => _saved = true);
      Future.delayed(const Duration(seconds: 3), () {
        if (mounted) setState(() => _saved = false);
      });
    } catch (e) {
      setState(() => _error = apiErrorMessage(e));
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final enabled = widget.canManage && !_saving;
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16.0),
      child: DesktopFormContainer(
        maxWidth: 960,
        child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          if (!widget.canManage) _readOnlyBanner('Read-only — only the Owner can edit operational rules.'),
          if (_error != null) Padding(padding: const EdgeInsets.only(bottom: 12), child: Text(_error!, style: const TextStyle(color: Colors.red))),
          if (_saved) const Padding(padding: EdgeInsets.only(bottom: 12), child: Text('Operational rules saved successfully.', style: TextStyle(color: Colors.green))),
          const Text('Fleet Alert & Expiry Warning Thresholds', style: TextStyle(fontWeight: FontWeight.bold)),
          const SizedBox(height: 12),
          TextField(
            controller: _serviceAlertHours,
            decoration: const InputDecoration(
              labelText: 'Machine Service Alert Threshold (Hours)',
              helperText: 'Warn when remaining service hours are within this threshold (default 50h).',
              border: OutlineInputBorder(),
            ),
            keyboardType: TextInputType.number,
            enabled: enabled,
          ),
          const SizedBox(height: 16),
          TextField(
            controller: _insuranceAlertDays,
            decoration: const InputDecoration(
              labelText: 'Machine Insurance & Document Expiry (Days)',
              helperText: 'Warn when insurance/registration expires within this many days (default 30).',
              border: OutlineInputBorder(),
            ),
            keyboardType: TextInputType.number,
            enabled: enabled,
          ),
          const SizedBox(height: 16),
          TextField(
            controller: _licenseAlertDays,
            decoration: const InputDecoration(
              labelText: 'Driver License Expiry Warning (Days)',
              helperText: 'Warn when operator license expires within this many days (default 30).',
              border: OutlineInputBorder(),
            ),
            keyboardType: TextInputType.number,
            enabled: enabled,
          ),
          const SizedBox(height: 24),
          const Text('Mandatory Job Completion Rules', style: TextStyle(fontWeight: FontWeight.bold)),
          SwitchListTile(
            contentPadding: EdgeInsets.zero,
            title: const Text('Require Mandatory Completion Photo'),
            subtitle: const Text('Before a job can be completed', style: TextStyle(fontSize: 11)),
            value: _requireJobPhoto,
            onChanged: enabled ? (v) => setState(() => _requireJobPhoto = v) : null,
          ),
          SwitchListTile(
            contentPadding: EdgeInsets.zero,
            title: const Text('Require Mandatory Fuel-Log Entry'),
            subtitle: const Text('Before a job can be completed', style: TextStyle(fontSize: 11)),
            value: _requireJobFuelLog,
            onChanged: enabled ? (v) => setState(() => _requireJobFuelLog = v) : null,
          ),
          if (widget.canManage) ...[
            const SizedBox(height: 16),
            ElevatedButton(
              onPressed: _saving ? null : _save,
              child: _saving
                  ? const SizedBox(height: 18, width: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                  : const Text('Save Operational Rules'),
            ),
          ],
        ],
      ),
      ),
    );
  }
}
