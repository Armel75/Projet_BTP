import { Router } from 'express';
import { InspectionController } from '../controllers/inspection.controller.js';
import { authenticateToken, requireAnyPermission, requirePermission } from '../middlewares/auth.middleware.js';

const router = Router();

router.use(authenticateToken);

router.post('/', requirePermission('inspection:create'), InspectionController.create);
router.get('/', requireAnyPermission('inspection:read', 'inspection:read:all'), InspectionController.list);
router.get('/:id/pdf', requireAnyPermission('inspection:read', 'inspection:read:all'), InspectionController.generatePdf);
router.get('/:id', requireAnyPermission('inspection:read', 'inspection:read:all'), InspectionController.getById);
router.put('/:id', requirePermission('inspection:update'), InspectionController.update);
router.delete('/:id', requirePermission('inspection:delete'), InspectionController.delete);

export default router;
