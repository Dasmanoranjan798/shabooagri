import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shabooagri_mobile/core/sync/data_sync.dart';
import '../../../core/network/api_client.dart';
import '../../../core/network/api_error.dart';
import '../../../core/widgets/info_row.dart';

/// Driver self-service earnings. Uses the "me" alias so the driver never needs
/// their internal id; the backend resolves and scopes it to the caller (a
/// driver can only ever see their own). Read-only — recording a Payment Out is
/// an Owner/Manager action.
final myEarningsProvider = FutureProvider<Map<String, dynamic>>((ref) async {
  syncOn(ref, {SyncEntity.driver, SyncEntity.job, SyncEntity.payment});
  final dio = ref.watch(apiClientProvider);
  final r = await dio.get('/drivers/me/earnings');
  return r.data as Map<String, dynamic>;
});

class DriverMyEarningsScreen extends ConsumerWidget {
  const DriverMyEarningsScreen({super.key});

  String _money(dynamic v) => '₹${(double.tryParse(v.toString()) ?? 0).toStringAsFixed(2)}';

  Color _statusColor(String s) => s == 'PAID'
      ? Colors.green
      : s == 'PARTIALLY_PAID'
          ? Colors.orange
          : Colors.red;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(myEarningsProvider);
    return async.when(
      loading: () => const Center(child: CircularProgressIndicator()),
      error: (e, _) => Center(child: Text('Could not load earnings: ${apiErrorMessage(e)}')),
      data: (data) {
        final comp = data['compensation'] as Map<String, dynamic>? ?? const {};
        final status = data['status'] as String? ?? 'UNPAID';
        final payments = (data['payments'] as List<dynamic>? ?? const []).cast<Map<String, dynamic>>();
        final compType = comp['compensationType'] as String? ?? '';
        final rateText = compType == 'HOURLY'
            ? '₹${comp['hourlyRate'] ?? 0}/hr'
            : compType == 'PER_MINUTE'
                ? '₹${comp['perMinuteRate'] ?? 0}/min'
                : compType == 'MONTHLY'
                    ? '₹${comp['monthlySalary'] ?? 0}/month'
                    : compType;

        return RefreshIndicator(
          onRefresh: () async => ref.invalidate(myEarningsProvider),
          child: ListView(
            padding: const EdgeInsets.all(16),
            children: [
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          const Text('My Earnings', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
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
                      InfoRow('Remaining Payable', _money(data['remainingPayable'])),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 8),
              const Padding(
                padding: EdgeInsets.symmetric(horizontal: 4, vertical: 8),
                child: Text('Payment History', style: TextStyle(fontWeight: FontWeight.bold)),
              ),
              if (payments.isEmpty)
                const Padding(padding: EdgeInsets.all(16), child: Text('No payments yet.'))
              else
                ...payments.map((p) {
                  final cancelled = p['cancelled'] == true;
                  return Card(
                    child: ListTile(
                      title: Text('${_money(p['amount'])} · ${p['paymentMethod']}',
                          style: TextStyle(decoration: cancelled ? TextDecoration.lineThrough : null, color: cancelled ? Colors.grey : null)),
                      subtitle: Text('${(p['paidAt'] as String? ?? '').split('T').first}'
                          '${p['referenceNumber'] != null ? ' · Ref ${p['referenceNumber']}' : ''}'
                          '${cancelled ? ' · CANCELLED' : ''}'),
                    ),
                  );
                }),
            ],
          ),
        );
      },
    );
  }
}
