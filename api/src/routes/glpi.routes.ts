import { Router } from 'express';
import { authenticateToken } from '../middlewares/auth.middleware.js';
import { GlpiController } from '../controllers/glpi.controller.js';

const glpiRouter = Router();

glpiRouter.use(authenticateToken);

glpiRouter.get('/users', GlpiController.getUsers);
glpiRouter.get('/tickets', GlpiController.getTickets);

glpiRouter.post('/sync/users', GlpiController.syncUsers);
glpiRouter.post('/sync/tickets', GlpiController.syncTickets);

export default glpiRouter;
