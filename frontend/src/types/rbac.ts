export interface Permission {
  id: string;
  key: string;
  description: string;
}

export interface RolePermission {
  roleId: string;
  permissionId: string;
  permission: Permission;
}

export interface Role {
  id: string;
  companyId: string;
  systemKey: string | null;
  name: string;
  isSystemRole: boolean;
  rolePermissions: RolePermission[];
  _count?: {
    users: number;
  };
}
