import { Router } from 'express';
import { RFIController } from '../controllers/rfi.controller.js';
import { authenticateToken } from '../middlewares/auth.middleware.js';

const rfiRouter = Router();

rfiRouter.use(authenticateToken);

// ─── CRUD RFIs ────────────────────────────────────────────────────────────────
rfiRouter.get('/',    RFIController.list);
rfiRouter.post('/',   RFIController.create);
rfiRouter.get('/:id', RFIController.getById);
rfiRouter.put('/:id', RFIController.update);
rfiRouter.delete('/:id', RFIController.delete);

// ─── Sous-ressource : Commentaires ───────────────────────────────────────────
rfiRouter.get('/:id/comments',          RFIController.getComments);
rfiRouter.post('/:id/comments',         RFIController.createComment);
rfiRouter.put('/:id/comments/:cid',     RFIController.updateComment);
rfiRouter.delete('/:id/comments/:cid',  RFIController.deleteComment);

export default rfiRouter;
