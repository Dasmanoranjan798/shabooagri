import type { NextFunction, Request, Response } from "express";
import * as rbacService from "../modules/rbac/rbac.service";
import { AppError } from "../shared/errors/AppError";

// Reusable permission gate any module's routes can apply, e.g.:
//   router.post("/", authMiddleware, requirePermission("booking.create"), controller.create)
// Must run after authMiddleware — it reads req.user and does not verify
// the token itself. Looks the permission up from role_permissions via
// rbac.service on every call rather than a hardcoded switch on role name,
// so granting/revoking a permission is a data change, not a code change.
export function requirePermission(permissionKey: string) {
  return async (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AppError(401, "Authentication required"));
    }
    const allowed = await rbacService.userHasPermission(req.user.roleId, permissionKey);
    if (!allowed) {
      return next(new AppError(403, `Missing required permission: ${permissionKey}`));
    }
    next();
  };
}
