import { Router } from 'express';
import { WeeklyReportController } from '../controllers/weekly-report.controller.js';
import { authenticateToken } from '../middlewares/auth.middleware.js';

const router = Router();

router.use(authenticateToken);

router.post('/generate', WeeklyReportController.generate);
router.get('/project/:projectId', WeeklyReportController.listByProject);
router.get('/:id', WeeklyReportController.getById);
router.put('/:id', WeeklyReportController.update);

export default router;
