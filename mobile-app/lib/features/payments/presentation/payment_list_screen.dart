import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../core/network/api_client.dart';
import '../../../core/widgets/app_drawer.dart';

/// No offline table exists for invoices (Stage 2's offline layer never
/// covered Payments/Invoices) — this is a live-only screen, same pattern as
/// the Farmer portal's read-only invoice list, just company-wide in scope
/// here since `GET /invoices` is scoped server-side per caller role
/// (all company invoices for Owner/Manager, own only for a Farmer).
class InvoiceSummary {
  final String id;
  final String invoiceNumber;
  final String status;
  final double totalAmount;
  final double paidAmount;
  final double balanceAmount;
  final String invoiceDate;

  InvoiceSummary.fromJson(Map<String, dynamic> json)
      : id = json['id'] as String,
        invoiceNumber = json['invoiceNumber'] as String,
        status = json['status'] as String,
        totalAmount = (json['totalAmount'] as num).toDouble(),
        paidAmount = (json['paidAmount'] as num).toDouble(),
        balanceAmount = (json['balanceAmount'] as num).toDouble(),
        invoiceDate = json['invoiceDate'] as String;
}

final invoicesListProvider = FutureProvider<List<InvoiceSummary>>((ref) async {
  final dio = ref.watch(apiClientProvider);
  final response = await dio.get('/invoices');
  return (response.data as List<dynamic>)
      .map((json) => InvoiceSummary.fromJson(json as Map<String, dynamic>))
      .toList();
});

class PaymentListScreen extends ConsumerWidget {
  const PaymentListScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final invoicesAsync = ref.watch(invoicesListProvider);

    return Scaffold(
      drawer: const AppDrawer(currentRoute: '/payments'),
      appBar: AppBar(
        title: const Text('Payments'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () => ref.invalidate(invoicesListProvider),
          ),
        ],
      ),
      body: invoicesAsync.when(
        data: (invoices) {
          if (invoices.isEmpty) {
            return const Center(child: Text('No invoices found.'));
          }
          return ListView.builder(
            itemCount: invoices.length,
            itemBuilder: (context, index) {
              final invoice = invoices[index];
              return Card(
                margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                child: ListTile(
                  title: Text('Invoice ${invoice.invoiceNumber}'),
                  subtitle: Text('${invoice.status} · ${invoice.invoiceDate.split('T').first}'),
                  trailing: Text(
                    invoice.balanceAmount > 0 ? 'Due ₹${invoice.balanceAmount.toStringAsFixed(0)}' : 'Paid',
                    style: TextStyle(
                      color: invoice.balanceAmount > 0 ? Colors.red : Colors.green,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  onTap: () => context.go('/payments/${invoice.id}'),
                ),
              );
            },
          );
        },
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, stack) => Center(child: Text('Error: $error')),
      ),
    );
  }
}
