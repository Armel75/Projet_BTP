import { Router } from 'express';
import { IncidentController } from '../controllers/incident.controller.js';
import { authenticateToken, requireAnyPermission, requirePermission } from '../middlewares/auth.middleware.js';

const router = Router();

router.use(authenticateToken);

router.post('/', requirePermission('incident:create'), IncidentController.create);
router.get('/', requireAnyPermission('incident:read', 'incident:read:all'), IncidentController.list);
router.get('/:id/pdf',   requireAnyPermission('incident:read', 'incident:read:all'), IncidentController.generatePdf);
router.get('/:id/excel', requireAnyPermission('incident:read', 'incident:read:all'), IncidentController.exportExcel);
router.get('/:id', requireAnyPermission('incident:read', 'incident:read:all'), IncidentController.getById);
router.put('/:id', requirePermission('incident:update'), IncidentController.update);
router.delete('/:id', requirePermission('incident:delete'), IncidentController.delete);

export default router;
