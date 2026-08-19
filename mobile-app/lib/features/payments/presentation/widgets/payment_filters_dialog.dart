import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../payment_filters.dart';
import '../payment_list_screen_provider.dart';

class PaymentFiltersDialog extends ConsumerStatefulWidget {
  const PaymentFiltersDialog({super.key});

  @override
  ConsumerState<PaymentFiltersDialog> createState() => _PaymentFiltersDialogState();
}

class _PaymentFiltersDialogState extends ConsumerState<PaymentFiltersDialog> {
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
    return Container(
      padding: const EdgeInsets.all(16),
      height: MediaQuery.of(context).size.height * 0.8,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text('Advanced Filters', style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
              IconButton(icon: const Icon(Icons.close), onPressed: () => Navigator.of(context).pop()),
            ],
          ),
          const Divider(),
          Expanded(
            child: ListView(
              children: [
                _buildStatusSection(),
                const Divider(),
                _buildDateSection(),
                const Divider(),
                _buildOutstandingAgeSection(),
              ],
            ),
          ),
          Row(
            mainAxisAlignment: MainAxisAlignment.end,
            children: [
              TextButton(onPressed: _clear, child: const Text('Clear Filters')),
              const SizedBox(width: 16),
              ElevatedButton(onPressed: _apply, child: const Text('Apply Filters')),
            ],
          )
        ],
      ),
    );
  }

  Widget _buildStatusSection() {
    final statuses = ['UNPAID', 'PARTIALLY_PAID', 'PAID', 'OVERDUE', 'DUE_TODAY', 'DUE_SOON'];
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text('Status', style: TextStyle(fontWeight: FontWeight.bold)),
        Wrap(
          spacing: 8,
          children: statuses.map((s) {
            final isSelected = _state.status.contains(s);
            return FilterChip(
              label: Text(s.replaceAll('_', ' ')),
              selected: isSelected,
              onSelected: (selected) {
                setState(() {
                  final list = List<String>.from(_state.status);
                  if (selected) { list.add(s); }
                  else { list.remove(s); }
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
        if (_state.dateField != null) ...[
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
          )
        ]
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
        )
      ],
    );
  }
}
