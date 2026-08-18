import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../core/network/api_client.dart';
import '../../../core/widgets/info_row.dart';

final invoiceDetailProvider = FutureProvider.family<Map<String, dynamic>, String>((ref, id) async {
  final dio = ref.watch(apiClientProvider);
  final response = await dio.get('/invoices/$id');
  return response.data as Map<String, dynamic>;
});

class PaymentDetailScreen extends ConsumerWidget {
  final String invoiceId;

  const PaymentDetailScreen({super.key, required this.invoiceId});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final invoiceAsync = ref.watch(invoiceDetailProvider(invoiceId));

    return Scaffold(
      appBar: AppBar(
        title: const Text('Invoice Details'),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => context.go('/payments'),
        ),
      ),
      body: invoiceAsync.when(
        data: (invoice) => Padding(
          padding: const EdgeInsets.all(16.0),
          child: ListView(
            children: [
              InfoRow('Invoice Number', invoice['invoiceNumber'] as String),
              InfoRow('Status', invoice['status'] as String),
              InfoRow('Invoice Date', (invoice['invoiceDate'] as String).split('T').first),
              InfoRow('Total Amount', '₹${(invoice['totalAmount'] as num).toStringAsFixed(2)}'),
              InfoRow('Paid Amount', '₹${(invoice['paidAmount'] as num).toStringAsFixed(2)}'),
              InfoRow('Balance Due', '₹${(invoice['balanceAmount'] as num).toStringAsFixed(2)}'),
            ],
          ),
        ),
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, stack) => Center(child: Text('Error: $error')),
      ),
    );
  }
}
