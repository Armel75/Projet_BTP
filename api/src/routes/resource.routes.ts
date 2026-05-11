import { Router } from "express";
import { ResourceController } from "../controllers/resource.controller.js";
import { RbacController } from "../controllers/rbac.controller.js";
import { authenticateToken, requirePermission } from "../middlewares/auth.middleware.js";

const resourceRouter = Router();

// Resource CRUD
resourceRouter.get("/", authenticateToken, requirePermission("resource:read"), ResourceController.getResources);
resourceRouter.post("/", authenticateToken, requirePermission("resource:create"), ResourceController.createResource);
resourceRouter.get("/types", authenticateToken, requirePermission("resource:read"), ResourceController.getResourceTypes);
resourceRouter.post("/types", authenticateToken, requirePermission("resource:create"), ResourceController.createResourceType);
resourceRouter.delete("/types/:id", authenticateToken, requirePermission("resource:delete"), ResourceController.deleteResourceType);

// Users list (used across multiple views to populate pilot/responsible dropdowns)
resourceRouter.get("/users", authenticateToken, requirePermission("user:read"), RbacController.getAllUsers);
resourceRouter.get("/glpi-users", authenticateToken, requirePermission("erp-sync:read"), ResourceController.getGlpiUsers);

resourceRouter.get("/:id", authenticateToken, requirePermission("resource:read"), ResourceController.getResource);
resourceRouter.put("/:id", authenticateToken, requirePermission("resource:update"), ResourceController.updateResource);
resourceRouter.delete("/:id", authenticateToken, requirePermission("resource:delete"), ResourceController.deleteResource);

// Task Assignments (Resource perspective or specific endpoints requested)
resourceRouter.post("/tasks/:id/assign", authenticateToken, requirePermission("task:update"), ResourceController.assignToTask);
resourceRouter.get("/tasks/:id/assignments", authenticateToken, requirePermission("task:read"), ResourceController.getTaskAssignments);
resourceRouter.delete("/tasks/:id/assign/:resourceId", authenticateToken, requirePermission("task:update"), ResourceController.unassignFromTask);

export default resourceRouter;
