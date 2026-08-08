export type SystemRoleKey = "owner" | "manager" | "driver" | "farmer";

export interface Permission {
  id: string;
  key: string;
  description: string;
}

export interface Role {
  id: string;
  companyId: string;
  systemKey: SystemRoleKey;
  name: string;
  isSystemRole: boolean;
  rolePermissions?: Array<{
    permission: Permission;
  }>;
}

export interface User {
  id: string;
  companyId: string;
  roleId: string;
  fullName: string;
  email: string | null;
  mobileNumber: string | null;
  status: "ACTIVE" | "INACTIVE";
  role: Role;
}

export interface LoginResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}
