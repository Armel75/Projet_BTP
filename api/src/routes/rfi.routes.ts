import { Router } from 'express';
import { RFIController } from '../controllers/rfi.controller.js';
import { authenticateToken, requireAnyPermission, requirePermission } from '../middlewares/auth.middleware.js';

const rfiRouter = Router();

rfiRouter.use(authenticateToken);

// ─── CRUD RFIs ────────────────────────────────────────────────────────────────
rfiRouter.get('/next-number', requirePermission('rfi:read'), RFIController.nextNumber);
rfiRouter.get('/',    requireAnyPermission('rfi:read', 'rfi:read:all'),   RFIController.list);
rfiRouter.post('/',   requirePermission('rfi:create'), RFIController.create);
rfiRouter.get('/:id', requireAnyPermission('rfi:read', 'rfi:read:all'),   RFIController.getById);
rfiRouter.put('/:id', requirePermission('rfi:update'), RFIController.update);
rfiRouter.delete('/:id', requirePermission('rfi:delete'), RFIController.delete);

// ─── Sous-ressource : Commentaires ───────────────────────────────────────────
rfiRouter.get('/:id/comments',          requirePermission('rfi:read'),   RFIController.getComments);
rfiRouter.post('/:id/comments',         requirePermission('rfi:update'), RFIController.createComment);
rfiRouter.put('/:id/comments/:cid',     requirePermission('rfi:update'), RFIController.updateComment);
rfiRouter.delete('/:id/comments/:cid',  requirePermission('rfi:update'), RFIController.deleteComment);

export default rfiRouter;
