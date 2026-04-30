import { Router } from "express";
import { TenantController } from "../controllers/tenant.controller.js";
import { requireAuth, requirePermission } from "../middlewares/auth.middleware.js";

const tenantRouter = Router();

// All tenant routes require authentication
tenantRouter.use(requireAuth);

// CRUD — permission-based, never role-name-based
tenantRouter.get("/",    requirePermission("tenant:read"),   TenantController.list);
tenantRouter.get("/:id", requirePermission("tenant:read"),   TenantController.getOne);
tenantRouter.post("/",   requirePermission("tenant:create"), TenantController.create);
tenantRouter.patch("/:id", requirePermission("tenant:update"), TenantController.update);
tenantRouter.delete("/:id", requirePermission("tenant:delete"), TenantController.remove);

export default tenantRouter;
