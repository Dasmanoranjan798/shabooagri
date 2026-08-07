import * as rbacRepository from "./rbac.repository";

// The single source of truth for "can this role do X." Both
// middleware/rbac.middleware.ts (route-level gating) and any module's own
// service layer that needs an inline check mid-flow (e.g. Auth's
// bootstrap-gated registration) call this — neither queries
// role_permissions directly, and neither hardcodes a role-name switch.
//
// Takes a bare roleId rather than a full user/session object on purpose:
// permission-checking only ever needs to know which role is asking, so
// this module stays decoupled from Auth's user/session shape.
export async function userHasPermission(roleId: string, permissionKey: string): Promise<boolean> {
  return rbacRepository.roleHasPermission(roleId, permissionKey);
}
