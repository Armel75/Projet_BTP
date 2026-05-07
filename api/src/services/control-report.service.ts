import { Prisma } from '@prisma/client';
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
  action_type: true,
  priority: true,
  responsible_id: true,
  owner_name: true,
  due_date: true,
  started_at: true,
  status: true,
  completed_at: true,
  verified_at: true,
  verification_note: true,
  is_overdue: true,
  reopened_count: true,
  sequence_no: true,
  created_at: true,
  updated_at: true,
  responsible: { select: USER_SELECT },
} as const;

const ATTACHMENT_SELECT = {
  id: true,
  control_report_id: true,
  tenant_id: true,
  url: true,
  storage_key: true,
  file_name: true,
  file_type: true,
  mime_type: true,
  file_size_bytes: true,
  checksum_sha256: true,
  source: true,
  caption: true,
  taken_at: true,
  latitude: true,
  longitude: true,
  is_primary_evidence: true,
  uploaded_by: true,
  external_system: true,
  external_id: true,
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
    orderBy: [{ status: 'asc' as const }, { due_date: 'asc' as const }, { created_at: 'desc' as const }] as object[],
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
  priority?: string;
}

const TERMINAL_STATUSES = new Set(['APPROVED', 'REJECTED', 'CLOSED']);

export class ControlReportService {
  private static requireTenantId() {
    const tenantId = TenantContext.getTenantId();
    if (!tenantId) throw new Error('Tenant session required');
    return tenantId;
  }

  private static normalizeStatus(value?: string) {
    return (value || '').trim().toUpperCase();
  }

  private static mapApprovalWorkflowStatus(status?: string) {
    const normalized = this.normalizeStatus(status);
    if (normalized === 'APPROVED') return 'APPROVED';
    if (normalized === 'REJECTED') return 'REJECTED';
    if (normalized === 'UNDER_REVIEW' || normalized === 'ACTION_REQUIRED') return 'IN_REVIEW';
    if (normalized === 'CLOSED') return 'ARCHIVED';
    return 'DRAFT';
  }

  private static toDateOrNull(value: unknown) {
    if (value === undefined || value === null || value === '') return null;
    const date = value instanceof Date ? value : new Date(String(value));
    return Number.isNaN(date.getTime()) ? null : date;
  }

  private static toNumberOrNull(value: unknown) {
    if (value === undefined || value === null || value === '') return null;
    const num = Number(value);
    return Number.isFinite(num) ? num : null;
  }

  private static async logStatusHistory(
    tx: Prisma.TransactionClient,
    params: {
      control_report_id: number;
      tenant_id: number;
      from_status?: string | null;
      to_status: string;
      changed_by?: number | null;
      reason?: string | null;
      comment?: string | null;
      sla_breached?: boolean;
    }
  ) {
    await tx.controlReportStatusHistory.create({
      data: {
        control_report_id: params.control_report_id,
        tenant_id: params.tenant_id,
        from_status: params.from_status || null,
        to_status: params.to_status,
        changed_by: params.changed_by || null,
        reason: params.reason || null,
        comment: params.comment || null,
        sla_breached: params.sla_breached || false,
      },
    });
  }

  private static async recomputeDerivedCounts(tx: Prisma.TransactionClient, controlReportId: number, tenantId: number) {
    const [openActionsCount, evidenceCount] = await Promise.all([
      tx.controlReportAction.count({
        where: {
          control_report_id: controlReportId,
          tenant_id: tenantId,
          is_archived: false,
          status: { in: ['OPEN', 'IN_PROGRESS'] },
        },
      }),
      tx.controlReportAttachment.count({
        where: {
          control_report_id: controlReportId,
          tenant_id: tenantId,
          is_archived: false,
        },
      }),
    ]);

    await tx.controlReport.update({
      where: { id: controlReportId },
      data: {
        open_actions_count: openActionsCount,
        evidence_count: evidenceCount,
      },
    });
  }

  private static async getOwnedActiveReport(controlReportId: number, tenantId: number) {
    const report = await prisma.controlReport.findFirst({
      where: { id: controlReportId, tenant_id: tenantId, is_archived: false },
      select: { id: true, tenant_id: true, status: true, resolved_at: true, approved_at: true, sla_breached: true },
    });
    if (!report) throw new Error('Control report not found');
    return report;
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
    const where: any = { tenant_id: tenantId, is_archived: false };

    if (filters.project_id) where.project_id = filters.project_id;
    if (filters.lot_id) where.lot_id = filters.lot_id;
    if (filters.task_id) where.task_id = filters.task_id;
    if (filters.type) where.type = filters.type;
    if (filters.status) where.status = filters.status;
    if (filters.severity) where.severity = filters.severity;
    if (filters.priority) where.priority = filters.priority;

    return prisma.controlReport.findMany({
      where,
      include: CONTROL_REPORT_INCLUDE,
      orderBy: [{ report_date: 'desc' }, { created_at: 'desc' }],
    });
  }

  static async getControlReportById(id: number) {
    const tenantId = this.requireTenantId();
    return prisma.controlReport.findFirst({
      where: { id, tenant_id: tenantId, is_archived: false },
      include: CONTROL_REPORT_INCLUDE,
    });
  }

  static async createControlReport(data: any) {
    const tenantId = this.requireTenantId();
    const projectId = Number(data.project_id);
    const initialStatus = this.normalizeStatus(data.status) || 'DRAFT';

    const reference = data.reference || (await this.generateReference(projectId, tenantId));

    return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const created = await tx.controlReport.create({
        data: {
          tenant_id: tenantId,
          project_id: projectId,
          lot_id: this.toNumberOrNull(data.lot_id),
          task_id: this.toNumberOrNull(data.task_id),
          reference,
          title: data.title || null,
          type: data.type || 'QUALITY',
          category: data.category || null,
          status: initialStatus,
          initial_status: initialStatus,
          severity: data.severity || 'MEDIUM',
          priority: data.priority || 'MEDIUM',
          discipline: data.discipline || null,
          sub_discipline: data.sub_discipline || null,
          location: data.location || null,
          zone_code: data.zone_code || null,
          latitude: this.toNumberOrNull(data.latitude),
          longitude: this.toNumberOrNull(data.longitude),
          source_channel: data.source_channel || 'MANUAL',
          inspection_method: data.inspection_method || null,
          observed_by_name: data.observed_by_name || null,
          observed_by_company: data.observed_by_company || null,
          report_date: this.toDateOrNull(data.report_date),
          due_date: this.toDateOrNull(data.due_date),
          target_response_at: this.toDateOrNull(data.target_response_at),
          target_resolution_at: this.toDateOrNull(data.target_resolution_at),
          first_response_at: this.toDateOrNull(data.first_response_at),
          last_status_changed_at: new Date(),
          resolved_at: this.toDateOrNull(data.resolved_at),
          closed_at: this.toDateOrNull(data.closed_at),
          comment: data.comment,
          root_cause: data.root_cause || null,
          corrective_action_summary: data.corrective_action_summary || null,
          preventive_action_summary: data.preventive_action_summary || null,
          closure_summary: data.closure_summary || null,
          assigned_to_id: this.toNumberOrNull(data.assigned_to_id),
          sla_breached: Boolean(data.sla_breached),
          escalation_level: this.toNumberOrNull(data.escalation_level) ?? 0,
          created_by: this.toNumberOrNull(data.created_by),
          approved_by: this.toNumberOrNull(data.approved_by),
          approved_at: this.toDateOrNull(data.approved_at),
          approval_workflow_status: this.mapApprovalWorkflowStatus(initialStatus),
          rejected_reason: data.rejected_reason || null,
        },
      });

      await this.logStatusHistory(tx, {
        control_report_id: created.id,
        tenant_id: tenantId,
        from_status: null,
        to_status: created.status,
        changed_by: this.toNumberOrNull(data.created_by),
        reason: 'CREATED',
      });

      await this.recomputeDerivedCounts(tx, created.id, tenantId);

      return tx.controlReport.findUnique({ where: { id: created.id }, include: CONTROL_REPORT_INCLUDE });
    });
  }

  static async updateControlReport(id: number, data: any) {
    const tenantId = this.requireTenantId();
    const existing = await this.getOwnedActiveReport(id, tenantId);

    const cleaned: any = { ...data };
    delete cleaned.id;
    delete cleaned.tenant_id;
    delete cleaned.created_at;
    delete cleaned.updated_at;
    delete cleaned.is_archived;
    delete cleaned.archived_at;
    delete cleaned.open_actions_count;
    delete cleaned.evidence_count;

    if (cleaned.project_id !== undefined) cleaned.project_id = this.toNumberOrNull(cleaned.project_id);
    if (cleaned.lot_id !== undefined) cleaned.lot_id = this.toNumberOrNull(cleaned.lot_id);
    if (cleaned.task_id !== undefined) cleaned.task_id = this.toNumberOrNull(cleaned.task_id);
    if (cleaned.created_by !== undefined) cleaned.created_by = this.toNumberOrNull(cleaned.created_by);
    if (cleaned.approved_by !== undefined) cleaned.approved_by = this.toNumberOrNull(cleaned.approved_by);
    if (cleaned.assigned_to_id !== undefined) cleaned.assigned_to_id = this.toNumberOrNull(cleaned.assigned_to_id);
    if (cleaned.latitude !== undefined) cleaned.latitude = this.toNumberOrNull(cleaned.latitude);
    if (cleaned.longitude !== undefined) cleaned.longitude = this.toNumberOrNull(cleaned.longitude);
    if (cleaned.escalation_level !== undefined) cleaned.escalation_level = this.toNumberOrNull(cleaned.escalation_level) ?? 0;

    [
      'report_date',
      'due_date',
      'target_response_at',
      'target_resolution_at',
      'first_response_at',
      'resolved_at',
      'closed_at',
      'approved_at',
    ].forEach((field) => {
      if (field in cleaned) cleaned[field] = this.toDateOrNull(cleaned[field]);
    });

    const nextStatus = this.normalizeStatus(cleaned.status || existing.status);
    const statusChanged = Boolean(cleaned.status) && this.normalizeStatus(existing.status) !== nextStatus;

    if (nextStatus && TERMINAL_STATUSES.has(nextStatus) && !cleaned.resolved_at && !existing.resolved_at) {
      cleaned.resolved_at = new Date();
    }

    if (nextStatus === 'APPROVED' && !cleaned.approved_at && !existing.approved_at) {
      cleaned.approved_at = new Date();
    }

    if (nextStatus === 'CLOSED' && !cleaned.closed_at) {
      cleaned.closed_at = new Date();
    }

    if (statusChanged) {
      cleaned.last_status_changed_at = new Date();
      cleaned.approval_workflow_status = this.mapApprovalWorkflowStatus(nextStatus);
    }

    if (Object.keys(cleaned).length > 0) {
      cleaned.revision_no = { increment: 1 };
    }

    return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const updated = await tx.controlReport.update({
        where: { id },
        data: cleaned,
      });

      if (statusChanged) {
        await this.logStatusHistory(tx, {
          control_report_id: id,
          tenant_id: tenantId,
          from_status: existing.status,
          to_status: nextStatus,
          changed_by: this.toNumberOrNull(data.updated_by ?? data.approved_by ?? data.created_by),
          reason: data.status_reason || null,
          comment: data.status_comment || null,
          sla_breached: Boolean(updated.sla_breached),
        });
      }

      await this.recomputeDerivedCounts(tx, id, tenantId);

      return tx.controlReport.findUnique({ where: { id }, include: CONTROL_REPORT_INCLUDE });
    });
  }

  static async approve(id: number, approvedBy: number) {
    const tenantId = this.requireTenantId();
    const existing = await this.getOwnedActiveReport(id, tenantId);

    return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      await tx.controlReport.update({
        where: { id },
        data: {
          status: 'APPROVED',
          approved_by: approvedBy,
          approved_at: new Date(),
          rejected_reason: null,
          resolved_at: existing.resolved_at || new Date(),
          last_status_changed_at: new Date(),
          approval_workflow_status: 'APPROVED',
          revision_no: { increment: 1 },
        },
      });

      if (this.normalizeStatus(existing.status) !== 'APPROVED') {
        await this.logStatusHistory(tx, {
          control_report_id: id,
          tenant_id: tenantId,
          from_status: existing.status,
          to_status: 'APPROVED',
          changed_by: approvedBy,
          reason: 'APPROVAL',
          sla_breached: Boolean(existing.sla_breached),
        });
      }

      await this.recomputeDerivedCounts(tx, id, tenantId);

      return tx.controlReport.findUnique({ where: { id }, include: CONTROL_REPORT_INCLUDE });
    });
  }

  static async reject(id: number, approvedBy: number, rejectedReason: string) {
    const tenantId = this.requireTenantId();
    const existing = await this.getOwnedActiveReport(id, tenantId);

    return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      await tx.controlReport.update({
        where: { id },
        data: {
          status: 'REJECTED',
          approved_by: approvedBy,
          approved_at: new Date(),
          rejected_reason: rejectedReason,
          resolved_at: existing.resolved_at || new Date(),
          last_status_changed_at: new Date(),
          approval_workflow_status: 'REJECTED',
          revision_no: { increment: 1 },
        },
      });

      if (this.normalizeStatus(existing.status) !== 'REJECTED') {
        await this.logStatusHistory(tx, {
          control_report_id: id,
          tenant_id: tenantId,
          from_status: existing.status,
          to_status: 'REJECTED',
          changed_by: approvedBy,
          reason: rejectedReason,
          sla_breached: Boolean(existing.sla_breached),
        });
      }

      await this.recomputeDerivedCounts(tx, id, tenantId);

      return tx.controlReport.findUnique({ where: { id }, include: CONTROL_REPORT_INCLUDE });
    });
  }

  static async deleteControlReport(id: number) {
    const tenantId = this.requireTenantId();
    const existing = await this.getOwnedActiveReport(id, tenantId);

    return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const archivedAt = new Date();
      await tx.controlReportAction.updateMany({
        where: { control_report_id: id, tenant_id: tenantId, is_archived: false },
        data: { is_archived: true, archived_at: archivedAt, updated_at: archivedAt },
      });

      await tx.controlReportAttachment.updateMany({
        where: { control_report_id: id, tenant_id: tenantId, is_archived: false },
        data: { is_archived: true, archived_at: archivedAt, updated_at: archivedAt },
      });

      await tx.controlReport.update({
        where: { id },
        data: {
          is_archived: true,
          archived_at: archivedAt,
          approval_workflow_status: 'ARCHIVED',
          last_status_changed_at: archivedAt,
          revision_no: { increment: 1 },
        },
      });

      await this.logStatusHistory(tx, {
        control_report_id: id,
        tenant_id: tenantId,
        from_status: existing.status,
        to_status: 'ARCHIVED',
        reason: 'SOFT_DELETE',
        sla_breached: Boolean(existing.sla_breached),
      });

      return { success: true };
    });
  }

  static async listActions(controlReportId: number) {
    const tenantId = this.requireTenantId();
    return prisma.controlReportAction.findMany({
      where: { control_report_id: controlReportId, tenant_id: tenantId, is_archived: false },
      orderBy: [{ status: 'asc' }, { due_date: 'asc' }, { created_at: 'desc' }],
      select: ACTION_SELECT,
    });
  }

  static async createAction(controlReportId: number, data: any) {
    const tenantId = this.requireTenantId();

    await this.getOwnedActiveReport(controlReportId, tenantId);

    return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const sequence = await tx.controlReportAction.aggregate({
        where: { control_report_id: controlReportId, tenant_id: tenantId },
        _max: { sequence_no: true },
      });

      const status = this.normalizeStatus(data.status) || 'OPEN';
      const dueDate = this.toDateOrNull(data.due_date);
      const completedAt = this.toDateOrNull(data.completed_at);
      const now = new Date();
      const isTerminal = status === 'DONE' || status === 'CANCELLED';

      const created = await tx.controlReportAction.create({
        data: {
          control_report_id: controlReportId,
          tenant_id: tenantId,
          subject: data.subject,
          description: data.description || null,
          action_type: data.action_type || 'CORRECTIVE',
          priority: data.priority || 'MEDIUM',
          responsible_id: this.toNumberOrNull(data.responsible_id),
          owner_name: data.owner_name || null,
          due_date: dueDate,
          status,
          started_at: status === 'IN_PROGRESS' ? (this.toDateOrNull(data.started_at) || now) : this.toDateOrNull(data.started_at),
          completed_at: status === 'DONE' ? (completedAt || now) : completedAt,
          sequence_no: (sequence._max.sequence_no || 0) + 1,
          escalation_level: this.toNumberOrNull(data.escalation_level) ?? 0,
          escalation_reason: data.escalation_reason || null,
          escalated_at: this.toDateOrNull(data.escalated_at),
          is_overdue: Boolean(dueDate && !isTerminal && dueDate.getTime() < now.getTime()),
        },
        select: ACTION_SELECT,
      });

      await this.recomputeDerivedCounts(tx, controlReportId, tenantId);

      return created;
    });
  }

  static async updateAction(id: number, data: any) {
    const tenantId = this.requireTenantId();
    const existing = await prisma.controlReportAction.findFirst({
      where: { id, tenant_id: tenantId, is_archived: false },
      select: {
        id: true,
        control_report_id: true,
        status: true,
        due_date: true,
        completed_at: true,
        started_at: true,
        reopened_count: true,
      },
    });
    if (!existing) throw new Error('Action not found');

    await this.getOwnedActiveReport(existing.control_report_id, tenantId);

    const cleaned: any = { ...data };

    if (cleaned.responsible_id !== undefined) cleaned.responsible_id = this.toNumberOrNull(cleaned.responsible_id);
    if (cleaned.verified_by !== undefined) cleaned.verified_by = this.toNumberOrNull(cleaned.verified_by);
    if (cleaned.escalation_level !== undefined) cleaned.escalation_level = this.toNumberOrNull(cleaned.escalation_level) ?? 0;
    if (cleaned.sequence_no !== undefined) cleaned.sequence_no = this.toNumberOrNull(cleaned.sequence_no) ?? existing.id;

    if (cleaned.due_date !== undefined) cleaned.due_date = this.toDateOrNull(cleaned.due_date);
    if (cleaned.started_at !== undefined) cleaned.started_at = this.toDateOrNull(cleaned.started_at);
    if (cleaned.completed_at !== undefined) cleaned.completed_at = this.toDateOrNull(cleaned.completed_at);
    if (cleaned.verified_at !== undefined) cleaned.verified_at = this.toDateOrNull(cleaned.verified_at);
    if (cleaned.escalated_at !== undefined) cleaned.escalated_at = this.toDateOrNull(cleaned.escalated_at);

    const previousStatus = this.normalizeStatus(existing.status);
    const nextStatus = this.normalizeStatus(cleaned.status || existing.status) || previousStatus;
    const now = new Date();

    if (nextStatus === 'DONE' && !cleaned.completed_at && !existing.completed_at) cleaned.completed_at = now;
    if (nextStatus === 'IN_PROGRESS' && !cleaned.started_at && !existing.started_at) cleaned.started_at = now;

    if ((previousStatus === 'DONE' || previousStatus === 'CANCELLED') && (nextStatus === 'OPEN' || nextStatus === 'IN_PROGRESS')) {
      cleaned.reopened_count = (existing.reopened_count || 0) + 1;
      cleaned.completed_at = null;
    }

    const dueDate = cleaned.due_date !== undefined ? cleaned.due_date : existing.due_date;
    const isTerminal = nextStatus === 'DONE' || nextStatus === 'CANCELLED';
    cleaned.is_overdue = Boolean(dueDate && !isTerminal && dueDate.getTime() < now.getTime());

    return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const updated = await tx.controlReportAction.update({
        where: { id },
        data: cleaned,
        select: ACTION_SELECT,
      });

      await this.recomputeDerivedCounts(tx, existing.control_report_id, tenantId);

      return updated;
    });
  }

  static async deleteAction(id: number) {
    const tenantId = this.requireTenantId();
    const existing = await prisma.controlReportAction.findFirst({
      where: { id, tenant_id: tenantId, is_archived: false },
      select: { id: true, control_report_id: true },
    });
    if (!existing) throw new Error('Action not found');

    return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      await tx.controlReportAction.update({
        where: { id },
        data: { is_archived: true, archived_at: new Date() },
      });

      await this.recomputeDerivedCounts(tx, existing.control_report_id, tenantId);

      return { success: true };
    });
  }

  static async listAttachments(controlReportId: number) {
    const tenantId = this.requireTenantId();
    return prisma.controlReportAttachment.findMany({
      where: { control_report_id: controlReportId, tenant_id: tenantId, is_archived: false },
      orderBy: { created_at: 'desc' },
      select: ATTACHMENT_SELECT,
    });
  }

  static async createAttachment(controlReportId: number, data: any) {
    const tenantId = this.requireTenantId();

    await this.getOwnedActiveReport(controlReportId, tenantId);

    return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const source = this.normalizeStatus(data.source);
      const created = await tx.controlReportAttachment.create({
        data: {
          control_report_id: controlReportId,
          tenant_id: tenantId,
          url: data.url,
          storage_key: data.storage_key || null,
          file_name: data.file_name || null,
          file_type: data.file_type || null,
          mime_type: data.mime_type || null,
          file_size_bytes: this.toNumberOrNull(data.file_size_bytes),
          checksum_sha256: data.checksum_sha256 || null,
          source: source === 'PHOTO' ? 'PHOTO' : 'DOCUMENT',
          caption: data.caption || null,
          taken_at: this.toDateOrNull(data.taken_at),
          latitude: this.toNumberOrNull(data.latitude),
          longitude: this.toNumberOrNull(data.longitude),
          is_primary_evidence: Boolean(data.is_primary_evidence),
          uploaded_by: this.toNumberOrNull(data.uploaded_by),
          external_system: data.external_system || null,
          external_id: data.external_id || null,
          source_updated_at: this.toDateOrNull(data.source_updated_at),
        },
        select: ATTACHMENT_SELECT,
      });

      await this.recomputeDerivedCounts(tx, controlReportId, tenantId);

      return created;
    });
  }

  static async updateAttachment(id: number, data: any) {
    const tenantId = this.requireTenantId();
    const existing = await prisma.controlReportAttachment.findFirst({
      where: { id, tenant_id: tenantId, is_archived: false },
      select: { id: true, control_report_id: true },
    });
    if (!existing) throw new Error('Attachment not found');

    await this.getOwnedActiveReport(existing.control_report_id, tenantId);

    return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const updated = await tx.controlReportAttachment.update({
        where: { id },
        data: {
          ...(data.url !== undefined && { url: data.url }),
          ...(data.storage_key !== undefined && { storage_key: data.storage_key || null }),
          ...(data.file_name !== undefined && { file_name: data.file_name || null }),
          ...(data.file_type !== undefined && { file_type: data.file_type || null }),
          ...(data.mime_type !== undefined && { mime_type: data.mime_type || null }),
          ...(data.file_size_bytes !== undefined && { file_size_bytes: this.toNumberOrNull(data.file_size_bytes) }),
          ...(data.checksum_sha256 !== undefined && { checksum_sha256: data.checksum_sha256 || null }),
          ...(data.source !== undefined && { source: this.normalizeStatus(data.source) === 'PHOTO' ? 'PHOTO' : 'DOCUMENT' }),
          ...(data.caption !== undefined && { caption: data.caption || null }),
          ...(data.taken_at !== undefined && { taken_at: this.toDateOrNull(data.taken_at) }),
          ...(data.latitude !== undefined && { latitude: this.toNumberOrNull(data.latitude) }),
          ...(data.longitude !== undefined && { longitude: this.toNumberOrNull(data.longitude) }),
          ...(data.is_primary_evidence !== undefined && { is_primary_evidence: Boolean(data.is_primary_evidence) }),
          ...(data.uploaded_by !== undefined && { uploaded_by: this.toNumberOrNull(data.uploaded_by) }),
          ...(data.external_system !== undefined && { external_system: data.external_system || null }),
          ...(data.external_id !== undefined && { external_id: data.external_id || null }),
          ...(data.source_updated_at !== undefined && { source_updated_at: this.toDateOrNull(data.source_updated_at) }),
        },
        select: ATTACHMENT_SELECT,
      });

      await this.recomputeDerivedCounts(tx, existing.control_report_id, tenantId);

      return updated;
    });
  }

  static async deleteAttachment(id: number) {
    const tenantId = this.requireTenantId();
    const existing = await prisma.controlReportAttachment.findFirst({
      where: { id, tenant_id: tenantId, is_archived: false },
      select: { id: true, control_report_id: true },
    });
    if (!existing) throw new Error('Attachment not found');

    return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      await tx.controlReportAttachment.update({
        where: { id },
        data: { is_archived: true, archived_at: new Date() },
      });

      await this.recomputeDerivedCounts(tx, existing.control_report_id, tenantId);

      return { success: true };
    });
  }
}
