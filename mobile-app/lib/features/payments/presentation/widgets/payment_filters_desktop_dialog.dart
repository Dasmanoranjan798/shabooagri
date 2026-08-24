import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../payment_filters.dart';
import '../payment_list_screen_provider.dart';

/// Desktop presentation of the Payments "Advanced Filters" — a centred,
/// width-capped [AlertDialog] (mouse/keyboard friendly) instead of the phone
/// [PaymentFiltersDialog] modal bottom sheet. This is a **presentation-only**
/// alternative: it reads and writes the exact same [paymentFilterProvider] and
/// [PaymentFilterState], offers the exact same filters (status, date field +
/// range, outstanding-age min/max), and the same Apply / Clear semantics. The
/// mobile bottom-sheet path is unchanged.
///
/// Show with [showPaymentFiltersDesktopDialog]; the phone path keeps calling
/// `showModalBottomSheet(... PaymentFiltersDialog ...)`.
Future<void> showPaymentFiltersDesktopDialog(BuildContext context) {
  return showDialog<void>(
    context: context,
    builder: (_) => const PaymentFiltersDesktopDialog(),
  );
}

class PaymentFiltersDesktopDialog extends ConsumerStatefulWidget {
  const PaymentFiltersDesktopDialog({super.key});

  @override
  ConsumerState<PaymentFiltersDesktopDialog> createState() => _PaymentFiltersDesktopDialogState();
}

class _PaymentFiltersDesktopDialogState extends ConsumerState<PaymentFiltersDesktopDialog> {
  late PaymentFilterState _state;

  @override
  void initState() {
    super.initState();
    _state = ref.read(paymentFilterProvider);
  }

  void _apply() {
    ref.read(paymentFilterProvider.notifier).updateFilter(_state);
    Navigator.of(context).pop();
  }

  void _clear() {
    setState(() {
      _state = PaymentFilterState();
    });
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: const Text('Advanced Filters'),
      // A comfortable desktop dialog width; content scrolls if it exceeds the
      // available height (small windows / long content).
      content: SizedBox(
        width: 520,
        child: SingleChildScrollView(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              _buildStatusSection(),
              const Divider(height: 24),
              _buildDateSection(),
              const Divider(height: 24),
              _buildOutstandingAgeSection(),
            ],
          ),
        ),
      ),
      actions: [
        TextButton(onPressed: _clear, child: const Text('Clear Filters')),
        TextButton(onPressed: () => Navigator.of(context).pop(), child: const Text('Cancel')),
        ElevatedButton(onPressed: _apply, child: const Text('Apply Filters')),
      ],
    );
  }

  Widget _buildStatusSection() {
    final statuses = ['UNPAID', 'PARTIALLY_PAID', 'PAID', 'OVERDUE', 'DUE_TODAY', 'DUE_SOON'];
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text('Status', style: TextStyle(fontWeight: FontWeight.bold)),
        const SizedBox(height: 8),
        Wrap(
          spacing: 8,
          runSpacing: 4,
          children: statuses.map((s) {
            final isSelected = _state.status.contains(s);
            return FilterChip(
              label: Text(s.replaceAll('_', ' ')),
              selected: isSelected,
              onSelected: (selected) {
                setState(() {
                  final list = List<String>.from(_state.status);
                  if (selected) {
                    list.add(s);
                  } else {
                    list.remove(s);
                  }
                  _state = _state.copyWith(status: list);
                });
              },
            );
          }).toList(),
        ),
      ],
    );
  }

  Widget _buildDateSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text('Date Filter', style: TextStyle(fontWeight: FontWeight.bold)),
        DropdownButtonFormField<String>(
          initialValue: _state.dateField,
          decoration: const InputDecoration(labelText: 'Date Field'),
          items: const [
            DropdownMenuItem(value: 'invoiceDate', child: Text('Invoice Date')),
            DropdownMenuItem(value: 'dueDate', child: Text('Due Date')),
            DropdownMenuItem(value: 'paymentDate', child: Text('Payment Date')),
            DropdownMenuItem(value: 'workCompletionDate', child: Text('Work Completion Date')),
          ],
          onChanged: (v) => setState(() => _state = _state.copyWith(dateField: v)),
        ),
        if (_state.dateField != null)
          Row(
            children: [
              Expanded(
                child: TextButton(
                  onPressed: () async {
                    final d = await showDatePicker(context: context, initialDate: DateTime.now(), firstDate: DateTime(2020), lastDate: DateTime(2030));
                    if (d != null) setState(() => _state = _state.copyWith(fromDate: d.toIso8601String()));
                  },
                  child: Text(_state.fromDate?.split('T').first ?? 'From Date'),
                ),
              ),
              Expanded(
                child: TextButton(
                  onPressed: () async {
                    final d = await showDatePicker(context: context, initialDate: DateTime.now(), firstDate: DateTime(2020), lastDate: DateTime(2030));
                    if (d != null) setState(() => _state = _state.copyWith(toDate: d.toIso8601String()));
                  },
                  child: Text(_state.toDate?.split('T').first ?? 'To Date'),
                ),
              ),
            ],
          ),
      ],
    );
  }

  Widget _buildOutstandingAgeSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text('Outstanding Age (Days Overdue)', style: TextStyle(fontWeight: FontWeight.bold)),
        Row(
          children: [
            Expanded(
              child: TextFormField(
                initialValue: _state.minOutstandingDays?.toString(),
                decoration: const InputDecoration(labelText: 'Min Days'),
                keyboardType: TextInputType.number,
                onChanged: (v) => _state = _state.copyWith(minOutstandingDays: int.tryParse(v)),
              ),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: TextFormField(
                initialValue: _state.maxOutstandingDays?.toString(),
                decoration: const InputDecoration(labelText: 'Max Days'),
                keyboardType: TextInputType.number,
                onChanged: (v) => _state = _state.copyWith(maxOutstandingDays: int.tryParse(v)),
              ),
            ),
          ],
        ),
      ],
    );
  }
}
