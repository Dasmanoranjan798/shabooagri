class PaymentFilterState {
  final List<String> status;
  final String? fromDate;
  final String? toDate;
  final String? dateField;
  
  final List<String> customerIds;
  final List<String> villages;
  final List<String> machineIds;
  final List<String> driverIds;
  final List<String> paymentMethods;
  
  final String? amountField;
  final String? amountOperator;
  final double? amountValue;
  final double? amountValueMax;
  
  final int? minOutstandingDays;
  final int? maxOutstandingDays;

  PaymentFilterState({
    this.status = const [],
    this.fromDate, this.toDate, this.dateField,
    this.customerIds = const [],
    this.villages = const [],
    this.machineIds = const [],
    this.driverIds = const [],
    this.paymentMethods = const [],
    this.amountField, this.amountOperator, this.amountValue, this.amountValueMax,
    this.minOutstandingDays, this.maxOutstandingDays,
  });

  PaymentFilterState copyWith({
    List<String>? status,
    String? fromDate, String? toDate, String? dateField,
    List<String>? customerIds, List<String>? villages,
    List<String>? machineIds, List<String>? driverIds,
    List<String>? paymentMethods,
    String? amountField, String? amountOperator, double? amountValue, double? amountValueMax,
    int? minOutstandingDays, int? maxOutstandingDays,
  }) {
    return PaymentFilterState(
      status: status ?? this.status,
      fromDate: fromDate ?? this.fromDate,
      toDate: toDate ?? this.toDate,
      dateField: dateField ?? this.dateField,
      customerIds: customerIds ?? this.customerIds,
      villages: villages ?? this.villages,
      machineIds: machineIds ?? this.machineIds,
      driverIds: driverIds ?? this.driverIds,
      paymentMethods: paymentMethods ?? this.paymentMethods,
      amountField: amountField ?? this.amountField,
      amountOperator: amountOperator ?? this.amountOperator,
      amountValue: amountValue ?? this.amountValue,
      amountValueMax: amountValueMax ?? this.amountValueMax,
      minOutstandingDays: minOutstandingDays ?? this.minOutstandingDays,
      maxOutstandingDays: maxOutstandingDays ?? this.maxOutstandingDays,
    );
  }

  Map<String, dynamic> toJson() {
    final m = <String, dynamic>{};
    if (status.isNotEmpty) m['status'] = status;
    if (fromDate != null || toDate != null || dateField != null) {
      m['dateRange'] = {
        if (fromDate != null) 'from': fromDate,
        if (toDate != null) 'to': toDate,
        if (dateField != null) 'field': dateField,
      };
    }
    if (customerIds.isNotEmpty) m['customerId'] = customerIds;
    if (villages.isNotEmpty) m['village'] = villages;
    if (machineIds.isNotEmpty) m['machineId'] = machineIds;
    if (driverIds.isNotEmpty) m['driverId'] = driverIds;
    if (paymentMethods.isNotEmpty) m['paymentMethod'] = paymentMethods;
    
    if (amountField != null && amountOperator != null) {
      m['amountFilter'] = {
        'field': amountField,
        'operator': amountOperator,
        if (amountValue != null) 'value': amountValue,
        if (amountValueMax != null) 'valueMax': amountValueMax,
      };
    }
    
    if (minOutstandingDays != null || maxOutstandingDays != null) {
      m['outstandingAge'] = {
        if (minOutstandingDays != null) 'minDays': minOutstandingDays,
        if (maxOutstandingDays != null) 'maxDays': maxOutstandingDays,
      };
    }
    return m;
  }
}

/// Compact "applied filters" summary (label, value) for report export headers,
/// derived from a [PaymentFilterState]. Only non-empty fields appear. Shared by
/// the Payments transaction report and the Payments & Collections reports so
/// there is one filter-summary implementation.
List<(String, String)> appliedPaymentFilters(PaymentFilterState f) {
  final out = <(String, String)>[];
  if (f.status.isNotEmpty) out.add(('Status', f.status.join(', ')));
  if (f.fromDate != null) out.add(('From', f.fromDate!));
  if (f.toDate != null) out.add(('To', f.toDate!));
  if (f.paymentMethods.isNotEmpty) out.add(('Method', f.paymentMethods.join(', ')));
  if (f.villages.isNotEmpty) out.add(('Village', f.villages.join(', ')));
  if (f.customerIds.isNotEmpty) out.add(('Customers', '${f.customerIds.length} selected'));
  if (f.machineIds.isNotEmpty) out.add(('Machines', '${f.machineIds.length} selected'));
  if (f.driverIds.isNotEmpty) out.add(('Drivers', '${f.driverIds.length} selected'));
  return out;
}
