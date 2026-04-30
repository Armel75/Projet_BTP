import { prisma } from '../config/prisma.js';

// ─── Input Types ───────────────────────────────────────────────────────────────

export interface CreateProjectInput {
  title: string;
  status: string;
  tenant_id: number;
  created_by: number;
  start_date?: string | null;
  end_date?: string | null;
  budget_initial: number;
  currency: string;
  location: string;
  /** Document principal — créé atomiquement avec le projet */
  doc_name: string;
  doc_category?: string;
  doc_description?: string | null;
}

export interface UpdateProjectInput {
  title?: string;
  status?: string;
  start_date?: string | null;
  end_date?: string | null;
  budget_initial?: number;
  currency?: string;
  location?: string;
}

export interface CreateLotInput {
  project_id:       number;
  name:             string;
  lot_number:       string;   // Numéro officiel du lot : "01", "02", "A"...
  trade_code:       string;   // FK → TradeCategory.code
  description?:     string | null;
  tenant_id:        number;
  status?:          string;
  budget_allocated?: number;
  start_date?:      string | null;
  end_date?:        string | null;
  responsible_id?:  number | null;
  contractor_id?:   number | null;
  contract_id?:     number | null;
}

export interface CreateWBSNodeInput {
  project_id: number;
  parent_id?: number | null;
  tenant_id: number;
  code: string;
  name: string;
}

export interface CreateTaskInput {
  project_id: number;
  wbs_id?: number | null;
  title: string;
  status: string;
  progress: number;
  tenant_id: number;
  planned_start?: string | null;
  planned_end?: string | null;
  created_by?: number | null;
}

export interface CreateBudgetLineInput {
  project_id: number;
  wbs_id?: number | null;
  category: string;
  planned: number;
  currency: string;
  tenant_id: number;
  supplier_id?: number | null;
  actual?: number;
}

// ─── Includes / Selects ────────────────────────────────────────────────────────

const PROJECT_LIST_SELECT = {
  id: true, code: true, title: true, status: true,
  location: true, start_date: true, end_date: true,
  budget_initial: true, currency: true, tenant_id: true,
  created_by: true, document_id: true,
  createdBy: { select: { id: true, firstname: true, lastname: true } },
  document:  { select: { id: true, name: true, category: true } },
  _count: { select: { lots: true, tasks: true, wbs: true, budgetLines: true } },
} as const;

const PROJECT_DETAIL_INCLUDE = {
  createdBy: { select: { id: true, firstname: true, lastname: true } },
  document:  { select: { id: true, name: true, category: true, description: true } },
  lots:        { orderBy: { id: 'asc' as const } },
  budgetLines: {
    include: { supplier: { select: { id: true, name: true } } },
    orderBy: { id: 'asc' as const },
  },
  _count: {
    select: { tasks: true, lots: true, incidents: true, contracts: true, invoices: true },
  },
} as const;

// ─── ProjectManagementService ─────────────────────────────────────────────────

export class ProjectManagementService {

  // ═══════════════════════════════════════════════════════════════════════════
  // PROJECTS
  // ═══════════════════════════════════════════════════════════════════════════

  static async listProjects(tenant_id: number, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [total, projects] = await Promise.all([
      prisma.project.count({ where: { tenant_id } }),
      prisma.project.findMany({
        where:   { tenant_id },
        select:  PROJECT_LIST_SELECT as any,
        skip,
        take:    limit,
        orderBy: { id: 'desc' },
      }),
    ]);
    return { data: projects, pagination: { page, limit, total, pages: Math.ceil(total / limit) } };
  }

  static async getProjectById(id: number, tenant_id?: number) {
    return prisma.project.findFirst({
      where:   { id, ...(tenant_id ? { tenant_id } : {}) },
      include: PROJECT_DETAIL_INCLUDE as any,
    });
  }

  /**
   * Génère le prochain code projet au format PROJ-YYYY-NNN pour un tenant et une année donnés.
   *
   * Stratégie : MAX(code) LIKE 'PROJ-YYYY-%' + incrément.
   * Protection contre la concurrence :
   *   • UPDLOCK : upgrades shared lock → update lock, empêche les lectures concurrentes de la même plage
   *   • HOLDLOCK : maintient le verrou jusqu'à la fin de la transaction (= SERIALIZABLE pour cette requête)
   * → Toute transaction concurrente doit attendre notre COMMIT avant de lire MAX(code).
   * Filet de sécurité : contrainte @unique sur Project.code en base → retry en cas de P2002.
   */
  private static async generateProjectCode(tenant_id: number, year: number, tx: any): Promise<string> {
    const pattern = `PROJ-${year}-%`;
    const rows = await tx.$queryRaw<{ max_code: string | null }[]>`
      SELECT MAX(code) AS max_code
      FROM   [dbo].[Project] WITH (UPDLOCK, HOLDLOCK)
      WHERE  tenant_id = ${tenant_id}
      AND    code LIKE ${pattern}
    `;
    const maxCode = rows[0]?.max_code ?? null;
    let seq = 1;
    if (maxCode) {
      const n = parseInt(maxCode.split('-').at(-1) ?? '', 10);
      if (!isNaN(n)) seq = n + 1;
    }
    return `PROJ-${year}-${String(seq).padStart(3, '0')}`;
  }

  /**
   * Création atomique Projet + Document avec génération automatique du code.
   *
   * PROBLÈME CIRCULAIRE : Project.document_id → Document ; Document.project_id → Project
   * SOLUTION : DDL transactionnel SQL Server (NOCHECK / WITH CHECK CHECK CONSTRAINT)
   *
   * CONCURRENCE : generateProjectCode() utilise UPDLOCK+HOLDLOCK ; en dernier recours
   * la contrainte @unique sur Project.code déclenche un P2002 → retry automatique.
   */
  static async createProject(data: CreateProjectInput) {
    const {
      title, status, tenant_id, created_by,
      start_date, end_date, budget_initial, currency, location,
      doc_name, doc_category = 'PLAN', doc_description = null,
    } = data;

    const year = new Date().getFullYear();
    const MAX_RETRIES = 5;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        const result = await (prisma as any).$transaction(async (tx: any) => {
          // ── Génération du code (avec verrou exclusif sur la plage) ──────────
          const code = await ProjectManagementService.generateProjectCode(tenant_id, year, tx);

          // ── Étape 1 : Désactiver la contrainte FK Document → Project ────────
          await tx.$executeRaw`ALTER TABLE [dbo].[Document] NOCHECK CONSTRAINT [Document_project_id_fkey]`;

          // ── Étape 2 : Créer le Document (project_id = 0 = placeholder) ──────
          const doc = await tx.document.create({
            data: {
              project_id:  0,
              category:    doc_category,
              name:        doc_name,
              description: doc_description,
              is_archived: false,
              tenant_id,
            },
          });

          // ── Étape 3 : Créer le Project ──────────────────────────────────────
          const project = await tx.project.create({
            data: {
              code, title, status, tenant_id, created_by,
              document_id:    doc.id,
              start_date:     start_date ? new Date(start_date) : null,
              end_date:       end_date   ? new Date(end_date)   : null,
              budget_initial: Number(budget_initial),
              currency,
              location,
            },
          });

          // ── Étape 4 : Corriger le placeholder du Document ───────────────────
          await tx.document.update({
            where: { id: doc.id },
            data:  { project_id: project.id },
          });

          // ── Étape 5 : Réactiver + valider la contrainte ─────────────────────
          await tx.$executeRaw`ALTER TABLE [dbo].[Document] WITH CHECK CHECK CONSTRAINT [Document_project_id_fkey]`;

          return project;
        });

        return prisma.project.findFirst({
          where:   { id: result.id },
          include: PROJECT_DETAIL_INCLUDE as any,
        });

      } catch (err: any) {
        // P2002 = violation de contrainte unique → collision sur le code généré
        if (err?.code === 'P2002' && attempt < MAX_RETRIES) {
          console.warn(`[generateProjectCode] Collision sur le code PROJ-${year} (tentative ${attempt}/${MAX_RETRIES}) → nouvel essai`);
          continue;
        }
        throw err;
      }
    }

    throw new Error('[createProject] Impossible de générer un code projet unique après plusieurs tentatives.');
  }

  static async updateProject(id: number, data: UpdateProjectInput, tenant_id?: number) {
    const project = await prisma.project.findFirst({ where: { id, ...(tenant_id ? { tenant_id } : {}) } });
    if (!project) throw new Error('Projet introuvable.');

    return prisma.project.update({
      where: { id },
      data: {
        ...(data.title          !== undefined && { title: data.title }),
        ...(data.status         !== undefined && { status: data.status }),
        ...(data.location       !== undefined && { location: data.location }),
        ...(data.currency       !== undefined && { currency: data.currency }),
        ...(data.budget_initial !== undefined && { budget_initial: Number(data.budget_initial) }),
        ...(data.start_date     !== undefined && { start_date: data.start_date ? new Date(data.start_date) : null }),
        ...(data.end_date       !== undefined && { end_date: data.end_date ? new Date(data.end_date) : null }),
      },
      include: PROJECT_DETAIL_INCLUDE as any,
    });
  }

  static async deleteProject(id: number, tenant_id?: number) {
    const project = await prisma.project.findFirst({
      where:  { id, ...(tenant_id ? { tenant_id } : {}) },
      select: { id: true, code: true, _count: { select: { tasks: true, contracts: true, invoices: true, lots: true } } },
    }) as any;
    if (!project) throw new Error('Projet introuvable.');

    const hasChildren = (Object.values(project._count) as number[]).some(c => c > 0);
    if (hasChildren) {
      throw new Error('Impossible de supprimer ce projet : il contient des tâches, contrats, factures ou lots.');
    }

    await prisma.project.delete({ where: { id } });
    return { success: true, message: `Projet "${project.code}" supprimé.` };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PROJECT LOTS
  // ═══════════════════════════════════════════════════════════════════════════

  static async createProjectLot(data: CreateLotInput) {
    const project = await prisma.project.findFirst({ where: { id: data.project_id, tenant_id: data.tenant_id } });
    if (!project) throw new Error('Projet introuvable ou accès refusé.');
    const lot = await prisma.projectLot.create({ data });
    if (!lot) throw new Error('Échec de la création du lot (réponse inattendue du serveur).');
    return lot;
  }

  static async updateProjectLot(id: number, data: {
    name?:             string;
    description?:      string | null;
    lot_number?:       string;
    trade_code?:       string;
    status?:           string;
    budget_allocated?: number;
    progress?:         number;
    start_date?:       string | null;
    end_date?:         string | null;
    responsible_id?:   number | null;
    contractor_id?:    number | null;
    contract_id?:      number | null;
  }, tenant_id: number) {
    const lot = await prisma.projectLot.findFirst({ where: { id, tenant_id } });
    if (!lot) throw new Error('Lot introuvable.');
    return prisma.projectLot.update({ where: { id }, data });
  }

  static async getLotsByProject(project_id: number) {
    return prisma.projectLot.findMany({ where: { project_id }, orderBy: { id: 'asc' } });
  }

  static async deleteProjectLot(id: number) {
    return prisma.projectLot.delete({ where: { id } });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // WBS
  // ═══════════════════════════════════════════════════════════════════════════

  static async createWBSNode(data: CreateWBSNodeInput) {
    const project = await prisma.project.findFirst({ where: { id: data.project_id, tenant_id: data.tenant_id } });
    if (!project) throw new Error('Projet introuvable.');

    let level = 0;
    if (data.parent_id) {
      const parent = await prisma.wBSNode.findFirst({ where: { id: data.parent_id, project_id: data.project_id } }) as any;
      if (!parent) throw new Error('Nœud parent introuvable dans ce projet.');
      level = parent.level + 1;
    }

    const existing = await prisma.wBSNode.findFirst({ where: { code: data.code, project_id: data.project_id } });
    if (existing) throw new Error(`Le code WBS "${data.code}" existe déjà dans ce projet.`);

    return prisma.wBSNode.create({ data: { ...data, level } });
  }

  static async updateWBSNode(id: number, data: { name?: string; code?: string }, tenant_id: number) {
    const node = await prisma.wBSNode.findFirst({ where: { id, tenant_id } });
    if (!node) throw new Error('Nœud WBS introuvable.');
    return prisma.wBSNode.update({ where: { id }, data });
  }

  static async deleteWBSNode(id: number, tenant_id: number) {
    const node = await prisma.wBSNode.findFirst({
      where:  { id, tenant_id },
      select: { id: true, _count: { select: { children: true, tasks: true } } },
    }) as any;
    if (!node) throw new Error('Nœud WBS introuvable.');
    if (node._count.children > 0) throw new Error('Impossible de supprimer un nœud WBS avec des enfants.');
    if (node._count.tasks    > 0) throw new Error('Impossible de supprimer un nœud WBS avec des tâches associées.');
    return prisma.wBSNode.delete({ where: { id } });
  }

  static async getWBSTree(project_id: number) {
    const nodes = await prisma.wBSNode.findMany({
      where:   { project_id },
      include: { tasks: { select: { id: true, title: true, status: true, progress: true } } },
      orderBy: [{ level: 'asc' as const }, { code: 'asc' as const }],
    }) as any[];

    const map: Record<number, any> = {};
    const roots: any[] = [];

    for (const n of nodes) map[n.id] = { ...n, children: [] };
    for (const n of nodes) {
      if (n.parent_id && map[n.parent_id]) {
        map[n.parent_id].children.push(map[n.id]);
      } else {
        roots.push(map[n.id]);
      }
    }
    return roots;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // TASKS
  // ═══════════════════════════════════════════════════════════════════════════

  static async createTask(data: CreateTaskInput) {
    const project = await prisma.project.findFirst({ where: { id: data.project_id, tenant_id: data.tenant_id } });
    if (!project) throw new Error('Projet introuvable.');

    if (data.wbs_id) {
      const wbs = await prisma.wBSNode.findFirst({ where: { id: data.wbs_id, project_id: data.project_id } });
      if (!wbs) throw new Error('Nœud WBS introuvable dans ce projet.');
    }

    return prisma.task.create({
      data: {
        ...data,
        planned_start: data.planned_start ? new Date(data.planned_start) : null,
        planned_end:   data.planned_end   ? new Date(data.planned_end)   : null,
      },
      include: { wbs: true, assignments: { include: { resource: true } } },
    });
  }

  static async updateTask(id: number, data: Partial<CreateTaskInput>) {
    if (data.status && !['TODO', 'PLANNING'].includes(data.status)) {
      const canStart = await this.canStartTask(id);
      if (!canStart) throw new Error('Dépendances non satisfaites : impossible de changer le statut.');
    }
    return prisma.task.update({
      where: { id },
      data: {
        ...data,
        planned_start: data.planned_start !== undefined ? (data.planned_start ? new Date(data.planned_start) : null) : undefined,
        planned_end:   data.planned_end   !== undefined ? (data.planned_end   ? new Date(data.planned_end)   : null) : undefined,
      },
      include: { wbs: true, assignments: { include: { resource: true } } },
    });
  }

  static async deleteTask(id: number, tenant_id: number) {
    const task = await prisma.task.findFirst({
      where:  { id, tenant_id },
      select: { id: true, _count: { select: { assignments: true } } },
    }) as any;
    if (!task) throw new Error('Tâche introuvable.');
    if (task._count.assignments > 0) throw new Error('Impossible de supprimer une tâche avec des affectations.');
    return prisma.task.delete({ where: { id } });
  }

  static async getTasksByProject(project_id: number) {
    return prisma.task.findMany({
      where:   { project_id },
      include: {
        wbs:         { select: { id: true, code: true, name: true } },
        assignments: { include: { resource: { select: { id: true, name: true, type: { select: { code: true } } } } } },
        dependencies: { include: { dependsOn: { select: { id: true, title: true, status: true } } } },
      },
      orderBy: { planned_start: 'asc' },
    });
  }

  static async getAllTasksForTenant(tenant_id: number) {
    return prisma.task.findMany({
      where:   { tenant_id },
      include: {
        project:     { select: { id: true, code: true, title: true } },
        wbs:         { select: { id: true, code: true, name: true } },
        assignments: { include: { resource: { select: { id: true, name: true } } } },
      },
      orderBy: [{ status: 'asc' }, { planned_start: 'asc' }],
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // BUDGET LINES
  // ═══════════════════════════════════════════════════════════════════════════

  static async createBudgetLine(data: CreateBudgetLineInput) {
    const project = await prisma.project.findFirst({ where: { id: data.project_id, tenant_id: data.tenant_id } });
    if (!project) throw new Error('Projet introuvable.');

    if (data.wbs_id) {
      const wbs = await prisma.wBSNode.findFirst({ where: { id: data.wbs_id, project_id: data.project_id } });
      if (!wbs) throw new Error('Nœud WBS introuvable dans ce projet.');
    }

    if (data.supplier_id) {
      const supplier = await prisma.supplier.findFirst({ where: { id: data.supplier_id, tenant_id: data.tenant_id } });
      if (!supplier) throw new Error('Fournisseur introuvable.');
    }

    return prisma.budgetLine.create({
      data:    { ...data, actual: data.actual ?? 0 },
      include: {
        supplier: { select: { id: true, name: true } },
        wbs:      { select: { id: true, code: true, name: true } },
      },
    });
  }

  static async updateBudgetLine(id: number, data: Partial<CreateBudgetLineInput>, tenant_id: number) {
    const line = await prisma.budgetLine.findFirst({ where: { id, tenant_id } });
    if (!line) throw new Error('Ligne budgétaire introuvable.');
    return prisma.budgetLine.update({
      where:   { id },
      data,
      include: {
        supplier: { select: { id: true, name: true } },
        wbs:      { select: { id: true, code: true, name: true } },
      },
    });
  }

  static async deleteBudgetLine(id: number, tenant_id: number) {
    const line = await prisma.budgetLine.findFirst({ where: { id, tenant_id } });
    if (!line) throw new Error('Ligne budgétaire introuvable.');
    return prisma.budgetLine.delete({ where: { id } });
  }

  static async getBudgetLinesByProject(project_id: number) {
    return prisma.budgetLine.findMany({
      where:   { project_id },
      include: {
        supplier: { select: { id: true, name: true } },
        wbs:      { select: { id: true, code: true, name: true } },
      },
      orderBy: { category: 'asc' },
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // TASK DEPENDENCIES
  // ═══════════════════════════════════════════════════════════════════════════

  static async createTaskDependency(task_id: number, depends_on_id: number) {
    if (task_id === depends_on_id) throw new Error("Une tâche ne peut pas dépendre d'elle-même.");
    const hasCycle = await this.checkCycle(task_id, depends_on_id);
    if (hasCycle) throw new Error('Dépendance cyclique détectée.');
    return prisma.taskDependency.create({ data: { task_id, depends_on_id } });
  }

  static async canStartTask(taskId: number): Promise<boolean> {
    const deps = await prisma.taskDependency.findMany({
      where:   { task_id: taskId },
      include: { dependsOn: { select: { status: true } } },
    }) as any[];
    return deps.every((d: any) => ['DONE', 'COMPLETED'].includes(d.dependsOn.status));
  }

  static async checkCycle(taskId: number, dependsOnId: number): Promise<boolean> {
    const queue = [dependsOnId];
    const visited = new Set<number>();
    while (queue.length > 0) {
      const currentId = queue.shift()!;
      if (currentId === taskId) return true;
      if (visited.has(currentId)) continue;
      visited.add(currentId);
      const deps = await prisma.taskDependency.findMany({ where: { task_id: currentId } }) as any[];
      for (const dep of deps) queue.push(dep.depends_on_id);
    }
    return false;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // HELPERS — pour les selects des formulaires
  // ═══════════════════════════════════════════════════════════════════════════

  static async getUsersByTenant(tenant_id: number) {
    return prisma.user.findMany({
      where:  { tenant_id },
      select: { id: true, firstname: true, lastname: true, email: true },
    });
  }

  static async getSuppliersByTenant(tenant_id: number) {
    return prisma.supplier.findMany({
      where:  { tenant_id },
      select: { id: true, name: true },
    });
  }

  static async getTradeCategories() {
    return prisma.tradeCategory.findMany({
      orderBy: { order: 'asc' },
      select:  { code: true, label: true },
    });
  }

  static async getWBSByProject(project_id: number) {
    return prisma.wBSNode.findMany({
      where:   { project_id },
      select:  { id: true, code: true, name: true, level: true },
      orderBy: [{ level: 'asc' as const }, { code: 'asc' as const }],
    });
  }
}
