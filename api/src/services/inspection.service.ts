import { prisma } from '../config/prisma.js';
import { TenantContext } from '../config/tenant-context.js';

const INSPECTION_INCLUDE = {
  createdBy:  { select: { id: true, firstname: true, lastname: true } },
  inspector:  { select: { id: true, firstname: true, lastname: true } },
  project:    { select: { id: true, code: true, title: true } },
  lot:        { select: { id: true, lot_number: true, name: true } },
  items: {
    orderBy: { order: 'asc' as const }
  }
} as const;

export class InspectionService {
  static async createInspection(data: {
    project_id: number;
    lot_id?: number;
    title: string;
    type: string;
    status: string;
    scheduled_date?: Date;
    date_scheduled?: Date;
    description?: string;
    location?: string;
    reference_norm?: string;
    checklist_template_id?: number;
    inspection_result?: string;
    evidence_photos_required?: boolean;
    approval_workflow_status?: string;
    rework_required?: boolean;
    inspector_id?: number;
    created_by: number;
    items?: { description: string; result?: string; comment?: string; order?: number; category?: string }[];
  }) {
    const tenantId = TenantContext.getTenantId();
    if (!tenantId) throw new Error("Tenant session required");

    return await prisma.inspection.create({
      data: {
        project_id:     data.project_id,
        lot_id:         data.lot_id,
        title:          data.title,
        type:           data.type,
        status:         data.status,
        scheduled_date: data.scheduled_date,
        date_scheduled: data.date_scheduled,
        description:    data.description,
        location:       data.location,
        reference_norm: data.reference_norm,
        checklist_template_id: data.checklist_template_id,
        inspection_result: data.inspection_result,
        evidence_photos_required: data.evidence_photos_required,
        approval_workflow_status: data.approval_workflow_status,
        rework_required: data.rework_required,
        inspector_id:   data.inspector_id,
        created_by:     data.created_by,
        tenant_id:      tenantId,
        items: {
          create: (data.items || []).map((item, idx) => ({
            description: item.description,
            result:      item.result,
            comment:     item.comment,
            order:       item.order ?? idx,
            category:    item.category
          }))
        }
      },
      include: INSPECTION_INCLUDE
    });
  }

  static async getInspections(filters: {
    project_id?: number;
    status?: string;
    type?: string;
    approval_workflow_status?: string;
    inspection_result?: string;
    inspector_id?: number;
    created_by?: number;
    rework_required?: boolean;
  }) {
    const tenantId = TenantContext.getTenantId();
    if (!tenantId) throw new Error("Tenant session required");

    return await prisma.inspection.findMany({
      where: {
        ...filters,
        tenant_id: tenantId
      },
      include: INSPECTION_INCLUDE,
      orderBy: { created_at: 'desc' }
    });
  }

  static async getInspectionById(id: number) {
    return await prisma.inspection.findUnique({
      where: { id },
      include: INSPECTION_INCLUDE
    });
  }

  static async getInspectionByIdForTenant(id: number) {
    const tenantId = TenantContext.getTenantId();
    if (!tenantId) throw new Error('Tenant session required');

    return await prisma.inspection.findFirst({
      where: { id, tenant_id: tenantId },
      include: INSPECTION_INCLUDE,
    });
  }

  static async updateInspection(id: number, data: {
    title?: string;
    type?: string;
    status?: string;
    scheduled_date?: Date;
    date_scheduled?: Date;
    completed_date?: Date;
    description?: string;
    location?: string;
    reference_norm?: string;
    checklist_template_id?: number | null;
    inspection_result?: string;
    evidence_photos_required?: boolean;
    approval_workflow_status?: string;
    rework_required?: boolean;
    inspector_id?: number | null;
    lot_id?: number | null;
    items?: { id?: number; description: string; result?: string; comment?: string; order?: number; category?: string }[];
  }) {
    return await prisma.$transaction(async (tx: any) => {
      if (data.items) {
        for (const item of data.items) {
          if (item.id) {
            await tx.inspectionItem.update({
              where: { id: item.id },
              data: {
                description: item.description,
                result:      item.result,
                comment:     item.comment,
                order:       item.order,
                category:    item.category
              }
            });
          } else {
            await tx.inspectionItem.create({
              data: {
                inspection_id: id,
                description:   item.description,
                result:        item.result,
                comment:       item.comment,
                order:         item.order ?? 0,
                category:      item.category
              }
            });
          }
        }
      }

      return await tx.inspection.update({
        where: { id },
        data: {
          title:          data.title,
          type:           data.type,
          status:         data.status,
          scheduled_date: data.scheduled_date,
          date_scheduled: data.date_scheduled,
          completed_date: data.completed_date,
          description:    data.description,
          location:       data.location,
          reference_norm: data.reference_norm,
          checklist_template_id: data.checklist_template_id,
          inspection_result: data.inspection_result,
          evidence_photos_required: data.evidence_photos_required,
          approval_workflow_status: data.approval_workflow_status,
          rework_required: data.rework_required,
          inspector_id:   data.inspector_id,
          lot_id:         data.lot_id
        },
        include: INSPECTION_INCLUDE
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
