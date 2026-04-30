import { Router } from 'express';
import { WorkAcceptanceController } from '../controllers/work-acceptance.controller.js';
import { authenticateToken } from '../middlewares/auth.middleware.js';

const router = Router();

router.use(authenticateToken);

router.post('/',    WorkAcceptanceController.create);
router.get('/',     WorkAcceptanceController.list);
router.get('/:id',  WorkAcceptanceController.getById);
router.put('/:id',  WorkAcceptanceController.update);
router.delete('/:id', WorkAcceptanceController.delete);

export default router;
