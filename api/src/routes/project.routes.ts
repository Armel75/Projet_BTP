import { Router } from "express";
import { ProjectController } from '../controllers/project.controller.js';
import { authenticateToken } from '../middlewares/auth.middleware.js';

const projectRouter = Router();

projectRouter.get("/", authenticateToken, ProjectController.getProjects);
projectRouter.post("/", authenticateToken, ProjectController.createProject);
projectRouter.get("/:id", authenticateToken, ProjectController.getProject);

// WBS
projectRouter.get("/:projectId/wbs", authenticateToken, ProjectController.getWBSTree);
projectRouter.post("/wbs", authenticateToken, ProjectController.createWBSNode);

// Tasks
projectRouter.get("/:projectId/tasks", authenticateToken, ProjectController.getTasks);
projectRouter.post("/tasks", authenticateToken, ProjectController.createTask);
projectRouter.patch("/tasks/:id", authenticateToken, ProjectController.updateTask);

// Dependencies
projectRouter.post("/tasks/dependency", authenticateToken, ProjectController.createDependency);

// Lots
projectRouter.get("/:projectId/lots", authenticateToken, ProjectController.getLots);
projectRouter.post("/lots", authenticateToken, ProjectController.createLot);
projectRouter.delete("/lots/:id", authenticateToken, ProjectController.deleteLot);

export default projectRouter;
