import { prisma } from '../config/prisma.js';
import { TenantContext } from '../config/tenant-context.js';

const WORK_ACCEPTANCE_INCLUDE = {
  createdBy: { select: { id: true, firstname: true, lastname: true } },
  inspector: { select: { id: true, firstname: true, lastname: true } },
  document:  { select: { id: true, name: true, file_url: true, file_name: true, file_size: true } },
  project:   { select: { id: true, code: true, title: true } },
  lot:       { select: { id: true, lot_number: true, name: true } },
} as const;

export class WorkAcceptanceService {
  static async createWorkAcceptance(data: {
    project_id:          number;
    lot_id?:             number;
    reference?:          string;
    title?:              string;
    type:                string;
    status:              string;
    planned_date?:       Date;
    inspection_date?:    Date;
    accepted_at?:        Date;
    contra_visit_date?:  Date;
    warranty_months?:    number;
    warranty_end_date?:  Date;
    amount_accepted?:    number;
    penalty_amount?:     number;
    reserve_count?:      number;
    notes?:              string;
    observations?:       string;
    reserves_text?:      string;
    attendees?:          string;
    signed_by_owner?:    boolean;
    signed_by_contractor?: boolean;
    document_id?:        number;
    inspector_id?:       number;
    created_by:          number;
  }) {
    const tenantId = TenantContext.getTenantId();
    if (!tenantId) throw new Error("Tenant session required");

    return await prisma.workAcceptance.create({
      data: { ...data, tenant_id: tenantId },
      include: WORK_ACCEPTANCE_INCLUDE,
    });
  }

  static async getWorkAcceptances(filters: {
    project_id?:  number;
    lot_id?:      number;
    status?:      string;
    type?:        string;
    inspector_id?: number;
  }) {
    const tenantId = TenantContext.getTenantId();
    if (!tenantId) throw new Error("Tenant session required");

    return await prisma.workAcceptance.findMany({
      where:   { ...filters, tenant_id: tenantId },
      include: WORK_ACCEPTANCE_INCLUDE,
      orderBy: { created_at: 'desc' },
    });
  }

  static async getWorkAcceptanceById(id: number) {
    return await prisma.workAcceptance.findUnique({
      where:   { id },
      include: WORK_ACCEPTANCE_INCLUDE,
    });
  }

  static async getWorkAcceptanceByIdForTenant(id: number) {
    const tenantId = TenantContext.getTenantId();
    if (!tenantId) throw new Error("Tenant session required");

    return await prisma.workAcceptance.findFirst({
      where: {
        id,
        tenant_id: tenantId,
      },
      include: WORK_ACCEPTANCE_INCLUDE,
    });
  }

  static async updateWorkAcceptance(id: number, data: Record<string, any>) {
    // Auto-set accepted_at when status becomes ACCEPTED or ACCEPTED_WITH_RESERVES
    if (
      (data.status === 'ACCEPTED' || data.status === 'ACCEPTED_WITH_RESERVES') &&
      !data.accepted_at
    ) {
      data.accepted_at = new Date();
    }

    // Auto-compute warranty_end_date when accepted_at is set and warranty_months known
    if (data.accepted_at && data.warranty_months) {
      const base = new Date(data.accepted_at);
      base.setMonth(base.getMonth() + Number(data.warranty_months));
      data.warranty_end_date = base;
    }

    return await prisma.workAcceptance.update({
      where:   { id },
      data,
      include: WORK_ACCEPTANCE_INCLUDE,
    });
  }

  static async deleteWorkAcceptance(id: number) {
    return await prisma.workAcceptance.delete({ where: { id } });
  }
}
