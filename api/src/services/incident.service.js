import { prisma } from '../config/prisma.js';
import { TenantContext } from '../config/tenant-context.js';
export class IncidentService {
    static async createIncident(data) {
        const tenantId = TenantContext.getTenantId();
        if (!tenantId)
            throw new Error("Tenant session required");
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
    static async getIncidents(filters) {
        const tenantId = TenantContext.getTenantId();
        if (!tenantId)
            throw new Error("Tenant session required");
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
    static async getIncidentById(id) {
        return await prisma.incident.findUnique({
            where: { id },
            include: {
                createdBy: true,
                project: true,
                task: true
            }
        });
    }
    static async updateIncident(id, data) {
        // If status is RESOLVED, set resolved_at if not provided
        if (data.status === 'RESOLVED' && !data.resolved_at) {
            data.resolved_at = new Date();
        }
        return await prisma.incident.update({
            where: { id },
            data
        });
    }
    static async deleteIncident(id) {
        return await prisma.incident.delete({
            where: { id }
        });
    }
}
