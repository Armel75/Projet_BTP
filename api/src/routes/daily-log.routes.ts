import { Router } from 'express';
import { DailyLogController } from '../controllers/daily-log.controller.js';
import { authenticateToken } from '../middlewares/auth.middleware.js';

const router = Router();

router.use(authenticateToken);

router.post('/', DailyLogController.create);
router.get('/', DailyLogController.list);
router.get('/:id', DailyLogController.getById);
router.put('/:id', DailyLogController.update);
router.delete('/:id', DailyLogController.delete);

export default router;
