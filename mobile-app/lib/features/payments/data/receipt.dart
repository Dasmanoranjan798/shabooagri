/// `GET /invoices/:id/receipt` — the website's purpose-built printable
/// receipt payload (company + invoice + customer + service + payments all
/// joined server-side), not assembled from separate calls client-side.
class ReceiptPayment {
  final String id;
  final double amount;
  final String paymentMethod;
  final String? referenceNumber;
  final String receivedAt;
  final String receivedBy;
  final bool voided;
  final String? voidReason;

  ReceiptPayment.fromJson(Map<String, dynamic> json)
      : id = json['id'] as String,
        amount = (double.tryParse(json['amount'].toString()) ?? 0.0),
        paymentMethod = json['paymentMethod'] as String,
        referenceNumber = json['referenceNumber'] as String?,
        receivedAt = json['receivedAt'] as String,
        receivedBy = json['receivedBy'] as String,
        voided = json['voided'] as bool? ?? false,
        voidReason = json['voidReason'] as String?;
}

class Receipt {
  final String receiptNumber;
  final Map<String, dynamic> company;
  final Map<String, dynamic> invoice;
  final Map<String, dynamic> customer;
  final Map<String, dynamic> service;
  final String? description;
  final List<ReceiptPayment> payments;

  Receipt.fromJson(Map<String, dynamic> json)
      : receiptNumber = json['receiptNumber'] as String,
        company = json['company'] as Map<String, dynamic>,
        invoice = json['invoice'] as Map<String, dynamic>,
        customer = json['customer'] as Map<String, dynamic>,
        service = json['service'] as Map<String, dynamic>,
        description = json['description'] as String?,
        payments = (json['payments'] as List<dynamic>)
            .map((p) => ReceiptPayment.fromJson(p as Map<String, dynamic>))
            .toList();
}
