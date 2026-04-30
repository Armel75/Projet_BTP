import { prisma } from '../config/prisma.js';
export class ProjectManagementService {
    // ==========================
    // PROJECTS
    // ==========================
    static async createProject(data) {
        return await prisma.project.create({
            data
        });
    }
    static async getProjectById(id) {
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
    static async createProjectLot(data) {
        return await prisma.projectLot.create({
            data
        });
    }
    static async getLotsByProject(project_id) {
        return await prisma.projectLot.findMany({
            where: { project_id }
        });
    }
    static async deleteProjectLot(id) {
        return await prisma.projectLot.delete({
            where: { id }
        });
    }
    static async createWBSNode(data) {
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
    static async getWBSByProject(project_id) {
        return await prisma.wBSNode.findMany({
            where: { project_id },
            include: {
                children: true,
                tasks: true
            },
            orderBy: { code: 'asc' }
        });
    }
    static async getWBSTree(project_id) {
        const nodes = await prisma.wBSNode.findMany({
            where: { project_id },
            include: {
                tasks: true
            },
            orderBy: { level: 'asc' }
        });
        const nodeMap = {};
        const roots = [];
        nodes.forEach((node) => {
            nodeMap[node.id] = { ...node, children: [] };
        });
        nodes.forEach((node) => {
            if (node.parent_id && nodeMap[node.parent_id]) {
                nodeMap[node.parent_id].children.push(nodeMap[node.id]);
            }
            else {
                roots.push(nodeMap[node.id]);
            }
        });
        return roots;
    }
    // ==========================
    // TASKS
    // ==========================
    static async createTask(data) {
        return await prisma.task.create({
            data
        });
    }
    static async updateTask(id, data) {
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
    static async getTasksByProject(project_id) {
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
    static async createTaskDependency(task_id, depends_on_id) {
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
    static async checkCycle(taskId, dependsOnId) {
        // BFS or DFS to see if taskId is reachable from dependsOnId
        const queue = [dependsOnId];
        const visited = new Set();
        while (queue.length > 0) {
            const currentId = queue.shift();
            if (currentId === taskId)
                return true;
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
    static async canStartTask(taskId) {
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
