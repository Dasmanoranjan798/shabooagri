import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../core/network/api_client.dart';
import '../../../core/network/api_error.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/widgets/adaptive_scaffold.dart';
import '../../customers/presentation/customer_list_screen.dart';

class TakePaymentScreen extends ConsumerStatefulWidget {
  final String? preselectedCustomerId;
  const TakePaymentScreen({super.key, this.preselectedCustomerId});

  @override
  ConsumerState<TakePaymentScreen> createState() => _TakePaymentScreenState();
}

class _TakePaymentScreenState extends ConsumerState<TakePaymentScreen> {
  @override
  void initState() {
    super.initState();
    if (widget.preselectedCustomerId != null) {
      _selectedCustomerId = widget.preselectedCustomerId;
      _fetchSummary(widget.preselectedCustomerId!);
    }
  }

  String? _selectedCustomerId;
  Map<String, dynamic>? _summary;
  bool _loading = false;
  String? _error;

  Future<void> _fetchSummary(String customerId) async {
    setState(() {
      _selectedCustomerId = customerId;
      _loading = true;
      _error = null;
    });

    try {
      final dio = ref.read(apiClientProvider);
      // We can fetch from /dashboard/summary or filter invoices
      final invoices = await dio.post('/invoices/filter', data: {
         'customerId': [customerId],
      });
      
      final summaryData = invoices.data['summary'];

      setState(() {
        _summary = {
           'totalBilled': (summaryData['totalInvoiced'] as num).toDouble(),
           'totalPaid': (summaryData['totalPaid'] as num).toDouble(),
           'totalOutstanding': (summaryData['totalOutstanding'] as num).toDouble(),
           'overdue': (summaryData['overdueAmount'] as num).toDouble(),
           'completedJobs': summaryData['invoicesCount'],
        };
      });
    } catch (e) {
      setState(() => _error = apiErrorMessage(e));
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final customersAsync = ref.watch(customersListProvider);

    return AdaptiveScaffold(
      currentRoute: '/payments',
      title: 'Take Payment',
      showBack: true,
      body: customersAsync.when(
        data: (customers) {
           return Padding(
             padding: const EdgeInsets.all(16.0),
             child: Column(
               crossAxisAlignment: CrossAxisAlignment.start,
               children: [
                 const Text('Select Farmer', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                 const SizedBox(height: 8),
                 DropdownButtonFormField<String>(
                   initialValue: _selectedCustomerId,
                   decoration: const InputDecoration(labelText: 'Farmer'),
                   items: customers.map((c) => DropdownMenuItem(value: c.id, child: Text('${c.name} - ${c.villageName}'))).toList(),
                   onChanged: (v) {
                     if (v != null) _fetchSummary(v);
                   },
                 ),
                 const SizedBox(height: 24),
                 if (_loading)
                   const Center(child: CircularProgressIndicator())
                 else if (_error != null)
                   Text(_error!, style: const TextStyle(color: Colors.red))
                 else if (_summary != null) ...[
                   Card(
                     color: AppTheme.primaryLight,
                     shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12), side: const BorderSide(color: AppTheme.primary)),
                     child: Padding(
                       padding: const EdgeInsets.all(16),
                       child: Column(
                         crossAxisAlignment: CrossAxisAlignment.start,
                         children: [
                           Text('Total Outstanding: ₹${_summary!['totalOutstanding'].toStringAsFixed(0)}', style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: AppTheme.danger)),
                           const SizedBox(height: 8),
                           Text('Overdue Amount: ₹${_summary!['overdue'].toStringAsFixed(0)}', style: TextStyle(color: _summary!['overdue'] > 0 ? AppTheme.danger : AppTheme.textMuted)),
                           const Divider(height: 24),
                           Text('Total Billed: ₹${_summary!['totalBilled'].toStringAsFixed(0)}'),
                           Text('Total Paid: ₹${_summary!['totalPaid'].toStringAsFixed(0)}'),
                           Text('Completed Jobs: ${_summary!['completedJobs']}'),
                         ],
                       ),
                     ),
                   ),
                   const Spacer(),
                   SizedBox(
                     width: double.infinity,
                     child: ElevatedButton(
                       onPressed: () {
                         // The existing advance screen takes care of recording payment
                         context.go('/payments/advance/new', extra: {'customerId': _selectedCustomerId});
                       },
                       style: ElevatedButton.styleFrom(
                         padding: const EdgeInsets.symmetric(vertical: 16),
                         backgroundColor: AppTheme.success,
                       ),
                       child: const Text('PROCEED TO PAYMENT', style: TextStyle(fontSize: 16)),
                     ),
                   ),
                   const SizedBox(height: 32),
                 ]
               ],
             ),
           );
        },
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, s) => Center(child: Text(apiErrorMessage(e))),
      ),
    );
  }
}
