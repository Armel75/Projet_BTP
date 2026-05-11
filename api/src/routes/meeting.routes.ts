import { Router } from 'express';
import { MeetingController } from '../controllers/meeting.controller.js';
import { authenticateToken, requireAnyPermission, requirePermission } from '../middlewares/auth.middleware.js';

const meetingRouter = Router();

meetingRouter.use(authenticateToken);

// ─── CRUD Meetings ────────────────────────────────────────────────────────────
meetingRouter.get('/',    requireAnyPermission('meeting:read', 'meeting:read:all'), MeetingController.list);
meetingRouter.post('/',   requirePermission('meeting:create'), MeetingController.create);
meetingRouter.get('/:id/pdf', requireAnyPermission('meeting:read', 'meeting:read:all'), MeetingController.generatePdf);
meetingRouter.get('/:id/excel', requireAnyPermission('meeting:read', 'meeting:read:all'), MeetingController.exportExcel);
meetingRouter.get('/:id', requireAnyPermission('meeting:read', 'meeting:read:all'), MeetingController.getById);
meetingRouter.put('/:id', requirePermission('meeting:update'), MeetingController.update);
meetingRouter.delete('/:id', requirePermission('meeting:delete'), MeetingController.delete);

// ─── Sous-ressource : Participants ────────────────────────────────────────────
meetingRouter.get('/:id/attendees',         requirePermission('meeting:read'), MeetingController.getAttendees);
meetingRouter.post('/:id/attendees',        requirePermission('meeting:update'), MeetingController.addAttendee);
meetingRouter.put('/:id/attendees/:aid',    requirePermission('meeting:update'), MeetingController.updateAttendee);
meetingRouter.delete('/:id/attendees/:aid', requirePermission('meeting:update'), MeetingController.removeAttendee);

// ─── Sous-ressource : Points d'action ─────────────────────────────────────────
meetingRouter.get('/:id/action-items',            requirePermission('meeting:read'), MeetingController.getActionItems);
meetingRouter.post('/:id/action-items',           requirePermission('meeting:update'), MeetingController.createActionItem);
meetingRouter.put('/:id/action-items/:aiid',      requirePermission('meeting:update'), MeetingController.updateActionItem);
meetingRouter.delete('/:id/action-items/:aiid',   requirePermission('meeting:update'), MeetingController.deleteActionItem);

export default meetingRouter;
