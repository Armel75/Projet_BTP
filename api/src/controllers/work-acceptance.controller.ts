import { Request, Response } from 'express';
import { WorkAcceptanceService } from '../services/work-acceptance.service.js';
import { AuthRequest } from '../middlewares/auth.middleware.js';

export class WorkAcceptanceController {
  static async create(req: Request, res: Response) {
    try {
      const user = (req as AuthRequest).user;
      const body = req.body;
      const wa = await WorkAcceptanceService.createWorkAcceptance({
        ...body,
        project_id:         Number(body.project_id),
        lot_id:             body.lot_id          ? Number(body.lot_id)             : undefined,
        inspector_id:       body.inspector_id    ? Number(body.inspector_id)       : undefined,
        warranty_months:    body.warranty_months ? Number(body.warranty_months)    : undefined,
        amount_accepted:    body.amount_accepted ? Number(body.amount_accepted)    : undefined,
        penalty_amount:     body.penalty_amount  ? Number(body.penalty_amount)     : undefined,
        reserve_count:      body.reserve_count   ? Number(body.reserve_count)      : undefined,
        planned_date:       body.planned_date       ? new Date(body.planned_date)       : undefined,
        inspection_date:    body.inspection_date    ? new Date(body.inspection_date)    : undefined,
        accepted_at:        body.accepted_at        ? new Date(body.accepted_at)        : undefined,
        contra_visit_date:  body.contra_visit_date  ? new Date(body.contra_visit_date)  : undefined,
        warranty_end_date:  body.warranty_end_date  ? new Date(body.warranty_end_date)  : undefined,
        signed_by_owner:      body.signed_by_owner      === true || body.signed_by_owner      === 'true',
        signed_by_contractor: body.signed_by_contractor === true || body.signed_by_contractor === 'true',
        created_by: user!.id,
      });
      res.status(201).json(wa);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  static async list(req: Request, res: Response) {
    try {
      const filters: any = {};
      if (req.query.project_id)   filters.project_id   = Number(req.query.project_id);
      if (req.query.lot_id)       filters.lot_id        = Number(req.query.lot_id);
      if (req.query.status)       filters.status        = req.query.status as string;
      if (req.query.type)         filters.type          = req.query.type as string;
      if (req.query.inspector_id) filters.inspector_id  = Number(req.query.inspector_id);

      const items = await WorkAcceptanceService.getWorkAcceptances(filters);
      res.json(items);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  static async getById(req: Request, res: Response) {
    try {
      const wa = await WorkAcceptanceService.getWorkAcceptanceById(Number(req.params.id));
      if (!wa) return res.status(404).json({ error: "Work acceptance not found" });
      res.json(wa);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  static async update(req: Request, res: Response) {
    try {
      const body = req.body;
      const data: Record<string, any> = { ...body };

      if (body.lot_id        !== undefined) data.lot_id        = body.lot_id        ? Number(body.lot_id)        : null;
      if (body.inspector_id  !== undefined) data.inspector_id  = body.inspector_id  ? Number(body.inspector_id)  : null;
      if (body.warranty_months  !== undefined) data.warranty_months  = body.warranty_months  ? Number(body.warranty_months)  : null;
      if (body.amount_accepted  !== undefined) data.amount_accepted  = body.amount_accepted  ? Number(body.amount_accepted)  : null;
      if (body.penalty_amount   !== undefined) data.penalty_amount   = body.penalty_amount   ? Number(body.penalty_amount)   : null;
      if (body.reserve_count    !== undefined) data.reserve_count    = body.reserve_count    ? Number(body.reserve_count)    : 0;

      if (body.planned_date      !== undefined) data.planned_date      = body.planned_date      ? new Date(body.planned_date)      : null;
      if (body.inspection_date   !== undefined) data.inspection_date   = body.inspection_date   ? new Date(body.inspection_date)   : null;
      if (body.accepted_at       !== undefined) data.accepted_at       = body.accepted_at       ? new Date(body.accepted_at)       : null;
      if (body.contra_visit_date !== undefined) data.contra_visit_date = body.contra_visit_date ? new Date(body.contra_visit_date) : null;
      if (body.warranty_end_date !== undefined) data.warranty_end_date = body.warranty_end_date ? new Date(body.warranty_end_date) : null;

      if (body.signed_by_owner      !== undefined) data.signed_by_owner      = body.signed_by_owner      === true || body.signed_by_owner      === 'true';
      if (body.signed_by_contractor !== undefined) data.signed_by_contractor = body.signed_by_contractor === true || body.signed_by_contractor === 'true';

      const wa = await WorkAcceptanceService.updateWorkAcceptance(Number(req.params.id), data);
      res.json(wa);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  static async delete(req: Request, res: Response) {
    try {
      await WorkAcceptanceService.deleteWorkAcceptance(Number(req.params.id));
      res.status(204).send();
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }
}
