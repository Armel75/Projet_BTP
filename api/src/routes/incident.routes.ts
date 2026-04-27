import { Router } from 'express';
import { IncidentController } from '../controllers/incident.controller.js';
import { authenticateToken } from '../middlewares/auth.middleware.js';

const router = Router();

router.use(authenticateToken);

router.post('/', IncidentController.create);
router.get('/', IncidentController.list);
router.get('/:id', IncidentController.getById);
router.put('/:id', IncidentController.update);
router.delete('/:id', IncidentController.delete);

export default router;
