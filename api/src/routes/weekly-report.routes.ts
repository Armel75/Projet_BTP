import { Router } from 'express';
import { WeeklyReportController } from '../controllers/weekly-report.controller.js';
import { authenticateToken, requireAnyPermission, requirePermission } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import {
	approveWeeklyReportSchema,
	deleteWeeklyReportSchema,
	generateWeeklyReportSchema,
	rejectWeeklyReportSchema,
	submitWeeklyReportSchema,
	updateWeeklyReportSchema,
} from '../schemas/weekly-report.schema.js';

const router = Router();

router.use(authenticateToken);

router.post('/generate', requirePermission('report:create'), validate(generateWeeklyReportSchema), WeeklyReportController.generate);
router.get('/project/:projectId', requireAnyPermission('report:read', 'report:read:all'), WeeklyReportController.listByProject);
router.get('/:id/pdf', requireAnyPermission('report:read', 'report:read:all'), WeeklyReportController.generatePdf);
router.get('/:id', requireAnyPermission('report:read', 'report:read:all'), WeeklyReportController.getById);
router.put('/:id', requirePermission('report:update'), validate(updateWeeklyReportSchema), WeeklyReportController.update);
router.post('/:id/submit', requirePermission('report:update'), validate(submitWeeklyReportSchema), WeeklyReportController.submit);
router.post('/:id/approve', requirePermission('report:validate'), validate(approveWeeklyReportSchema), WeeklyReportController.approve);
router.post('/:id/reject', requirePermission('report:validate'), validate(rejectWeeklyReportSchema), WeeklyReportController.reject);
router.delete('/:id', requirePermission('report:delete'), validate(deleteWeeklyReportSchema), WeeklyReportController.remove);

export default router;
