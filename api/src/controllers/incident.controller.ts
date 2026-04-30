import { Request, Response } from 'express';
import { IncidentService } from '../services/incident.service.js';
import { AuthRequest } from '../middlewares/auth.middleware.js';

export class IncidentController {
  static async create(req: Request, res: Response) {
    try {
      const user = (req as AuthRequest).user;
      const body = req.body;
      const incident = await IncidentService.createIncident({
        ...body,
        project_id:       Number(body.project_id),
        task_id:          body.task_id          ? Number(body.task_id)          : undefined,
        lot_id:           body.lot_id           ? Number(body.lot_id)           : undefined,
        assigned_to_id:   body.assigned_to_id   ? Number(body.assigned_to_id)   : undefined,
        cost_impact:      body.cost_impact      ? Number(body.cost_impact)      : undefined,
        delay_impact_days: body.delay_impact_days ? Number(body.delay_impact_days) : undefined,
        incident_date:    body.incident_date    ? new Date(body.incident_date)  : undefined,
        created_by:       user!.id
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
      if (req.query.status)     filters.status     = req.query.status as string;
      if (req.query.severity)   filters.severity   = req.query.severity as string;
      if (req.query.type)       filters.type       = req.query.type as string;

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
      const body = req.body;
      const data: Record<string, any> = { ...body };
      if (body.resolved_at)     data.resolved_at     = new Date(body.resolved_at);
      if (body.incident_date)   data.incident_date   = new Date(body.incident_date);
      if (body.assigned_to_id !== undefined) data.assigned_to_id = body.assigned_to_id ? Number(body.assigned_to_id) : null;
      if (body.cost_impact      !== undefined) data.cost_impact      = body.cost_impact      ? Number(body.cost_impact)      : null;
      if (body.delay_impact_days !== undefined) data.delay_impact_days = body.delay_impact_days ? Number(body.delay_impact_days) : null;

      const incident = await IncidentService.updateIncident(Number(req.params.id), data);
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
