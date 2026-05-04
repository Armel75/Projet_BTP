import { Router } from 'express';
import { authenticateToken } from '../middlewares/auth.middleware.js';
import { ControlReportController } from '../controllers/control-report.controller.js';

const router = Router();

router.use(authenticateToken);

router.get('/', ControlReportController.list);
router.post('/', ControlReportController.create);
router.get('/:id', ControlReportController.getById);
router.put('/:id', ControlReportController.update);
router.delete('/:id', ControlReportController.delete);

router.post('/:id/approve', ControlReportController.approve);
router.post('/:id/reject', ControlReportController.reject);

router.get('/:id/actions', ControlReportController.listActions);
router.post('/:id/actions', ControlReportController.createAction);
router.put('/:id/actions/:actionId', ControlReportController.updateAction);
router.delete('/:id/actions/:actionId', ControlReportController.deleteAction);

router.get('/:id/attachments', ControlReportController.listAttachments);
router.post('/:id/attachments', ControlReportController.createAttachment);
router.put('/:id/attachments/:attachmentId', ControlReportController.updateAttachment);
router.delete('/:id/attachments/:attachmentId', ControlReportController.deleteAttachment);

export default router;
