import { Request, Response } from 'express';
import { IncidentService } from '../services/incident.service.js';
import { AuthRequest } from '../middlewares/auth.middleware.js';

export class IncidentController {
  static async create(req: Request, res: Response) {
    try {
      const user = (req as AuthRequest).user;
      const incident = await IncidentService.createIncident({
        ...req.body,
        created_by: user!.id
      });
      res.status(201).json(incident);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  static async list(req: Request, res: Response) {
    try {
      const filters: any = {};
      if (req.query.project_id) filters.project_id = Number(req.query.project_id);
      if (req.query.status) filters.status = req.query.status as string;
      if (req.query.severity) filters.severity = req.query.severity as string;
      if (req.query.type) filters.type = req.query.type as string;

      const incidents = await IncidentService.getIncidents(filters);
      res.json(incidents);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  static async getById(req: Request, res: Response) {
    try {
      const incident = await IncidentService.getIncidentById(Number(req.params.id));
      if (!incident) return res.status(404).json({ error: "Incident not found" });
      res.json(incident);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  static async update(req: Request, res: Response) {
    try {
      const incident = await IncidentService.updateIncident(Number(req.params.id), {
        ...req.body,
        resolved_at: req.body.resolved_at ? new Date(req.body.resolved_at) : undefined
      });
      res.json(incident);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  static async delete(req: Request, res: Response) {
    try {
      await IncidentService.deleteIncident(Number(req.params.id));
      res.status(204).send();
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }
}
