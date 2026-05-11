import { Router } from 'express';
import { PunchItemController } from '../controllers/punch-item.controller.js';
import { authenticateToken, requireAnyPermission, requirePermission } from '../middlewares/auth.middleware.js';

const router = Router();

router.use(authenticateToken);

router.post('/', requirePermission('punch-item:create'), PunchItemController.create);
router.get('/', requireAnyPermission('punch-item:read', 'punch-item:read:all'), PunchItemController.list);
router.get('/:id', requireAnyPermission('punch-item:read', 'punch-item:read:all'), PunchItemController.getById);
router.put('/:id', requirePermission('punch-item:update'), PunchItemController.update);
router.delete('/:id', requirePermission('punch-item:delete'), PunchItemController.delete);

export default router;
