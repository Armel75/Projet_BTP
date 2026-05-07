import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../../lib/api";
import { motion } from "motion/react";
import {
  ShieldCheck,
  Plus,
  Loader2,
  AlertCircle,
  ClipboardCheck,
  CalendarClock,
  ArrowRight,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
} from "lucide-react";

type ProjectRef = { id: number; title: string; code?: string };

type ControlReport = {
  id: number;
  reference: string;
  title?: string;
  type: string;
  status: string;
  severity: string;
  report_date?: string;
  due_date?: string;
  comment: string;
  open_actions_count?: number;
};

const API_BASE = import.meta.env.VITE_API_URL;

const STATUS_LABELS: Record<string, string> = {
  DRAFT: "Brouillon",
  OPEN: "Ouvert",
  UNDER_REVIEW: "En revue",
  IN_PROGRESS: "En cours",
  ACTION_REQUIRED: "Actions requises",
  RESOLVED: "Résolu",
  APPROVED: "Approuvé",
  REJECTED: "Rejeté",
  CLOSED: "Clôturé",
};

const TYPE_LABELS: Record<string, string> = {
  QUALITY: "Qualité",
  SAFETY: "Sécurité",
  COMPLIANCE: "Conformité",
  TECHNICAL: "Technique",
  ENVIRONMENTAL: "Environnement",
  STRUCTURAL: "Structure",
  ELECTRICAL: "Électricité",
  PLUMBING: "Plomberie",
  FINISHING: "Finitions",
  COMMISSIONING: "Mise en service",
  AUDIT: "Audit",
  OTHER: "Autre",
};

const statusMeta = (status: string): { cls: string; icon: React.ReactNode } => {
  switch (status) {
    case "APPROVED":   return { cls: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20", icon: <CheckCircle2 size={11} /> };
    case "REJECTED":   return { cls: "text-red-500 bg-red-500/10 border-red-500/20",             icon: <XCircle size={11} /> };
    case "UNDER_REVIEW":
    case "ACTION_REQUIRED": return { cls: "text-amber-500 bg-amber-500/10 border-amber-500/20", icon: <AlertTriangle size={11} /> };
    case "RESOLVED":   return { cls: "text-blue-500 bg-blue-500/10 border-blue-500/20",          icon: <CheckCircle2 size={11} /> };
    case "OPEN":
    case "IN_PROGRESS": return { cls: "text-cyan-500 bg-cyan-500/10 border-cyan-500/20",         icon: <Clock size={11} /> };
    default:           return { cls: "text-gb-muted bg-gb-surface-solid border-gb-border",       icon: <Clock size={11} /> };
  }
};

const pickList = (payload: unknown): ControlReport[] => {
  if (Array.isArray(payload)) return payload as ControlReport[];
  if (payload && typeof payload === "object") {
    const p = payload as Record<string, unknown>;
    if (Array.isArray(p.data)) return p.data as ControlReport[];
  }
  return [];
};

export default function ControlReportModule() {
  const navigate = useNavigate();

  const [projects,          setProjects]          = useState<ProjectRef[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [reports,           setReports]           = useState<ControlReport[]>([]);
  const [loading,           setLoading]           = useState(false);
  const [error,             setError]             = useState<string | null>(null);

  const fetchProjects = useCallback(async () => {
    try {
      const res = await apiFetch(`${API_BASE}/projects?limit=100`);
      if (!res.ok) return;
      const payload = await res.json();
      const list: ProjectRef[] = Array.isArray(payload) ? payload : payload?.data ?? payload?.projects ?? [];
      setProjects(list);
      if (list.length && !selectedProjectId) setSelectedProjectId(String(list[0].id));
    } catch { /* no-op */ }
  }, [selectedProjectId]);

  const fetchReports = useCallback(async (projectId: string) => {
    if (!projectId) return;
    setLoading(true); setError(null);
    try {
      const res = await apiFetch(`${API_BASE}/control-reports?project_id=${projectId}&limit=5`);
      if (!res.ok) throw new Error("Impossible de charger les rapports");
      const payload = await res.json();
      setReports(pickList(payload));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erreur inattendue");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchProjects(); }, [fetchProjects]);
  useEffect(() => { if (selectedProjectId) fetchReports(selectedProjectId); }, [selectedProjectId, fetchReports]);

  const kpis = useMemo(() => ({
    total:   reports.length,
    pending: reports.filter(r => ["UNDER_REVIEW", "RESOLVED", "ACTION_REQUIRED"].includes(r.status)).length,
    critical: reports.filter(r => r.severity === "CRITICAL").length,
    rejected: reports.filter(r => r.status === "REJECTED").length,
  }), [reports]);

  return (
    <div className="space-y-5">

      {/* Project selector */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="w-full max-w-xs">
          <label className="text-[10px] font-black text-gb-muted uppercase tracking-widest">Projet</label>
          <select
            value={selectedProjectId}
            onChange={e => setSelectedProjectId(e.target.value)}
            className="mt-1 w-full h-10 rounded-xl border border-gb-border bg-gb-app px-3 text-sm text-gb-text"
          >
            {projects.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
          </select>
        </div>

        <button
          onClick={() => navigate(`/control-reports?project_id=${selectedProjectId}&create=1`)}
          className="h-10 px-4 rounded-xl bg-gb-primary text-gb-inverse font-bold inline-flex items-center gap-2 text-sm"
        >
          <Plus size={15} />
          Nouveau rapport
        </button>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total",     value: kpis.total,    cls: "text-gb-text" },
          { label: "À valider", value: kpis.pending,  cls: "text-amber-500" },
          { label: "Critiques", value: kpis.critical, cls: "text-red-500" },
          { label: "Rejetés",   value: kpis.rejected, cls: "text-purple-500" },
        ].map(k => (
          <div key={k.label} className="rounded-2xl border border-gb-border bg-gb-surface-solid p-4">
            <p className="text-[10px] font-black text-gb-muted uppercase tracking-widest">{k.label}</p>
            <p className={`text-3xl font-black mt-1 ${k.cls}`}>{k.value}</p>
          </div>
        ))}
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-3 text-sm text-red-500 flex items-center gap-2">
          <AlertCircle size={14} />{error}
        </div>
      )}

      {/* Recent reports â€” last 5, read-only */}
      <div className="rounded-2xl border border-gb-border bg-gb-surface-solid overflow-hidden">
        <div className="px-4 py-3 border-b border-gb-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck size={14} className="text-gb-primary" />
            <span className="text-sm font-black text-gb-text">Derniers rapports</span>
          </div>
          <button
            onClick={() => navigate(`/control-reports?project_id=${selectedProjectId}`)}
            className="text-xs font-bold text-gb-primary hover:underline inline-flex items-center gap-1"
          >
            Voir tous <ArrowRight size={12} />
          </button>
        </div>

        {loading ? (
          <div className="py-10 flex items-center justify-center">
            <Loader2 className="animate-spin text-gb-primary" size={24} />
          </div>
        ) : reports.length === 0 ? (
          <div className="py-10 text-center">
            <ClipboardCheck className="mx-auto text-gb-muted/30 mb-2" size={36} />
            <p className="text-sm font-semibold text-gb-muted">Aucun rapport de contrôle</p>
            <p className="text-xs text-gb-muted/60 mt-0.5">Crée ton premier rapport pour ce projet.</p>
          </div>
        ) : (
          <div className="divide-y divide-gb-border">
            {reports.slice(0, 5).map(r => {
              const meta = statusMeta(r.status);
              const overdue = r.due_date && !["APPROVED","CLOSED","RESOLVED"].includes(r.status) && new Date(r.due_date) < new Date();
              return (
                <motion.button
                  key={r.id}
                  whileHover={{ backgroundColor: "rgba(var(--gb-primary-rgb),0.03)" }}
                  onClick={() => navigate(`/control-reports?project_id=${selectedProjectId}`)}
                  className="w-full text-left px-4 py-3 flex items-center justify-between gap-3 transition-colors"
                >
                  <div className="min-w-0">
                    <p className="text-[10px] font-black text-gb-muted tracking-widest">{r.reference}</p>
                    <p className="text-sm font-bold text-gb-text truncate mt-0.5">{r.title || TYPE_LABELS[r.type] || r.type}</p>
                    {r.due_date && (
                      <p className={`text-xs mt-0.5 inline-flex items-center gap-1 ${overdue ? "text-red-500" : "text-gb-muted"}`}>
                        <CalendarClock size={11} />
                        {new Date(r.due_date).toLocaleDateString("fr-FR")}
                        {overdue && " Â· En retard"}
                      </p>
                    )}
                  </div>
                  <span className={`shrink-0 px-2 py-0.5 text-[10px] font-bold border rounded-full inline-flex items-center gap-1 ${meta.cls}`}>
                    {meta.icon}{STATUS_LABELS[r.status] ?? r.status}
                  </span>
                </motion.button>
              );
            })}
          </div>
        )}

        {reports.length > 0 && (
          <div className="px-4 py-3 border-t border-gb-border">
            <button
              onClick={() => navigate(`/control-reports?project_id=${selectedProjectId}`)}
              className="w-full h-9 rounded-xl border border-gb-primary/30 text-gb-primary font-bold text-sm hover:bg-gb-primary/5 transition-colors inline-flex items-center justify-center gap-2"
            >
              Gérer tous les rapports de contrôle <ArrowRight size={14} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
