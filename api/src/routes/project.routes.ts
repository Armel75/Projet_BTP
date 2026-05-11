import { Router } from "express";
import { ProjectController } from '../controllers/project.controller.js';
import { requireAuth, requireAnyPermission, requirePermission } from '../middlewares/auth.middleware.js';

const projectRouter = Router();
projectRouter.use(requireAuth);

// ─── Helpers pour formulaires (avant /:id pour éviter les conflits) ───────────
projectRouter.get("/helpers/users",              requirePermission("project:read"),     ProjectController.getUsers);
projectRouter.get("/helpers/roles",              requirePermission("project:team:update"),   ProjectController.getAssignableRoles);
projectRouter.get("/helpers/suppliers",          requirePermission("project:read"),     ProjectController.getSuppliers);
projectRouter.get("/helpers/trade-categories",   requirePermission("project-lot:read"), ProjectController.getTradeCategories);
projectRouter.get("/:projectId/helpers/wbs",     requirePermission("wbs:read"),         ProjectController.getWBSForProject);
// ─── Toutes les tâches du tenant (doit être avant /:id) ───────────────────────
projectRouter.get("/tasks",                      requirePermission("task:read"),        ProjectController.listAllTasks);

// ─── Projects ─────────────────────────────────────────────────────────────────
projectRouter.get("/",       requireAnyPermission("project:read", "project:read:all"),   ProjectController.listProjects);
projectRouter.post("/query", requireAnyPermission("project:read", "project:read:all"),   ProjectController.queryProjects);
projectRouter.get("/export/excel", requireAnyPermission("project:read", "project:read:all"), ProjectController.exportProjectsExcel);
projectRouter.get("/export/pdf", requireAnyPermission("project:read", "project:read:all"), ProjectController.exportProjectsPdf);
projectRouter.get("/:id",    requireAnyPermission("project:read", "project:read:all"),   ProjectController.getProject);
projectRouter.get("/:projectId/phase-transitions", requireAnyPermission("project:read", "project:read:all"), ProjectController.getProjectPhaseTransitions);
projectRouter.post("/",      requirePermission("project:create"), ProjectController.createProject);
projectRouter.patch("/:id",  requireAnyPermission("project:metadata:update", "project:phase:transition"), ProjectController.updateProject);
projectRouter.delete("/:id", requirePermission("project:delete"), ProjectController.deleteProject);

// ─── WBS ──────────────────────────────────────────────────────────────────────
projectRouter.get("/:projectId/wbs",  requirePermission("wbs:read"),   ProjectController.getWBSTree);
projectRouter.post("/wbs",            requirePermission("wbs:create"),  ProjectController.createWBSNode);
projectRouter.patch("/wbs/:id",       requirePermission("wbs:update"),  ProjectController.updateWBSNode);
projectRouter.delete("/wbs/:id",      requirePermission("wbs:delete"),  ProjectController.deleteWBSNode);

// ─── Tasks ────────────────────────────────────────────────────────────────────
projectRouter.get("/:projectId/tasks",  requirePermission("task:read"),   ProjectController.getTasks);
projectRouter.post("/tasks",            requirePermission("task:create"),  ProjectController.createTask);
projectRouter.patch("/tasks/:id",       requirePermission("task:update"),  ProjectController.updateTask);
projectRouter.delete("/tasks/:id",      requirePermission("task:delete"),  ProjectController.deleteTask);
projectRouter.post("/tasks/dependency", requirePermission("task:update"),  ProjectController.createDependency);

// ─── Lots ─────────────────────────────────────────────────────────────────────
projectRouter.get("/:projectId/lots",  requirePermission("project-lot:read"),   ProjectController.getLots);
projectRouter.post("/lots",            requirePermission("project-lot:create"),  ProjectController.createLot);
projectRouter.patch("/lots/:id",       requirePermission("project-lot:update"),  ProjectController.updateLot);
projectRouter.delete("/lots/:id",      requirePermission("project-lot:delete"),  ProjectController.deleteLot);

// ─── Budget Lines ─────────────────────────────────────────────────────────────
projectRouter.get("/:projectId/budget-lines",  requirePermission("budget:read"),   ProjectController.getBudgetLines);
projectRouter.post("/budget-lines",            requirePermission("budget:create"),  ProjectController.createBudgetLine);
projectRouter.patch("/budget-lines/:id",       requirePermission("budget:update"),  ProjectController.updateBudgetLine);
projectRouter.delete("/budget-lines/:id",      requirePermission("budget:delete"),  ProjectController.deleteBudgetLine);

// ─── Chef de Projet & Membres ─────────────────────────────────────────────────
projectRouter.put("/:id/manager",                    requirePermission("project:team:update"), ProjectController.assignProjectManager);
projectRouter.get("/:id/members",                    requireAnyPermission("project:read", "project:read:all"),   ProjectController.listProjectMembers);
projectRouter.post("/:id/members",                   requirePermission("project:team:update"), ProjectController.addProjectMember);
projectRouter.delete("/:id/members/:membershipId",   requirePermission("project:team:update"), ProjectController.removeProjectMember);

export default projectRouter;
