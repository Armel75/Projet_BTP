import { Router } from "express";
import { ResourceController } from "../controllers/resource.controller.js";
import { RbacController } from "../controllers/rbac.controller.js";
import { authenticateToken } from "../middlewares/auth.middleware.js";

const resourceRouter = Router();

// Resource CRUD
resourceRouter.get("/", authenticateToken, ResourceController.getResources);
resourceRouter.post("/", authenticateToken, ResourceController.createResource);
resourceRouter.get("/types", authenticateToken, ResourceController.getResourceTypes);
resourceRouter.post("/types", authenticateToken, ResourceController.createResourceType);
resourceRouter.delete("/types/:id", authenticateToken, ResourceController.deleteResourceType);

// Users list (used across multiple views to populate pilot/responsible dropdowns)
resourceRouter.get("/users", authenticateToken, RbacController.getAllUsers);
resourceRouter.get("/glpi-users", authenticateToken, ResourceController.getGlpiUsers);

resourceRouter.get("/:id", authenticateToken, ResourceController.getResource);
resourceRouter.put("/:id", authenticateToken, ResourceController.updateResource);
resourceRouter.delete("/:id", authenticateToken, ResourceController.deleteResource);

// Task Assignments (Resource perspective or specific endpoints requested)
// POST /tasks/:id/assign
resourceRouter.post("/tasks/:id/assign", authenticateToken, ResourceController.assignToTask);
resourceRouter.get("/tasks/:id/assignments", authenticateToken, ResourceController.getTaskAssignments);
resourceRouter.delete("/tasks/:id/assign/:resourceId", authenticateToken, ResourceController.unassignFromTask);

export default resourceRouter;
