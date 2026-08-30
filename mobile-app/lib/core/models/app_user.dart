/// Mirrors the shape of `frontend/src/types/auth.ts`'s `User`/`Role` —
/// only the fields this app actually needs for role-based routing.
class AppUser {
  final String id;
  final String companyId;
  final String fullName;
  final String? email;
  final String? mobileNumber;
  final String roleSystemKey; // "owner" | "manager" | "driver" | "farmer"
  final String roleName;
  final String status; // "ACTIVE" | "INACTIVE"
  // Authoritative PIN state from the backend (`toPublicUser`'s `hasPin`) — the
  // UI reads this instead of guessing PIN configuration from local storage.
  final bool hasPin;

  const AppUser({
    required this.id,
    required this.companyId,
    required this.fullName,
    required this.email,
    required this.mobileNumber,
    required this.roleSystemKey,
    required this.roleName,
    this.status = 'ACTIVE',
    this.hasPin = false,
  });

  factory AppUser.fromJson(Map<String, dynamic> json) {
    final role = json['role'] as Map<String, dynamic>? ?? const {};
    return AppUser(
      id: json['id'] as String,
      companyId: json['companyId'] as String,
      fullName: json['fullName'] as String,
      email: json['email'] as String?,
      mobileNumber: json['mobileNumber'] as String?,
      roleSystemKey: role['systemKey'] as String? ?? '',
      roleName: role['name'] as String? ?? '',
      status: json['status'] as String? ?? 'ACTIVE',
      hasPin: json['hasPin'] as bool? ?? false,
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'companyId': companyId,
        'fullName': fullName,
        'email': email,
        'mobileNumber': mobileNumber,
        'role': {'systemKey': roleSystemKey, 'name': roleName},
        'status': status,
        'hasPin': hasPin,
      };

  bool get isOwnerOrManager => roleSystemKey == 'owner' || roleSystemKey == 'manager';
  bool get isDriver => roleSystemKey == 'driver';
  bool get isFarmer => roleSystemKey == 'farmer';

  /// Route each role lands on after login, mirroring
  /// `frontend/src/app/App.tsx`'s `RootRoute`.
  String get homeRoute {
    if (isDriver) return '/driver';
    if (isFarmer) return '/farmer';
    return '/dashboard';
  }
}
