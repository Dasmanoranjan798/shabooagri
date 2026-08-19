/// Mirrors `frontend/src/types/team.ts` exactly — Team is company-wide
/// user-account management (all roles, including deactivate/reactivate of
/// existing accounts), distinct from the Employees module's own HR records.
class TeamUser {
  final String id;
  final String fullName;
  final String? email;
  final String? mobileNumber;
  final String status; // ACTIVE | INACTIVE
  final DateTime? lastLoginAt;
  final String roleName;

  TeamUser.fromJson(Map<String, dynamic> json)
      : id = json['id'] as String,
        fullName = json['fullName'] as String,
        email = json['email'] as String?,
        mobileNumber = json['mobileNumber'] as String?,
        status = json['status'] as String,
        lastLoginAt = json['lastLoginAt'] == null ? null : DateTime.parse(json['lastLoginAt'] as String),
        roleName = (json['role'] as Map<String, dynamic>?)?['name'] as String? ?? '—';
}

class StaffInvite {
  final String id;
  final String fullName;
  final String? email;
  final String? phone;
  final String status; // PENDING | ACCEPTED | REVOKED | EXPIRED
  final DateTime expiresAt;
  final String roleName;
  final String invitedByName;

  StaffInvite.fromJson(Map<String, dynamic> json)
      : id = json['id'] as String,
        fullName = json['fullName'] as String,
        email = json['email'] as String?,
        phone = json['phone'] as String?,
        status = json['status'] as String,
        expiresAt = DateTime.parse(json['expiresAt'] as String),
        roleName = (json['role'] as Map<String, dynamic>?)?['name'] as String? ?? '—',
        invitedByName = (json['invitedBy'] as Map<String, dynamic>?)?['fullName'] as String? ?? '—';
}

class RoleOption {
  final String id;
  final String name;
  final String? systemKey;

  RoleOption.fromJson(Map<String, dynamic> json)
      : id = json['id'] as String,
        name = json['name'] as String,
        systemKey = json['systemKey'] as String?;
}

class CreateInviteResult {
  final String inviteLink;
  final String deliveryMethod; // email | email_failed | sms | manual_link

  CreateInviteResult.fromJson(Map<String, dynamic> json)
      : inviteLink = json['inviteLink'] as String,
        deliveryMethod = json['deliveryMethod'] as String;
}
