import { Router } from 'express';
import { ExecutionNoteController } from '../controllers/execution-note.controller.js';
import { authenticateToken, requirePermission } from '../middlewares/auth.middleware.js';

const executionNoteRouter = Router();

executionNoteRouter.use(authenticateToken);

// ─── Timeline (aggregated view) ───────────────────────────────────────────────
executionNoteRouter.get('/timeline',    requirePermission('execution-note:read'), ExecutionNoteController.timeline);

// ─── Status History ───────────────────────────────────────────────────────────
executionNoteRouter.get('/task-history/:taskId',         requirePermission('execution-note:read'), ExecutionNoteController.taskHistory);
executionNoteRouter.get('/lot-history/:lotId',           requirePermission('execution-note:read'), ExecutionNoteController.lotHistory);
executionNoteRouter.get('/incident-history/:incidentId', requirePermission('execution-note:read'), ExecutionNoteController.incidentHistory);

// ─── CRUD Notes ───────────────────────────────────────────────────────────────
executionNoteRouter.get('/',     requirePermission('execution-note:read'),   ExecutionNoteController.list);
executionNoteRouter.post('/',    requirePermission('execution-note:create'), ExecutionNoteController.create);
executionNoteRouter.get('/:id',  requirePermission('execution-note:read'),   ExecutionNoteController.getById);
executionNoteRouter.patch('/:id', requirePermission('execution-note:update'), ExecutionNoteController.update);
executionNoteRouter.delete('/:id', requirePermission('execution-note:delete'), ExecutionNoteController.softDelete);

// ─── Actions ──────────────────────────────────────────────────────────────────
executionNoteRouter.post('/:id/pin',     requirePermission('execution-note:pin'),    ExecutionNoteController.togglePin);
executionNoteRouter.post('/:id/resolve', requirePermission('execution-note:update'), ExecutionNoteController.resolve);

export default executionNoteRouter;
