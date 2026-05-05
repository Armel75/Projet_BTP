import { Request, Response } from "express";
import { ResourceService } from "../services/resource.service.js";
import { AuthRequest } from "../middlewares/auth.middleware.js";

export class ResourceController {
  static async getGlpiUsers(req: Request, res: Response): Promise<void> {
    try {
      const limit = req.query.limit ? Number(req.query.limit) : 200;
      const users = await ResourceService.getGlpiUsers(limit);
      res.json(users);
    } catch (error: any) {
      res.status(400).json({ error: error.message ?? "Failed to fetch GLPI users" });
    }
  }

  static async getResources(req: Request, res: Response): Promise<void> {
    try {
      const resources = await ResourceService.getResources();
      res.json(resources);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch resources" });
    }
  }

  static async getResource(req: Request, res: Response): Promise<void> {
    try {
      const resource = await ResourceService.getResourceById(Number(req.params.id));
      if (!resource) {
        res.status(404).json({ error: "Resource not found" });
        return;
      }
      res.json(resource);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch resource" });
    }
  }

  static async createResource(req: Request, res: Response): Promise<void> {
    try {
      const resource = await ResourceService.createResource(req.body);
      if (!resource) {
        throw new Error("Echec de persistance de la ressource.");
      }
      res.status(201).json(resource);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  static async updateResource(req: Request, res: Response): Promise<void> {
    try {
      const resource = await ResourceService.updateResource(Number(req.params.id), req.body);
      res.json(resource);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  static async deleteResource(req: Request, res: Response): Promise<void> {
    try {
      await ResourceService.deleteResource(Number(req.params.id));
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete resource" });
    }
  }

  static async getResourceTypes(req: Request, res: Response): Promise<void> {
    try {
      const types = await ResourceService.getResourceTypes();
      res.json(types);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch resource types" });
    }
  }

  static async createResourceType(req: Request, res: Response): Promise<void> {
    try {
      const type = await ResourceService.createResourceType(req.body?.code);
      res.status(201).json(type);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  static async deleteResourceType(req: Request, res: Response): Promise<void> {
    try {
      await ResourceService.deleteResourceType(Number(req.params.id));
      res.status(204).send();
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  static async assignToTask(req: Request, res: Response): Promise<void> {
    try {
      const taskId = Number(req.params.id);
      const userId = (req as AuthRequest).user?.id;
      const body = req.body ?? {};

      const resource_id = Number(body.resource_id ?? body.resourceId);
      const planned_hours = Number(body.planned_hours ?? body.plannedHours);
      const startDateRaw = body.start_date ?? body.startDate;
      const endDateRaw = body.end_date ?? body.endDate;

      if (!Number.isFinite(resource_id) || resource_id <= 0) {
        res.status(400).json({ error: "resource_id is required" });
        return;
      }

      if (!Number.isFinite(planned_hours) || planned_hours < 0) {
        res.status(400).json({ error: "planned_hours must be >= 0" });
        return;
      }

      const assignment = await ResourceService.assignToTask({
        resource_id,
        planned_hours,
        start_date: startDateRaw ? new Date(startDateRaw) : undefined,
        end_date: endDateRaw ? new Date(endDateRaw) : undefined,
        task_id: taskId,
        created_by: userId
      });
      res.status(201).json(assignment);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  static async unassignFromTask(req: Request, res: Response): Promise<void> {
    try {
      const taskId = Number(req.params.id);
      const resourceId = Number(req.params.resourceId);
      await ResourceService.unassignResourceFromTask(taskId, resourceId);
      res.status(204).send();
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  static async getTaskAssignments(req: Request, res: Response): Promise<void> {
    try {
      const assignments = await ResourceService.getTaskAssignments(Number(req.params.id));
      res.json(assignments);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch task assignments" });
    }
  }
}
