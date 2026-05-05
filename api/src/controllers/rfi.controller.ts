import { Request, Response } from 'express';
import { RFIService } from '../services/rfi.service.js';
import { AuthRequest } from '../middlewares/auth.middleware.js';

export class RFIController {

  // ─── RFIs ─────────────────────────────────────────────────────────────────

  // GET /rfis
  static async list(req: Request, res: Response) {
    try {
      const filters: any = {};
      if (req.query.project_id) filters.project_id = Number(req.query.project_id);
      if (req.query.lot_id)     filters.lot_id     = Number(req.query.lot_id);
      if (req.query.status)     filters.status     = req.query.status as string;
      if (req.query.priority)   filters.priority   = req.query.priority as string;
      if (req.query.category)   filters.category   = req.query.category as string;

      const rfis = await RFIService.listRFIs(filters);
      res.json(rfis);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }

  // GET /rfis/:id
  static async getById(req: Request, res: Response) {
    try {
      const rfi = await RFIService.getRFIById(Number(req.params.id));
      if (!rfi) return res.status(404).json({ error: 'RFI not found' });
      res.json(rfi);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }

  // POST /rfis
  static async create(req: Request, res: Response) {
    try {
      const user = (req as AuthRequest).user;
      const body = req.body;

      if (!body.project_id) return res.status(400).json({ error: 'project_id est obligatoire' });
      if (!body.number)     return res.status(400).json({ error: 'number est obligatoire' });
      if (!body.subject)    return res.status(400).json({ error: 'subject est obligatoire' });
      if (!body.question)   return res.status(400).json({ error: 'question est obligatoire' });

      // Auto-assign submitted_by si non fourni
      if (!body.submitted_by && user?.id) body.submitted_by = user.id;

      const rfi = await RFIService.createRFI(body);
      res.status(201).json(rfi);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }

  // PUT /rfis/:id
  static async update(req: Request, res: Response) {
    try {
      const rfi = await RFIService.updateRFI(Number(req.params.id), req.body);
      res.json(rfi);
    } catch (err: any) {
      if (err.message === 'RFI not found') return res.status(404).json({ error: err.message });
      res.status(400).json({ error: err.message });
    }
  }

  // DELETE /rfis/:id
  static async delete(req: Request, res: Response) {
    try {
      await RFIService.deleteRFI(Number(req.params.id));
      res.status(204).send();
    } catch (err: any) {
      if (err.message === 'RFI not found') return res.status(404).json({ error: err.message });
      res.status(400).json({ error: err.message });
    }
  }

  // ─── Comments ─────────────────────────────────────────────────────────────

  // GET /rfis/:id/comments
  static async getComments(req: Request, res: Response) {
    try {
      const comments = await RFIService.getComments(Number(req.params.id));
      res.json(comments);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }

  // POST /rfis/:id/comments
  static async createComment(req: Request, res: Response) {
    try {
      const user = (req as AuthRequest).user;
      const { content, document_id } = req.body;
      if (!content?.trim()) return res.status(400).json({ error: 'content est obligatoire' });

      const comment = await RFIService.createComment({
        rfi_id:       Number(req.params.id),
        user_id:      user?.id || undefined,
        content,
        document_id: document_id ? Number(document_id) : undefined,
      });
      res.status(201).json(comment);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }

  // PUT /rfis/:id/comments/:cid
  static async updateComment(req: Request, res: Response) {
    try {
      const body = req.body;
      const comment = await RFIService.updateComment(Number(req.params.cid), {
        ...(body.content !== undefined ? { content: body.content } : {}),
        ...(body.document_id !== undefined ? { document_id: body.document_id ? Number(body.document_id) : null } : {}),
      });
      res.json(comment);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }

  // DELETE /rfis/:id/comments/:cid
  static async deleteComment(req: Request, res: Response) {
    try {
      await RFIService.deleteComment(Number(req.params.cid));
      res.status(204).send();
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }
}
