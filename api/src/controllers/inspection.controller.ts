import { Request, Response } from 'express';
import { InspectionService } from '../services/inspection.service.js';
import { AuthRequest } from '../middlewares/auth.middleware.js';

export class InspectionController {
  static async create(req: Request, res: Response) {
    try {
      const user = (req as AuthRequest).user;
      const inspection = await InspectionService.createInspection({
        ...req.body,
        created_by: user!.id,
        scheduled_date: req.body.scheduled_date ? new Date(req.body.scheduled_date) : undefined
      });
      res.status(201).json(inspection);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  static async list(req: Request, res: Response) {
    try {
      const filters: any = {};
      if (req.query.project_id) filters.project_id = Number(req.query.project_id);
      if (req.query.status) filters.status = req.query.status as string;
      if (req.query.created_by) filters.created_by = Number(req.query.created_by);

      const inspections = await InspectionService.getInspections(filters);
      res.json(inspections);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  static async getById(req: Request, res: Response) {
    try {
      const inspection = await InspectionService.getInspectionById(Number(req.params.id));
      if (!inspection) return res.status(404).json({ error: "Inspection not found" });
      res.json(inspection);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  static async update(req: Request, res: Response) {
    try {
      const inspection = await InspectionService.updateInspection(Number(req.params.id), {
        ...req.body,
        completed_date: req.body.completed_date ? new Date(req.body.completed_date) : undefined
      });
      res.json(inspection);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  static async delete(req: Request, res: Response) {
    try {
      await InspectionService.deleteInspection(Number(req.params.id));
      res.status(204).send();
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }
}
