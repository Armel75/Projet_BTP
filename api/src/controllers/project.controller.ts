import { Request, Response } from "express";
import { prisma } from '../config/prisma.js';
import { ProjectManagementService } from "../services/project-management.service.js";

export class ProjectController {
  static async getProjects(req: Request, res: Response): Promise<void> {
    try {
      const projects = await prisma.project.findMany({
        include: {
          createdBy: true,
          document: true,
        },
      });
      res.json(projects);
    } catch (error) {
      console.error("Error fetching projects:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }

  static async createProject(req: Request, res: Response): Promise<void> {
    try {
      const project = await ProjectManagementService.createProject(req.body);
      res.status(201).json(project);
    } catch (error) {
      res.status(500).json({ error: "Failed to create project" });
    }
  }

  static async getProject(req: Request, res: Response): Promise<void> {
    try {
      const project = await ProjectManagementService.getProjectById(Number(req.params.id));
      if (!project) {
        res.status(404).json({ error: "Project not found" });
        return;
      }
      res.json(project);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch project" });
    }
  }

  // WBS
  static async getWBSTree(req: Request, res: Response): Promise<void> {
    try {
      const tree = await ProjectManagementService.getWBSTree(Number(req.params.projectId));
      res.json(tree);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch WBS tree" });
    }
  }

  static async createWBSNode(req: Request, res: Response): Promise<void> {
    try {
      const node = await ProjectManagementService.createWBSNode(req.body);
      res.status(201).json(node);
    } catch (error) {
      res.status(500).json({ error: "Failed to create WBS node" });
    }
  }

  // Tasks
  static async getTasks(req: Request, res: Response): Promise<void> {
    try {
      const tasks = await ProjectManagementService.getTasksByProject(Number(req.params.projectId));
      res.json(tasks);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch tasks" });
    }
  }

  static async createTask(req: Request, res: Response): Promise<void> {
    try {
      const task = await ProjectManagementService.createTask(req.body);
      res.status(201).json(task);
    } catch (error) {
      res.status(500).json({ error: "Failed to create task" });
    }
  }

  static async updateTask(req: Request, res: Response): Promise<void> {
    try {
      const task = await ProjectManagementService.updateTask(Number(req.params.id), req.body);
      res.json(task);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  static async createDependency(req: Request, res: Response): Promise<void> {
    try {
      const { taskId, dependsOnId } = req.body;
      const dep = await ProjectManagementService.createTaskDependency(taskId, dependsOnId);
      res.status(201).json(dep);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  // Lots
  static async createLot(req: Request, res: Response): Promise<void> {
    try {
      const lot = await ProjectManagementService.createProjectLot(req.body);
      res.status(201).json(lot);
    } catch (error) {
      res.status(500).json({ error: "Failed to create lot" });
    }
  }

  static async getLots(req: Request, res: Response): Promise<void> {
    try {
      const lots = await ProjectManagementService.getLotsByProject(Number(req.params.projectId));
      res.json(lots);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch lots" });
    }
  }

  static async deleteLot(req: Request, res: Response): Promise<void> {
    try {
      await ProjectManagementService.deleteProjectLot(Number(req.params.id));
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete lot" });
    }
  }
}
