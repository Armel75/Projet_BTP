import { prisma } from "../config/prisma.js";

export type DashboardPersona = "operational" | "management" | "executive";

type Severity = "low" | "medium" | "high" | "critical";

type Kpi = {
  code: string;
  label: string;
  value: number;
  unit?: "count" | "currency" | "percent" | "days";
  format?: "integer" | "decimal";
  trend?: number;
};

type PriorityAction = {
  code: string;
  title: string;
  description: string;
  severity: Severity;
  metric: number;
  actionPath: string;
};

type ChartPoint = {
  label: string;
  value: number;
  secondary?: number;
};

type MaturityCriterionStatus = "not_met" | "partial" | "met";

type MaturityCriterion = {
  code: string;
  label: string;
  description: string;
  status: MaturityCriterionStatus;
  score: number;
  maxScore: number;
};

type MaturityDomain = {
  code: string;
  label: string;
  score: number;
  maxScore: number;
  criteria: MaturityCriterion[];
};

type MaturityLevel = "critical" | "progressing" | "advanced" | "top_1";

type MaturityGrid = {
  score: number;
  maxScore: number;
  percent: number;
  level: MaturityLevel;
  domains: MaturityDomain[];
};

type PersonaPayload = {
  persona: DashboardPersona;
  title: string;
  decisionFrequency: string;
  kpis: Kpi[];
  priorityActions: PriorityAction[];
  charts: {
    progressTrend: ChartPoint[];
    incidentsByType: ChartPoint[];
    cashFlow?: ChartPoint[];
    projectHealth?: ChartPoint[];
  };
};

export type DashboardOverviewPayload = {
  personas: DashboardPersona[];
  defaultPersona: DashboardPersona;
  filters: {
    windowDays: number;
    selectedProjectIds: number[];
    projects: Array<{ id: number; code: string; title: string; status: string }>;
  };
  dashboards: {
    operational?: PersonaPayload;
    management?: PersonaPayload;
    executive?: PersonaPayload;
  };
  maturity: MaturityGrid;
};

type BuildParams = {
  userId: number;
  permissions: string[];
  windowDays: number;
  requestedProjectIds: number[];
};

type GroupByStatusRow = {
  status: string;
  _count: { _all: number };
};

type GroupByTypeRow = {
  type: string;
  _count: { _all: number };
};

type WeeklyProgressRow = {
  week_start: Date;
  overall_progress: number;
};

type InvoiceLite = {
  amount: number;
  status: string;
  due_date: Date | null;
  project_id: number;
};

type PaymentLite = {
  amount: number;
  date: Date;
};

type ProjectHealthSource = {
  id: number;
  code: string;
  title: string;
  budget_approved: number | null;
  budget_spent: number | null;
  incidents: Array<{ severity: string; delay_impact_days: number | null }>;
  punchItems: Array<{ id: number }>;
  invoices: Array<{ amount: number; due_date: Date | null }>;
};

const OPEN_TASK_STATUSES = ["PLANNED", "OPEN", "IN_PROGRESS", "BLOCKED", "PENDING", "ASSIGNED"];
const OPEN_INCIDENT_STATUSES = ["OPEN", "IN_PROGRESS"];
const OPEN_PUNCH_STATUSES = ["OPEN", "IN_PROGRESS", "SUBMITTED", "REJECTED"];
const OPEN_INSPECTION_STATUSES = ["SCHEDULED", "IN_PROGRESS", "FAILED"];

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function monthLabel(date: Date): string {
  return date.toLocaleDateString("fr-FR", { month: "short", year: "2-digit" });
}

function clampWindowDays(raw: number): number {
  if (!Number.isFinite(raw)) return 30;
  return Math.max(7, Math.min(180, Math.trunc(raw)));
}

function criterionStatus(score: number, maxScore: number): MaturityCriterionStatus {
  if (maxScore <= 0 || score <= 0) return "not_met";
  if (score >= maxScore) return "met";
  return "partial";
}

function createCriterion(input: {
  code: string;
  label: string;
  description: string;
  score: number;
  maxScore?: number;
}): MaturityCriterion {
  const maxScore = input.maxScore ?? 10;
  const safeScore = Math.max(0, Math.min(maxScore, Math.trunc(input.score)));
  return {
    code: input.code,
    label: input.label,
    description: input.description,
    score: safeScore,
    maxScore,
    status: criterionStatus(safeScore, maxScore),
  };
}

function maturityLevelFromPercent(percent: number): MaturityLevel {
  if (percent >= 85) return "top_1";
  if (percent >= 65) return "advanced";
  if (percent >= 40) return "progressing";
  return "critical";
}

function buildMaturityGrid(input: {
  hasProjects: boolean;
  projectCount: number;
  windowDays: number;
  openTasks: number;
  overdueTasks: number;
  weeklyProgressCount: number;
  dailyLogsWindowCount: number;
  meetingsWindowCount: number;
  openIncidents: number;
  incidentsCritical: number;
  controlReportsOpen: number;
  budgetApproved: number;
  budgetBurnPct: number;
  overdueInvoices: number;
  changeOrdersPending: number;
  workAcceptancesPending: number;
  openPunchItems: number;
}): MaturityGrid {
  const overdueTaskRatio = input.openTasks > 0 ? input.overdueTasks / input.openTasks : 0;
  const reportingDensityTarget = Math.max(1, input.projectCount * Math.max(1, Math.floor(input.windowDays / 14)));

  const executionCriteria: MaturityCriterion[] = [
    createCriterion({
      code: "execution-overdue-tasks",
      label: "Retards taches",
      description: "Le volume de taches en retard reste sous controle.",
      score: overdueTaskRatio <= 0.15 ? 10 : overdueTaskRatio <= 0.3 ? 5 : 0,
    }),
    createCriterion({
      code: "execution-weekly-trend",
      label: "Suivi avancement",
      description: "Les rapports hebdomadaires alimentent la tendance d'avancement.",
      score: input.weeklyProgressCount >= Math.max(1, input.projectCount) ? 10 : input.weeklyProgressCount > 0 ? 5 : 0,
    }),
    createCriterion({
      code: "execution-daily-logs",
      label: "Discipline journal chantier",
      description: "Les journaux quotidiens sont suffisamment renseignes sur la periode.",
      score: input.dailyLogsWindowCount >= reportingDensityTarget ? 10 : input.dailyLogsWindowCount > 0 ? 5 : 0,
    }),
  ];

  const riskCriteria: MaturityCriterion[] = [
    createCriterion({
      code: "risk-critical-incidents",
      label: "Incidents critiques",
      description: "Aucun incident critique ouvert dans le portefeuille.",
      score: input.incidentsCritical === 0 ? 10 : input.incidentsCritical <= 2 ? 5 : 0,
    }),
    createCriterion({
      code: "risk-control-reports",
      label: "Rapports controle ouverts",
      description: "Les constats qualite/securite sont traites rapidement.",
      score: input.controlReportsOpen === 0 ? 10 : input.controlReportsOpen <= 5 ? 5 : 0,
    }),
    createCriterion({
      code: "risk-punch-items",
      label: "Reserves en attente",
      description: "Le stock de reserves ouvertes reste maitrise.",
      score: input.openPunchItems <= 5 ? 10 : input.openPunchItems <= 15 ? 5 : 0,
    }),
  ];

  const governanceCriteria: MaturityCriterion[] = [
    createCriterion({
      code: "governance-budget",
      label: "Maitrise budgetaire",
      description: "La consommation budgetaire reste dans une enveloppe soutenable.",
      score: input.budgetApproved <= 0 ? 0 : input.budgetBurnPct <= 100 ? 10 : input.budgetBurnPct <= 110 ? 5 : 0,
    }),
    createCriterion({
      code: "governance-cash",
      label: "Discipline encaissement",
      description: "Les factures en retard sont maintenues au minimum.",
      score: input.overdueInvoices === 0 ? 10 : input.overdueInvoices <= 3 ? 5 : 0,
    }),
    createCriterion({
      code: "governance-receptions",
      label: "Flux de reception",
      description: "Les receptions en attente sont debloquees sans accumulation.",
      score: input.workAcceptancesPending === 0 ? 10 : input.workAcceptancesPending <= 3 ? 5 : 0,
    }),
    createCriterion({
      code: "governance-arbitrage",
      label: "Arbitrage avenants",
      description: "Les avenants en attente restent limites pour proteger delai et cout.",
      score: input.changeOrdersPending === 0 ? 10 : input.changeOrdersPending <= 3 ? 5 : 0,
    }),
    createCriterion({
      code: "governance-rituals",
      label: "Rituels de pilotage",
      description: "Le portefeuille maintient un rythme de reunions de pilotage.",
      score: input.meetingsWindowCount >= Math.max(1, input.projectCount) ? 10 : input.meetingsWindowCount > 0 ? 5 : 0,
    }),
  ];

  const domains: MaturityDomain[] = [
    {
      code: "execution",
      label: "Execution terrain",
      score: executionCriteria.reduce((acc, item) => acc + item.score, 0),
      maxScore: executionCriteria.reduce((acc, item) => acc + item.maxScore, 0),
      criteria: executionCriteria,
    },
    {
      code: "risk",
      label: "Risque & conformite",
      score: riskCriteria.reduce((acc, item) => acc + item.score, 0),
      maxScore: riskCriteria.reduce((acc, item) => acc + item.maxScore, 0),
      criteria: riskCriteria,
    },
    {
      code: "governance",
      label: "Gouvernance projet",
      score: governanceCriteria.reduce((acc, item) => acc + item.score, 0),
      maxScore: governanceCriteria.reduce((acc, item) => acc + item.maxScore, 0),
      criteria: governanceCriteria,
    },
  ];

  const score = domains.reduce((acc, domain) => acc + domain.score, 0);
  const maxScore = domains.reduce((acc, domain) => acc + domain.maxScore, 0);
  const percent = maxScore > 0 ? Number(((score / maxScore) * 100).toFixed(1)) : 0;

  if (!input.hasProjects) {
    return {
      score: 0,
      maxScore,
      percent: 0,
      level: "critical",
      domains,
    };
  }

  return {
    score,
    maxScore,
    percent,
    level: maturityLevelFromPercent(percent),
    domains,
  };
}

function derivePersonas(permissions: string[]): DashboardPersona[] {
  const canExecutive = permissions.includes("invoice:approve") || permissions.includes("change-order:approve") || permissions.includes("tenant:read") || permissions.includes("report:validate");
  const canManagement =
    permissions.includes("project:update") ||
    permissions.includes("project:metadata:update") ||
    permissions.includes("project:team:update") ||
    permissions.includes("project:phase:transition") ||
    permissions.includes("budget:update") ||
    permissions.includes("contract:update") ||
    permissions.includes("change-order:update");
  const canOperational = permissions.includes("daily-log:create") || permissions.includes("incident:create") || permissions.includes("inspection:create") || permissions.includes("task:read");

  const personas: DashboardPersona[] = [];
  if (canOperational) personas.push("operational");
  if (canManagement) personas.push("management");
  if (canExecutive) personas.push("executive");

  if (personas.length === 0) {
    personas.push("operational");
  }

  return personas;
}

function chooseDefaultPersona(personas: DashboardPersona[]): DashboardPersona {
  if (personas.includes("executive")) return "executive";
  if (personas.includes("management")) return "management";
  return "operational";
}

async function resolveAccessibleProjects(userId: number, requestedProjectIds: number[]): Promise<number[]> {
  const scopedRoles: Array<{ project_id: number | null }> = await prisma.userRole.findMany({
    where: { user_id: userId, project_id: { not: null } },
    select: { project_id: true },
  });

  const scopedProjectIds = scopedRoles
    .map((r) => r.project_id)
    .filter((id): id is number => typeof id === "number");

  if (scopedProjectIds.length > 0) {
    if (requestedProjectIds.length === 0) return scopedProjectIds;
    return scopedProjectIds.filter((id) => requestedProjectIds.includes(id));
  }

  const tenantProjects: Array<{ id: number }> = await prisma.project.findMany({
    select: { id: true },
    where: { is_archived: false },
    orderBy: { id: "asc" },
  });
  const allIds = tenantProjects.map((p) => p.id);

  if (requestedProjectIds.length === 0) return allIds;
  return allIds.filter((id) => requestedProjectIds.includes(id));
}

export class DashboardService {
  static async buildOverview(params: BuildParams): Promise<DashboardOverviewPayload> {
    const windowDays = clampWindowDays(params.windowDays);
    const end = new Date();
    const start = startOfDay(addDays(end, -windowDays));

    const personas = derivePersonas(params.permissions);
    const defaultPersona = chooseDefaultPersona(personas);

    const selectedProjectIds = await resolveAccessibleProjects(params.userId, params.requestedProjectIds);

    const projects: Array<{ id: number; code: string; title: string; status: string }> = await prisma.project.findMany({
      where: {
        id: { in: selectedProjectIds.length > 0 ? selectedProjectIds : [-1] },
      },
      select: { id: true, code: true, title: true, status: true },
      orderBy: [{ status: "asc" }, { title: "asc" }],
    });

    const projectIds = projects.map((p) => p.id);
    const hasProjects = projectIds.length > 0;

    const safeProjectFilter = hasProjects ? { in: projectIds } : { in: [-1] };

    const [
      taskCounts,
      overdueTasks,
      incidentCounts,
      incidentByType,
      punchCounts,
      inspectionCounts,
      docsWindowCount,
      meetingsWindowCount,
      dailyLogsWindowCount,
      weeklyProgress,
      projectBudget,
      invoices,
      payments,
      changeOrdersPending,
      controlReportsOpen,
      workAcceptancesPending,
      projectsForHealth,
    ]: [
      GroupByStatusRow[],
      number,
      GroupByStatusRow[],
      GroupByTypeRow[],
      GroupByStatusRow[],
      GroupByStatusRow[],
      number,
      number,
      number,
      WeeklyProgressRow[],
      { _sum: { budget_approved: number | null; budget_spent: number | null; budget_committed: number | null }; _count: { id: number } },
      InvoiceLite[],
      PaymentLite[],
      number,
      number,
      number,
      ProjectHealthSource[],
    ] = await Promise.all([
      prisma.task.groupBy({
        by: ["status"],
        where: { project_id: safeProjectFilter },
        _count: { _all: true },
      }),
      prisma.task.count({
        where: {
          project_id: safeProjectFilter,
          planned_end: { lt: end },
          status: { in: OPEN_TASK_STATUSES },
        },
      }),
      prisma.incident.groupBy({
        by: ["status"],
        where: { project_id: safeProjectFilter },
        _count: { _all: true },
      }),
      prisma.incident.groupBy({
        by: ["type"],
        where: { project_id: safeProjectFilter, created_at: { gte: start } },
        _count: { _all: true },
      }),
      prisma.punchItem.groupBy({
        by: ["status"],
        where: { project_id: safeProjectFilter },
        _count: { _all: true },
      }),
      prisma.inspection.groupBy({
        by: ["status"],
        where: { project_id: safeProjectFilter },
        _count: { _all: true },
      }),
      prisma.document.count({
        where: { project_id: safeProjectFilter, updated_at: { gte: start } },
      }),
      prisma.meeting.count({
        where: { project_id: safeProjectFilter, date: { gte: start, lte: end } },
      }),
      prisma.dailyLog.count({
        where: { project_id: safeProjectFilter, date: { gte: start, lte: end } },
      }),
      prisma.weeklyReport.findMany({
        where: {
          project_id: safeProjectFilter,
          week_start: { gte: addDays(end, -56) },
          status: { not: 'DELETED' }
        },
        select: { week_start: true, overall_progress: true },
        orderBy: { week_start: "asc" },
      }),
      prisma.project.aggregate({
        where: { id: safeProjectFilter },
        _sum: { budget_approved: true, budget_spent: true, budget_committed: true },
        _count: { id: true },
      }),
      prisma.invoice.findMany({
        where: { project_id: safeProjectFilter, created_at: { gte: start } },
        select: { amount: true, status: true, due_date: true, project_id: true },
      }),
      prisma.payment.findMany({
        where: {
          invoice: { project_id: safeProjectFilter },
          date: { gte: addDays(end, -180) },
        },
        select: { amount: true, date: true },
      }),
      prisma.changeOrder.count({
        where: {
          project_id: safeProjectFilter,
          status: { in: ["DRAFT", "SUBMITTED", "PENDING_APPROVAL"] },
        },
      }),
      prisma.controlReport.count({
        where: {
          project_id: safeProjectFilter,
          is_archived: false,
          status: { in: ["OPEN", "UNDER_REVIEW", "ACTION_REQUIRED"] },
        },
      }),
      prisma.workAcceptance.count({
        where: {
          project_id: safeProjectFilter,
          status: { in: ["PENDING", "SCHEDULED", "IN_PROGRESS", "ACCEPTED_WITH_RESERVES"] },
        },
      }),
      prisma.project.findMany({
        where: { id: safeProjectFilter },
        select: {
          id: true,
          code: true,
          title: true,
          budget_approved: true,
          budget_spent: true,
          incidents: {
            where: { status: { in: OPEN_INCIDENT_STATUSES } },
            select: { severity: true, delay_impact_days: true },
          },
          punchItems: {
            where: { status: { in: OPEN_PUNCH_STATUSES } },
            select: { id: true },
          },
          invoices: {
            where: { status: { not: "PAID" } },
            select: { amount: true, due_date: true },
          },
        },
      }),
    ]);

    const openTasks = taskCounts
      .filter((s) => OPEN_TASK_STATUSES.includes(s.status))
      .reduce((acc, curr) => acc + curr._count._all, 0);

    const openIncidents = incidentCounts
      .filter((s) => OPEN_INCIDENT_STATUSES.includes(s.status))
      .reduce((acc, curr) => acc + curr._count._all, 0);

    const openPunchItems = punchCounts
      .filter((s) => OPEN_PUNCH_STATUSES.includes(s.status))
      .reduce((acc, curr) => acc + curr._count._all, 0);

    const scheduledInspections = inspectionCounts
      .filter((s) => OPEN_INSPECTION_STATUSES.includes(s.status))
      .reduce((acc, curr) => acc + curr._count._all, 0);

    const incidentsCritical = await prisma.incident.count({
      where: {
        project_id: safeProjectFilter,
        status: { in: OPEN_INCIDENT_STATUSES },
        severity: "CRITICAL",
      },
    });

    const weeklyBuckets = new Map<string, { total: number; count: number }>();
    for (const row of weeklyProgress) {
      const key = monthLabel(row.week_start);
      const current = weeklyBuckets.get(key) ?? { total: 0, count: 0 };
      current.total += row.overall_progress;
      current.count += 1;
      weeklyBuckets.set(key, current);
    }

    const progressTrend: ChartPoint[] = Array.from(weeklyBuckets.entries()).map(([label, v]) => ({
      label,
      value: Number((v.total / v.count).toFixed(1)),
    }));

    const incidentsByType: ChartPoint[] = incidentByType
      .map((row) => ({ label: row.type, value: row._count._all }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);

    const paidByMonth = new Map<string, number>();
    for (const p of payments) {
      const key = monthLabel(p.date);
      paidByMonth.set(key, (paidByMonth.get(key) ?? 0) + p.amount);
    }

    const invoicedByMonth = new Map<string, number>();
    for (const i of invoices) {
      const basis = i.due_date ?? end;
      const key = monthLabel(basis);
      invoicedByMonth.set(key, (invoicedByMonth.get(key) ?? 0) + i.amount);
    }

    const cashFlowLabels = Array.from(new Set([...paidByMonth.keys(), ...invoicedByMonth.keys()]));
    const cashFlow: ChartPoint[] = cashFlowLabels
      .map((label) => ({
        label,
        value: Number((invoicedByMonth.get(label) ?? 0).toFixed(2)),
        secondary: Number((paidByMonth.get(label) ?? 0).toFixed(2)),
      }))
      .slice(-6);

    const outstandingInvoicesAmount = invoices
      .filter((i) => i.status !== "PAID")
      .reduce((acc, i) => acc + i.amount, 0);

    const overdueInvoices = invoices.filter((i) => i.due_date && i.due_date < end && i.status !== "PAID").length;

    const avgTaskProgressRaw = await prisma.task.aggregate({
      where: { project_id: safeProjectFilter },
      _avg: { progress: true },
    });

    const avgTaskProgress = Number((avgTaskProgressRaw._avg.progress ?? 0).toFixed(1));
    const budgetApproved = projectBudget._sum.budget_approved ?? 0;
    const budgetSpent = projectBudget._sum.budget_spent ?? 0;
    const budgetCommitted = projectBudget._sum.budget_committed ?? 0;
    const budgetBurnPct = budgetApproved > 0 ? Number(((budgetSpent / budgetApproved) * 100).toFixed(1)) : 0;

    const projectHealth: ChartPoint[] = projectsForHealth
      .map((p) => {
        const critical = p.incidents.filter((i) => i.severity === "CRITICAL").length;
        const high = p.incidents.filter((i) => i.severity === "HIGH").length;
        const overdue = p.invoices.filter((i) => i.due_date && i.due_date < end).length;
        const punchOpen = p.punchItems.length;
        const score = critical * 35 + high * 20 + overdue * 15 + punchOpen * 5;
        return {
          label: p.code || p.title,
          value: score,
          secondary: Number((p.budget_spent ?? 0) - (p.budget_approved ?? 0)),
        };
      })
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);

    const opPriority: PriorityAction[] = [
      {
        code: "op-overdue-tasks",
        title: "Traiter les taches en retard",
        description: "Taches avec date planifiee depassee et encore ouvertes.",
        severity: overdueTasks > 0 ? "high" : "low",
        metric: overdueTasks,
        actionPath: "/tasks",
      },
      {
        code: "op-open-incidents",
        title: "Resoudre les incidents ouverts",
        description: "Incidents securite/qualite/delai encore en traitement.",
        severity: incidentsCritical > 0 ? "critical" : openIncidents > 0 ? "medium" : "low",
        metric: openIncidents,
        actionPath: "/incidents",
      },
      {
        code: "op-open-punch",
        title: "Fermer les réserves de la liste de contrôle",
        description: "Elements de reserve non verifies ou non clotures.",
        severity: openPunchItems > 10 ? "high" : "medium",
        metric: openPunchItems,
        actionPath: "/punch-list",
      },
    ];

    const mgmtPriority: PriorityAction[] = [
      {
        code: "mgmt-overdue-invoices",
        title: "Securiser les factures en retard",
        description: "Factures non reglees avec echeance depassee.",
        severity: overdueInvoices > 0 ? "high" : "low",
        metric: overdueInvoices,
        actionPath: "/finance",
      },
      {
        code: "mgmt-change-orders",
        title: "Arbitrer les avenants en attente",
        description: "Avenants a valider pour securiser le budget et le delai.",
        severity: changeOrdersPending > 0 ? "high" : "low",
        metric: changeOrdersPending,
        actionPath: "/finance",
      },
      {
        code: "mgmt-control-reports",
        title: "Traiter les rapports de controle ouverts",
        description: "Constats qualite/securite necessitant une action corrective.",
        severity: controlReportsOpen > 0 ? "medium" : "low",
        metric: controlReportsOpen,
        actionPath: "/reporting",
      },
    ];

    const execPriority: PriorityAction[] = [
      {
        code: "exec-risk-projects",
        title: "Prioriser les projets a risque",
        description: "Score de risque eleve combine incidents, reserves et echeances impayees.",
        severity: projectHealth.some((p) => p.value >= 50) ? "critical" : "medium",
        metric: projectHealth.filter((p) => p.value >= 50).length,
        actionPath: "/projects",
      },
      {
        code: "exec-cash-gap",
        title: "Reduire le gap de tresorerie",
        description: "Difference entre factures emises et paiements comptabilises.",
        severity: outstandingInvoicesAmount > 0 ? "high" : "low",
        metric: Number(outstandingInvoicesAmount.toFixed(2)),
        actionPath: "/finance",
      },
      {
        code: "exec-receptions",
        title: "Lever les blocages de reception",
        description: "Receptions en attente pouvant retarder cloture et facturation finale.",
        severity: workAcceptancesPending > 0 ? "medium" : "low",
        metric: workAcceptancesPending,
        actionPath: "/receptions",
      },
    ];

    const dashboards: DashboardOverviewPayload["dashboards"] = {};

    const maturity = buildMaturityGrid({
      hasProjects,
      projectCount: projectIds.length,
      windowDays,
      openTasks,
      overdueTasks,
      weeklyProgressCount: weeklyProgress.length,
      dailyLogsWindowCount,
      meetingsWindowCount,
      openIncidents,
      incidentsCritical,
      controlReportsOpen,
      budgetApproved,
      budgetBurnPct,
      overdueInvoices,
      changeOrdersPending,
      workAcceptancesPending,
      openPunchItems,
    });

    if (personas.includes("operational")) {
      dashboards.operational = {
        persona: "operational",
        title: "Dashboard Operationnel",
        decisionFrequency: "Pilotage quotidien (0-48h)",
        kpis: [
          { code: "open_tasks", label: "Taches ouvertes", value: openTasks, unit: "count" },
          { code: "overdue_tasks", label: "Taches en retard", value: overdueTasks, unit: "count" },
          { code: "open_incidents", label: "Incidents ouverts", value: openIncidents, unit: "count" },
          { code: "critical_incidents", label: "Incidents critiques", value: incidentsCritical, unit: "count" },
          { code: "open_punch", label: "Reserves ouvertes", value: openPunchItems, unit: "count" },
          { code: "scheduled_inspections", label: "Inspections a traiter", value: scheduledInspections, unit: "count" },
          { code: "daily_logs_window", label: "Journaux chantier (periode)", value: dailyLogsWindowCount, unit: "count" },
          { code: "docs_window", label: "Documents maj (periode)", value: docsWindowCount, unit: "count" },
        ],
        priorityActions: opPriority,
        charts: {
          progressTrend,
          incidentsByType,
        },
      };
    }

    if (personas.includes("management")) {
      dashboards.management = {
        persona: "management",
        title: "Dashboard Management Projet",
        decisionFrequency: "Pilotage hebdomadaire (7-30j)",
        kpis: [
          { code: "tracked_projects", label: "Projets suivis", value: projectIds.length, unit: "count" },
          { code: "avg_progress", label: "Avancement moyen", value: avgTaskProgress, unit: "percent", format: "decimal" },
          { code: "budget_committed", label: "Budget engage", value: Number(budgetCommitted.toFixed(2)), unit: "currency" },
          { code: "budget_spent", label: "Budget depense", value: Number(budgetSpent.toFixed(2)), unit: "currency" },
          { code: "budget_burn", label: "Burn budgetaire", value: budgetBurnPct, unit: "percent", format: "decimal" },
          { code: "overdue_invoices", label: "Factures en retard", value: overdueInvoices, unit: "count" },
          { code: "change_orders_pending", label: "Avenants en attente", value: changeOrdersPending, unit: "count" },
          { code: "control_reports_open", label: "Rapports controle ouverts", value: controlReportsOpen, unit: "count" },
        ],
        priorityActions: mgmtPriority,
        charts: {
          progressTrend,
          incidentsByType,
          cashFlow,
        },
      };
    }

    if (personas.includes("executive")) {
      dashboards.executive = {
        persona: "executive",
        title: "Dashboard Direction Generale",
        decisionFrequency: "Arbitrage mensuel (30-90j)",
        kpis: [
          { code: "portfolio_projects", label: "Projets portefeuille", value: projectIds.length, unit: "count" },
          { code: "budget_approved", label: "Budget approuve", value: Number(budgetApproved.toFixed(2)), unit: "currency" },
          { code: "budget_spent", label: "Depenses cumulees", value: Number(budgetSpent.toFixed(2)), unit: "currency" },
          { code: "burn_ratio", label: "Consommation budget", value: budgetBurnPct, unit: "percent", format: "decimal" },
          { code: "outstanding_invoices", label: "Encours factures", value: Number(outstandingInvoicesAmount.toFixed(2)), unit: "currency" },
          { code: "critical_incidents", label: "Incidents critiques ouverts", value: incidentsCritical, unit: "count" },
          { code: "open_work_acceptance", label: "Receptions a debloquer", value: workAcceptancesPending, unit: "count" },
          { code: "meetings_window", label: "Reunions (periode)", value: meetingsWindowCount, unit: "count" },
        ],
        priorityActions: execPriority,
        charts: {
          progressTrend,
          incidentsByType,
          cashFlow,
          projectHealth,
        },
      };
    }

    return {
      personas,
      defaultPersona,
      filters: {
        windowDays,
        selectedProjectIds: projectIds,
        projects,
      },
      dashboards,
      maturity,
    };
  }
}
