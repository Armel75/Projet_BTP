import { prisma } from '../config/prisma.js';

export class ProjectManagementService {
  // ==========================
  // PROJECTS
  // ==========================

  static async createProject(data: any) {
    return await prisma.project.create({
      data
    });
  }

  static async getProjectById(id: number) {
    return await prisma.project.findUnique({
      where: { id },
      include: {
        lots: true,
        createdBy: true,
      }
    });
  }

  // ==========================
  // PROJECT LOTS
  // ==========================

  static async createProjectLot(data: {
    project_id: number;
    name: string;
    description?: string;
    tenant_id: number;
  }) {
    return await prisma.projectLot.create({
      data
    });
  }

  static async getLotsByProject(project_id: number) {
    return await prisma.projectLot.findMany({
      where: { project_id }
    });
  }

  static async deleteProjectLot(id: number) {
    return await prisma.projectLot.delete({
      where: { id }
    });
  }

  static async createWBSNode(data: {
    project_id: number;
    parent_id?: number;
    tenant_id: number;
    code: string;
    name: string;
  }) {
    let level = 0;
    if (data.parent_id) {
      const parent = await prisma.wBSNode.findUnique({
        where: { id: data.parent_id }
      });
      if (parent) {
        level = parent.level + 1;
      }
    }

    return await prisma.wBSNode.create({
      data: {
        ...data,
        level
      }
    });
  }

  static async getWBSByProject(project_id: number) {
    return await prisma.wBSNode.findMany({
      where: { project_id },
      include: {
        children: true,
        tasks: true
      },
      orderBy: { code: 'asc' }
    });
  }

  static async getWBSTree(project_id: number) {
    const nodes = await prisma.wBSNode.findMany({
      where: { project_id },
      include: {
        tasks: true
      },
      orderBy: { level: 'asc' }
    });

    const nodeMap: any = {};
    const roots: any[] = [];

    nodes.forEach((node: any) => {
      nodeMap[node.id] = { ...node, children: [] };
    });

    nodes.forEach((node: any) => {
      if (node.parent_id && nodeMap[node.parent_id]) {
        nodeMap[node.parent_id].children.push(nodeMap[node.id]);
      } else {
        roots.push(nodeMap[node.id]);
      }
    });

    return roots;
  }

  // ==========================
  // TASKS
  // ==========================

  static async createTask(data: {
    project_id: number;
    wbs_id?: number;
    title: string;
    status: string;
    progress: number;
    tenant_id: number;
    planned_start?: Date;
    planned_end?: Date;
    created_by?: number;
  }) {
    return await prisma.task.create({
      data
    });
  }

  static async updateTask(id: number, data: any) {
    // If status is changing to IN_PROGRESS or DONE, check dependencies
    if (data.status && data.status !== 'TODO') {
      const canStart = await this.canStartTask(id);
      if (!canStart) {
        throw new Error("Cannot start or complete task: Pending dependencies.");
      }
    }

    return await prisma.task.update({
      where: { id },
      data
    });
  }

  static async getTasksByProject(project_id: number) {
    return await prisma.task.findMany({
      where: { project_id },
      include: {
        dependencies: {
          include: {
            dependsOn: true
          }
        }
      }
    });
  }

  // ==========================
  // DEPENDENCIES
  // ==========================

  static async createTaskDependency(task_id: number, depends_on_id: number) {
    if (task_id === depends_on_id) {
      throw new Error("A task cannot depend on itself.");
    }

    // Check for cycles
    const hasCycle = await this.checkCycle(task_id, depends_on_id);
    if (hasCycle) {
      throw new Error("Cyclic dependency detected.");
    }

    return await prisma.taskDependency.create({
      data: {
        task_id,
        depends_on_id
      }
    });
  }

  static async checkCycle(taskId: number, dependsOnId: number): Promise<boolean> {
    // BFS or DFS to see if taskId is reachable from dependsOnId
    const queue = [dependsOnId];
    const visited = new Set<number>();

    while (queue.length > 0) {
      const currentId = queue.shift()!;
      if (currentId === taskId) return true;

      visited.add(currentId);

      const deps = await prisma.taskDependency.findMany({
        where: { task_id: currentId }
      });

      for (const dep of deps) {
        if (!visited.has(dep.depends_on_id)) {
          queue.push(dep.depends_on_id);
        }
      }
    }

    return false;
  }

  static async canStartTask(taskId: number): Promise<boolean> {
    const dependencies = await prisma.taskDependency.findMany({
      where: { task_id: taskId },
      include: {
        dependsOn: true
      }
    });

    for (const dep of dependencies) {
      if (dep.dependsOn.status !== 'DONE') {
        return false;
      }
    }

    return true;
  }
}
