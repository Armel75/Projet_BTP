import { prisma } from '../config/prisma.js';
import { TenantContext } from '../config/tenant-context.js';

// ─── Selects ──────────────────────────────────────────────────────────────────

const USER_SELECT = {
  id: true, firstname: true, lastname: true, email: true,
} as const;

const NOTE_SELECT = {
  id:                 true,
  tenant_id:          true,
  project_id:         true,
  lot_id:             true,
  task_id:            true,
  incident_id:        true,
  parent_id:          true,
  content:            true,
  category:           true,
  visibility:         true,
  source:             true,
  requires_attention: true,
  is_pinned:          true,
  metadata_json:      true,
  created_by:         true,
  edited_by:          true,
  edited_at:          true,
  resolved_at:        true,
  deleted_at:         true,
  created_at:         true,
  updated_at:         true,
  createdBy: { select: USER_SELECT },
  project:   { select: { id: true, code: true, title: true, project_manager_id: true } },
  lot:       { select: { id: true, lot_number: true, name: true } },
  task:      { select: { id: true, title: true, status: true } },
  incident:  { select: { id: true, title: true, status: true, severity: true } },
  replies: {
    where:   { deleted_at: null },
    orderBy: { created_at: 'asc' as const },
    select: {
      id: true, content: true, category: true, visibility: true,
      created_by: true, created_at: true, updated_at: true,
      is_pinned: true, requires_attention: true,
      createdBy: { select: USER_SELECT },
    },
  },
} as const;

// ─── Filter types ─────────────────────────────────────────────────────────────

export interface ExecutionNoteFilters {
  project_id?:        number;
  lot_id?:            number;
  task_id?:           number;
  incident_id?:       number;
  category?:          string;
  visibility?:        string;
  source?:            string;
  requires_attention?: boolean;
  is_pinned?:         boolean;
  /** Exclude soft-deleted notes (default: true) */
  exclude_deleted?:   boolean;
  /** Only top-level notes (parent_id IS NULL) */
  top_level_only?:    boolean;
}

export interface CreateExecutionNoteInput {
  project_id:          number;
  lot_id?:             number | null;
  task_id?:            number | null;
  lot_ids?:            number[];
  task_ids?:           number[];
  incident_id?:        number | null;
  parent_id?:          number | null;
  content:             string;
  category?:           string;
  visibility?:         string;
  source?:             string;
  requires_attention?: boolean;
  is_pinned?:          boolean;
  metadata_json?:      string | null;
}

export interface UpdateExecutionNoteInput {
  content?:            string;
  category?:           string;
  visibility?:         string;
  requires_attention?: boolean;
  metadata_json?:      string | null;
}

// ─── Service ──────────────────────────────────────────────────────────────────

export class ExecutionNoteService {

  private static normalizeIds(input?: number[]) {
    if (!Array.isArray(input)) return [];
    const ids = input
      .map((value) => Number(value))
      .filter((value) => Number.isInteger(value) && value > 0);
    return Array.from(new Set(ids));
  }

  private static withBatchMetadata(existing: string | null | undefined, batchId: string) {
    let metadata: Record<string, unknown> = {};
    if (existing) {
      try {
        const parsed = JSON.parse(existing);
        if (parsed && typeof parsed === 'object') {
          metadata = parsed as Record<string, unknown>;
        }
      } catch {
        metadata = {};
      }
    }
    metadata.batch_id = batchId;
    return JSON.stringify(metadata);
  }

  // ─── List ──────────────────────────────────────────────────────────────────

  static async list(filters: ExecutionNoteFilters = {}) {
    const tenantId = TenantContext.getTenantId();
    if (!tenantId) throw new Error('Tenant session required');

    const {
      project_id, lot_id, task_id, incident_id,
      category, visibility, source,
      requires_attention, is_pinned,
      exclude_deleted = true,
      top_level_only  = true,
    } = filters;

    const where: any = { tenant_id: tenantId };

    if (project_id)  where.project_id  = project_id;
    if (lot_id)      where.lot_id      = lot_id;
    if (task_id)     where.task_id     = task_id;
    if (incident_id) where.incident_id = incident_id;
    if (category)    where.category    = category;
    if (visibility)  where.visibility  = visibility;
    if (source)      where.source      = source;
    if (requires_attention !== undefined) where.requires_attention = requires_attention;
    if (is_pinned          !== undefined) where.is_pinned          = is_pinned;
    if (exclude_deleted)                 where.deleted_at          = null;
    if (top_level_only)                  where.parent_id           = null;

    return prisma.executionNote.findMany({
      where,
      select: NOTE_SELECT as any,
      orderBy: [
        { is_pinned:   'desc' },
        { created_at:  'desc' },
      ],
    });
  }

  // ─── Timeline (aggregates notes + history for a given scope) ──────────────

  static async timeline(filters: {
    project_id:  number;
    lot_id?:     number;
    task_id?:    number;
    incident_id?: number;
  }) {
    const tenantId = TenantContext.getTenantId();
    if (!tenantId) throw new Error('Tenant session required');

    const noteWhere: any = {
      tenant_id:  tenantId,
      project_id: filters.project_id,
      deleted_at: null,
      parent_id:  null,
    };
    if (filters.lot_id)      noteWhere.lot_id      = filters.lot_id;
    if (filters.task_id)     noteWhere.task_id     = filters.task_id;
    if (filters.incident_id) noteWhere.incident_id = filters.incident_id;

    const [notes, taskHistory, lotHistory, incidentHistory] = await Promise.all([
      // Notes
      prisma.executionNote.findMany({
        where:   noteWhere,
        select:  NOTE_SELECT as any,
        orderBy: [{ is_pinned: 'desc' }, { created_at: 'desc' }],
      }),

      // Task status history (only when scoped to a task)
      filters.task_id
        ? prisma.taskStatusHistory.findMany({
            where:   { task_id: filters.task_id, tenant_id: tenantId },
            include: { task: { select: { id: true, title: true } } },
            orderBy: { changed_at: 'desc' },
          })
        : Promise.resolve([]),

      // Lot status history (only when scoped to a lot)
      filters.lot_id
        ? prisma.lotStatusHistory.findMany({
            where:   { lot_id: filters.lot_id, tenant_id: tenantId },
            include: { lot: { select: { id: true, lot_number: true, name: true } } },
            orderBy: { changed_at: 'desc' },
          })
        : Promise.resolve([]),

      // Incident status history (only when scoped to an incident)
      filters.incident_id
        ? prisma.incidentStatusHistory.findMany({
            where:   { incident_id: filters.incident_id, tenant_id: tenantId },
            include: { incident: { select: { id: true, title: true } } },
            orderBy: { changed_at: 'desc' },
          })
        : Promise.resolve([]),
    ]);

    return {
      notes,
      taskHistory,
      lotHistory,
      incidentHistory,
    };
  }

  // ─── Get by ID ────────────────────────────────────────────────────────────

  static async getById(id: number) {
    const tenantId = TenantContext.getTenantId();
    if (!tenantId) throw new Error('Tenant session required');
    return prisma.executionNote.findFirst({
      where:  { id, tenant_id: tenantId, deleted_at: null },
      select: NOTE_SELECT as any,
    });
  }

  // ─── Create ───────────────────────────────────────────────────────────────

  static async create(data: CreateExecutionNoteInput, userId: number) {
    const tenantId = TenantContext.getTenantId();
    if (!tenantId) throw new Error('Tenant session required');

    // Validate parent belongs to same tenant
    if (data.parent_id) {
      const parent = await prisma.executionNote.findFirst({
        where: { id: data.parent_id, tenant_id: tenantId, deleted_at: null },
        select: { id: true, project_id: true },
      });
      if (!parent) throw new Error('Note parente introuvable.');
      if (parent.project_id !== data.project_id) {
        throw new Error('La note parente doit appartenir au même projet.');
      }
    }

    const lotIds = this.normalizeIds(data.lot_ids);
    const taskIds = this.normalizeIds(data.task_ids);

    if (data.parent_id && (lotIds.length > 0 || taskIds.length > 0)) {
      throw new Error('Le mode multi-cible n\'est pas compatible avec une note en réponse (parent_id).');
    }

    if (lotIds.length > 0 || taskIds.length > 0) {
      const batchId = `execution-note-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const metadataJson = this.withBatchMetadata(data.metadata_json, batchId);

      const lotCreates = lotIds.map((targetLotId) =>
        prisma.executionNote.create({
          data: {
            tenant_id:          tenantId,
            project_id:         data.project_id,
            lot_id:             targetLotId,
            task_id:            null,
            incident_id:        data.incident_id  ?? null,
            parent_id:          data.parent_id    ?? null,
            content:            data.content,
            category:           data.category     ?? 'INFO',
            visibility:         data.visibility   ?? 'INTERNAL',
            source:             data.source       ?? 'MANUAL',
            requires_attention: data.requires_attention ?? false,
            is_pinned:          data.is_pinned    ?? false,
            metadata_json:      metadataJson,
            created_by:         userId,
          },
          select: NOTE_SELECT as any,
        }),
      );

      const taskCreates = taskIds.map((targetTaskId) =>
        prisma.executionNote.create({
          data: {
            tenant_id:          tenantId,
            project_id:         data.project_id,
            lot_id:             null,
            task_id:            targetTaskId,
            incident_id:        data.incident_id  ?? null,
            parent_id:          data.parent_id    ?? null,
            content:            data.content,
            category:           data.category     ?? 'INFO',
            visibility:         data.visibility   ?? 'INTERNAL',
            source:             data.source       ?? 'MANUAL',
            requires_attention: data.requires_attention ?? false,
            is_pinned:          data.is_pinned    ?? false,
            metadata_json:      metadataJson,
            created_by:         userId,
          },
          select: NOTE_SELECT as any,
        }),
      );

      const notes = await prisma.$transaction([...lotCreates, ...taskCreates]);
      return {
        mode: 'bulk',
        batch_id: batchId,
        count: notes.length,
        notes,
      };
    }

    return prisma.executionNote.create({
      data: {
        tenant_id:          tenantId,
        project_id:         data.project_id,
        lot_id:             data.lot_id       ?? null,
        task_id:            data.task_id      ?? null,
        incident_id:        data.incident_id  ?? null,
        parent_id:          data.parent_id    ?? null,
        content:            data.content,
        category:           data.category     ?? 'INFO',
        visibility:         data.visibility   ?? 'INTERNAL',
        source:             data.source       ?? 'MANUAL',
        requires_attention: data.requires_attention ?? false,
        is_pinned:          data.is_pinned    ?? false,
        metadata_json:      data.metadata_json ?? null,
        created_by:         userId,
      },
      select: NOTE_SELECT as any,
    });
  }

  // ─── Update ───────────────────────────────────────────────────────────────

  static async update(id: number, data: UpdateExecutionNoteInput, userId: number) {
    const tenantId = TenantContext.getTenantId();
    if (!tenantId) throw new Error('Tenant session required');

    const note = await prisma.executionNote.findFirst({
      where:  { id, tenant_id: tenantId, deleted_at: null },
      select: { id: true, created_by: true },
    });
    if (!note) throw new Error('Note introuvable.');

    return prisma.executionNote.update({
      where: { id },
      data:  {
        ...(data.content            !== undefined && { content:            data.content }),
        ...(data.category           !== undefined && { category:           data.category }),
        ...(data.visibility         !== undefined && { visibility:         data.visibility }),
        ...(data.requires_attention !== undefined && { requires_attention: data.requires_attention }),
        ...(data.metadata_json      !== undefined && { metadata_json:      data.metadata_json }),
        edited_by: userId,
        edited_at: new Date(),
      },
      select: NOTE_SELECT as any,
    });
  }

  // ─── Pin / Unpin ──────────────────────────────────────────────────────────

  static async togglePin(id: number) {
    const tenantId = TenantContext.getTenantId();
    if (!tenantId) throw new Error('Tenant session required');

    const note = await prisma.executionNote.findFirst({
      where:  { id, tenant_id: tenantId, deleted_at: null },
      select: { id: true, is_pinned: true },
    });
    if (!note) throw new Error('Note introuvable.');

    return prisma.executionNote.update({
      where: { id },
      data:  { is_pinned: !note.is_pinned },
      select: NOTE_SELECT as any,
    });
  }

  // ─── Resolve ──────────────────────────────────────────────────────────────

  static async resolve(id: number) {
    const tenantId = TenantContext.getTenantId();
    if (!tenantId) throw new Error('Tenant session required');

    const note = await prisma.executionNote.findFirst({
      where:  { id, tenant_id: tenantId, deleted_at: null },
      select: { id: true },
    });
    if (!note) throw new Error('Note introuvable.');

    return prisma.executionNote.update({
      where:  { id },
      data:   { resolved_at: new Date(), requires_attention: false },
      select: NOTE_SELECT as any,
    });
  }

  // ─── Soft delete ──────────────────────────────────────────────────────────

  static async softDelete(id: number) {
    const tenantId = TenantContext.getTenantId();
    if (!tenantId) throw new Error('Tenant session required');

    const note = await prisma.executionNote.findFirst({
      where:  { id, tenant_id: tenantId, deleted_at: null },
      select: { id: true },
    });
    if (!note) throw new Error('Note introuvable.');

    return prisma.executionNote.update({
      where:  { id },
      data:   { deleted_at: new Date() },
      select: { id: true, deleted_at: true },
    });
  }

  // ─── Status History helpers ───────────────────────────────────────────────

  static async getTaskStatusHistory(task_id: number) {
    const tenantId = TenantContext.getTenantId();
    if (!tenantId) throw new Error('Tenant session required');
    return prisma.taskStatusHistory.findMany({
      where:   { task_id, tenant_id: tenantId },
      include: {
        task:   { select: { id: true, title: true } },
      },
      orderBy: { changed_at: 'desc' },
    });
  }

  static async getLotStatusHistory(lot_id: number) {
    const tenantId = TenantContext.getTenantId();
    if (!tenantId) throw new Error('Tenant session required');
    return prisma.lotStatusHistory.findMany({
      where:   { lot_id, tenant_id: tenantId },
      include: {
        lot:    { select: { id: true, lot_number: true, name: true } },
      },
      orderBy: { changed_at: 'desc' },
    });
  }

  static async getIncidentStatusHistory(incident_id: number) {
    const tenantId = TenantContext.getTenantId();
    if (!tenantId) throw new Error('Tenant session required');
    return prisma.incidentStatusHistory.findMany({
      where:   { incident_id, tenant_id: tenantId },
      include: {
        incident: { select: { id: true, title: true } },
      },
      orderBy: { changed_at: 'desc' },
    });
  }
}
