import { Router } from 'express';
import { MeetingController } from '../controllers/meeting.controller.js';
import { authenticateToken } from '../middlewares/auth.middleware.js';

const meetingRouter = Router();

meetingRouter.use(authenticateToken);

// ─── CRUD Meetings ────────────────────────────────────────────────────────────
meetingRouter.get('/',    MeetingController.list);
meetingRouter.post('/',   MeetingController.create);
meetingRouter.get('/:id/pdf', MeetingController.generatePdf);
meetingRouter.get('/:id/excel', MeetingController.exportExcel);
meetingRouter.get('/:id', MeetingController.getById);
meetingRouter.put('/:id', MeetingController.update);
meetingRouter.delete('/:id', MeetingController.delete);

// ─── Sous-ressource : Participants ────────────────────────────────────────────
meetingRouter.get('/:id/attendees',         MeetingController.getAttendees);
meetingRouter.post('/:id/attendees',        MeetingController.addAttendee);
meetingRouter.put('/:id/attendees/:aid',    MeetingController.updateAttendee);
meetingRouter.delete('/:id/attendees/:aid', MeetingController.removeAttendee);

// ─── Sous-ressource : Points d'action ─────────────────────────────────────────
meetingRouter.get('/:id/action-items',            MeetingController.getActionItems);
meetingRouter.post('/:id/action-items',           MeetingController.createActionItem);
meetingRouter.put('/:id/action-items/:aiid',      MeetingController.updateActionItem);
meetingRouter.delete('/:id/action-items/:aiid',   MeetingController.deleteActionItem);

export default meetingRouter;
