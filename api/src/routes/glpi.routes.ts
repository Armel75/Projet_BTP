import { Router } from 'express';
import { authenticateToken, requirePermission } from '../middlewares/auth.middleware.js';
import { GlpiController } from '../controllers/glpi.controller.js';

const glpiRouter = Router();

glpiRouter.use(authenticateToken);

glpiRouter.get('/users', requirePermission('erp-sync:read'), GlpiController.getUsers);
glpiRouter.get('/tickets', requirePermission('erp-sync:read'), GlpiController.getTickets);

glpiRouter.post('/sync/users', requirePermission('erp-sync:manage'), GlpiController.syncUsers);
glpiRouter.post('/sync/tickets', requirePermission('erp-sync:manage'), GlpiController.syncTickets);

export default glpiRouter;
