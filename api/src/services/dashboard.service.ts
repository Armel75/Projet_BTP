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

function derivePersonas(permissions: string[]): DashboardPersona[] {
  const canExecutive = permissions.includes("invoice:approve") || permissions.includes("change-order:approve") || permissions.includes("tenant:read") || permissions.includes("report:validate");
  const canManagement = permissions.includes("project:update") || permissions.includes("budget:update") || permissions.includes("task:update") || permissions.includes("contract:update");
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
        where: { project_id: safeProjectFilter, week_start: { gte: addDays(end, -56) } },
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
        title: "Fermer les reserves punch list",
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
    };
  }
}
