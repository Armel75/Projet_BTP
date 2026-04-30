import { Router } from "express";
import { RbacController } from "../controllers/rbac.controller.js";
import { requireAuth, requirePermission } from "../middlewares/auth.middleware.js";

const rbacRouter = Router();

// All RBAC routes require authentication
rbacRouter.use(requireAuth);

// Roles — controlled by permission, not by role name
rbacRouter.get("/roles", requirePermission("role:read"), RbacController.getRoles);
rbacRouter.post("/roles", requirePermission("role:create"), RbacController.createRole);
rbacRouter.delete("/roles/:id", requirePermission("role:delete"), RbacController.deleteRole);

// Permissions
rbacRouter.get("/permissions", requirePermission("permission:read"), RbacController.getPermissions);
rbacRouter.post("/permissions", requirePermission("permission:create"), RbacController.createPermission);
rbacRouter.delete("/permissions/:id", requirePermission("permission:delete"), RbacController.deletePermission);

// Role <=> Permission assignment
rbacRouter.post("/roles/:id/permissions", requirePermission("role:assign-permission"), RbacController.addPermissionToRole);
rbacRouter.delete("/roles/:id/permissions/:permissionId", requirePermission("role:assign-permission"), RbacController.removePermissionFromRole);

// Users <=> Role assignment
rbacRouter.get("/users", requirePermission("user:read"), RbacController.getAllUsers);
rbacRouter.post("/users/:id/roles", requirePermission("user:assign-role"), RbacController.assignRoleToUser);
rbacRouter.delete("/users/:id/roles/:roleId", requirePermission("user:assign-role"), RbacController.removeRoleFromUser);

export default rbacRouter;
