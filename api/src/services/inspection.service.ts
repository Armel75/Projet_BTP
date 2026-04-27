import { prisma } from '../config/prisma.js';
import { TenantContext } from '../config/tenant-context.js';

export class InspectionService {
  static async createInspection(data: {
    project_id: number;
    title: string;
    type: string;
    status: string;
    scheduled_date?: Date;
    created_by: number;
    items?: { description: string; result?: string; comment?: string }[];
  }) {
    const tenantId = TenantContext.getTenantId();
    if (!tenantId) throw new Error("Tenant session required");

    return await prisma.inspection.create({
      data: {
        project_id: data.project_id,
        title: data.title,
        type: data.type,
        status: data.status,
        scheduled_date: data.scheduled_date,
        created_by: data.created_by,
        tenant_id: tenantId,
        items: {
          create: data.items || []
        }
      },
      include: {
        items: true,
        createdBy: true,
        project: true
      }
    });
  }

  static async getInspections(filters: {
    project_id?: number;
    status?: string;
    created_by?: number;
  }) {
    const tenantId = TenantContext.getTenantId();
    if (!tenantId) throw new Error("Tenant session required");

    return await prisma.inspection.findMany({
      where: {
        ...filters,
        tenant_id: tenantId
      },
      include: {
        items: true,
        createdBy: true
      },
      orderBy: { created_at: 'desc' }
    });
  }

  static async getInspectionById(id: number) {
    return await prisma.inspection.findUnique({
      where: { id },
      include: {
        items: true,
        createdBy: true,
        project: true
      }
    });
  }

  static async updateInspection(id: number, data: {
    title?: string;
    status?: string;
    completed_date?: Date;
    items?: { id?: number; description: string; result?: string; comment?: string }[];
  }) {
    return await prisma.$transaction(async (tx: any) => {
      // Logic for items: update existing or create new ones
      if (data.items) {
        for (const item of data.items) {
          if (item.id) {
            await tx.inspectionItem.update({
              where: { id: item.id },
              data: {
                description: item.description,
                result: item.result,
                comment: item.comment
              }
            });
          } else {
            await tx.inspectionItem.create({
              data: {
                inspection_id: id,
                description: item.description,
                result: item.result,
                comment: item.comment
              }
            });
          }
        }
      }

      return await tx.inspection.update({
        where: { id },
        data: {
          title: data.title,
          status: data.status,
          completed_date: data.completed_date
        },
        include: {
          items: true
        }
      });
    });
  }

  static async deleteInspection(id: number) {
    return await prisma.$transaction(async (tx: any) => {
      await tx.inspectionItem.deleteMany({ where: { inspection_id: id } });
      return await tx.inspection.delete({ where: { id } });
    });
  }
}
