import { Router } from 'express';
import { InspectionController } from '../controllers/inspection.controller.js';
import { authenticateToken } from '../middlewares/auth.middleware.js';

const router = Router();

router.use(authenticateToken);

router.post('/', InspectionController.create);
router.get('/', InspectionController.list);
router.get('/:id', InspectionController.getById);
router.put('/:id', InspectionController.update);
router.delete('/:id', InspectionController.delete);

export default router;
