import { prisma } from '../config/prisma.js';
import { TenantContext } from '../config/tenant-context.js';

// ─── Includes ─────────────────────────────────────────────────────────────────

const ATTENDEE_SELECT = {
  id:         true,
  meeting_id: true,
  user_id:    true,
  name:       true,
  status:     true,
  company:    true,
  role_title: true,
  created_at: true,
  updated_at: true,
  user: { select: { id: true, firstname: true, lastname: true, email: true } },
} as const;

const ACTION_ITEM_SELECT = {
  id:             true,
  meeting_id:     true,
  subject:        true,
  responsible_id: true,
  due_date:       true,
  status:         true,
  comment:        true,
  created_by:     true,
  created_at:     true,
  updated_at:     true,
  responsible: { select: { id: true, firstname: true, lastname: true } },
  createdBy:   { select: { id: true, firstname: true, lastname: true } },
} as const;

const MEETING_INCLUDE = {
  createdBy: { select: { id: true, firstname: true, lastname: true } },
  project:   { select: { id: true, code: true, title: true } },
  lot:       { select: { id: true, lot_number: true, name: true } },
  attendees: {
    orderBy: { id: 'asc' as const },
    select: ATTENDEE_SELECT,
  },
  actionItems: {
    orderBy: { due_date: 'asc' as const },
    select: ACTION_ITEM_SELECT,
  },
} as const;

// ─── Service ──────────────────────────────────────────────────────────────────

export class MeetingService {

  // ─── LIST ────────────────────────────────────────────────────────────────
  static async listMeetings(filters: {
    project_id?: number;
    lot_id?:     number;
    type?:       string;
    status?:     string;
  }) {
    const tenantId = TenantContext.getTenantId();
    if (!tenantId) throw new Error('Tenant session required');

    return prisma.meeting.findMany({
      where: { ...filters, tenant_id: tenantId },
      include: MEETING_INCLUDE,
      orderBy: { date: 'desc' },
    });
  }

  // ─── GET BY ID ───────────────────────────────────────────────────────────
  static async getMeetingById(id: number) {
    return prisma.meeting.findUnique({
      where: { id },
      include: MEETING_INCLUDE,
    });
  }

  static async getMeetingByIdForTenant(id: number) {
    const tenantId = TenantContext.getTenantId();
    if (!tenantId) throw new Error('Tenant session required');

    return prisma.meeting.findFirst({
      where: { id, tenant_id: tenantId },
      include: MEETING_INCLUDE,
    });
  }

  // ─── CREATE ──────────────────────────────────────────────────────────────
  static async createMeeting(data: {
    project_id:            number;
    lot_id?:               number;
    title:                 string;
    reference?:            string;
    type?:                 string;
    date:                  Date;
    end_date?:             Date;
    location?:             string;
    status?:               string;
    agenda?:               string;
    minutes?:              string;
    conclusion?:           string;
    next_meeting_date?:    Date;
    next_meeting_location?: string;
    distribution_list?:    string;
    created_by:            number;
  }) {
    const tenantId = TenantContext.getTenantId();
    if (!tenantId) throw new Error('Tenant session required');

    return prisma.meeting.create({
      data: { ...data, tenant_id: tenantId },
      include: MEETING_INCLUDE,
    });
  }

  // ─── UPDATE ──────────────────────────────────────────────────────────────
  static async updateMeeting(id: number, data: Record<string, any>) {
    // Convertir les dates si passées en string
    const DATE_FIELDS = ['date', 'end_date', 'next_meeting_date'];
    for (const f of DATE_FIELDS) {
      if (data[f] && typeof data[f] === 'string') data[f] = new Date(data[f]);
    }
    // Champs non-modifiables
    delete data.id;
    delete data.tenant_id;

    return prisma.meeting.update({
      where: { id },
      data,
      include: MEETING_INCLUDE,
    });
  }

  // ─── DELETE ──────────────────────────────────────────────────────────────
  static async deleteMeeting(id: number) {
    // Supprimer les sous-ressources d'abord (contraintes FK NoAction)
    await prisma.meetingActionItem.deleteMany({ where: { meeting_id: id } });
    await prisma.meetingAttendee.deleteMany({ where: { meeting_id: id } });
    return prisma.meeting.delete({ where: { id } });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // ATTENDEES
  // ─────────────────────────────────────────────────────────────────────────

  static async getAttendees(meeting_id: number) {
    return prisma.meetingAttendee.findMany({
      where:   { meeting_id },
      orderBy: { id: 'asc' },
      select: ATTENDEE_SELECT,
    });
  }

  static async addAttendee(data: {
    meeting_id: number;
    user_id?:   number;
    name?:      string;
    status?:    string;
    company?:   string;
    role_title?: string;
  }) {
    return prisma.meetingAttendee.create({
      data,
      select: ATTENDEE_SELECT,
    });
  }

  static async updateAttendee(id: number, data: {
    status?:    string;
    company?:   string;
    role_title?: string;
    name?:      string;
  }) {
    return prisma.meetingAttendee.update({
      where: { id },
      data,
      select: ATTENDEE_SELECT,
    });
  }

  static async removeAttendee(id: number) {
    return prisma.meetingAttendee.delete({ where: { id } });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // ACTION ITEMS
  // ─────────────────────────────────────────────────────────────────────────

  static async getActionItems(meeting_id: number) {
    return prisma.meetingActionItem.findMany({
      where:   { meeting_id },
      orderBy: { due_date: 'asc' },
      select: ACTION_ITEM_SELECT,
    });
  }

  static async createActionItem(data: {
    meeting_id:     number;
    tenant_id:      number;
    subject:        string;
    responsible_id?: number;
    due_date?:      Date;
    status?:        string;
    comment?:       string;
    created_by?:    number;
  }) {
    return prisma.meetingActionItem.create({
      data,
      select: ACTION_ITEM_SELECT,
    });
  }

  static async updateActionItem(id: number, data: {
    subject?:       string;
    responsible_id?: number | null;
    due_date?:      Date | null;
    status?:        string;
    comment?:       string;
  }) {
    if (data.due_date && typeof data.due_date === 'string') {
      data.due_date = new Date(data.due_date as any);
    }
    return prisma.meetingActionItem.update({
      where: { id },
      data,
      select: ACTION_ITEM_SELECT,
    });
  }

  static async deleteActionItem(id: number) {
    return prisma.meetingActionItem.delete({ where: { id } });
  }
}
