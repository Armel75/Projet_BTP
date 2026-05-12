import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AlertTriangle, Briefcase, CalendarClock, TrendingUp } from "lucide-react";
import { motion } from "motion/react";
import { apiFetch } from "../lib/api";

const API_BASE = import.meta.env.VITE_API_URL;

type Persona = "operational" | "management" | "executive";

type Kpi = {
  code: string;
  label: string;
  value: number;
  unit?: "count" | "currency" | "percent" | "days";
  format?: "integer" | "decimal";
};

type PriorityAction = {
  code: string;
  title: string;
  description: string;
  severity: "low" | "medium" | "high" | "critical";
  metric: number;
  actionPath: string;
};

type ChartPoint = {
  label: string;
  value: number;
  secondary?: number;
};

type MaturityCriterion = {
  code: string;
  label: string;
  description: string;
  status: "not_met" | "partial" | "met";
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

type MaturityGrid = {
  score: number;
  maxScore: number;
  percent: number;
  level: "critical" | "progressing" | "advanced" | "top_1";
  domains: MaturityDomain[];
};

type PersonaPayload = {
  persona: Persona;
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

type DashboardOverview = {
  personas: Persona[];
  defaultPersona: Persona;
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

const INCIDENT_COLORS = ["#ef4444", "#f59e0b", "#3b82f6", "#10b981", "#8b5cf6", "#14b8a6"];

const PERSONA_LABELS: Record<Persona, string> = {
  operational: "Opérationnel",
  management: "Management Projet",
  executive: "Direction Générale",
};

function formatKpiValue(kpi: Kpi): string {
  if (kpi.unit === "currency") {
    return `${new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(kpi.value)} FCFA`;
  }

  if (kpi.unit === "percent") {
    return `${new Intl.NumberFormat("fr-FR", {
      maximumFractionDigits: kpi.format === "decimal" ? 1 : 0,
    }).format(kpi.value)}%`;
  }

  if (kpi.unit === "days") {
    return `${new Intl.NumberFormat("fr-FR").format(kpi.value)} j`;
  }

  return new Intl.NumberFormat("fr-FR", {
    maximumFractionDigits: kpi.format === "decimal" ? 1 : 0,
  }).format(kpi.value);
}

function severityClass(severity: PriorityAction["severity"]): string {
  if (severity === "critical") return "text-rose-600 bg-rose-50 border-rose-200";
  if (severity === "high") return "text-amber-700 bg-amber-50 border-amber-200";
  if (severity === "medium") return "text-blue-700 bg-blue-50 border-blue-200";
  return "text-emerald-700 bg-emerald-50 border-emerald-200";
}

function severityLabel(severity: PriorityAction["severity"]): string {
  if (severity === "critical") return "Critique";
  if (severity === "high") return "Élevé";
  if (severity === "medium") return "Moyen";
  return "Faible";
}

function maturityLevelLabel(level: MaturityGrid["level"]): string {
  if (level === "top_1") return "Top 1%";
  if (level === "advanced") return "Avancé";
  if (level === "progressing") return "Progression";
  return "Critique";
}

function maturityLevelClass(level: MaturityGrid["level"]): string {
  if (level === "top_1") return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (level === "advanced") return "bg-blue-50 text-blue-700 border-blue-200";
  if (level === "progressing") return "bg-amber-50 text-amber-700 border-amber-200";
  return "bg-rose-50 text-rose-700 border-rose-200";
}

function criterionStatusLabel(status: MaturityCriterion["status"]): string {
  if (status === "met") return "Conforme";
  if (status === "partial") return "Partiel";
  return "A corriger";
}

function criterionStatusClass(status: MaturityCriterion["status"]): string {
  if (status === "met") return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (status === "partial") return "bg-amber-50 text-amber-700 border-amber-200";
  return "bg-rose-50 text-rose-700 border-rose-200";
}

export default function DashboardView() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [windowDays, setWindowDays] = useState<number>(30);
  const [selectedProjects, setSelectedProjects] = useState<number[]>([]);
  const [activePersona, setActivePersona] = useState<Persona>("operational");
  const [overview, setOverview] = useState<DashboardOverview | null>(null);

  useEffect(() => {
    let alive = true;

    const load = async () => {
      try {
        setLoading(true);
        setError(null);

        const params = new URLSearchParams();
        params.set("windowDays", String(windowDays));
        if (selectedProjects.length > 0) {
          params.set("projectIds", selectedProjects.join(","));
        }

        const response = await apiFetch(`${API_BASE}/dashboard/overview?${params.toString()}`);
        if (!response.ok) {
          const body = await response.json().catch(() => ({}));
          throw new Error(body.error || "Erreur de chargement du dashboard");
        }

        const data = (await response.json()) as DashboardOverview;
        if (!alive) return;

        setOverview(data);
        setActivePersona((current) => (data.personas.includes(current) ? current : data.defaultPersona));

        if (selectedProjects.length === 0 && data.filters.selectedProjectIds.length > 0) {
          setSelectedProjects(data.filters.selectedProjectIds);
        }
      } catch (e: any) {
        if (alive) {
          setError(e?.message || "Erreur inattendue");
        }
      } finally {
        if (alive) setLoading(false);
      }
    };

    void load();
    return () => {
      alive = false;
    };
  }, [windowDays, selectedProjects]);

  const activeDashboard = useMemo(() => {
    if (!overview) return undefined;
    if (activePersona === "executive") return overview.dashboards.executive;
    if (activePersona === "management") return overview.dashboards.management;
    return overview.dashboards.operational;
  }, [overview, activePersona]);

  const toggleProject = (projectId: number) => {
    setSelectedProjects((current) => {
      if (current.includes(projectId)) return current.filter((id) => id !== projectId);
      return [...current, projectId];
    });
  };

  if (loading && !overview) {
    return <div className="py-16 text-center text-gb-muted font-semibold">Chargement du dashboard premium...</div>;
  }

  if (error && !overview) {
    return <div className="py-16 text-center text-rose-600 font-semibold">{error}</div>;
  }

  if (!overview || !activeDashboard) {
    return <div className="py-16 text-center text-gb-muted font-semibold">Aucune donnée dashboard disponible.</div>;
  }

  return (
    <div className="space-y-6 pb-10">
      <div className="bg-gb-surface-solid border border-gb-border rounded-2xl p-5 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h2 className="text-3xl font-black tracking-tighter text-gb-text">{activeDashboard.title}</h2>
            <p className="text-sm font-semibold text-gb-muted">{activeDashboard.decisionFrequency}</p>
          </div>

          <div className="flex flex-wrap gap-2">
            {overview.personas.map((persona) => (
              <button
                key={persona}
                onClick={() => setActivePersona(persona)}
                className={`px-3 py-2 rounded-xl text-xs font-black uppercase tracking-wide border transition-all ${
                  activePersona === persona
                    ? "bg-gb-primary text-gb-inverse border-gb-primary"
                    : "bg-gb-app text-gb-muted border-gb-border hover:text-gb-text"
                }`}
              >
                {PERSONA_LABELS[persona]}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div>
            <p className="text-[11px] font-black uppercase text-gb-muted mb-2">Fenêtre temporelle</p>
            <div className="flex gap-2">
              {[7, 30, 90].map((days) => (
                <button
                  key={days}
                  onClick={() => setWindowDays(days)}
                  className={`px-3 py-2 rounded-lg text-xs font-bold border transition-colors ${
                    windowDays === days
                      ? "bg-gb-primary/10 text-gb-primary border-gb-primary/40"
                      : "bg-gb-app border-gb-border text-gb-muted hover:text-gb-text"
                  }`}
                >
                  {days} jours
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-[11px] font-black uppercase text-gb-muted mb-2">Projets (multi-sélection)</p>
            <div className="flex flex-wrap gap-2 max-h-[96px] overflow-auto pr-1">
              {overview.filters.projects.map((project) => {
                const selected = selectedProjects.includes(project.id);
                return (
                  <button
                    key={project.id}
                    onClick={() => toggleProject(project.id)}
                    className={`px-3 py-2 rounded-lg text-[11px] font-bold border transition-colors ${
                      selected
                        ? "bg-blue-50 border-blue-200 text-blue-700"
                        : "bg-gb-app border-gb-border text-gb-muted hover:text-gb-text"
                    }`}
                    title={project.title}
                  >
                    {project.code}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {activeDashboard.kpis.slice(0, 8).map((kpi) => (
          <motion.div
            key={kpi.code}
            whileHover={{ y: -2 }}
            className="bg-gb-surface-solid border border-gb-border rounded-2xl p-4 shadow-sm"
          >
            <p className="text-[10px] font-black uppercase tracking-wide text-gb-muted">{kpi.label}</p>
            <h3 className="mt-2 text-2xl font-black tracking-tight text-gb-text">{formatKpiValue(kpi)}</h3>
          </motion.div>
        ))}
      </div>

      <div className="bg-gb-surface-solid border border-gb-border rounded-2xl p-5 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          <div>
            <h3 className="text-base font-black uppercase tracking-tight text-gb-text">Grille de maturité top 1%</h3>
            <p className="text-xs text-gb-muted mt-1">Evaluation data-driven du portefeuille, basee sur vos donnees reelles.</p>
          </div>
          <div className="flex items-center gap-3">
            <span className={`px-3 py-1.5 text-xs font-black uppercase border rounded-lg ${maturityLevelClass(overview.maturity.level)}`}>
              {maturityLevelLabel(overview.maturity.level)}
            </span>
            <div className="text-right">
              <p className="text-2xl font-black tracking-tight text-gb-text">{overview.maturity.percent}%</p>
              <p className="text-[11px] font-semibold text-gb-muted">
                {overview.maturity.score}/{overview.maturity.maxScore}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-4 h-2 w-full rounded-full bg-gb-app overflow-hidden">
          <div
            className="h-full bg-gb-primary transition-all duration-500"
            style={{ width: `${Math.max(0, Math.min(100, overview.maturity.percent))}%` }}
          />
        </div>

        <div className="mt-5 grid grid-cols-1 xl:grid-cols-3 gap-4">
          {overview.maturity.domains.map((domain) => (
            <div key={domain.code} className="rounded-xl border border-gb-border bg-gb-app p-4">
              <div className="flex items-center justify-between gap-3">
                <h4 className="text-sm font-black text-gb-text">{domain.label}</h4>
                <span className="text-xs font-black text-gb-primary">
                  {domain.score}/{domain.maxScore}
                </span>
              </div>
              <div className="mt-3 space-y-2">
                {domain.criteria.map((criterion) => (
                  <div key={criterion.code} className="rounded-lg border border-gb-border bg-gb-surface-solid p-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-bold text-gb-text">{criterion.label}</p>
                      <span className={`px-2 py-0.5 text-[10px] font-black uppercase border rounded-md ${criterionStatusClass(criterion.status)}`}>
                        {criterionStatusLabel(criterion.status)}
                      </span>
                    </div>
                    <p className="mt-1 text-[11px] text-gb-muted leading-relaxed">{criterion.description}</p>
                    <p className="mt-2 text-[10px] font-bold text-gb-muted">Score: {criterion.score}/{criterion.maxScore}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-gb-surface-solid border border-gb-border rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-black uppercase tracking-tight text-gb-text flex items-center gap-2">
              <TrendingUp size={16} /> Progression consolidée
            </h3>
          </div>
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={activeDashboard.charts.progressTrend}>
                <defs>
                  <linearGradient id="progressArea" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0.03} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="label" axisLine={false} tickLine={false} fontSize={11} />
                <YAxis axisLine={false} tickLine={false} fontSize={11} unit="%" />
                <Tooltip />
                <Area type="monotone" dataKey="value" stroke="#2563eb" strokeWidth={2.5} fill="url(#progressArea)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-gb-surface-solid border border-gb-border rounded-2xl p-5 shadow-sm">
          <h3 className="text-base font-black uppercase tracking-tight text-gb-text flex items-center gap-2 mb-4">
            <AlertTriangle size={16} /> Risques par type
          </h3>
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={activeDashboard.charts.incidentsByType}
                  dataKey="value"
                  nameKey="label"
                  innerRadius={58}
                  outerRadius={84}
                  paddingAngle={4}
                >
                  {activeDashboard.charts.incidentsByType.map((entry, index) => (
                    <Cell key={`${entry.label}-${index}`} fill={INCIDENT_COLORS[index % INCIDENT_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {activeDashboard.charts.cashFlow && activeDashboard.charts.cashFlow.length > 0 && (
          <div className="bg-gb-surface-solid border border-gb-border rounded-2xl p-5 shadow-sm">
            <h3 className="text-base font-black uppercase tracking-tight text-gb-text flex items-center gap-2 mb-4">
              <Briefcase size={16} /> Facturé vs encaissé
            </h3>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={activeDashboard.charts.cashFlow}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="label" axisLine={false} tickLine={false} fontSize={11} />
                  <YAxis axisLine={false} tickLine={false} fontSize={11} />
                  <Tooltip />
                  <Bar dataKey="value" name="Facturé" fill="#93c5fd" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="secondary" name="Encaissé" fill="#2563eb" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {activeDashboard.charts.projectHealth && activeDashboard.charts.projectHealth.length > 0 && (
          <div className="bg-gb-surface-solid border border-gb-border rounded-2xl p-5 shadow-sm">
            <h3 className="text-base font-black uppercase tracking-tight text-gb-text mb-4">Projets à risque (score)</h3>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={activeDashboard.charts.projectHealth} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                  <XAxis type="number" axisLine={false} tickLine={false} fontSize={11} />
                  <YAxis dataKey="label" type="category" axisLine={false} tickLine={false} width={90} fontSize={10} />
                  <Tooltip />
                  <Bar dataKey="value" name="Score" fill="#f59e0b" radius={[0, 5, 5, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        <div className="bg-gb-surface-solid border border-gb-border rounded-2xl p-5 shadow-sm lg:col-span-full">
          <h3 className="text-base font-black uppercase tracking-tight text-gb-text flex items-center gap-2 mb-4">
            <CalendarClock size={16} /> 3 actions prioritaires proposées
          </h3>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {activeDashboard.priorityActions.slice(0, 3).map((action) => (
              <button
                key={action.code}
                onClick={() => navigate(action.actionPath)}
                className="text-left p-4 rounded-xl border border-gb-border bg-gb-app hover:bg-gb-surface-hover transition-colors"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className={`px-2 py-1 rounded-md text-[10px] font-black uppercase border ${severityClass(action.severity)}`}>
                    {severityLabel(action.severity)}
                  </span>
                  <span className="text-sm font-black text-gb-text">{new Intl.NumberFormat("fr-FR").format(action.metric)}</span>
                </div>
                <h4 className="mt-3 text-sm font-black text-gb-text">{action.title}</h4>
                <p className="mt-1 text-xs text-gb-muted leading-relaxed">{action.description}</p>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
