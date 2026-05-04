import { prisma } from '../config/prisma.js';
import { TenantContext } from '../config/tenant-context.js';

const INCIDENT_INCLUDE = {
  createdBy:  { select: { id: true, firstname: true, lastname: true } },
  assignedTo: { select: { id: true, firstname: true, lastname: true } },
  project:    { select: { id: true, code: true, title: true } },
  task:       { select: { id: true, title: true } },
  lot:        { select: { id: true, lot_number: true, name: true } },
} as const;

export class IncidentService {
  static async createIncident(data: {
    project_id: number;
    task_id?: number;
    lot_id?: number;
    type: string;
    severity: string;
    status: string;
    title?: string;
    description: string;
    location?: string;
    incident_date?: Date;
    root_cause?: string;
    corrective_action?: string;
    cost_impact?: number;
    delay_impact_days?: number;
    assigned_to_id?: number;
    created_by: number;
  }) {
    const tenantId = TenantContext.getTenantId();
    if (!tenantId) throw new Error("Tenant session required");

    return await prisma.incident.create({
      data: { ...data, tenant_id: tenantId },
      include: INCIDENT_INCLUDE
    });
  }

  static async getIncidents(filters: {
    project_id?: number;
    status?: string;
    severity?: string;
    type?: string;
  }) {
    const tenantId = TenantContext.getTenantId();
    if (!tenantId) throw new Error("Tenant session required");

    return await prisma.incident.findMany({
      where: { ...filters, tenant_id: tenantId },
      include: INCIDENT_INCLUDE,
      orderBy: { created_at: 'desc' }
    });
  }

  static async getIncidentById(id: number) {
    return await prisma.incident.findUnique({
      where: { id },
      include: INCIDENT_INCLUDE
    });
  }

  static async getIncidentByIdForTenant(id: number) {
    const tenantId = TenantContext.getTenantId();
    if (!tenantId) throw new Error('Tenant session required');
    return await prisma.incident.findFirst({
      where: { id, tenant_id: tenantId },
      include: INCIDENT_INCLUDE,
    });
  }

  static async updateIncident(id: number, data: Record<string, any>) {
    // Auto-set resolved_at when status becomes RESOLVED
    if (data.status === 'RESOLVED' && !data.resolved_at) {
      data.resolved_at = new Date();
    }
    // Clear resolved_at if re-opened
    if (data.status === 'OPEN' || data.status === 'IN_PROGRESS') {
      data.resolved_at = null;
    }
    return await prisma.incident.update({
      where: { id },
      data,
      include: INCIDENT_INCLUDE
    });
  }

  static async deleteIncident(id: number) {
    return await prisma.incident.delete({ where: { id } });
  }
}
