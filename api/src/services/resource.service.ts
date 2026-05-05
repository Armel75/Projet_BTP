import { prisma } from '../config/prisma.js';
import { TenantContext } from '../config/tenant-context.js';

export class ResourceService {
  static async getGlpiUsers(limit = 200) {
    const tenantId = TenantContext.getTenantId();
    if (!tenantId) throw new Error("Tenant session required");

    const safeLimit = Math.max(1, Math.min(1000, Number(limit) || 200));
    return (prisma as any).gLPIUser.findMany({
      where: {
        tenant_id: tenantId,
        is_deleted_in_source: false,
      },
      select: {
        id: true,
        glpi_id: true,
        login: true,
        email: true,
        first_name: true,
        last_name: true,
        full_name: true,
        status: true,
      },
      orderBy: [
        { full_name: 'asc' },
        { login: 'asc' },
      ],
      take: safeLimit,
    });
  }

  // ==========================
  // RESOURCE TYPES
  // ==========================
  static async getResourceTypes() {
    return await prisma.resourceType.findMany({
      include: {
        _count: { select: { resources: true } }
      },
      orderBy: { code: "asc" }
    });
  }

  static async createResourceType(code: string) {
    const normalized = String(code ?? "").trim().toUpperCase();
    if (!normalized) throw new Error("Le code du type est requis.");
    if (!/^[A-Z0-9_]+$/.test(normalized)) {
      throw new Error("Le code doit contenir uniquement lettres majuscules, chiffres ou underscore.");
    }

    return await prisma.resourceType.create({
      data: { code: normalized }
    });
  }

  static async deleteResourceType(id: number) {
    if (!Number.isInteger(id) || id <= 0) throw new Error("ID de type invalide.");

    const existing = await prisma.resourceType.findUnique({
      where: { id },
      include: { _count: { select: { resources: true } } }
    });

    if (!existing) throw new Error("Type de ressource introuvable.");
    if (existing._count.resources > 0) {
      throw new Error("Impossible de supprimer ce type: des ressources l'utilisent encore.");
    }

    return await prisma.resourceType.delete({ where: { id } });
  }

  // ==========================
  // RESOURCES
  // ==========================
  static async createResource(data: {
    name: string;
    type_id: number;
    cost_rate: number;
  }) {
    const tenantId = TenantContext.getTenantId();
    if (!tenantId) throw new Error("Tenant session required");

    const name = String(data.name ?? "").trim();
    const typeId = Number(data.type_id);
    const costRate = Number(data.cost_rate);

    if (!name) throw new Error("Le nom de la ressource est requis.");
    if (!Number.isInteger(typeId) || typeId <= 0) throw new Error("Le type de ressource est invalide.");
    if (!Number.isFinite(costRate) || costRate < 0) throw new Error("Le taux horaire est invalide.");

    const type = await prisma.resourceType.findUnique({ where: { id: typeId } });
    if (!type) throw new Error("Le type de ressource sélectionné n'existe pas.");

    const created = await prisma.resource.create({
      data: {
        name,
        type_id: typeId,
        cost_rate: costRate,
        tenant_id: tenantId
      }
    });

    if (!created || !created.id) {
      throw new Error("La ressource n'a pas pu être enregistrée.");
    }

    return created;
  }

  static async getResources() {
    return await prisma.resource.findMany({
      include: {
        type: true,
        assignments: true
      }
    });
  }

  static async getResourceById(id: number) {
    return await prisma.resource.findUnique({
      where: { id },
      include: {
        type: true,
        assignments: {
          include: {
            task: true
          }
        }
      }
    });
  }

  static async updateResource(id: number, data: any) {
    return await prisma.resource.update({
      where: { id },
      data
    });
  }

  static async deleteResource(id: number) {
    return await prisma.resource.delete({
      where: { id }
    });
  }

  // ==========================
  // TASK ASSIGNMENTS
  // ==========================
  static async assignToTask(data: {
    task_id: number;
    resource_id: number;
    planned_hours: number;
    start_date?: Date;
    end_date?: Date;
    created_by?: number;
  }) {
    const tenantId = TenantContext.getTenantId();
    if (!tenantId) throw new Error("Tenant session required");

    // 1. Validate Task and Resource exist
    const task = await prisma.task.findUnique({ where: { id: data.task_id } });
    const resource = await prisma.resource.findUnique({ where: { id: data.resource_id } });

    if (!task) throw new Error("Task not found");
    if (!resource) throw new Error("Resource not found");

    // 2. Conflict Detection (Temporal)
    if (data.start_date && data.end_date) {
      const hasConflict = await this.checkConflict(data.resource_id, data.start_date, data.end_date);
      if (hasConflict) {
        throw new Error("Resource conflict: Resource is already assigned to another task during this period.");
      }
    }

    return await prisma.taskAssignment.create({
      data: {
        ...data,
        tenant_id: tenantId
      }
    });
  }

  static async unassignFromTask(id: number) {
    return await prisma.taskAssignment.delete({
      where: { id }
    });
  }

  static async unassignResourceFromTask(taskId: number, resourceId: number) {
    // Find the assignment first
    const assignment = await prisma.taskAssignment.findFirst({
      where: {
        task_id: taskId,
        resource_id: resourceId
      }
    });

    if (!assignment) throw new Error("Assignment not found");

    return await prisma.taskAssignment.delete({
      where: { id: assignment.id }
    });
  }

  static async getTaskAssignments(taskId: number) {
    return await prisma.taskAssignment.findMany({
      where: { task_id: taskId },
      include: {
        resource: {
          include: {
            type: true
          }
        }
      }
    });
  }

  private static async checkConflict(resourceId: number, start: Date, end: Date): Promise<boolean> {
    const overlapping = await prisma.taskAssignment.findMany({
      where: {
        resource_id: resourceId,
        OR: [
          {
            // Case 1: Existing assignment starts within new period
            start_date: {
              gte: start,
              lte: end
            }
          },
          {
            // Case 2: Existing assignment ends within new period
            end_date: {
              gte: start,
              lte: end
            }
          },
          {
            // Case 3: New period is entirely within existing assignment
            AND: [
              { start_date: { lte: start } },
              { end_date: { gte: end } }
            ]
          }
        ]
      }
    });

    return overlapping.length > 0;
  }
}
