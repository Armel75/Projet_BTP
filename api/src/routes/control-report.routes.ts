import { Router } from 'express';
import { authenticateToken, requireAnyPermission, requirePermission } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import { ControlReportController } from '../controllers/control-report.controller.js';
import { uploadDocuments } from '../middlewares/upload.middleware.js';
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

router.get('/files/:filename', requireAnyPermission('control-report:read', 'control-report:read:all'), ControlReportController.serveAttachmentFile);

router.get('/', requireAnyPermission('control-report:read', 'control-report:read:all'), ControlReportController.list);
router.post('/', requirePermission('control-report:create'), validate(createControlReportSchema), ControlReportController.create);
router.get('/:id', requireAnyPermission('control-report:read', 'control-report:read:all'), ControlReportController.getById);
router.put('/:id', requirePermission('control-report:update'), validate(updateControlReportSchema), ControlReportController.update);
router.delete('/:id', requirePermission('control-report:delete'), ControlReportController.delete);
router.get('/:id/pdf', requireAnyPermission('control-report:read', 'control-report:read:all'), ControlReportController.generatePdf);

router.post('/:id/approve', requirePermission('control-report:approve'), ControlReportController.approve);
router.post('/:id/reject', requirePermission('control-report:approve'), validate(rejectControlReportSchema), ControlReportController.reject);

router.get('/:id/actions', requireAnyPermission('control-report:read', 'control-report:read:all'), ControlReportController.listActions);
router.post('/:id/actions', requirePermission('control-report:update'), validate(createControlReportActionSchema), ControlReportController.createAction);
router.put('/:id/actions/:actionId', requirePermission('control-report:update'), validate(updateControlReportActionSchema), ControlReportController.updateAction);
router.delete('/:id/actions/:actionId', requirePermission('control-report:update'), ControlReportController.deleteAction);

router.get('/:id/attachments', requireAnyPermission('control-report:read', 'control-report:read:all'), ControlReportController.listAttachments);
router.post('/:id/attachments', requirePermission('control-report:update'), validate(createControlReportAttachmentSchema), ControlReportController.createAttachment);
router.post('/:id/attachments/upload', requirePermission('control-report:update'), uploadDocuments, ControlReportController.uploadAttachmentFile);
router.put('/:id/attachments/:attachmentId', requirePermission('control-report:update'), validate(updateControlReportAttachmentSchema), ControlReportController.updateAttachment);
router.delete('/:id/attachments/:attachmentId', requirePermission('control-report:update'), ControlReportController.deleteAttachment);

export default router;
