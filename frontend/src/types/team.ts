export interface TeamUser {
  id: string;
  fullName: string;
  email: string | null;
  mobileNumber: string | null;
  status: "ACTIVE" | "INACTIVE";
  lastLoginAt: string | null;
  createdAt: string;
  role: {
    id: string;
    name: string;
    systemKey: string | null;
  };
}

export interface StaffInvite {
  id: string;
  companyId: string;
  roleId: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  villageId: string | null;
  status: "PENDING" | "ACCEPTED" | "REVOKED" | "EXPIRED";
  expiresAt: string;
  acceptedAt: string | null;
  createdAt: string;
  role: {
    id: string;
    name: string;
    systemKey: string | null;
  };
  invitedBy: {
    id: string;
    fullName: string;
  };
}

export interface CreateInvitePayload {
  fullName: string;
  roleId: string;
  email?: string;
  phone?: string;
  villageId?: string;
  employeeId?: string;
}

export interface CreateInviteResponse {
  invite: StaffInvite;
  inviteLink: string;
  deliveryMethod: "email" | "email_failed" | "manual_link";
}

export interface InviteVerifyResult {
  companyName: string;
  roleName: string;
  inviterName: string;
  fullName: string;
  email: string | null;
  phone: string | null;
}
