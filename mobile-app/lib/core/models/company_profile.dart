/// `GET /settings/profile` — full Company record. Shared across Settings
/// (read/write), Machines/Drivers (service/insurance/license alert
/// thresholds), Dashboard (warning banner), and Job Detail (mandatory
/// photo/fuel-log requirements before Submit).
class CompanyProfile {
  final String id;
  final String slug;
  final bool isActive;
  final DateTime? createdAt;
  final String name;
  final String? invoicePrefix;
  final String? address;
  final String? city;
  final String? district;
  final String? state;
  final String? pincode;
  final String? country;
  final String? phone;
  final String? email;
  final bool isGstRegistered;
  final String? gstin;
  final String? pan;
  final String? bankName;
  final String? accountNumber;
  final String? ifscCode;
  final String? upiId;
  final double? defaultTaxRate;
  final bool taxInclusive;
  final int serviceAlertHours;
  final int insuranceAlertDays;
  final int licenseAlertDays;
  final bool requireJobPhoto;
  final bool requireJobFuelLog;
  final String currency;
  final String timezone;
  final String language;

  CompanyProfile({
    required this.id,
    required this.slug,
    required this.isActive,
    required this.createdAt,
    required this.name,
    required this.invoicePrefix,
    required this.address,
    required this.city,
    required this.district,
    required this.state,
    required this.pincode,
    required this.country,
    required this.phone,
    required this.email,
    required this.isGstRegistered,
    required this.gstin,
    required this.pan,
    required this.bankName,
    required this.accountNumber,
    required this.ifscCode,
    required this.upiId,
    required this.defaultTaxRate,
    required this.taxInclusive,
    required this.serviceAlertHours,
    required this.insuranceAlertDays,
    required this.licenseAlertDays,
    required this.requireJobPhoto,
    required this.requireJobFuelLog,
    required this.currency,
    required this.timezone,
    required this.language,
  });

  factory CompanyProfile.fromJson(Map<String, dynamic> json) {
    return CompanyProfile(
      id: json['id'] as String,
      slug: json['slug'] as String? ?? '—',
      isActive: json['isActive'] as bool? ?? true,
      createdAt: json['createdAt'] == null ? null : DateTime.parse(json['createdAt'] as String),
      name: json['name'] as String,
      invoicePrefix: json['invoicePrefix'] as String?,
      address: json['address'] as String?,
      city: json['city'] as String?,
      district: json['district'] as String?,
      state: json['state'] as String?,
      pincode: json['pincode'] as String?,
      country: json['country'] as String?,
      phone: json['phone'] as String?,
      email: json['email'] as String?,
      isGstRegistered: json['isGstRegistered'] as bool? ?? false,
      gstin: json['gstin'] as String?,
      pan: json['pan'] as String?,
      bankName: json['bankName'] as String?,
      accountNumber: json['accountNumber'] as String?,
      ifscCode: json['ifscCode'] as String?,
      upiId: json['upiId'] as String?,
      defaultTaxRate: (json['defaultTaxRate'] as num?)?.toDouble(),
      taxInclusive: json['taxInclusive'] as bool? ?? false,
      serviceAlertHours: json['serviceAlertHours'] as int? ?? 50,
      insuranceAlertDays: json['insuranceAlertDays'] as int? ?? 30,
      licenseAlertDays: json['licenseAlertDays'] as int? ?? 30,
      requireJobPhoto: json['requireJobPhoto'] as bool? ?? false,
      requireJobFuelLog: json['requireJobFuelLog'] as bool? ?? false,
      currency: json['currency'] as String? ?? 'INR',
      timezone: json['timezone'] as String? ?? 'Asia/Kolkata',
      language: json['language'] as String? ?? 'en',
    );
  }
}
