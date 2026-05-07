import { prisma } from '../config/prisma.js';
import { TenantContext } from '../config/tenant-context.js';

// ─── Includes ─────────────────────────────────────────────────────────────────

const USER_SELECT = {
  id: true, firstname: true, lastname: true, email: true,
} as const;

const COMMENT_SELECT = {
  id:           true,
  rfi_id:       true,
  user_id:      true,
  content:      true,
  document_id:  true,
  created_at:   true,
  updated_at:   true,
  document: { select: { id: true, name: true, file_url: true, file_name: true, file_size: true } },
  user: { select: USER_SELECT },
} as const;

const RFI_INCLUDE = {
  submittedBy: { select: USER_SELECT },
  assignedTo:  { select: USER_SELECT },
  reviewedBy:  { select: USER_SELECT },
  project:     { select: { id: true, code: true, title: true } },
  lot:         { select: { id: true, lot_number: true, name: true } },
  comments: {
    orderBy: { created_at: 'asc' as const },
    select: COMMENT_SELECT,
  },
} as const;

// ─── Filters ──────────────────────────────────────────────────────────────────

interface RFIFilters {
  project_id?: number;
  lot_id?:     number;
  status?:     string;
  priority?:   string;
  category?:   string;
}

// ─── Service ──────────────────────────────────────────────────────────────────

export class RFIService {

  // ─── Number generation ────────────────────────────────────────────────────

  /**
   * Génère le prochain numéro séquentiel de demande de renseignements
   * Format : RFI-YYYY-NNN (ex: RFI-2026-001)
   * Le séquençage est isolé par tenant et par année.
   */
  static async generateNextNumber(tenantId: number): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `RFI-${year}-`;

    // On récupère tous les numéros de l'année courante pour ce tenant
    const existing = await prisma.rFI.findMany({
      where: {
        tenant_id: tenantId,
        number:    { startsWith: prefix },
      },
      select: { number: true },
    });

    // On extrait les séquences numériques et on prend le max
    let max = 0;
    for (const { number } of existing) {
      const seq = parseInt(number.replace(prefix, ''), 10);
      if (!isNaN(seq) && seq > max) max = seq;
    }

    const next = String(max + 1).padStart(3, '0');
    return `${prefix}${next}`;
  }

  // ─── CRUD ─────────────────────────────────────────────────────────────────

  static async listRFIs(filters: RFIFilters = {}) {
    const tenantId = TenantContext.getTenantId();
    const where: any = { tenant_id: tenantId };
    if (filters.project_id) where.project_id = filters.project_id;
    if (filters.lot_id)     where.lot_id      = filters.lot_id;
    if (filters.status)     where.status      = filters.status;
    if (filters.priority)   where.priority    = filters.priority;
    if (filters.category)   where.category    = filters.category;

    return prisma.rFI.findMany({
      where,
      include: RFI_INCLUDE,
      orderBy: [
        { priority: 'asc' },
        { due_date: 'asc' },
        { created_at: 'desc' },
      ],
    });
  }

  static async getRFIById(id: number) {
    const tenantId = TenantContext.getTenantId();
    return prisma.rFI.findFirst({
      where: { id, tenant_id: tenantId },
      include: RFI_INCLUDE,
    });
  }

  static async createRFI(data: any) {
    const tenantId = TenantContext.getTenantId();
    const {
      project_id, lot_id, number, reference, category, discipline,
      subject, question, drawing_ref, spec_section,
      status, priority, submitted_by, assigned_to, reviewed_by,
      answer, official_response, due_date,
      cost_impact, cost_impact_amount, schedule_impact, schedule_impact_days,
      distribution_list,
    } = data;

    return prisma.rFI.create({
      data: {
        tenant_id:  tenantId,
        project_id: Number(project_id),
        lot_id:     lot_id ? Number(lot_id) : null,
        number,
        reference:   reference   || null,
        category:    category    || 'CLARIFICATION',
        discipline:  discipline  || null,
        subject,
        question,
        drawing_ref:  drawing_ref  || null,
        spec_section: spec_section || null,
        status:       status       || 'OPEN',
        priority:     priority     || 'NORMAL',
        submitted_by: submitted_by ? Number(submitted_by) : null,
        assigned_to:  assigned_to  ? Number(assigned_to)  : null,
        reviewed_by:  reviewed_by  ? Number(reviewed_by)  : null,
        answer:             answer             || null,
        official_response:  official_response  || null,
        due_date:           due_date           ? new Date(due_date) : null,
        cost_impact:         Boolean(cost_impact),
        cost_impact_amount:  cost_impact_amount  ? Number(cost_impact_amount)  : null,
        schedule_impact:     Boolean(schedule_impact),
        schedule_impact_days: schedule_impact_days ? Number(schedule_impact_days) : null,
        distribution_list: distribution_list || null,
      },
      include: RFI_INCLUDE,
    });
  }

  static async updateRFI(id: number, data: any) {
    const tenantId = TenantContext.getTenantId();
    const existing = await prisma.rFI.findFirst({ where: { id, tenant_id: tenantId } });
    if (!existing) throw new Error('RFI not found');

    const cleaned = { ...data };
    delete cleaned.id;
    delete cleaned.tenant_id;
    delete cleaned.created_at;

    // Conversion types
    if (cleaned.project_id)  cleaned.project_id  = Number(cleaned.project_id);
    if (cleaned.lot_id)      cleaned.lot_id       = Number(cleaned.lot_id);
    if (cleaned.submitted_by) cleaned.submitted_by = Number(cleaned.submitted_by);
    if (cleaned.assigned_to)  cleaned.assigned_to  = Number(cleaned.assigned_to);
    if (cleaned.reviewed_by)  cleaned.reviewed_by  = Number(cleaned.reviewed_by);
    if (cleaned.cost_impact_amount)    cleaned.cost_impact_amount    = Number(cleaned.cost_impact_amount);
    if (cleaned.schedule_impact_days)  cleaned.schedule_impact_days  = Number(cleaned.schedule_impact_days);

    const dateFields = ['due_date', 'answered_date', 'closed_date'];
    dateFields.forEach(f => {
      if (cleaned[f] && typeof cleaned[f] === 'string') cleaned[f] = new Date(cleaned[f]);
      if (cleaned[f] === '') cleaned[f] = null;
    });

    // Auto-set answered_date / closed_date
    if (cleaned.status === 'ANSWERED' && !cleaned.answered_date && !existing.answered_date) {
      cleaned.answered_date = new Date();
    }
    if ((cleaned.status === 'CLOSED' || cleaned.status === 'CANCELLED') && !cleaned.closed_date && !existing.closed_date) {
      cleaned.closed_date = new Date();
    }

    return prisma.rFI.update({
      where: { id },
      data: cleaned,
      include: RFI_INCLUDE,
    });
  }

  static async deleteRFI(id: number) {
    const tenantId = TenantContext.getTenantId();
    const existing = await prisma.rFI.findFirst({ where: { id, tenant_id: tenantId } });
    if (!existing) throw new Error('RFI not found');

    // Supprimer les commentaires d'abord (FK NoAction)
    await prisma.rFIComment.deleteMany({ where: { rfi_id: id } });
    return prisma.rFI.delete({ where: { id } });
  }

  // ─── Comments ──────────────────────────────────────────────────────────────

  static async getComments(rfi_id: number) {
    return prisma.rFIComment.findMany({
      where: { rfi_id },
      orderBy: { created_at: 'asc' },
      select: COMMENT_SELECT,
    });
  }

  static async createComment(data: { rfi_id: number; user_id?: number; content: string; document_id?: number }) {
    return prisma.rFIComment.create({
      data: {
        rfi_id:       data.rfi_id,
        user_id:      data.user_id      || null,
        content:      data.content,
        document_id:  data.document_id  || null,
      },
      select: COMMENT_SELECT,
    });
  }

  static async updateComment(id: number, data: { content?: string; document_id?: number | null }) {
    return prisma.rFIComment.update({
      where: { id },
      data: {
        ...(data.content     !== undefined && { content: data.content }),
        ...(data.document_id !== undefined && { document_id: data.document_id }),
      },
      select: COMMENT_SELECT,
    });
  }

  static async deleteComment(id: number) {
    return prisma.rFIComment.delete({ where: { id } });
  }
}
