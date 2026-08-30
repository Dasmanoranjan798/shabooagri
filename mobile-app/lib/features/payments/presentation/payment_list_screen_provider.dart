import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shabooagri_mobile/core/sync/data_sync.dart';
import '../../../core/network/api_client.dart';
import '../data/invoice_analysis.dart';
import 'payment_filters.dart';

class PaymentFilterNotifier extends StateNotifier<PaymentFilterState> {
  PaymentFilterNotifier() : super(PaymentFilterState());
  
  void updateFilter(PaymentFilterState newState) {
    state = newState;
  }
  
  void clearFilters() {
    state = PaymentFilterState();
  }
}

final paymentFilterProvider = StateNotifierProvider<PaymentFilterNotifier, PaymentFilterState>((ref) {
  return PaymentFilterNotifier();
});

final invoicesAnalysisProvider = FutureProvider<InvoiceAnalysisResponse>((ref) async {
  syncOn(ref, {SyncEntity.invoice, SyncEntity.payment});
  final filterState = ref.watch(paymentFilterProvider);
  final dio = ref.watch(apiClientProvider);
  final response = await dio.post('/invoices/filter', data: filterState.toJson());
  return InvoiceAnalysisResponse.fromJson(response.data as Map<String, dynamic>);
});
