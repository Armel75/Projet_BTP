import { prisma } from '../config/prisma.js';
import { TenantContext } from '../config/tenant-context.js';

export class ResourceService {
  // ==========================
  // RESOURCE TYPES
  // ==========================
  static async getResourceTypes() {
    return await prisma.resourceType.findMany();
  }

  static async createResourceType(code: string) {
    return await prisma.resourceType.create({
      data: { code }
    });
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

    return await prisma.resource.create({
      data: {
        ...data,
        tenant_id: tenantId
      }
    });
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
