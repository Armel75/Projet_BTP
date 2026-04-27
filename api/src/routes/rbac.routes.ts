import { Router } from "express";
import { RbacController } from "../controllers/rbac.controller.js";
import { requireAuth, requireRole, requirePermission } from "../middlewares/auth.middleware.js";

const rbacRouter = Router();

// Only ADMIN can access RBAC generally, we can apply requireRole("ADMIN") later if needed. 
// For now let's just make it required an authenticated user, and optionally we can protect tests.
rbacRouter.use(requireAuth);
rbacRouter.use(requireRole("ADMIN"));


// Roles
rbacRouter.get("/roles", RbacController.getRoles);
rbacRouter.post("/roles", RbacController.createRole);
rbacRouter.delete("/roles/:id", RbacController.deleteRole);

// Permissions
rbacRouter.get("/permissions", RbacController.getPermissions);
rbacRouter.post("/permissions", RbacController.createPermission);
rbacRouter.delete("/permissions/:id", RbacController.deletePermission);

// Role <=> Permission
rbacRouter.post("/roles/:id/permissions", RbacController.addPermissionToRole);
rbacRouter.delete("/roles/:id/permissions/:permissionId", RbacController.removePermissionFromRole);

// Users <=> Role
rbacRouter.get("/users", RbacController.getAllUsers); // Used for listing users and their roles
rbacRouter.post("/users/:id/roles", RbacController.assignRoleToUser);
rbacRouter.delete("/users/:id/roles/:roleId", RbacController.removeRoleFromUser);

export default rbacRouter;
