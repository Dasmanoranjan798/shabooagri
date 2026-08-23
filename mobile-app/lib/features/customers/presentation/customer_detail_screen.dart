import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../core/layout/responsive.dart';
import '../../../core/network/api_client.dart';
import '../../../core/network/api_error.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/widgets/adaptive_scaffold.dart';
import '../../../core/widgets/info_row.dart';

final customerDetailProvider = FutureProvider.family<Map<String, dynamic>, String>((ref, id) async {
  final dio = ref.watch(apiClientProvider);
  final response = await dio.get('/customers/$id');
  return response.data as Map<String, dynamic>;
});

final customerInvoicesProvider = FutureProvider.family<List<dynamic>, String>((ref, customerId) async {
  final dio = ref.watch(apiClientProvider);
  final response = await dio.post('/invoices/filter', data: {
    'customerId': customerId,
    'limit': 100,
  });
  return response.data['data'] as List<dynamic>;
});

final customerBookingsProvider = FutureProvider.family<List<dynamic>, String>((ref, customerId) async {
  final dio = ref.watch(apiClientProvider);
  // Using the list and filtering locally or if the API supports it
  final response = await dio.get('/bookings');
  final all = response.data['data'] as List;
  return all.where((b) => b['customerId'] == customerId).toList();
});

class CustomerDetailScreen extends ConsumerWidget {
  final String customerId;

  const CustomerDetailScreen({super.key, required this.customerId});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final customerAsync = ref.watch(customerDetailProvider(customerId));
    final invoicesAsync = ref.watch(customerInvoicesProvider(customerId));
    final bookingsAsync = ref.watch(customerBookingsProvider(customerId));
    final isDesktop = context.responsive.isDesktop;

    return AdaptiveScaffold(
      currentRoute: '/customers',
      title: 'Farmer Profile',
      showBack: true,
      actions: [
        IconButton(
          icon: const Icon(Icons.edit),
          tooltip: 'Edit',
          onPressed: () => context.go('/customers/$customerId/edit'),
        ),
      ],
      body: customerAsync.when(
        data: (customer) {
          final villageName = (customer['village'] as Map<String, dynamic>?)?['name'] as String? ?? 'N/A';

          final profileCard = Card(
            margin: EdgeInsets.zero,
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                children: [
                  CircleAvatar(
                    radius: 40,
                    backgroundColor: AppTheme.primaryLight,
                    child: Text(
                      (customer['name'] as String).substring(0, 1).toUpperCase(),
                      style: const TextStyle(fontSize: 32, fontWeight: FontWeight.bold, color: AppTheme.primary),
                    ),
                  ),
                  const SizedBox(height: 16),
                  Text(customer['name'] as String, style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold)),
                  const SizedBox(height: 4),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const Icon(Icons.location_on, size: 16, color: AppTheme.textMuted),
                      const SizedBox(width: 4),
                      Text(villageName, style: const TextStyle(color: AppTheme.textMuted)),
                    ],
                  ),
                  const SizedBox(height: 16),
                  InfoRow('Mobile Contact', customer['phone'] as String? ?? 'N/A'),
                  InfoRow('Address', customer['address'] as String? ?? 'N/A'),
                  InfoRow('Status', (customer['isActive'] as bool? ?? true) ? 'Active' : 'Inactive'),
                  if (customer['isGstApplicable'] == true) InfoRow('GSTIN', customer['gstin'] as String? ?? 'N/A'),
                ],
              ),
            ),
          );

          final financialSection = Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const Text('FINANCIAL SUMMARY',
                  style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: AppTheme.textMuted)),
              const SizedBox(height: 8),
              invoicesAsync.when(
                data: (invoices) {
                  double totalBilled = 0;
                  double totalPaid = 0;
                  double totalOutstanding = 0;
                  for (final inv in invoices) {
                    totalBilled += (inv['totalAmount'] as num).toDouble();
                    totalPaid += (inv['paidAmount'] as num).toDouble();
                    totalOutstanding += (inv['balanceAmount'] as num).toDouble();
                  }

                  return Card(
                    margin: EdgeInsets.zero,
                    child: Padding(
                      padding: const EdgeInsets.all(16),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          _statCol('Total Billed', '₹${totalBilled.toStringAsFixed(0)}', Colors.black),
                          _statCol('Total Paid', '₹${totalPaid.toStringAsFixed(0)}', AppTheme.success),
                          _statCol('Outstanding', '₹${totalOutstanding.toStringAsFixed(0)}',
                              totalOutstanding > 0 ? AppTheme.danger : AppTheme.textMuted),
                        ],
                      ),
                    ),
                  );
                },
                loading: () => const Center(child: CircularProgressIndicator()),
                error: (e, s) => Text('Error loading finances: ${apiErrorMessage(e)}'),
              ),
            ],
          );

          final operationalSection = Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const Text('OPERATIONAL SUMMARY',
                  style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: AppTheme.textMuted)),
              const SizedBox(height: 8),
              bookingsAsync.when(
                data: (bookings) {
                  int total = bookings.length;
                  int completed = bookings.where((b) => b['status'] == 'COMPLETED').length;
                  int pending = total - completed;

                  return Card(
                    margin: EdgeInsets.zero,
                    child: Padding(
                      padding: const EdgeInsets.all(16),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          _statCol('Total Jobs', '$total', Colors.black),
                          _statCol('Completed', '$completed', AppTheme.primary),
                          _statCol('Pending', '$pending', AppTheme.warning),
                        ],
                      ),
                    ),
                  );
                },
                loading: () => const Center(child: CircularProgressIndicator()),
                error: (e, s) => Text('Error loading ops: ${apiErrorMessage(e)}'),
              ),
            ],
          );

          final takePaymentButton = SizedBox(
            width: double.infinity,
            child: ElevatedButton.icon(
              icon: const Icon(Icons.payment),
              label: const Text('TAKE PAYMENT'),
              style: ElevatedButton.styleFrom(
                backgroundColor: AppTheme.success,
                padding: const EdgeInsets.symmetric(vertical: 12),
              ),
              onPressed: () => context.go('/payments/take', extra: customerId),
            ),
          );

          if (isDesktop) {
            // Desktop record page: profile on the left, summaries + action on
            // the right.
            return ListView(
              padding: const EdgeInsets.all(24),
              children: [
                IntrinsicHeight(
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Expanded(flex: 2, child: profileCard),
                      const SizedBox(width: 24),
                      Expanded(
                        flex: 3,
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.stretch,
                          children: [
                            financialSection,
                            const SizedBox(height: 24),
                            operationalSection,
                            const SizedBox(height: 24),
                            takePaymentButton,
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            );
          }

          return ListView(
            padding: const EdgeInsets.all(16.0),
            children: [
              Padding(padding: const EdgeInsets.only(bottom: 16), child: profileCard),
              financialSection,
              const SizedBox(height: 24),
              operationalSection,
              const SizedBox(height: 24),
              takePaymentButton,
            ],
          );
        },
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, s) => Center(child: Text('Could not load customer: ${apiErrorMessage(e)}')),
      ),
    );
  }

  Widget _statCol(String label, String value, Color color) {
    return Column(
      children: [
        Text(value, style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: color)),
        const SizedBox(height: 4),
        Text(label, style: const TextStyle(fontSize: 11, color: AppTheme.textMuted)),
      ],
    );
  }
}
