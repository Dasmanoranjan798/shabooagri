import 'package:flutter/material.dart';
import 'package:shabooagri_mobile/core/sync/data_sync.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../core/network/api_client.dart';
import '../../../core/network/api_error.dart';
import '../../../core/providers/company_profile_provider.dart';
import '../../../core/providers/session_provider.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/widgets/adaptive_scaffold.dart';
import '../../../core/widgets/info_row.dart';

final driverDetailProvider = FutureProvider.family<Map<String, dynamic>, String>((ref, id) async {
  syncOn(ref, {SyncEntity.driver});
  final dio = ref.watch(apiClientProvider);
  final response = await dio.get('/drivers/$id');
  return response.data as Map<String, dynamic>;
});

// Driver earnings vs. Payment Out — computed authoritatively by the backend
// (/drivers/:id/earnings): worked time, earned, paid, remaining, status, and
// payment history. The client never recomputes any of it.
final driverEarningsProvider = FutureProvider.family<Map<String, dynamic>, String>((ref, id) async {
  syncOn(ref, {SyncEntity.driver, SyncEntity.job, SyncEntity.payment});
  final dio = ref.watch(apiClientProvider);
  final response = await dio.get('/drivers/$id/earnings');
  return response.data as Map<String, dynamic>;
});

const _driverPaymentMethods = ['CASH', 'UPI', 'BANK_TRANSFER', 'CREDIT'];

class DriverDetailScreen extends ConsumerWidget {
  final String driverId;

  const DriverDetailScreen({super.key, required this.driverId});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final driverAsync = ref.watch(driverDetailProvider(driverId));
    final profileAsync = ref.watch(companyProfileProvider);
    final licenseAlertDays = profileAsync.valueOrNull?.licenseAlertDays ?? 30;

    return AdaptiveScaffold(
      currentRoute: '/drivers',
      title: 'Driver Details',
      showBack: true,
      actions: [
        IconButton(
          icon: const Icon(Icons.edit),
          tooltip: 'Edit',
          onPressed: () => context.go('/drivers/$driverId/edit'),
        ),
      ],
      body: driverAsync.when(
        data: (driver) {
          final employee = driver['employee'] as Map<String, dynamic>? ?? const {};
          final licenseExpiry =
              driver['licenseExpiryDate'] == null ? null : DateTime.parse(driver['licenseExpiryDate'] as String);
          final licenseWarn = expiryWarning(
            expiryDate: licenseExpiry,
            alertDays: licenseAlertDays,
            overdueLabel: 'License Expired',
            dueSoonLabel: 'License Expires',
          );

          return Padding(
            padding: const EdgeInsets.all(16.0),
            child: ListView(
              children: [
                if (licenseWarn != null)
                  Card(
                    color: Colors.red.withValues(alpha: 0.08),
                    child: Padding(
                      padding: const EdgeInsets.all(12.0),
                      child: Text('⚠ Driver License Alert: ${licenseWarn.$3}',
                          style: TextStyle(color: licenseWarn.$1 ? Colors.red : Colors.orange, fontWeight: FontWeight.bold)),
                    ),
                  ),
                Card(
                  margin: const EdgeInsets.only(top: 8),
                  child: Padding(
                    padding: const EdgeInsets.all(16.0),
                    child: Column(
                      children: [
                InfoRow('Name', employee['name'] as String? ?? 'Unknown'),
                InfoRow('Designation', employee['roleTitle'] as String? ?? 'Equipment Operator'),
                if (employee['phone'] != null) InfoRow('Mobile Number', employee['phone'] as String),
                InfoRow('License Number', driver['licenseNumber'] as String? ?? 'N/A'),
                InfoRow(
                  'License Expiry',
                  licenseExpiry != null
                      ? '${licenseExpiry.toIso8601String().split('T').first}${licenseExpiry.isBefore(DateTime.now()) ? ' (Expired)' : ''}'
                      : 'N/A',
                ),
                InfoRow('Availability', driver['availabilityStatus'] as String),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 8),
                _DriverEarningsSection(driverId: driverId),
                const SizedBox(height: 8),
                _DriverCustomerWorkSection(driverId: driverId),
              ],
            ),
          );
        },
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, stack) => Center(child: Text('Error: ${apiErrorMessage(error)}')),
      ),
    );
  }
}

/// Earnings & Payment Out. Owner/Manager can record a payment (POST
/// /drivers/:id/payments) and Owner can void one; a Driver viewing their own
/// record sees a read-only view (the backend scopes and gates both).
class _DriverEarningsSection extends ConsumerStatefulWidget {
  final String driverId;
  const _DriverEarningsSection({required this.driverId});

  @override
  ConsumerState<_DriverEarningsSection> createState() => _DriverEarningsSectionState();
}

class _DriverEarningsSectionState extends ConsumerState<_DriverEarningsSection> {
  bool _busy = false;

  String _money(dynamic v) => '₹${(double.tryParse(v.toString()) ?? 0).toStringAsFixed(2)}';

  // Driver Payment-Out status. This is a PAYABLE context (money going OUT), so
  // there is no "money in" — PAID must NOT be green (§20/§22: green is reserved
  // for receivables). UNPAID = red (we still owe), PARTIAL = amber, PAID =
  // neutral (settled). The remaining-payable amount below is the red money value.
  Color _statusColor(String s) {
    switch (s) {
      case 'PAID':
        return AppTheme.textMuted;
      case 'PARTIALLY_PAID':
        return AppTheme.warning;
      default:
        return AppTheme.payable;
    }
  }

  Future<void> _recordPayment(double remaining) async {
    final result = await showDialog<Map<String, String>>(
      context: context,
      builder: (_) => _RecordDriverPaymentDialog(remaining: remaining),
    );
    if (result == null) return;
    final amount = double.tryParse(result['amount'] ?? '');
    if (amount == null || amount <= 0) return;
    setState(() => _busy = true);
    try {
      final dio = ref.read(apiClientProvider);
      await dio.post('/drivers/${widget.driverId}/payments', data: {
        'amount': amount,
        'paymentMethod': result['paymentMethod'],
        if ((result['referenceNumber'] ?? '').isNotEmpty) 'referenceNumber': result['referenceNumber'],
        if ((result['notes'] ?? '').isNotEmpty) 'notes': result['notes'],
      });
      ref.invalidate(driverEarningsProvider(widget.driverId));
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Payment recorded.')));
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(apiErrorMessage(e))));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _cancelPayment(String paymentId) async {
    final controller = TextEditingController();
    final reason = await showDialog<String>(
      context: context,
      builder: (_) => AlertDialog(
        title: const Text('Cancel Payment'),
        content: TextField(
          controller: controller,
          decoration: const InputDecoration(labelText: 'Reason *', border: OutlineInputBorder()),
          autofocus: true,
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context), child: const Text('Keep')),
          ElevatedButton(onPressed: () => Navigator.pop(context, controller.text.trim()), child: const Text('Cancel Payment')),
        ],
      ),
    );
    if (reason == null || reason.isEmpty) return;
    setState(() => _busy = true);
    try {
      final dio = ref.read(apiClientProvider);
      await dio.post('/drivers/${widget.driverId}/payments/$paymentId/cancel', data: {'reason': reason});
      ref.invalidate(driverEarningsProvider(widget.driverId));
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Payment cancelled.')));
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(apiErrorMessage(e))));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final earningsAsync = ref.watch(driverEarningsProvider(widget.driverId));
    final user = ref.watch(currentUserProvider);
    final canPay = user?.isOwnerOrManager ?? false;
    final isOwner = user?.roleSystemKey == 'owner';

    return earningsAsync.when(
      loading: () => const Card(child: Padding(padding: EdgeInsets.all(24), child: Center(child: CircularProgressIndicator()))),
      error: (e, _) => Card(child: Padding(padding: const EdgeInsets.all(16), child: Text('Could not load earnings: ${apiErrorMessage(e)}'))),
      data: (data) {
        final comp = data['compensation'] as Map<String, dynamic>? ?? const {};
        final status = data['status'] as String? ?? 'UNPAID';
        final remaining = double.tryParse(data['remainingPayable'].toString()) ?? 0;
        final payments = (data['payments'] as List<dynamic>? ?? const []).cast<Map<String, dynamic>>();
        final compType = comp['compensationType'] as String? ?? '';
        final rateText = compType == 'HOURLY'
            ? '₹${comp['hourlyRate'] ?? 0}/hr'
            : compType == 'PER_MINUTE'
                ? '₹${comp['perMinuteRate'] ?? 0}/min'
                : compType == 'MONTHLY'
                    ? '₹${comp['monthlySalary'] ?? 0}/month'
                    : compType;

        return Card(
          child: Padding(
            padding: const EdgeInsets.all(16.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text('Earnings & Payments', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                      decoration: BoxDecoration(color: _statusColor(status).withValues(alpha: 0.12), borderRadius: BorderRadius.circular(6)),
                      child: Text(status.replaceAll('_', ' '), style: TextStyle(color: _statusColor(status), fontWeight: FontWeight.bold, fontSize: 12)),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                InfoRow('Pay Basis', rateText),
                InfoRow('Worked', '${comp['totalWorkedHours'] ?? 0} h (${comp['totalWorkedMinutes'] ?? 0} min)'),
                InfoRow('Completed Jobs', '${comp['totalCompletedJobs'] ?? 0}'),
                const Divider(),
                InfoRow('Total Earned', _money(data['totalEarned'])),
                InfoRow('Total Paid', _money(data['totalPaid'])),
                // Remaining payable = money the business must PAY OUT → red.
                InfoRow('Remaining Payable', _money(remaining),
                    customValueWidget: Text(_money(remaining),
                        textAlign: TextAlign.right,
                        style: TextStyle(
                            fontWeight: FontWeight.bold,
                            fontSize: 15,
                            color: remaining > 0 ? AppTheme.payable : AppTheme.textMuted))),
                if (canPay) ...[
                  const SizedBox(height: 12),
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton.icon(
                      icon: const Icon(Icons.payments),
                      label: const Text('Record Payment (Pay Out)'),
                      onPressed: _busy || remaining <= 0 ? null : () => _recordPayment(remaining),
                    ),
                  ),
                ],
                if (payments.isNotEmpty) ...[
                  const SizedBox(height: 12),
                  const Text('Payment History', style: TextStyle(fontWeight: FontWeight.bold)),
                  ...payments.map((p) {
                    final cancelled = p['cancelled'] == true;
                    return ListTile(
                      dense: true,
                      contentPadding: EdgeInsets.zero,
                      title: Text(
                        '${_money(p['amount'])} · ${p['paymentMethod']}',
                        style: TextStyle(decoration: cancelled ? TextDecoration.lineThrough : null, color: cancelled ? Colors.grey : null),
                      ),
                      subtitle: Text('${(p['paidAt'] as String? ?? '').split('T').first}'
                          '${p['referenceNumber'] != null ? ' · Ref ${p['referenceNumber']}' : ''}'
                          '${cancelled ? ' · CANCELLED (${p['cancelReason'] ?? ''})' : ''}'),
                      trailing: (isOwner && !cancelled)
                          ? TextButton(onPressed: _busy ? null : () => _cancelPayment(p['id'] as String), child: const Text('Cancel'))
                          : null,
                    );
                  }),
                ],
              ],
            ),
          ),
        );
      },
    );
  }
}

/// Customer-wise work history for a driver (§ which customers the driver worked
/// for). Reads the SAME authoritative attribution as the pay calc, exposed by
/// GET /drivers/:id/earnings → `customerWise`. Never a separate hour ledger.
class _DriverCustomerWorkSection extends ConsumerWidget {
  final String driverId;
  const _DriverCustomerWorkSection({required this.driverId});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final earningsAsync = ref.watch(driverEarningsProvider(driverId));
    return earningsAsync.maybeWhen(
      orElse: () => const SizedBox.shrink(),
      data: (data) {
        final rows = (data['customerWise'] as List<dynamic>? ?? const []).cast<Map<String, dynamic>>();
        if (rows.isEmpty) return const SizedBox.shrink();
        final totalText = data['compensation']?['totalWorkedHours'] != null
            ? '${data['compensation']['totalWorkedHours']} h'
            : '';
        return Card(
          child: Padding(
            padding: const EdgeInsets.all(16.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text('Work by Customer', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                    if (totalText.isNotEmpty)
                      Text('Total $totalText', style: const TextStyle(color: AppTheme.textMuted, fontSize: 13)),
                  ],
                ),
                const SizedBox(height: 4),
                ...rows.map((r) => ListTile(
                      dense: true,
                      contentPadding: EdgeInsets.zero,
                      title: Text(r['customerName'] as String? ?? 'Unknown'),
                      subtitle: Text([
                        '${r['jobs']} job${(r['jobs'] as num? ?? 0) == 1 ? '' : 's'}',
                        if ((r['lastWorkedDate'] as String?)?.isNotEmpty == true)
                          'last ${(r['lastWorkedDate'] as String).split('T').first}',
                      ].join(' · ')),
                      trailing: Text(r['workedText'] as String? ?? '—',
                          style: const TextStyle(fontWeight: FontWeight.w600)),
                    )),
              ],
            ),
          ),
        );
      },
    );
  }
}

class _RecordDriverPaymentDialog extends StatefulWidget {
  final double remaining;
  const _RecordDriverPaymentDialog({required this.remaining});

  @override
  State<_RecordDriverPaymentDialog> createState() => _RecordDriverPaymentDialogState();
}

class _RecordDriverPaymentDialogState extends State<_RecordDriverPaymentDialog> {
  late final _amountController = TextEditingController(text: widget.remaining.toStringAsFixed(2));
  final _referenceController = TextEditingController();
  final _notesController = TextEditingController();
  String _method = 'CASH';

  @override
  void dispose() {
    _amountController.dispose();
    _referenceController.dispose();
    _notesController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: const Text('Record Payment Out'),
      content: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(
              controller: _amountController,
              decoration: InputDecoration(
                labelText: 'Amount *',
                border: const OutlineInputBorder(),
                prefixText: '₹ ',
                helperText: 'Remaining payable: ₹${widget.remaining.toStringAsFixed(2)}',
              ),
              keyboardType: const TextInputType.numberWithOptions(decimal: true),
              autofocus: true,
            ),
            const SizedBox(height: 12),
            DropdownButtonFormField<String>(
              initialValue: _method,
              decoration: const InputDecoration(labelText: 'Payment Method', border: OutlineInputBorder()),
              items: _driverPaymentMethods.map((m) => DropdownMenuItem(value: m, child: Text(m))).toList(),
              onChanged: (v) => setState(() => _method = v!),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: _referenceController,
              decoration: const InputDecoration(labelText: 'Reference Number (optional)', border: OutlineInputBorder()),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: _notesController,
              decoration: const InputDecoration(labelText: 'Notes (optional)', border: OutlineInputBorder()),
              maxLines: 2,
            ),
          ],
        ),
      ),
      actions: [
        TextButton(onPressed: () => Navigator.pop(context), child: const Text('Cancel')),
        ElevatedButton(
          onPressed: () => Navigator.pop(context, {
            'amount': _amountController.text,
            'paymentMethod': _method,
            'referenceNumber': _referenceController.text.trim(),
            'notes': _notesController.text.trim(),
          }),
          child: const Text('Save'),
        ),
      ],
    );
  }
}
