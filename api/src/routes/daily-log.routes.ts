import { Router } from 'express';
import { DailyLogController } from '../controllers/daily-log.controller.js';
import { authenticateToken, requireAnyPermission, requirePermission } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import { archiveDailyLogSchema, createDailyLogSchema, updateDailyLogSchema } from '../schemas/daily-log.schema.js';

const router = Router();

router.use(authenticateToken);

router.post('/', requirePermission('daily-log:create'), validate(createDailyLogSchema), DailyLogController.create);
router.get('/', requireAnyPermission('daily-log:read', 'daily-log:read:all'), DailyLogController.list);
router.get('/:id', requireAnyPermission('daily-log:read', 'daily-log:read:all'), DailyLogController.getById);
router.put('/:id', requirePermission('daily-log:update'), validate(updateDailyLogSchema), DailyLogController.update);
router.delete('/:id', requirePermission('daily-log:delete'), DailyLogController.delete);
router.patch('/:id/archive', requirePermission('daily-log:update'), validate(archiveDailyLogSchema), DailyLogController.archive);

export default router;
