import { Router } from 'express';
import { WorkAcceptanceController } from '../controllers/work-acceptance.controller.js';
import { authenticateToken, requirePermission } from '../middlewares/auth.middleware.js';

const router = Router();

router.use(authenticateToken);

router.post('/',    requirePermission('work-acceptance:create'), WorkAcceptanceController.create);
router.get('/',     requirePermission('work-acceptance:read'), WorkAcceptanceController.list);
router.get('/:id/pdf', requirePermission('work-acceptance:read'), WorkAcceptanceController.generatePdf);
router.get('/:id',  requirePermission('work-acceptance:read'), WorkAcceptanceController.getById);
router.put('/:id',  requirePermission('work-acceptance:update'), WorkAcceptanceController.update);
router.delete('/:id', requirePermission('work-acceptance:delete'), WorkAcceptanceController.delete);

export default router;
