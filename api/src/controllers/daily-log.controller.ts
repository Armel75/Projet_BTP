import { Request, Response } from 'express';
import { DailyLogService } from '../services/daily-log.service.js';
import { AuthRequest } from '../middlewares/auth.middleware.js';
import { RbacService } from '../services/rbac.service.js';

async function canReadAllDailyLogs(req: Request): Promise<boolean> {
  const user = (req as AuthRequest).user;
  if (!user?.id) return false;

  if (Array.isArray(user.permissions) && user.permissions.includes('daily-log:read:all')) {
    return true;
  }

  const permissions = await RbacService.getUserPermissions(user.id);
  return permissions.includes('daily-log:read:all');
}

export class DailyLogController {
  static async create(req: Request, res: Response) {
    try {
      const user = (req as AuthRequest).user;
      const log = await DailyLogService.createDailyLog({
        ...req.body,
        created_by: user!.id,
        date: new Date(req.body.date)
      });
      res.status(201).json(log);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  static async list(req: Request, res: Response) {
    try {
      const user = (req as AuthRequest).user;
      if (!user?.id) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const hasReadAll = await canReadAllDailyLogs(req);
      const filters: any = {};
      if (req.query.project_id) filters.project_id = Number(req.query.project_id);
      if (req.query.date) filters.date = new Date(req.query.date as string);
      if (req.query.is_archived !== undefined) {
        filters.is_archived = req.query.is_archived === 'true';
      } else {
        filters.is_archived = false;
      }
      if (!hasReadAll) filters.created_by = user.id;

      const logs = await DailyLogService.getDailyLogs(filters);
      res.json(logs);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  static async getById(req: Request, res: Response) {
    try {
      const user = (req as AuthRequest).user;
      if (!user?.id) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const hasReadAll = await canReadAllDailyLogs(req);
      const log = await DailyLogService.getDailyLogByIdForTenantScoped(
        Number(req.params.id),
        hasReadAll ? undefined : user.id
      );
      if (!log) return res.status(404).json({ error: "Daily log not found" });
      res.json(log);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  static async update(req: Request, res: Response) {
    try {
      const log = await DailyLogService.updateDailyLog(Number(req.params.id), {
        ...req.body,
        date: req.body.date ? new Date(req.body.date) : undefined,
      });
      res.json(log);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  static async delete(req: Request, res: Response) {
    try {
      await DailyLogService.deleteDailyLog(Number(req.params.id));
      res.status(204).send();
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  static async archive(req: Request, res: Response) {
    try {
      const { archived } = req.body;
      const log = archived === false
        ? await DailyLogService.restoreDailyLog(Number(req.params.id))
        : await DailyLogService.deleteDailyLog(Number(req.params.id));
      res.json(log);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }
}
