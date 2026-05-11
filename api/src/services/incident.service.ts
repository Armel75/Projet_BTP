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
    target_resolution_at?: Date;
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
    created_by?: number;
  }) {
    const tenantId = TenantContext.getTenantId();
    if (!tenantId) throw new Error("Tenant session required");

    return await prisma.incident.findMany({
      where: { ...filters, tenant_id: tenantId, is_archived: false },
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
      where: { id, tenant_id: tenantId, is_archived: false },
      include: INCIDENT_INCLUDE,
    });
  }

  static async getIncidentByIdForTenantScoped(id: number, created_by?: number) {
    const tenantId = TenantContext.getTenantId();
    if (!tenantId) throw new Error('Tenant session required');
    return await prisma.incident.findFirst({
      where: {
        id,
        tenant_id: tenantId,
        is_archived: false,
        ...(created_by !== undefined && { created_by }),
      },
      include: INCIDENT_INCLUDE,
    });
  }

  static async updateIncident(id: number, data: Record<string, any>, changed_by?: number) {
    const current = await prisma.incident.findFirst({
      where:  { id },
      select: { id: true, status: true, severity: true, tenant_id: true },
    });
    if (!current) throw new Error('Incident introuvable.');

    // Auto-set resolved_at when status becomes RESOLVED
    if (data.status === 'RESOLVED' && !data.resolved_at) {
      data.resolved_at = new Date();
    }
    // Clear resolved_at if re-opened
    if (data.status === 'OPEN' || data.status === 'IN_PROGRESS') {
      data.resolved_at = null;
    }

    const updated = await prisma.incident.update({
      where: { id },
      data,
      include: INCIDENT_INCLUDE
    });

    const statusChanged   = data.status   !== undefined && data.status   !== current.status;
    const severityChanged = data.severity !== undefined && data.severity !== current.severity;

    if (statusChanged || severityChanged) {
      await prisma.incidentStatusHistory.create({
        data: {
          incident_id:   id,
          tenant_id:     current.tenant_id,
          from_status:   statusChanged   ? current.status            : current.status,
          to_status:     statusChanged   ? data.status               : current.status,
          from_severity: severityChanged ? current.severity          : null,
          to_severity:   severityChanged ? data.severity             : null,
          changed_by:    changed_by ?? null,
        },
      });
    }

    return updated;
  }

  static async archiveIncident(id: number) {
    return await prisma.incident.update({
      where: { id },
      data: { is_archived: true, archived_at: new Date() },
      include: INCIDENT_INCLUDE,
    });
  }
}
