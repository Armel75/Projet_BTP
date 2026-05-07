import { Router } from 'express';
import { authenticateToken } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import { ControlReportController } from '../controllers/control-report.controller.js';
import {
	createControlReportActionSchema,
	createControlReportAttachmentSchema,
	createControlReportSchema,
	rejectControlReportSchema,
	updateControlReportActionSchema,
	updateControlReportAttachmentSchema,
	updateControlReportSchema,
} from '../schemas/control-report.schema.js';

const router = Router();

router.use(authenticateToken);

router.get('/', ControlReportController.list);
router.post('/', validate(createControlReportSchema), ControlReportController.create);
router.get('/:id', ControlReportController.getById);
router.put('/:id', validate(updateControlReportSchema), ControlReportController.update);
router.delete('/:id', ControlReportController.delete);

router.post('/:id/approve', ControlReportController.approve);
router.post('/:id/reject', validate(rejectControlReportSchema), ControlReportController.reject);

router.get('/:id/actions', ControlReportController.listActions);
router.post('/:id/actions', validate(createControlReportActionSchema), ControlReportController.createAction);
router.put('/:id/actions/:actionId', validate(updateControlReportActionSchema), ControlReportController.updateAction);
router.delete('/:id/actions/:actionId', ControlReportController.deleteAction);

router.get('/:id/attachments', ControlReportController.listAttachments);
router.post('/:id/attachments', validate(createControlReportAttachmentSchema), ControlReportController.createAttachment);
router.put('/:id/attachments/:attachmentId', validate(updateControlReportAttachmentSchema), ControlReportController.updateAttachment);
router.delete('/:id/attachments/:attachmentId', ControlReportController.deleteAttachment);

export default router;
