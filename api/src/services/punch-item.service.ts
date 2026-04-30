import { prisma } from '../config/prisma.js';
import { TenantContext } from '../config/tenant-context.js';

const PUNCH_ITEM_INCLUDE = {
  createdBy:  { select: { id: true, firstname: true, lastname: true } },
  assignedTo: { select: { id: true, firstname: true, lastname: true } },
  project:    { select: { id: true, code: true, title: true } },
  lot:        { select: { id: true, lot_number: true, name: true } },
  task:       { select: { id: true, title: true } },
} as const;

export class PunchItemService {
  static async createPunchItem(data: {
    project_id: number;
    lot_id?: number;
    task_id?: number;
    title: string;
    description: string;
    category?: string;
    priority?: string;
    status?: string;
    location?: string;
    image_urls?: string;
    assigned_to_id?: number;
    due_date?: Date;
    created_by: number;
  }) {
    const tenantId = TenantContext.getTenantId();
    if (!tenantId) throw new Error("Tenant session required");

    return await prisma.punchItem.create({
      data: {
        project_id:     data.project_id,
        lot_id:         data.lot_id,
        task_id:        data.task_id,
        title:          data.title,
        description:    data.description,
        category:       data.category ?? 'QUALITY',
        priority:       data.priority  ?? 'MEDIUM',
        status:         data.status    ?? 'OPEN',
        location:       data.location,
        image_urls:     data.image_urls,
        assigned_to_id: data.assigned_to_id,
        due_date:       data.due_date,
        created_by:     data.created_by,
        tenant_id:      tenantId,
      },
      include: PUNCH_ITEM_INCLUDE
    });
  }

  static async getPunchItems(filters: {
    project_id?: number;
    status?: string;
    category?: string;
    priority?: string;
    assigned_to_id?: number;
    lot_id?: number;
    created_by?: number;
  }) {
    const tenantId = TenantContext.getTenantId();
    if (!tenantId) throw new Error("Tenant session required");

    return await prisma.punchItem.findMany({
      where: {
        ...filters,
        tenant_id: tenantId
      },
      include: PUNCH_ITEM_INCLUDE,
      orderBy: [
        { priority: 'desc' },
        { created_at: 'desc' }
      ]
    });
  }

  static async getPunchItemById(id: number) {
    return await prisma.punchItem.findUnique({
      where: { id },
      include: PUNCH_ITEM_INCLUDE
    });
  }

  static async updatePunchItem(id: number, data: {
    title?: string;
    description?: string;
    category?: string;
    priority?: string;
    status?: string;
    location?: string;
    image_urls?: string;
    assigned_to_id?: number | null;
    lot_id?: number | null;
    task_id?: number | null;
    due_date?: Date;
    resolved_at?: Date;
  }) {
    // Auto-set resolved_at when closing or verifying
    if ((data.status === 'CLOSED' || data.status === 'VERIFIED') && !data.resolved_at) {
      data.resolved_at = new Date();
    }

    return await prisma.punchItem.update({
      where: { id },
      data,
      include: PUNCH_ITEM_INCLUDE
    });
  }

  static async deletePunchItem(id: number) {
    return await prisma.punchItem.delete({
      where: { id }
    });
  }
}
