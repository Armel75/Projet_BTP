import { prisma } from '../config/prisma.js';
import { TenantContext } from '../config/tenant-context.js';

export class IncidentService {
  static async createIncident(data: {
    project_id: number;
    task_id?: number;
    type: string;
    severity: string;
    status: string;
    description: string;
    created_by: number;
  }) {
    const tenantId = TenantContext.getTenantId();
    if (!tenantId) throw new Error("Tenant session required");

    return await prisma.incident.create({
      data: {
        ...data,
        tenant_id: tenantId
      },
      include: {
        createdBy: true,
        project: true,
        task: true
      }
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
      where: {
        ...filters,
        tenant_id: tenantId
      },
      include: {
        createdBy: true,
        project: true
      },
      orderBy: { created_at: 'desc' }
    });
  }

  static async getIncidentById(id: number) {
    return await prisma.incident.findUnique({
      where: { id },
      include: {
        createdBy: true,
        project: true,
        task: true
      }
    });
  }

  static async updateIncident(id: number, data: {
    status?: string;
    severity?: string;
    description?: string;
    resolved_at?: Date;
  }) {
    // If status is RESOLVED, set resolved_at if not provided
    if (data.status === 'RESOLVED' && !data.resolved_at) {
      data.resolved_at = new Date();
    }

    return await prisma.incident.update({
      where: { id },
      data
    });
  }

  static async deleteIncident(id: number) {
    return await prisma.incident.delete({
      where: { id }
    });
  }
}
