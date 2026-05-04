import { Request, Response } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware.js';
import { ControlReportService } from '../services/control-report.service.js';

export class ControlReportController {
  static async list(req: Request, res: Response) {
    try {
      const reports = await ControlReportService.listControlReports({
        project_id: req.query.project_id ? Number(req.query.project_id) : undefined,
        lot_id: req.query.lot_id ? Number(req.query.lot_id) : undefined,
        task_id: req.query.task_id ? Number(req.query.task_id) : undefined,
        type: req.query.type as string | undefined,
        status: req.query.status as string | undefined,
        severity: req.query.severity as string | undefined,
      });
      res.json(reports);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  static async getById(req: Request, res: Response) {
    try {
      const report = await ControlReportService.getControlReportById(Number(req.params.id));
      if (!report) return res.status(404).json({ error: 'Control report not found' });
      res.json(report);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  static async create(req: Request, res: Response) {
    try {
      const user = (req as AuthRequest).user;
      if (!req.body.project_id) return res.status(400).json({ error: 'project_id is required' });
      if (!req.body.comment) return res.status(400).json({ error: 'comment is required' });

      const report = await ControlReportService.createControlReport({
        ...req.body,
        created_by: user?.id,
      });

      res.status(201).json(report);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  static async update(req: Request, res: Response) {
    try {
      const report = await ControlReportService.updateControlReport(Number(req.params.id), req.body);
      res.json(report);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  static async approve(req: Request, res: Response) {
    try {
      const user = (req as AuthRequest).user;
      if (!user) return res.status(401).json({ error: 'Unauthorized' });
      const report = await ControlReportService.approve(Number(req.params.id), user.id);
      res.json(report);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  static async reject(req: Request, res: Response) {
    try {
      const user = (req as AuthRequest).user;
      if (!user) return res.status(401).json({ error: 'Unauthorized' });
      if (!req.body.rejected_reason) {
        return res.status(400).json({ error: 'rejected_reason is required for rejection' });
      }

      const report = await ControlReportService.reject(Number(req.params.id), user.id, req.body.rejected_reason);
      res.json(report);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  static async delete(req: Request, res: Response) {
    try {
      await ControlReportService.deleteControlReport(Number(req.params.id));
      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  static async listActions(req: Request, res: Response) {
    try {
      const actions = await ControlReportService.listActions(Number(req.params.id));
      res.json(actions);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  static async createAction(req: Request, res: Response) {
    try {
      if (!req.body.subject) return res.status(400).json({ error: 'subject is required' });
      const action = await ControlReportService.createAction(Number(req.params.id), req.body);
      res.status(201).json(action);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  static async updateAction(req: Request, res: Response) {
    try {
      const action = await ControlReportService.updateAction(Number(req.params.actionId), req.body);
      res.json(action);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  static async deleteAction(req: Request, res: Response) {
    try {
      await ControlReportService.deleteAction(Number(req.params.actionId));
      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  static async listAttachments(req: Request, res: Response) {
    try {
      const attachments = await ControlReportService.listAttachments(Number(req.params.id));
      res.json(attachments);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  static async createAttachment(req: Request, res: Response) {
    try {
      if (!req.body.url) return res.status(400).json({ error: 'url is required' });
      const attachment = await ControlReportService.createAttachment(Number(req.params.id), req.body);
      res.status(201).json(attachment);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  static async updateAttachment(req: Request, res: Response) {
    try {
      const attachment = await ControlReportService.updateAttachment(Number(req.params.attachmentId), req.body);
      res.json(attachment);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  static async deleteAttachment(req: Request, res: Response) {
    try {
      await ControlReportService.deleteAttachment(Number(req.params.attachmentId));
      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }
}
