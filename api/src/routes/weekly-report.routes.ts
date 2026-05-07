import { Router } from 'express';
import { WeeklyReportController } from '../controllers/weekly-report.controller.js';
import { authenticateToken, requirePermission } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import { deleteWeeklyReportSchema } from '../schemas/weekly-report.schema.js';

const router = Router();

router.use(authenticateToken);

router.post('/generate', WeeklyReportController.generate);
router.get('/project/:projectId', WeeklyReportController.listByProject);
router.get('/:id/pdf', WeeklyReportController.generatePdf);
router.get('/:id', WeeklyReportController.getById);
router.put('/:id', WeeklyReportController.update);
router.delete('/:id', requirePermission('report:update'), validate(deleteWeeklyReportSchema), WeeklyReportController.remove);

export default router;
