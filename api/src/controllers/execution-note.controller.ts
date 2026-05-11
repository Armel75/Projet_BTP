import { Request, Response } from 'express';
import { ExecutionNoteService } from '../services/execution-note.service.js';
import { AuthRequest } from '../middlewares/auth.middleware.js';

export class ExecutionNoteController {

  // ─── GET /execution-notes ─────────────────────────────────────────────────
  static async list(req: Request, res: Response) {
    try {
      const {
        project_id, lot_id, task_id, incident_id,
        category, visibility, source,
        requires_attention, is_pinned,
        exclude_deleted, top_level_only,
      } = req.query as Record<string, string | undefined>;

      const filters: any = {};
      if (project_id)  filters.project_id  = Number(project_id);
      if (lot_id)      filters.lot_id      = Number(lot_id);
      if (task_id)     filters.task_id     = Number(task_id);
      if (incident_id) filters.incident_id = Number(incident_id);
      if (category)    filters.category    = category;
      if (visibility)  filters.visibility  = visibility;
      if (source)      filters.source      = source;
      if (requires_attention !== undefined) filters.requires_attention = requires_attention === 'true';
      if (is_pinned          !== undefined) filters.is_pinned          = is_pinned === 'true';
      if (exclude_deleted    !== undefined) filters.exclude_deleted    = exclude_deleted !== 'false';
      if (top_level_only     !== undefined) filters.top_level_only     = top_level_only !== 'false';

      const notes = await ExecutionNoteService.list(filters);
      res.json(notes);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }

  // ─── GET /execution-notes/timeline ────────────────────────────────────────
  static async timeline(req: Request, res: Response) {
    try {
      const { project_id, lot_id, task_id, incident_id } = req.query as Record<string, string | undefined>;
      if (!project_id) return res.status(400).json({ error: 'project_id est obligatoire' });

      const timeline = await ExecutionNoteService.timeline({
        project_id:  Number(project_id),
        lot_id:      lot_id      ? Number(lot_id)      : undefined,
        task_id:     task_id     ? Number(task_id)     : undefined,
        incident_id: incident_id ? Number(incident_id) : undefined,
      });
      res.json(timeline);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }

  // ─── GET /execution-notes/:id ─────────────────────────────────────────────
  static async getById(req: Request, res: Response) {
    try {
      const note = await ExecutionNoteService.getById(Number(req.params.id));
      if (!note) return res.status(404).json({ error: 'Note introuvable' });
      res.json(note);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }

  // ─── POST /execution-notes ────────────────────────────────────────────────
  static async create(req: Request, res: Response) {
    try {
      const user = (req as AuthRequest).user;
      if (!user?.id) return res.status(401).json({ error: 'Utilisateur non identifié' });

      const { project_id, content } = req.body;
      if (!project_id) return res.status(400).json({ error: 'project_id est obligatoire' });
      if (!content?.trim()) return res.status(400).json({ error: 'content est obligatoire' });

      const note = await ExecutionNoteService.create(req.body, user.id);
      res.status(201).json(note);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }

  // ─── PATCH /execution-notes/:id ───────────────────────────────────────────
  static async update(req: Request, res: Response) {
    try {
      const user = (req as AuthRequest).user;
      if (!user?.id) return res.status(401).json({ error: 'Utilisateur non identifié' });

      const note = await ExecutionNoteService.update(Number(req.params.id), req.body, user.id);
      res.json(note);
    } catch (err: any) {
      if (err.message === 'Note introuvable.') return res.status(404).json({ error: err.message });
      res.status(400).json({ error: err.message });
    }
  }

  // ─── POST /execution-notes/:id/pin ────────────────────────────────────────
  static async togglePin(req: Request, res: Response) {
    try {
      const authorized = await ExecutionNoteController.authorizeNoteAction(req, res, Number(req.params.id));
      if (!authorized) return;

      const note = await ExecutionNoteService.togglePin(Number(req.params.id));
      res.json(note);
    } catch (err: any) {
      if (err.message === 'Note introuvable.') return res.status(404).json({ error: err.message });
      res.status(400).json({ error: err.message });
    }
  }

  // ─── POST /execution-notes/:id/resolve ───────────────────────────────────
  static async resolve(req: Request, res: Response) {
    try {
      const authorized = await ExecutionNoteController.authorizeNoteAction(req, res, Number(req.params.id));
      if (!authorized) return;

      const note = await ExecutionNoteService.resolve(Number(req.params.id));
      res.json(note);
    } catch (err: any) {
      if (err.message === 'Note introuvable.') return res.status(404).json({ error: err.message });
      res.status(400).json({ error: err.message });
    }
  }

  // ─── DELETE /execution-notes/:id ─────────────────────────────────────────
  static async softDelete(req: Request, res: Response) {
    try {
      const authorized = await ExecutionNoteController.authorizeNoteAction(req, res, Number(req.params.id));
      if (!authorized) return;

      await ExecutionNoteService.softDelete(Number(req.params.id));
      res.status(204).send();
    } catch (err: any) {
      if (err.message === 'Note introuvable.') return res.status(404).json({ error: err.message });
      res.status(400).json({ error: err.message });
    }
  }

  // ─── Authorization helper ─────────────────────────────────────────────────
  /**
   * Verifies that the requesting user is allowed to mutate the given note.
   * Rules (first match wins):
   *  1. User has `project:read:all` permission  → Admin / Directeur de projet bypass
   *  2. User is the note creator (`created_by`) → always allowed on own notes
   *  3. User is the project manager of the note's project (`project_manager_id`)
   *  4. Otherwise                               → 403 Forbidden
   *
   * Returns the fetched note on success, or sends the HTTP response and returns null.
   */
  private static async authorizeNoteAction(
    req: Request,
    res: Response,
    noteId: number,
  ): Promise<Record<string, any> | null> {
    const user = (req as AuthRequest).user;
    if (!user?.id) {
      res.status(401).json({ error: 'Utilisateur non identifié' });
      return null;
    }

    const note = await ExecutionNoteService.getById(noteId);
    if (!note) {
      res.status(404).json({ error: 'Note introuvable' });
      return null;
    }

    const userId = Number(user.id);
    // Admin bypass: users with project:read:all (ADMIN, DIRECTEUR_PROJET) can act on any note
    const isAdmin = (user.permissions as string[] | undefined)?.includes('project:read:all') ?? false;
    const isCreator = (note as any).created_by === userId;
    const isProjectManager = (note as any).project?.project_manager_id === userId;

    if (!isAdmin && !isCreator && !isProjectManager) {
      res.status(403).json({
        error: 'Accès refusé : seul le créateur, le responsable de projet ou un administrateur peut effectuer cette action.',
      });
      return null;
    }

    return note as Record<string, any>;
  }

  // ─── Status History ───────────────────────────────────────────────────────

  // GET /execution-notes/task-history/:taskId
  static async taskHistory(req: Request, res: Response) {
    try {
      const history = await ExecutionNoteService.getTaskStatusHistory(Number(req.params.taskId));
      res.json(history);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }

  // GET /execution-notes/lot-history/:lotId
  static async lotHistory(req: Request, res: Response) {
    try {
      const history = await ExecutionNoteService.getLotStatusHistory(Number(req.params.lotId));
      res.json(history);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }

  // GET /execution-notes/incident-history/:incidentId
  static async incidentHistory(req: Request, res: Response) {
    try {
      const history = await ExecutionNoteService.getIncidentStatusHistory(Number(req.params.incidentId));
      res.json(history);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }
}
