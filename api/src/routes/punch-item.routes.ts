import { Router } from 'express';
import { PunchItemController } from '../controllers/punch-item.controller.js';
import { authenticateToken } from '../middlewares/auth.middleware.js';

const router = Router();

router.use(authenticateToken);

router.post('/', PunchItemController.create);
router.get('/', PunchItemController.list);
router.get('/:id', PunchItemController.getById);
router.put('/:id', PunchItemController.update);
router.delete('/:id', PunchItemController.delete);

export default router;
