import { prisma } from '../config/prisma.js';
import { Prisma } from '@prisma/client';
import { buildProjectScopeWhere } from '../utils/projectFilterUtils.js';

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
  moe_firm_name?: string | null;
  control_bureau?: string | null;
  client_name?: string | null;
  client_contact_name?: string | null;
  client_phone?: string | null;
  street_address?: string | null;
  postal_code?: string | null;
  city?: string | null;
  country?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  budget_approved?: number | null;
  budget_committed?: number | null;
  contingency_budget?: number | null;
  hse_responsible_id?: number | null;
  permit_number?: string | null;
  permit_type?: string | null;
  risk_classification?: string | null;
  building_type?: string | null;
  erp_project_id?: string | null;
  is_archived?: boolean;
  /** Document principal — créé atomiquement avec le projet */
  doc_name: string;
  doc_category?: string;
  doc_description?: string | null;
}

export interface UpdateProjectInput {
  title?: string;
  status?: string;
  phase?: string;
  start_date?: string | null;
  end_date?: string | null;
  budget_initial?: number;
  currency?: string;
  location?: string;
  moe_firm_name?: string | null;
  control_bureau?: string | null;
  client_name?: string | null;
  client_contact_name?: string | null;
  client_phone?: string | null;
  street_address?: string | null;
  postal_code?: string | null;
  city?: string | null;
  country?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  budget_approved?: number | null;
  budget_committed?: number | null;
  contingency_budget?: number | null;
  hse_responsible_id?: number | null;
  permit_number?: string | null;
  permit_type?: string | null;
  risk_classification?: string | null;
  building_type?: string | null;
  erp_project_id?: string | null;
  is_archived?: boolean;
}

export interface CreateLotInput {
  project_id:       number;
  name:             string;
  lot_number?:      string;   // Numéro officiel du lot : auto si non fourni
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
  lot_id: number;
  wbs_id?: number | null;
  title: string;
  description?: string | null;
  status: string;
  priority?: string;
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

interface ListProjectsCursorOptions {
  after?: number;
  before?: number;
}

interface CursorPaginationMeta {
  mode: "cursor";
  limit: number;
  total: number;
  pages: number;
  nextCursor: string | null;
  prevCursor: string | null;
  hasNext: boolean;
  hasPrev: boolean;
}

// ─── Includes / Selects ────────────────────────────────────────────────────────

const PROJECT_LIST_SELECT = {
  id: true, code: true, title: true, status: true, phase: true,
  location: true, start_date: true, end_date: true,
  budget_initial: true, currency: true, tenant_id: true,
  client_name: true, city: true, country: true,
  building_type: true, permit_type: true,
  created_by: true, document_id: true,
  createdBy: { select: { id: true, firstname: true, lastname: true } },
  document:  { select: { id: true, name: true, category: true } },
  _count: { select: { lots: true, tasks: true, wbs: true, budgetLines: true } },
} as const;

const PROJECT_DETAIL_INCLUDE = {
  createdBy: { select: { id: true, firstname: true, lastname: true } },
  document:  { select: { id: true, name: true, category: true, description: true } },
  projectManager: { select: { id: true, firstname: true, lastname: true } },
  hseResponsible: { select: { id: true, firstname: true, lastname: true } },
  lots:        { orderBy: { id: 'asc' as const } },
  budgetLines: {
    include: { supplier: { select: { id: true, name: true } } },
    orderBy: { id: 'asc' as const },
  },
  _count: {
    select: { tasks: true, lots: true, incidents: true, contracts: true, invoices: true },
  },
} as const;

const PROJECT_PHASE_GUARDS = {
  wbs: {
    allowedPhases: ['ETUDE', 'PREPARATION'],
    reason: 'Le WBS est modifiable uniquement pendant les phases Étude et Préparation.',
  },
  lots: {
    allowedPhases: ['ETUDE', 'PREPARATION'],
    reason: 'Les lots sont modifiables uniquement pendant les phases Étude et Préparation.',
  },
  budget: {
    allowedPhases: ['PREPARATION', 'EXECUTION'],
    reason: 'Les lignes budgétaires sont modifiables uniquement pendant les phases Préparation et Exécution.',
  },
  tasks: {
    allowedPhases: ['PREPARATION', 'EXECUTION'],
    reason: 'Les tâches sont modifiables uniquement pendant les phases Préparation et Exécution.',
  },
  dependencies: {
    allowedPhases: ['PREPARATION', 'EXECUTION'],
    reason: 'Les dépendances de tâches sont modifiables uniquement pendant les phases Préparation et Exécution.',
  },
} as const;

const PROJECT_PHASE_SEQUENCE = ['ETUDE', 'PREPARATION', 'EXECUTION', 'RECEPTION', 'CLOTURE'] as const;

type WorkflowRequirement = {
  code: string;
  label: string;
  satisfied: boolean;
};

// ─── ProjectManagementService ─────────────────────────────────────────────────

export class ProjectManagementService {

  private static async generateNextLotNumber(project_id: number, tenant_id: number) {
    const lots: Array<{ lot_number: string }> = await prisma.projectLot.findMany({
      where: { project_id, tenant_id },
      select: { lot_number: true },
    });

    const existing = new Set(lots.map((l: { lot_number: string }) => l.lot_number));
    const numericNumbers = lots
      .map((l: { lot_number: string }) => {
        const value = String(l.lot_number ?? '').trim();
        if (!/^\d+$/.test(value)) return null;
        return Number.parseInt(value, 10);
      })
      .filter((n: number | null): n is number => n !== null && Number.isFinite(n));

    let next = numericNumbers.length > 0 ? Math.max(...numericNumbers) + 1 : 1;
    let candidate = String(next).padStart(2, '0');

    while (existing.has(candidate)) {
      next += 1;
      candidate = String(next).padStart(2, '0');
    }

    return candidate;
  }

  private static assertProjectPhaseAllowed(
    phase: string | null | undefined,
    allowedPhases: readonly string[],
    reason: string,
  ) {
    if (!phase) return;
    if (!allowedPhases.includes(phase)) {
      throw new Error(reason);
    }
  }

  private static async buildProjectWorkflowSummary(project: {
    id: number;
    tenant_id: number;
    phase?: string | null;
    document_id?: number | null;
    _count?: { lots?: number | null; tasks?: number | null } | null;
  }) {
    const [lotCount, taskCount, wbsCount, budgetLineCount, completedTaskCount, workAcceptanceCount] = await Promise.all([
      prisma.projectLot.count({ where: { project_id: project.id, tenant_id: project.tenant_id } }),
      prisma.task.count({ where: { project_id: project.id, tenant_id: project.tenant_id } }),
      prisma.wBSNode.count({ where: { project_id: project.id, tenant_id: project.tenant_id } }),
      prisma.budgetLine.count({ where: { project_id: project.id, tenant_id: project.tenant_id } }),
      prisma.task.count({
        where: {
          project_id: project.id,
          tenant_id: project.tenant_id,
          status: { in: ['DONE', 'COMPLETED'] },
        },
      }),
      prisma.workAcceptance.count({ where: { project_id: project.id, tenant_id: project.tenant_id } }),
    ]);

    const currentPhase = project.phase ?? 'PREPARATION';
    const currentPhaseIndex = PROJECT_PHASE_SEQUENCE.indexOf(currentPhase as (typeof PROJECT_PHASE_SEQUENCE)[number]);
    const nextPhase = currentPhaseIndex >= 0 && currentPhaseIndex < PROJECT_PHASE_SEQUENCE.length - 1
      ? PROJECT_PHASE_SEQUENCE[currentPhaseIndex + 1]
      : null;

    let requirements: WorkflowRequirement[] = [];
    if (currentPhase === 'ETUDE') {
      requirements = [
        { code: 'main-document', label: 'Document principal créé', satisfied: Boolean(project.document_id) },
        { code: 'lots', label: 'Au moins un lot structuré', satisfied: lotCount > 0 },
        { code: 'wbs', label: 'Au moins un nœud WBS structurant', satisfied: wbsCount > 0 },
      ];
    } else if (currentPhase === 'PREPARATION') {
      requirements = [
        { code: 'lots', label: 'Au moins un lot structuré', satisfied: lotCount > 0 },
        { code: 'tasks', label: 'Au moins une tâche planifiée', satisfied: taskCount > 0 },
        // Règle temporairement désactivée: on ne bloque plus l'avancement tant que le cadrage des lignes budgétaires n'est pas finalisé.
        // { code: 'budget-lines', label: 'Au moins une ligne budgétaire définie', satisfied: budgetLineCount > 0 },
      ];
    } else if (currentPhase === 'EXECUTION') {
      requirements = [
        { code: 'tasks-exist', label: 'Des tâches d’exécution existent', satisfied: taskCount > 0 },
        { code: 'tasks-completed', label: 'Toutes les tâches sont terminées', satisfied: taskCount > 0 && completedTaskCount === taskCount },
      ];
    } else if (currentPhase === 'RECEPTION') {
      requirements = [
        { code: 'work-acceptance', label: 'Au moins une réception est enregistrée', satisfied: workAcceptanceCount > 0 },
      ];
    }

    const completedRequirements = requirements.filter((item) => item.satisfied).length;
    const canAdvance = Boolean(nextPhase) && requirements.every((item) => item.satisfied);
    const blockingRequirements = requirements.filter((item) => !item.satisfied).map((item) => item.label);

    return {
      currentPhase,
      nextPhase,
      canAdvance,
      phaseSequence: [...PROJECT_PHASE_SEQUENCE],
      progress: {
        completed: completedRequirements,
        total: requirements.length,
      },
      requirements,
      blockingRequirements,
      metrics: {
        lots: lotCount,
        wbs: wbsCount,
        tasks: taskCount,
        completedTasks: completedTaskCount,
        budgetLines: budgetLineCount,
        workAcceptances: workAcceptanceCount,
      },
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PROJECTS
  // ═══════════════════════════════════════════════════════════════════════════

  static async listProjects(
    tenant_id: number,
    page = 1,
    limit = 20,
    userId?: number,
    canReadAll = true,
    cursorOptions?: ListProjectsCursorOptions
  ) {
    const after = cursorOptions?.after;
    const before = cursorOptions?.before;
    const scopeFilter = userId !== undefined
      ? buildProjectScopeWhere(userId, canReadAll)
      : null;
    const where: any = { tenant_id };
    if (scopeFilter) {
      where.AND = [scopeFilter];
    }

    // Cursor mode: keyset pagination to avoid SQL Server OFFSET drift.
    if (typeof after === 'number' || typeof before === 'number') {
      const cursorWhere: any = { ...where };
      const andClauses = Array.isArray(cursorWhere.AND) ? [...cursorWhere.AND] : [];

      if (typeof after === 'number') {
        andClauses.push({ id: { lt: after } });
      }
      if (typeof before === 'number') {
        andClauses.push({ id: { gt: before } });
      }
      if (andClauses.length > 0) {
        cursorWhere.AND = andClauses;
      }

      const [total, rows] = await Promise.all([
        prisma.project.count({ where }),
        prisma.project.findMany({
          where: cursorWhere,
          select: PROJECT_LIST_SELECT as any,
          take: limit + 1,
          orderBy: { id: typeof before === 'number' ? 'asc' : 'desc' },
        }),
      ]);

      const hasExtra = rows.length > limit;
      const sliced = hasExtra ? rows.slice(0, limit) : rows;
      const normalized = typeof before === 'number' ? [...sliced].reverse() : sliced;

      let hasPrev = false;
      let hasNext = false;

      if (normalized.length > 0) {
        const firstId = normalized[0]?.id;
        const lastId = normalized[normalized.length - 1]?.id;

        const [newer, older] = await Promise.all([
          typeof firstId === 'number'
            ? prisma.project.findFirst({
                where: {
                  ...(where as Record<string, unknown>),
                  id: { gt: firstId },
                },
                select: { id: true },
                orderBy: { id: 'asc' },
              })
            : Promise.resolve(null),
          typeof lastId === 'number'
            ? prisma.project.findFirst({
                where: {
                  ...(where as Record<string, unknown>),
                  id: { lt: lastId },
                },
                select: { id: true },
                orderBy: { id: 'desc' },
              })
            : Promise.resolve(null),
        ]);

        hasPrev = Boolean(newer);
        hasNext = Boolean(older);
      }

      const nextCursor = hasNext && normalized.length > 0
        ? String(normalized[normalized.length - 1]?.id ?? '')
        : null;
      const prevCursor = hasPrev && normalized.length > 0
        ? String(normalized[0]?.id ?? '')
        : null;

      const cursorPagination: CursorPaginationMeta = {
        mode: 'cursor',
        limit,
        total,
        pages: Math.ceil(total / limit),
        nextCursor: nextCursor && nextCursor.length > 0 ? nextCursor : null,
        prevCursor: prevCursor && prevCursor.length > 0 ? prevCursor : null,
        hasNext,
        hasPrev,
      };

      return { data: normalized, pagination: cursorPagination };
    }

    const skip = (page - 1) * limit;
    const [total, projects] = await Promise.all([
      prisma.project.count({ where }),
      prisma.project.findMany({
        where,
        select:  PROJECT_LIST_SELECT as any,
        skip,
        take:    limit,
        orderBy: { id: 'desc' },
      }),
    ]);
    return { data: projects, pagination: { page, limit, total, pages: Math.ceil(total / limit) } };
  }

  static async getProjectById(id: number, tenant_id?: number) {
    const project = await prisma.project.findFirst({
      where:   { id, ...(tenant_id ? { tenant_id } : {}) },
      include: PROJECT_DETAIL_INCLUDE as any,
    });
    if (!project) return null;

    const workflow = await this.buildProjectWorkflowSummary({
      id: project.id,
      tenant_id: project.tenant_id,
      phase: project.phase,
      document_id: project.document_id,
      _count: project._count,
    });

    return { ...project, workflow };
  }

  static async getProjectPhaseTransitions(project_id: number, tenant_id?: number) {
    const project = await prisma.project.findFirst({
      where: { id: project_id, ...(tenant_id ? { tenant_id } : {}) },
      select: { id: true },
    });
    if (!project) throw new Error('Projet introuvable.');

    return prisma.projectPhaseTransition.findMany({
      where: { project_id, ...(tenant_id ? { tenant_id } : {}) },
      include: {
        changedBy: {
          select: { id: true, firstname: true, lastname: true, email: true },
        },
      },
      orderBy: [{ changed_at: 'desc' }, { id: 'desc' }],
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PROJECT ACCESS CONTROL
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Vérifie si un utilisateur a accès à un projet spécifique (sans permission globale).
   * Retourne true si l'utilisateur est : créateur | chef de projet | responsable HSE | membre.
   */
  static async canUserAccessProject(projectId: number, userId: number, tenantId: number): Promise<boolean> {
    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        tenant_id: tenantId,
        OR: [
          { created_by: userId },
          { project_manager_id: userId },
          { hse_responsible_id: userId },
          { userRoles: { some: { user_id: userId } } },
        ],
      },
      select: { id: true },
    });
    return project !== null;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CHEF DE PROJET & MEMBRES
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Assigne ou retire le chef de projet (project_manager_id).
   * managerId = null → retire le chef de projet.
   */
  static async assignProjectManager(
    projectId: number,
    managerId: number | null,
    tenantId: number,
  ) {
    const project = await prisma.project.findFirst({
      where: { id: projectId, tenant_id: tenantId },
      select: { id: true },
    });
    if (!project) throw new Error('Projet introuvable.');

    if (managerId !== null) {
      const user = await prisma.user.findFirst({
        where: { id: managerId, tenant_id: tenantId },
        select: { id: true },
      });
      if (!user) throw new Error('Utilisateur introuvable ou hors périmètre.');
    }

    return prisma.project.update({
      where: { id: projectId },
      data: { project_manager_id: managerId },
      select: {
        id: true,
        project_manager_id: true,
        projectManager: { select: { id: true, firstname: true, lastname: true, email: true } },
      },
    });
  }

  /**
   * Retourne tous les membres d'un projet (UserRole scoped à ce projet).
   */
  static async listProjectMembers(projectId: number, tenantId: number) {
    const project = await prisma.project.findFirst({
      where: { id: projectId, tenant_id: tenantId },
      select: { id: true },
    });
    if (!project) throw new Error('Projet introuvable.');

    return prisma.userRole.findMany({
      where: { project_id: projectId },
      include: {
        user: { select: { id: true, firstname: true, lastname: true, email: true, matricule: true } },
        role: { select: { id: true, code: true, name: true } },
      },
      orderBy: { id: 'asc' },
    });
  }

  /**
   * Ajoute un membre à un projet en créant un UserRole project-scoped.
   * Idempotent : si l'assignation existe déjà, la retourne sans erreur.
   */
  static async addProjectMember(
    projectId: number,
    userId: number,
    roleId: number,
    tenantId: number,
  ) {
    const [project, user, role] = await Promise.all([
      prisma.project.findFirst({ where: { id: projectId, tenant_id: tenantId }, select: { id: true } }),
      prisma.user.findFirst({ where: { id: userId, tenant_id: tenantId }, select: { id: true } }),
      prisma.role.findUnique({ where: { id: roleId }, select: { id: true } }),
    ]);
    if (!project) throw new Error('Projet introuvable.');
    if (!user) throw new Error('Utilisateur introuvable ou hors périmètre.');
    if (!role) throw new Error('Rôle introuvable.');

    const existing = await prisma.userRole.findFirst({
      where: { user_id: userId, role_id: roleId, project_id: projectId },
      include: {
        user: { select: { id: true, firstname: true, lastname: true, email: true } },
        role: { select: { id: true, code: true, name: true } },
      },
    });
    if (existing) return existing;

    return prisma.userRole.create({
      data: { user_id: userId, role_id: roleId, project_id: projectId, tenant_id: tenantId },
      include: {
        user: { select: { id: true, firstname: true, lastname: true, email: true } },
        role: { select: { id: true, code: true, name: true } },
      },
    });
  }

  /**
   * Retire un membre d'un projet en supprimant le UserRole project-scoped.
   * Vérifie que le UserRole appartient bien à ce projet/tenant avant suppression.
   */
  static async removeProjectMember(
    userRoleId: number,
    projectId: number,
    tenantId: number,
  ) {
    const userRole = await prisma.userRole.findFirst({
      where: {
        id: userRoleId,
        project_id: projectId,
        project: { tenant_id: tenantId },
      },
      select: { id: true },
    });
    if (!userRole) throw new Error('Affectation introuvable.');

    await prisma.userRole.delete({ where: { id: userRoleId } });
    return { success: true };
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
      moe_firm_name, control_bureau,
      client_name, client_contact_name, client_phone,
      street_address, postal_code, city, country,
      latitude, longitude,
      budget_approved, budget_committed, contingency_budget,
      hse_responsible_id,
      permit_number, permit_type, risk_classification,
      building_type, erp_project_id, is_archived,
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
              moe_firm_name: moe_firm_name ?? null,
              control_bureau: control_bureau ?? null,
              client_name: client_name ?? null,
              client_contact_name: client_contact_name ?? null,
              client_phone: client_phone ?? null,
              street_address: street_address ?? null,
              postal_code: postal_code ?? null,
              city: city ?? null,
              country: country ?? undefined,
              latitude: latitude ?? null,
              longitude: longitude ?? null,
              budget_approved: budget_approved ?? null,
              budget_committed: budget_committed ?? null,
              contingency_budget: contingency_budget ?? null,
              hse_responsible_id: hse_responsible_id ?? null,
              permit_number: permit_number ?? null,
              permit_type: permit_type ?? null,
              risk_classification: risk_classification ?? null,
              building_type: building_type ?? null,
              erp_project_id: erp_project_id ?? null,
              is_archived: is_archived ?? false,
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

  static async updateProject(id: number, data: UpdateProjectInput, tenant_id?: number, changed_by?: number) {
    const project = await prisma.project.findFirst({
      where: { id, ...(tenant_id ? { tenant_id } : {}) },
      select: {
        id: true,
        tenant_id: true,
        phase: true,
        document_id: true,
        _count: { select: { tasks: true } },
      },
    });
    if (!project) throw new Error('Projet introuvable.');

    const hasNonPhaseUpdate = Object.entries(data).some(([key, value]) => key !== 'phase' && value !== undefined);

    if (project._count.tasks > 0 && hasNonPhaseUpdate) {
      throw new Error('Impossible de modifier ce projet : il contient déjà des tâches.');
    }

    if (data.phase !== undefined && data.phase !== project.phase) {
      const workflow = await this.buildProjectWorkflowSummary({
        id: project.id,
        tenant_id: project.tenant_id,
        phase: project.phase,
        document_id: project.document_id,
      });

      if (!workflow.nextPhase || data.phase !== workflow.nextPhase) {
        throw new Error(`Transition de phase invalide. Prochaine étape autorisée : ${workflow.nextPhase ?? 'aucune'}.`);
      }
      if (!workflow.canAdvance) {
        throw new Error(`Transition de phase bloquée : ${workflow.blockingRequirements.join(', ') || 'prérequis non satisfaits.'}`);
      }
    }

    return (prisma as any).$transaction(async (tx: any) => {
      const updated = await tx.project.update({
        where: { id },
        data: {
          ...(data.title          !== undefined && { title: data.title }),
          ...(data.status         !== undefined && { status: data.status }),
          ...(data.phase          !== undefined && { phase: data.phase }),
          ...(data.location       !== undefined && { location: data.location }),
          ...(data.currency       !== undefined && { currency: data.currency }),
          ...(data.budget_initial !== undefined && { budget_initial: Number(data.budget_initial) }),
          ...(data.moe_firm_name         !== undefined && { moe_firm_name: data.moe_firm_name }),
          ...(data.control_bureau        !== undefined && { control_bureau: data.control_bureau }),
          ...(data.start_date     !== undefined && { start_date: data.start_date ? new Date(data.start_date) : null }),
          ...(data.end_date       !== undefined && { end_date: data.end_date ? new Date(data.end_date) : null }),
          ...(data.client_name           !== undefined && { client_name: data.client_name }),
          ...(data.client_contact_name   !== undefined && { client_contact_name: data.client_contact_name }),
          ...(data.client_phone          !== undefined && { client_phone: data.client_phone }),
          ...(data.street_address        !== undefined && { street_address: data.street_address }),
          ...(data.postal_code           !== undefined && { postal_code: data.postal_code }),
          ...(data.city                  !== undefined && { city: data.city }),
          ...(data.country               !== undefined && { country: data.country }),
          ...(data.latitude              !== undefined && { latitude: data.latitude }),
          ...(data.longitude             !== undefined && { longitude: data.longitude }),
          ...(data.budget_approved       !== undefined && { budget_approved: data.budget_approved }),
          ...(data.budget_committed      !== undefined && { budget_committed: data.budget_committed }),
          ...(data.contingency_budget    !== undefined && { contingency_budget: data.contingency_budget }),
          ...(data.hse_responsible_id    !== undefined && { hse_responsible_id: data.hse_responsible_id }),
          ...(data.permit_number         !== undefined && { permit_number: data.permit_number }),
          ...(data.permit_type           !== undefined && { permit_type: data.permit_type }),
          ...(data.risk_classification   !== undefined && { risk_classification: data.risk_classification }),
          ...(data.building_type         !== undefined && { building_type: data.building_type }),
          ...(data.erp_project_id        !== undefined && { erp_project_id: data.erp_project_id }),
          ...(data.is_archived           !== undefined && { is_archived: data.is_archived }),
        },
        include: PROJECT_DETAIL_INCLUDE as any,
      });

      if (data.phase !== undefined && updated.phase !== project.phase) {
        await tx.projectPhaseTransition.create({
          data: {
            project_id: id,
            tenant_id: project.tenant_id,
            from_phase: project.phase,
            to_phase: updated.phase,
            changed_by: changed_by ?? null,
          },
        });
      }

      return updated;
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
    this.assertProjectPhaseAllowed(project.phase, PROJECT_PHASE_GUARDS.lots.allowedPhases, PROJECT_PHASE_GUARDS.lots.reason);

    const preparedData: CreateLotInput = {
      ...data,
      lot_number: data.lot_number?.trim() || undefined,
    };

    const hasExplicitLotNumber = Boolean(preparedData.lot_number);

    for (let attempt = 1; attempt <= 3; attempt += 1) {
      if (!preparedData.lot_number) {
        preparedData.lot_number = await this.generateNextLotNumber(data.project_id, data.tenant_id);
      }

      try {
        const lot = await prisma.projectLot.create({ data: preparedData as any });
        if (!lot) throw new Error('Échec de la création du lot (réponse inattendue du serveur).');
        return lot;
      } catch (error: any) {
        const isUniqueError = error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
        if (!isUniqueError) throw error;

        if (hasExplicitLotNumber) {
          throw new Error(`Le numéro de lot "${preparedData.lot_number}" existe déjà dans ce projet.`);
        }

        // En création automatique, on retente avec le prochain numéro.
        preparedData.lot_number = undefined;
      }
    }

    throw new Error('Impossible d’attribuer automatiquement un numéro de lot. Veuillez réessayer.');
  }

  static async updateProjectLot(id: number, data: {
    name?:             string;
    description?:      string | null;
    trade_code?:       string;
    status?:           string;
    schedule_status?:  string;
    budget_allocated?: number;
    progress?:         number;
    start_date?:       string | null;
    end_date?:         string | null;
    responsible_id?:   number | null;
    contractor_id?:    number | null;
    contract_id?:      number | null;
  }, tenant_id: number, changed_by?: number) {
    const lot = await prisma.projectLot.findFirst({
      where: { id, tenant_id },
      include: { project: { select: { phase: true } } },
    });
    if (!lot) throw new Error('Lot introuvable.');
    this.assertProjectPhaseAllowed(lot.project?.phase, PROJECT_PHASE_GUARDS.lots.allowedPhases, PROJECT_PHASE_GUARDS.lots.reason);

    const statusChanged         = data.status          !== undefined && data.status          !== (lot as any).status;
    const scheduleStatusChanged = data.schedule_status !== undefined && data.schedule_status !== (lot as any).schedule_status;

    const updated = await prisma.projectLot.update({ where: { id }, data });

    if (statusChanged || scheduleStatusChanged) {
      await prisma.lotStatusHistory.create({
        data: {
          lot_id:               id,
          tenant_id,
          from_status:          statusChanged         ? (lot as any).status          : null,
          to_status:            statusChanged         ? data.status!                 : (lot as any).status,
          from_schedule_status: scheduleStatusChanged ? (lot as any).schedule_status : null,
          to_schedule_status:   scheduleStatusChanged ? data.schedule_status!        : null,
          changed_by:           changed_by ?? null,
        },
      });
    }

    return updated;
  }

  static async getLotsByProject(project_id: number) {
    return prisma.projectLot.findMany({ where: { project_id }, orderBy: { id: 'asc' } });
  }

  static async deleteProjectLot(id: number, tenant_id: number) {
    const lot = await prisma.projectLot.findFirst({
      where: { id, tenant_id },
      include: {
        project: { select: { phase: true } },
        _count: { select: { tasks: true } },
      },
    });
    if (!lot) throw new Error('Lot introuvable.');
    this.assertProjectPhaseAllowed(lot.project?.phase, PROJECT_PHASE_GUARDS.lots.allowedPhases, PROJECT_PHASE_GUARDS.lots.reason);
    if ((lot as any)._count?.tasks > 0) {
      throw new Error('Impossible de supprimer un lot contenant des tâches. Supprimez ou déplacez les tâches d’abord.');
    }

    try {
      return await prisma.projectLot.delete({ where: { id } });
    } catch (error: any) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') {
        throw new Error('Impossible de supprimer ce lot car il est référencé par d’autres données (contrat, facture, réception, contrôle, etc.).');
      }
      throw error;
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // WBS
  // ═══════════════════════════════════════════════════════════════════════════

  static async createWBSNode(data: CreateWBSNodeInput) {
    const project = await prisma.project.findFirst({ where: { id: data.project_id, tenant_id: data.tenant_id } });
    if (!project) throw new Error('Projet introuvable.');
    this.assertProjectPhaseAllowed(project.phase, PROJECT_PHASE_GUARDS.wbs.allowedPhases, PROJECT_PHASE_GUARDS.wbs.reason);

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
    const node = await prisma.wBSNode.findFirst({
      where: { id, tenant_id },
      include: { project: { select: { phase: true } } },
    });
    if (!node) throw new Error('Nœud WBS introuvable.');
    this.assertProjectPhaseAllowed(node.project?.phase, PROJECT_PHASE_GUARDS.wbs.allowedPhases, PROJECT_PHASE_GUARDS.wbs.reason);
    return prisma.wBSNode.update({ where: { id }, data });
  }

  static async deleteWBSNode(id: number, tenant_id: number) {
    const node = await prisma.wBSNode.findFirst({
      where:  { id, tenant_id },
      select: { id: true, project: { select: { phase: true } }, _count: { select: { children: true, tasks: true } } },
    }) as any;
    if (!node) throw new Error('Nœud WBS introuvable.');
    this.assertProjectPhaseAllowed(node.project?.phase, PROJECT_PHASE_GUARDS.wbs.allowedPhases, PROJECT_PHASE_GUARDS.wbs.reason);
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
    this.assertProjectPhaseAllowed(project.phase, PROJECT_PHASE_GUARDS.tasks.allowedPhases, PROJECT_PHASE_GUARDS.tasks.reason);

    const lot = await prisma.projectLot.findFirst({
      where: { id: data.lot_id, project_id: data.project_id, tenant_id: data.tenant_id },
    });
    if (!lot) throw new Error('Lot introuvable dans ce projet.');

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
      include: {
        wbs: true,
        lot: { select: { id: true, lot_number: true, name: true, trade_code: true } },
        assignments: { include: { resource: true } },
      },
    });
  }

  static async updateTask(id: number, data: Partial<CreateTaskInput> & { schedule_status?: string }, tenant_id: number, changed_by?: number) {
    const task = await prisma.task.findFirst({
      where: { id, tenant_id },
      include: { project: { select: { id: true, phase: true } } },
    });
    if (!task) throw new Error('Tâche introuvable.');
    this.assertProjectPhaseAllowed(task.project?.phase, PROJECT_PHASE_GUARDS.tasks.allowedPhases, PROJECT_PHASE_GUARDS.tasks.reason);

    if (data.lot_id !== undefined) {
      const lot = await prisma.projectLot.findFirst({
        where: { id: data.lot_id, project_id: task.project.id, tenant_id },
      });
      if (!lot) throw new Error('Lot introuvable dans ce projet.');
    }

    if (data.wbs_id) {
      const wbs = await prisma.wBSNode.findFirst({ where: { id: data.wbs_id, project_id: task.project.id } });
      if (!wbs) throw new Error('Nœud WBS introuvable dans ce projet.');
    }

    if (data.status && !['TODO', 'PLANNING'].includes(data.status)) {
      const canStart = await this.canStartTask(id);
      if (!canStart) throw new Error('Dépendances non satisfaites : impossible de changer le statut.');
    }

    const statusChanged         = data.status          !== undefined && data.status          !== (task as any).status;
    const scheduleStatusChanged = data.schedule_status !== undefined && data.schedule_status !== (task as any).schedule_status;

    const updated = await prisma.task.update({
      where: { id },
      data: {
        ...data,
        planned_start: data.planned_start !== undefined ? (data.planned_start ? new Date(data.planned_start) : null) : undefined,
        planned_end:   data.planned_end   !== undefined ? (data.planned_end   ? new Date(data.planned_end)   : null) : undefined,
      },
      include: {
        wbs: true,
        lot: { select: { id: true, lot_number: true, name: true, trade_code: true } },
        assignments: { include: { resource: true } },
      },
    });

    if (statusChanged || scheduleStatusChanged) {
      await prisma.taskStatusHistory.create({
        data: {
          task_id:              id,
          tenant_id,
          from_status:          statusChanged         ? (task as any).status          : null,
          to_status:            statusChanged         ? data.status!                  : (task as any).status,
          from_schedule_status: scheduleStatusChanged ? (task as any).schedule_status : null,
          to_schedule_status:   scheduleStatusChanged ? data.schedule_status!         : null,
          changed_by:           changed_by ?? null,
        },
      });
    }

    return updated;
  }

  static async deleteTask(id: number, tenant_id: number) {
    const task = await prisma.task.findFirst({
      where:  { id, tenant_id },
      select: { id: true, project: { select: { phase: true } }, _count: { select: { assignments: true } } },
    }) as any;
    if (!task) throw new Error('Tâche introuvable.');
    this.assertProjectPhaseAllowed(task.project?.phase, PROJECT_PHASE_GUARDS.tasks.allowedPhases, PROJECT_PHASE_GUARDS.tasks.reason);
    if (task._count.assignments > 0) throw new Error('Impossible de supprimer une tâche avec des affectations.');
    return prisma.task.delete({ where: { id } });
  }

  static async getTasksByProject(project_id: number) {
    return prisma.task.findMany({
      where:   { project_id },
      include: {
        wbs:         { select: { id: true, code: true, name: true } },
        lot:         { select: { id: true, lot_number: true, name: true, trade_code: true } },
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
        project:     { select: { id: true, code: true, title: true, phase: true } },
        wbs:         { select: { id: true, code: true, name: true } },
        lot:         { select: { id: true, lot_number: true, name: true, trade_code: true } },
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
    this.assertProjectPhaseAllowed(project.phase, PROJECT_PHASE_GUARDS.budget.allowedPhases, PROJECT_PHASE_GUARDS.budget.reason);

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
    const line = await prisma.budgetLine.findFirst({
      where: { id, tenant_id },
      include: { project: { select: { phase: true } } },
    });
    if (!line) throw new Error('Ligne budgétaire introuvable.');
    this.assertProjectPhaseAllowed(line.project?.phase, PROJECT_PHASE_GUARDS.budget.allowedPhases, PROJECT_PHASE_GUARDS.budget.reason);
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
    const line = await prisma.budgetLine.findFirst({
      where: { id, tenant_id },
      include: { project: { select: { phase: true } } },
    });
    if (!line) throw new Error('Ligne budgétaire introuvable.');
    this.assertProjectPhaseAllowed(line.project?.phase, PROJECT_PHASE_GUARDS.budget.allowedPhases, PROJECT_PHASE_GUARDS.budget.reason);
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

  static async createTaskDependency(task_id: number, depends_on_id: number, tenant_id: number) {
    if (task_id === depends_on_id) throw new Error("Une tâche ne peut pas dépendre d'elle-même.");

    const [task, dependsOn] = await Promise.all([
      prisma.task.findFirst({ where: { id: task_id, tenant_id }, include: { project: { select: { phase: true } } } }),
      prisma.task.findFirst({ where: { id: depends_on_id, tenant_id }, include: { project: { select: { phase: true } } } }),
    ]);
    if (!task || !dependsOn) throw new Error('Tâche introuvable.');
    this.assertProjectPhaseAllowed(task.project?.phase, PROJECT_PHASE_GUARDS.dependencies.allowedPhases, PROJECT_PHASE_GUARDS.dependencies.reason);

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

  static async getAssignableRoles(tenant_id: number) {
    return prisma.role.findMany({
      where: {
        OR: [{ tenant_id: null }, { tenant_id }],
      },
      select: { id: true, code: true, name: true },
      orderBy: [{ code: 'asc' }, { name: 'asc' }],
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
