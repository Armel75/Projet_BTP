import { Request, Response } from 'express';
import { PunchItemService } from '../services/punch-item.service.js';
import { AuthRequest } from '../middlewares/auth.middleware.js';

export class PunchItemController {
  static async create(req: Request, res: Response) {
    try {
      const user = (req as AuthRequest).user;
      const item = await PunchItemService.createPunchItem({
        ...req.body,
        project_id:     Number(req.body.project_id),
        lot_id:         req.body.lot_id      ? Number(req.body.lot_id)      : undefined,
        task_id:        req.body.task_id     ? Number(req.body.task_id)     : undefined,
        assigned_to_id: req.body.assigned_to_id ? Number(req.body.assigned_to_id) : undefined,
        due_date:       req.body.due_date    ? new Date(req.body.due_date)  : undefined,
        created_by:     user!.id,
      });
      res.status(201).json(item);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  static async list(req: Request, res: Response) {
    try {
      const filters: any = {};
      if (req.query.project_id)    filters.project_id    = Number(req.query.project_id);
      if (req.query.status)        filters.status         = req.query.status as string;
      if (req.query.category)      filters.category       = req.query.category as string;
      if (req.query.priority)      filters.priority       = req.query.priority as string;
      if (req.query.assigned_to_id) filters.assigned_to_id = Number(req.query.assigned_to_id);
      if (req.query.lot_id)        filters.lot_id         = Number(req.query.lot_id);
      if (req.query.created_by)    filters.created_by     = Number(req.query.created_by);

      const items = await PunchItemService.getPunchItems(filters);
      res.json(items);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  static async getById(req: Request, res: Response) {
    try {
      const item = await PunchItemService.getPunchItemById(Number(req.params.id));
      if (!item) return res.status(404).json({ error: "Punch item not found" });
      res.json(item);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  static async update(req: Request, res: Response) {
    try {
      const item = await PunchItemService.updatePunchItem(Number(req.params.id), {
        ...req.body,
        assigned_to_id: req.body.assigned_to_id !== undefined
          ? (req.body.assigned_to_id ? Number(req.body.assigned_to_id) : null)
          : undefined,
        lot_id:  req.body.lot_id  !== undefined ? (req.body.lot_id  ? Number(req.body.lot_id)  : null) : undefined,
        task_id: req.body.task_id !== undefined ? (req.body.task_id ? Number(req.body.task_id) : null) : undefined,
        due_date:    req.body.due_date    ? new Date(req.body.due_date)    : undefined,
        resolved_at: req.body.resolved_at ? new Date(req.body.resolved_at) : undefined,
      });
      res.json(item);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  static async delete(req: Request, res: Response) {
    try {
      await PunchItemService.deletePunchItem(Number(req.params.id));
      res.status(204).send();
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }
}
