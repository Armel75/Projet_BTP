import { prisma } from '../config/prisma.js';
import { TenantContext } from '../config/tenant-context.js';

const USER_SELECT = {
  id: true,
  firstname: true,
  lastname: true,
  email: true,
} as const;

const ACTION_SELECT = {
  id: true,
  control_report_id: true,
  tenant_id: true,
  subject: true,
  description: true,
  responsible_id: true,
  due_date: true,
  status: true,
  completed_at: true,
  created_at: true,
  updated_at: true,
  responsible: { select: USER_SELECT },
} as const;

const ATTACHMENT_SELECT = {
  id: true,
  control_report_id: true,
  tenant_id: true,
  url: true,
  file_name: true,
  file_type: true,
  source: true,
  caption: true,
  created_at: true,
  updated_at: true,
} as const;

const CONTROL_REPORT_INCLUDE = {
  project: { select: { id: true, code: true, title: true } },
  lot: { select: { id: true, lot_number: true, name: true } },
  task: { select: { id: true, title: true, status: true } },
  createdBy: { select: USER_SELECT },
  approvedBy: { select: USER_SELECT },
  actions: {
    orderBy: [{ status: 'asc' as const }, { due_date: 'asc' as const }, { created_at: 'desc' as const }],
    select: ACTION_SELECT,
  },
  attachments: {
    orderBy: { created_at: 'desc' as const },
    select: ATTACHMENT_SELECT,
  },
} as const;

interface ControlReportFilters {
  project_id?: number;
  lot_id?: number;
  task_id?: number;
  type?: string;
  status?: string;
  severity?: string;
}

const TERMINAL_STATUSES = new Set(['APPROVED', 'REJECTED', 'CLOSED']);

export class ControlReportService {
  private static requireTenantId() {
    const tenantId = TenantContext.getTenantId();
    if (!tenantId) throw new Error('Tenant session required');
    return tenantId;
  }

  private static async generateReference(projectId: number, tenantId: number) {
    const year = new Date().getFullYear();

    for (let i = 0; i < 10; i += 1) {
      const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
      const candidate = `CR-${year}-${projectId}-${rand}`;
      const exists = await prisma.controlReport.findFirst({
        where: { tenant_id: tenantId, reference: candidate },
        select: { id: true },
      });
      if (!exists) return candidate;
    }

    throw new Error('Unable to generate unique control report reference');
  }

  static async listControlReports(filters: ControlReportFilters = {}) {
    const tenantId = this.requireTenantId();
    const where: any = { tenant_id: tenantId };

    if (filters.project_id) where.project_id = filters.project_id;
    if (filters.lot_id) where.lot_id = filters.lot_id;
    if (filters.task_id) where.task_id = filters.task_id;
    if (filters.type) where.type = filters.type;
    if (filters.status) where.status = filters.status;
    if (filters.severity) where.severity = filters.severity;

    return prisma.controlReport.findMany({
      where,
      include: CONTROL_REPORT_INCLUDE,
      orderBy: [{ report_date: 'desc' }, { created_at: 'desc' }],
    });
  }

  static async getControlReportById(id: number) {
    const tenantId = this.requireTenantId();
    return prisma.controlReport.findFirst({
      where: { id, tenant_id: tenantId },
      include: CONTROL_REPORT_INCLUDE,
    });
  }

  static async createControlReport(data: any) {
    const tenantId = this.requireTenantId();
    const projectId = Number(data.project_id);

    const reference = data.reference || (await this.generateReference(projectId, tenantId));

    return prisma.controlReport.create({
      data: {
        tenant_id: tenantId,
        project_id: projectId,
        lot_id: data.lot_id ? Number(data.lot_id) : null,
        task_id: data.task_id ? Number(data.task_id) : null,
        reference,
        title: data.title || null,
        type: data.type || 'QUALITY',
        status: data.status || 'DRAFT',
        severity: data.severity || 'MEDIUM',
        discipline: data.discipline || null,
        location: data.location || null,
        report_date: data.report_date ? new Date(data.report_date) : null,
        due_date: data.due_date ? new Date(data.due_date) : null,
        resolved_at: data.resolved_at ? new Date(data.resolved_at) : null,
        comment: data.comment,
        created_by: data.created_by ? Number(data.created_by) : null,
        approved_by: data.approved_by ? Number(data.approved_by) : null,
        approved_at: data.approved_at ? new Date(data.approved_at) : null,
        rejected_reason: data.rejected_reason || null,
      },
      include: CONTROL_REPORT_INCLUDE,
    });
  }

  static async updateControlReport(id: number, data: any) {
    const tenantId = this.requireTenantId();
    const existing = await prisma.controlReport.findFirst({ where: { id, tenant_id: tenantId } });
    if (!existing) throw new Error('Control report not found');

    const cleaned: any = { ...data };
    delete cleaned.id;
    delete cleaned.tenant_id;
    delete cleaned.created_at;
    delete cleaned.updated_at;

    if (cleaned.project_id) cleaned.project_id = Number(cleaned.project_id);
    if (cleaned.lot_id) cleaned.lot_id = Number(cleaned.lot_id);
    if (cleaned.task_id) cleaned.task_id = Number(cleaned.task_id);
    if (cleaned.created_by) cleaned.created_by = Number(cleaned.created_by);
    if (cleaned.approved_by) cleaned.approved_by = Number(cleaned.approved_by);

    ['report_date', 'due_date', 'resolved_at', 'approved_at'].forEach((field) => {
      if (cleaned[field] && typeof cleaned[field] === 'string') cleaned[field] = new Date(cleaned[field]);
      if (cleaned[field] === '') cleaned[field] = null;
    });

    if (cleaned.status && TERMINAL_STATUSES.has(cleaned.status) && !cleaned.resolved_at && !existing.resolved_at) {
      cleaned.resolved_at = new Date();
    }

    if (cleaned.status === 'APPROVED' && !cleaned.approved_at && !existing.approved_at) {
      cleaned.approved_at = new Date();
    }

    return prisma.controlReport.update({
      where: { id },
      data: cleaned,
      include: CONTROL_REPORT_INCLUDE,
    });
  }

  static async approve(id: number, approvedBy: number) {
    const tenantId = this.requireTenantId();
    const existing = await prisma.controlReport.findFirst({ where: { id, tenant_id: tenantId } });
    if (!existing) throw new Error('Control report not found');

    return prisma.controlReport.update({
      where: { id },
      data: {
        status: 'APPROVED',
        approved_by: approvedBy,
        approved_at: new Date(),
        rejected_reason: null,
        resolved_at: existing.resolved_at || new Date(),
      },
      include: CONTROL_REPORT_INCLUDE,
    });
  }

  static async reject(id: number, approvedBy: number, rejectedReason: string) {
    const tenantId = this.requireTenantId();
    const existing = await prisma.controlReport.findFirst({ where: { id, tenant_id: tenantId } });
    if (!existing) throw new Error('Control report not found');

    return prisma.controlReport.update({
      where: { id },
      data: {
        status: 'REJECTED',
        approved_by: approvedBy,
        approved_at: new Date(),
        rejected_reason: rejectedReason,
        resolved_at: existing.resolved_at || new Date(),
      },
      include: CONTROL_REPORT_INCLUDE,
    });
  }

  static async deleteControlReport(id: number) {
    const tenantId = this.requireTenantId();
    const existing = await prisma.controlReport.findFirst({ where: { id, tenant_id: tenantId } });
    if (!existing) throw new Error('Control report not found');

    await prisma.controlReportAttachment.deleteMany({ where: { control_report_id: id } });
    await prisma.controlReportAction.deleteMany({ where: { control_report_id: id } });
    return prisma.controlReport.delete({ where: { id } });
  }

  static async listActions(controlReportId: number) {
    return prisma.controlReportAction.findMany({
      where: { control_report_id: controlReportId },
      orderBy: [{ status: 'asc' }, { due_date: 'asc' }, { created_at: 'desc' }],
      select: ACTION_SELECT,
    });
  }

  static async createAction(controlReportId: number, data: any) {
    const tenantId = this.requireTenantId();

    return prisma.controlReportAction.create({
      data: {
        control_report_id: controlReportId,
        tenant_id: tenantId,
        subject: data.subject,
        description: data.description || null,
        responsible_id: data.responsible_id ? Number(data.responsible_id) : null,
        due_date: data.due_date ? new Date(data.due_date) : null,
        status: data.status || 'OPEN',
        completed_at: data.completed_at ? new Date(data.completed_at) : null,
      },
      select: ACTION_SELECT,
    });
  }

  static async updateAction(id: number, data: any) {
    const cleaned: any = { ...data };

    if (cleaned.responsible_id) cleaned.responsible_id = Number(cleaned.responsible_id);
    if (cleaned.due_date && typeof cleaned.due_date === 'string') cleaned.due_date = new Date(cleaned.due_date);
    if (cleaned.completed_at && typeof cleaned.completed_at === 'string') cleaned.completed_at = new Date(cleaned.completed_at);

    if (cleaned.status === 'DONE' && !cleaned.completed_at) cleaned.completed_at = new Date();

    return prisma.controlReportAction.update({
      where: { id },
      data: cleaned,
      select: ACTION_SELECT,
    });
  }

  static async deleteAction(id: number) {
    return prisma.controlReportAction.delete({ where: { id } });
  }

  static async listAttachments(controlReportId: number) {
    return prisma.controlReportAttachment.findMany({
      where: { control_report_id: controlReportId },
      orderBy: { created_at: 'desc' },
      select: ATTACHMENT_SELECT,
    });
  }

  static async createAttachment(controlReportId: number, data: any) {
    const tenantId = this.requireTenantId();

    return prisma.controlReportAttachment.create({
      data: {
        control_report_id: controlReportId,
        tenant_id: tenantId,
        url: data.url,
        file_name: data.file_name || null,
        file_type: data.file_type || null,
        source: data.source || 'DOCUMENT',
        caption: data.caption || null,
      },
      select: ATTACHMENT_SELECT,
    });
  }

  static async updateAttachment(id: number, data: any) {
    return prisma.controlReportAttachment.update({
      where: { id },
      data: {
        ...(data.url !== undefined && { url: data.url }),
        ...(data.file_name !== undefined && { file_name: data.file_name }),
        ...(data.file_type !== undefined && { file_type: data.file_type }),
        ...(data.source !== undefined && { source: data.source }),
        ...(data.caption !== undefined && { caption: data.caption }),
      },
      select: ATTACHMENT_SELECT,
    });
  }

  static async deleteAttachment(id: number) {
    return prisma.controlReportAttachment.delete({ where: { id } });
  }
}
