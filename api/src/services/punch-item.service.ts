import { prisma } from '../config/prisma.js';
import { TenantContext } from '../config/tenant-context.js';

export class PunchItemService {
  static async createPunchItem(data: {
    project_id: number;
    title: string;
    description: string;
    status: string;
    assigned_to?: string;
    due_date?: Date;
    created_by: number;
  }) {
    const tenantId = TenantContext.getTenantId();
    if (!tenantId) throw new Error("Tenant session required");

    return await prisma.punchItem.create({
      data: {
        ...data,
        tenant_id: tenantId
      },
      include: {
        createdBy: true,
        project: true
      }
    });
  }

  static async getPunchItems(filters: {
    project_id?: number;
    status?: string;
    created_by?: number;
  }) {
    const tenantId = TenantContext.getTenantId();
    if (!tenantId) throw new Error("Tenant session required");

    return await prisma.punchItem.findMany({
      where: {
        ...filters,
        tenant_id: tenantId
      },
      include: {
        createdBy: true
      },
      orderBy: { created_at: 'desc' }
    });
  }

  static async getPunchItemById(id: number) {
    return await prisma.punchItem.findUnique({
      where: { id },
      include: {
        createdBy: true,
        project: true
      }
    });
  }

  static async updatePunchItem(id: number, data: {
    title?: string;
    description?: string;
    status?: string;
    assigned_to?: string;
    due_date?: Date;
    resolved_at?: Date;
  }) {
    // Basic logic: if status set to CLOSED, set resolved_at if not provided
    if (data.status === 'CLOSED' && !data.resolved_at) {
      data.resolved_at = new Date();
    }

    return await prisma.punchItem.update({
      where: { id },
      data
    });
  }

  static async deletePunchItem(id: number) {
    return await prisma.punchItem.delete({
      where: { id }
    });
  }
}
