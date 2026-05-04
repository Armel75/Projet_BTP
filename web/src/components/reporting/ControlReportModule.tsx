import React, { useCallback, useEffect, useMemo, useState } from "react";
import { apiFetch } from "../../lib/api";
import { motion } from "motion/react";
import {
  ShieldCheck,
  Plus,
  Loader2,
  AlertCircle,
  ClipboardCheck,
  CalendarClock,
  CircleDot,
  CheckCircle2,
  XCircle,
  CheckCheck,
  Link2,
  Camera,
  Wrench,
  UserCheck,
} from "lucide-react";

type ProjectRef = { id: number; title: string; code?: string };
type LotRef = { id: number; name: string; lot_number?: string };
type TaskRef = { id: number; title: string };
type UserRef = { id: number; firstname: string; lastname: string; email: string };

type ControlReportAction = {
  id: number;
  subject: string;
  description?: string;
  status: string;
  due_date?: string;
  completed_at?: string;
  responsible?: UserRef;
};

type ControlReportAttachment = {
  id: number;
  url: string;
  source: string;
  caption?: string;
  file_name?: string;
};

type ControlReport = {
  id: number;
  reference: string;
  title?: string;
  type: string;
  status: string;
  severity: string;
  discipline?: string;
  location?: string;
  report_date?: string;
  due_date?: string;
  resolved_at?: string;
  comment: string;
  rejected_reason?: string;
  project?: ProjectRef;
  lot?: LotRef;
  task?: TaskRef;
  createdBy?: UserRef;
  approvedBy?: UserRef;
  actions?: ControlReportAction[];
  attachments?: ControlReportAttachment[];
};

const API_BASE = import.meta.env.VITE_API_URL;

const STATUSES = [
  "DRAFT",
  "OPEN",
  "UNDER_REVIEW",
  "ACTION_REQUIRED",
  "RESOLVED",
  "APPROVED",
  "REJECTED",
  "CLOSED",
] as const;

const TYPES = ["QUALITY", "SAFETY", "COMPLIANCE", "TECHNICAL"] as const;
const SEVERITIES = ["LOW", "MEDIUM", "HIGH", "CRITICAL"] as const;

const STATUS_LABELS: Record<string, string> = {
  DRAFT: "Brouillon",
  OPEN: "Ouvert",
  UNDER_REVIEW: "En revue",
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
};

const SEVERITY_LABELS: Record<string, string> = {
  LOW: "Faible",
  MEDIUM: "Moyenne",
  HIGH: "Élevée",
  CRITICAL: "Critique",
};

const statusClass = (status: string) => {
  switch (status) {
    case "APPROVED":
      return "bg-emerald-500/10 text-emerald-500 border-emerald-500/20";
    case "REJECTED":
      return "bg-red-500/10 text-red-500 border-red-500/20";
    case "UNDER_REVIEW":
      return "bg-amber-500/10 text-amber-500 border-amber-500/20";
    case "ACTION_REQUIRED":
      return "bg-orange-500/10 text-orange-500 border-orange-500/20";
    case "RESOLVED":
      return "bg-blue-500/10 text-blue-500 border-blue-500/20";
    case "CLOSED":
      return "bg-slate-500/10 text-slate-500 border-slate-500/20";
    case "OPEN":
      return "bg-cyan-500/10 text-cyan-500 border-cyan-500/20";
    default:
      return "bg-violet-500/10 text-violet-500 border-violet-500/20";
  }
};

const pickList = (payload: any): any[] => payload?.data ?? payload ?? [];

export default function ControlReportModule() {
  const [projects, setProjects] = useState<ProjectRef[]>([]);
  const [lots, setLots] = useState<LotRef[]>([]);
  const [tasks, setTasks] = useState<TaskRef[]>([]);
  const [users, setUsers] = useState<UserRef[]>([]);

  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [typeFilter, setTypeFilter] = useState<string>("");
  const [severityFilter, setSeverityFilter] = useState<string>("");

  const [reports, setReports] = useState<ControlReport[]>([]);
  const [selectedReport, setSelectedReport] = useState<ControlReport | null>(null);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");

  const [newReport, setNewReport] = useState<any>({
    project_id: "",
    lot_id: "",
    task_id: "",
    title: "",
    type: "QUALITY",
    status: "DRAFT",
    severity: "MEDIUM",
    discipline: "",
    location: "",
    report_date: "",
    due_date: "",
    comment: "",
  });

  const [newAction, setNewAction] = useState<any>({
    subject: "",
    description: "",
    responsible_id: "",
    due_date: "",
  });

  const [newAttachment, setNewAttachment] = useState<any>({
    url: "",
    source: "DOCUMENT",
    caption: "",
    file_name: "",
  });

  const fetchProjects = useCallback(async () => {
    try {
      const res = await apiFetch(`${API_BASE}/projects?limit=100`);
      if (!res.ok) return;
      const payload = await res.json();
      const list = pickList(payload) as ProjectRef[];
      setProjects(list);
      if (list.length && !selectedProjectId) {
        setSelectedProjectId(String(list[0].id));
        setNewReport((prev: any) => ({ ...prev, project_id: String(list[0].id) }));
      }
    } catch {
      // no-op
    }
  }, [selectedProjectId]);

  const fetchProjectContext = useCallback(async (projectId: string) => {
    if (!projectId) return;

    try {
      const [lotsRes, tasksRes, usersRes] = await Promise.all([
        apiFetch(`${API_BASE}/projects/${projectId}/lots`),
        apiFetch(`${API_BASE}/projects/${projectId}/tasks`),
        apiFetch(`${API_BASE}/projects/helpers/users`),
      ]);

      if (lotsRes.ok) {
        const payload = await lotsRes.json();
        setLots(pickList(payload));
      }

      if (tasksRes.ok) {
        const payload = await tasksRes.json();
        setTasks(pickList(payload));
      }

      if (usersRes.ok) {
        const payload = await usersRes.json();
        setUsers(pickList(payload));
      }
    } catch {
      // no-op
    }
  }, []);

  const fetchReports = useCallback(async () => {
    if (!selectedProjectId) return;

    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({ project_id: selectedProjectId });
      if (statusFilter) params.set("status", statusFilter);
      if (typeFilter) params.set("type", typeFilter);
      if (severityFilter) params.set("severity", severityFilter);

      const res = await apiFetch(`${API_BASE}/control-reports?${params.toString()}`);
      if (!res.ok) throw new Error("Impossible de charger les rapports de contrôle");
      const payload = await res.json();
      const list = pickList(payload) as ControlReport[];
      setReports(list);

      if (selectedReport) {
        const refreshed = list.find((r) => r.id === selectedReport.id) ?? null;
        setSelectedReport(refreshed);
      }
    } catch (e: any) {
      setError(e.message || "Erreur inattendue");
    } finally {
      setLoading(false);
    }
  }, [selectedProjectId, statusFilter, typeFilter, severityFilter, selectedReport]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  useEffect(() => {
    if (!selectedProjectId) return;
    fetchProjectContext(selectedProjectId);
    fetchReports();
  }, [selectedProjectId, fetchProjectContext, fetchReports]);

  useEffect(() => {
    if (!selectedProjectId) return;
    fetchReports();
  }, [statusFilter, typeFilter, severityFilter, selectedProjectId, fetchReports]);

  const kpis = useMemo(() => {
    const total = reports.length;
    const pendingApproval = reports.filter((r) => ["UNDER_REVIEW", "RESOLVED"].includes(r.status)).length;
    const critical = reports.filter((r) => r.severity === "CRITICAL").length;
    const rejected = reports.filter((r) => r.status === "REJECTED").length;
    return { total, pendingApproval, critical, rejected };
  }, [reports]);

  const submitReport = async () => {
    if (!newReport.project_id || !newReport.comment) {
      setError("Le chantier et le constat sont obligatoires.");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const res = await apiFetch(`${API_BASE}/control-reports`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...newReport,
          project_id: Number(newReport.project_id),
          lot_id: newReport.lot_id ? Number(newReport.lot_id) : undefined,
          task_id: newReport.task_id ? Number(newReport.task_id) : undefined,
          report_date: newReport.report_date || undefined,
          due_date: newReport.due_date || undefined,
        }),
      });

      if (!res.ok) throw new Error("Création du rapport impossible");

      setCreateOpen(false);
      setNewReport((prev: any) => ({
        ...prev,
        lot_id: "",
        task_id: "",
        title: "",
        discipline: "",
        location: "",
        report_date: "",
        due_date: "",
        comment: "",
      }));

      await fetchReports();
    } catch (e: any) {
      setError(e.message || "Erreur inattendue");
    } finally {
      setSaving(false);
    }
  };

  const changeStatus = async (id: number, status: string) => {
    setSaving(true);
    setError(null);
    try {
      const res = await apiFetch(`${API_BASE}/control-reports/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error("Mise à jour du statut impossible");
      await fetchReports();
    } catch (e: any) {
      setError(e.message || "Erreur inattendue");
    } finally {
      setSaving(false);
    }
  };

  const approveReport = async (id: number) => {
    setSaving(true);
    setError(null);
    try {
      const res = await apiFetch(`${API_BASE}/control-reports/${id}/approve`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Approbation impossible");
      await fetchReports();
    } catch (e: any) {
      setError(e.message || "Erreur inattendue");
    } finally {
      setSaving(false);
    }
  };

  const rejectReport = async (id: number) => {
    if (!rejectionReason.trim()) {
      setError("Le motif de rejet est obligatoire.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const res = await apiFetch(`${API_BASE}/control-reports/${id}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rejected_reason: rejectionReason.trim() }),
      });
      if (!res.ok) throw new Error("Rejet impossible");
      setRejectionReason("");
      await fetchReports();
    } catch (e: any) {
      setError(e.message || "Erreur inattendue");
    } finally {
      setSaving(false);
    }
  };

  const createAction = async () => {
    if (!selectedReport || !newAction.subject.trim()) return;

    setSaving(true);
    setError(null);
    try {
      const res = await apiFetch(`${API_BASE}/control-reports/${selectedReport.id}/actions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: newAction.subject,
          description: newAction.description || undefined,
          responsible_id: newAction.responsible_id ? Number(newAction.responsible_id) : undefined,
          due_date: newAction.due_date || undefined,
        }),
      });
      if (!res.ok) throw new Error("Création d'action impossible");

      setNewAction({ subject: "", description: "", responsible_id: "", due_date: "" });
      await fetchReports();
    } catch (e: any) {
      setError(e.message || "Erreur inattendue");
    } finally {
      setSaving(false);
    }
  };

  const createAttachment = async () => {
    if (!selectedReport || !newAttachment.url.trim()) return;

    setSaving(true);
    setError(null);
    try {
      const res = await apiFetch(`${API_BASE}/control-reports/${selectedReport.id}/attachments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newAttachment),
      });
      if (!res.ok) throw new Error("Ajout de pièce jointe impossible");

      setNewAttachment({ url: "", source: "DOCUMENT", caption: "", file_name: "" });
      await fetchReports();
    } catch (e: any) {
      setError(e.message || "Erreur inattendue");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <div className="rounded-2xl border border-gb-border bg-gb-surface-solid p-4">
          <p className="text-xs text-gb-muted uppercase tracking-widest">Total</p>
          <p className="text-3xl font-black text-gb-text mt-1">{kpis.total}</p>
        </div>
        <div className="rounded-2xl border border-gb-border bg-gb-surface-solid p-4">
          <p className="text-xs text-gb-muted uppercase tracking-widest">A valider</p>
          <p className="text-3xl font-black text-amber-500 mt-1">{kpis.pendingApproval}</p>
        </div>
        <div className="rounded-2xl border border-gb-border bg-gb-surface-solid p-4">
          <p className="text-xs text-gb-muted uppercase tracking-widest">Critiques</p>
          <p className="text-3xl font-black text-red-500 mt-1">{kpis.critical}</p>
        </div>
        <div className="rounded-2xl border border-gb-border bg-gb-surface-solid p-4">
          <p className="text-xs text-gb-muted uppercase tracking-widest">Rejetés</p>
          <p className="text-3xl font-black text-purple-500 mt-1">{kpis.rejected}</p>
        </div>
      </div>

      <div className="rounded-2xl border border-gb-border bg-gb-surface-solid p-4 md:p-5 flex flex-col lg:flex-row gap-3 lg:items-end lg:justify-between">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 w-full">
          <div>
            <label className="text-[10px] font-black text-gb-muted uppercase tracking-widest">Projet</label>
            <select
              value={selectedProjectId}
              onChange={(e) => {
                setSelectedProjectId(e.target.value);
                setNewReport((prev: any) => ({ ...prev, project_id: e.target.value, lot_id: "", task_id: "" }));
              }}
              className="mt-1 w-full h-10 rounded-xl border border-gb-border bg-gb-app px-3 text-sm"
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.title}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[10px] font-black text-gb-muted uppercase tracking-widest">Statut</label>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="mt-1 w-full h-10 rounded-xl border border-gb-border bg-gb-app px-3 text-sm">
              <option value="">Tous</option>
              {STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
            </select>
          </div>

          <div>
            <label className="text-[10px] font-black text-gb-muted uppercase tracking-widest">Type</label>
            <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="mt-1 w-full h-10 rounded-xl border border-gb-border bg-gb-app px-3 text-sm">
              <option value="">Tous</option>
              {TYPES.map((t) => <option key={t} value={t}>{TYPE_LABELS[t]}</option>)}
            </select>
          </div>

          <div>
            <label className="text-[10px] font-black text-gb-muted uppercase tracking-widest">Sévérité</label>
            <select value={severityFilter} onChange={(e) => setSeverityFilter(e.target.value)} className="mt-1 w-full h-10 rounded-xl border border-gb-border bg-gb-app px-3 text-sm">
              <option value="">Toutes</option>
              {SEVERITIES.map((s) => <option key={s} value={s}>{SEVERITY_LABELS[s]}</option>)}
            </select>
          </div>
        </div>

        <button
          onClick={() => setCreateOpen(true)}
          className="h-10 px-4 rounded-xl bg-gb-primary text-gb-inverse font-bold inline-flex items-center gap-2"
        >
          <Plus size={16} />
          Nouveau rapport
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-3 text-sm text-red-500 flex items-start gap-2">
          <AlertCircle size={16} className="mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="py-12 flex items-center justify-center">
          <Loader2 className="animate-spin text-gb-primary" size={30} />
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <div className="space-y-3">
            {reports.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-gb-border bg-gb-surface-solid p-12 text-center">
                <ClipboardCheck className="mx-auto text-gb-muted/30 mb-3" size={52} />
                <p className="text-gb-text font-semibold">Aucun rapport de contrôle</p>
                <p className="text-gb-muted text-sm mt-1">Crée ton premier rapport pour ce chantier.</p>
              </div>
            ) : reports.map((report) => (
              <motion.button
                key={report.id}
                whileHover={{ y: -1 }}
                onClick={() => setSelectedReport(report)}
                className={`w-full text-left rounded-2xl border p-4 transition-all ${selectedReport?.id === report.id ? "border-gb-primary bg-gb-primary/5" : "border-gb-border bg-gb-surface-solid"}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-black tracking-widest uppercase text-gb-muted">{report.reference}</p>
                    <h4 className="font-bold text-gb-text mt-1">{report.title || "Rapport de contrôle"}</h4>
                    <p className="text-sm text-gb-muted mt-1 line-clamp-2">{report.comment}</p>
                  </div>
                  <span className={`px-2.5 py-1 text-[10px] font-bold border rounded-full ${statusClass(report.status)}`}>
                    {STATUS_LABELS[report.status] || report.status}
                  </span>
                </div>

                <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
                  <span className="px-2 py-1 rounded-lg bg-gb-app border border-gb-border">{TYPE_LABELS[report.type] || report.type}</span>
                  <span className="px-2 py-1 rounded-lg bg-gb-app border border-gb-border">{SEVERITY_LABELS[report.severity] || report.severity}</span>
                  {report.report_date && (
                    <span className="px-2 py-1 rounded-lg bg-gb-app border border-gb-border inline-flex items-center gap-1">
                      <CalendarClock size={12} />
                      {new Date(report.report_date).toLocaleDateString("fr-FR")}
                    </span>
                  )}
                </div>
              </motion.button>
            ))}
          </div>

          <div className="rounded-2xl border border-gb-border bg-gb-surface-solid p-5 min-h-[480px]">
            {!selectedReport ? (
              <div className="h-full flex flex-col items-center justify-center text-center px-6">
                <ShieldCheck className="text-gb-muted/30 mb-3" size={52} />
                <p className="font-semibold text-gb-text">Sélectionne un rapport</p>
                <p className="text-sm text-gb-muted">Le détail, l'approbation, les actions correctives et les pièces jointes s'affichent ici.</p>
              </div>
            ) : (
              <div className="space-y-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-black tracking-widest uppercase text-gb-muted">{selectedReport.reference}</p>
                    <h3 className="text-xl font-black text-gb-text">{selectedReport.title || "Rapport de contrôle"}</h3>
                    <p className="text-sm text-gb-muted mt-1">{selectedReport.project?.title}</p>
                  </div>
                  <span className={`px-3 py-1 text-[10px] font-bold border rounded-full ${statusClass(selectedReport.status)}`}>
                    {STATUS_LABELS[selectedReport.status] || selectedReport.status}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-xl border border-gb-border bg-gb-app p-3">
                    <p className="text-[10px] uppercase tracking-widest text-gb-muted">Type</p>
                    <p className="font-bold text-gb-text">{TYPE_LABELS[selectedReport.type] || selectedReport.type}</p>
                  </div>
                  <div className="rounded-xl border border-gb-border bg-gb-app p-3">
                    <p className="text-[10px] uppercase tracking-widest text-gb-muted">Sévérité</p>
                    <p className="font-bold text-gb-text">{SEVERITY_LABELS[selectedReport.severity] || selectedReport.severity}</p>
                  </div>
                </div>

                <div className="rounded-xl border border-gb-border bg-gb-app p-3">
                  <p className="text-[10px] uppercase tracking-widest text-gb-muted mb-2">Constat</p>
                  <p className="text-sm text-gb-text whitespace-pre-wrap">{selectedReport.comment}</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                  <button onClick={() => changeStatus(selectedReport.id, "UNDER_REVIEW")} className="h-9 rounded-lg border border-amber-500/30 text-amber-500 font-semibold text-sm">En revue</button>
                  <button onClick={() => changeStatus(selectedReport.id, "RESOLVED")} className="h-9 rounded-lg border border-blue-500/30 text-blue-500 font-semibold text-sm">Résolu</button>
                  <button onClick={() => changeStatus(selectedReport.id, "CLOSED")} className="h-9 rounded-lg border border-slate-500/30 text-slate-500 font-semibold text-sm">Clôturer</button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <button onClick={() => approveReport(selectedReport.id)} className="h-10 rounded-xl bg-emerald-600 text-white font-bold inline-flex items-center justify-center gap-2">
                    <CheckCircle2 size={16} />
                    Approuver
                  </button>
                  <button onClick={() => rejectReport(selectedReport.id)} className="h-10 rounded-xl bg-red-600 text-white font-bold inline-flex items-center justify-center gap-2">
                    <XCircle size={16} />
                    Rejeter
                  </button>
                </div>

                <textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Motif de rejet (obligatoire pour rejet)"
                  rows={2}
                  className="w-full rounded-xl border border-gb-border bg-gb-app px-3 py-2 text-sm"
                />

                <div className="rounded-xl border border-gb-border p-3 space-y-3">
                  <div className="flex items-center gap-2 text-sm font-bold text-gb-text">
                    <Wrench size={15} />
                    Actions correctives
                  </div>

                  <div className="space-y-2">
                    {(selectedReport.actions || []).map((a) => (
                      <div key={a.id} className="rounded-lg border border-gb-border bg-gb-app p-2.5 text-sm">
                        <p className="font-semibold text-gb-text">{a.subject}</p>
                        {a.description && <p className="text-gb-muted text-xs mt-0.5">{a.description}</p>}
                        <div className="mt-1 flex flex-wrap gap-2 text-[11px]">
                          <span className="px-2 py-0.5 rounded bg-gb-surface-solid border border-gb-border">{a.status}</span>
                          {a.responsible && (
                            <span className="px-2 py-0.5 rounded bg-gb-surface-solid border border-gb-border inline-flex items-center gap-1">
                              <UserCheck size={11} />
                              {a.responsible.firstname} {a.responsible.lastname}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    <input value={newAction.subject} onChange={(e) => setNewAction((p: any) => ({ ...p, subject: e.target.value }))} placeholder="Sujet action" className="h-9 rounded-lg border border-gb-border bg-gb-app px-3 text-sm" />
                    <select value={newAction.responsible_id} onChange={(e) => setNewAction((p: any) => ({ ...p, responsible_id: e.target.value }))} className="h-9 rounded-lg border border-gb-border bg-gb-app px-3 text-sm">
                      <option value="">Responsable</option>
                      {users.map((u) => <option key={u.id} value={u.id}>{u.firstname} {u.lastname}</option>)}
                    </select>
                    <input value={newAction.due_date} onChange={(e) => setNewAction((p: any) => ({ ...p, due_date: e.target.value }))} type="date" className="h-9 rounded-lg border border-gb-border bg-gb-app px-3 text-sm" />
                    <input value={newAction.description} onChange={(e) => setNewAction((p: any) => ({ ...p, description: e.target.value }))} placeholder="Description (optionnel)" className="h-9 rounded-lg border border-gb-border bg-gb-app px-3 text-sm" />
                  </div>

                  <button onClick={createAction} className="h-9 px-3 rounded-lg border border-gb-border bg-gb-app font-semibold text-sm inline-flex items-center gap-2">
                    <Plus size={14} />
                    Ajouter action
                  </button>
                </div>

                <div className="rounded-xl border border-gb-border p-3 space-y-3">
                  <div className="flex items-center gap-2 text-sm font-bold text-gb-text">
                    <Link2 size={15} />
                    Pièces jointes
                  </div>

                  <div className="space-y-2">
                    {(selectedReport.attachments || []).map((a) => (
                      <a key={a.id} href={a.url} target="_blank" rel="noreferrer" className="block rounded-lg border border-gb-border bg-gb-app p-2.5 hover:border-gb-primary/30">
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-semibold text-sm text-gb-text truncate">{a.file_name || a.url}</p>
                          <span className="text-[10px] px-2 py-0.5 rounded border border-gb-border">{a.source}</span>
                        </div>
                        {a.caption && <p className="text-xs text-gb-muted mt-1">{a.caption}</p>}
                      </a>
                    ))}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    <input value={newAttachment.url} onChange={(e) => setNewAttachment((p: any) => ({ ...p, url: e.target.value }))} placeholder="URL fichier" className="h-9 rounded-lg border border-gb-border bg-gb-app px-3 text-sm" />
                    <input value={newAttachment.file_name} onChange={(e) => setNewAttachment((p: any) => ({ ...p, file_name: e.target.value }))} placeholder="Nom fichier" className="h-9 rounded-lg border border-gb-border bg-gb-app px-3 text-sm" />
                    <select value={newAttachment.source} onChange={(e) => setNewAttachment((p: any) => ({ ...p, source: e.target.value }))} className="h-9 rounded-lg border border-gb-border bg-gb-app px-3 text-sm">
                      <option value="DOCUMENT">Document</option>
                      <option value="PHOTO">Photo</option>
                    </select>
                    <input value={newAttachment.caption} onChange={(e) => setNewAttachment((p: any) => ({ ...p, caption: e.target.value }))} placeholder="Légende" className="h-9 rounded-lg border border-gb-border bg-gb-app px-3 text-sm" />
                  </div>

                  <button onClick={createAttachment} className="h-9 px-3 rounded-lg border border-gb-border bg-gb-app font-semibold text-sm inline-flex items-center gap-2">
                    <Camera size={14} />
                    Ajouter pièce
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {createOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="w-full max-w-3xl rounded-3xl border border-gb-border bg-gb-surface-solid p-5 md:p-6 max-h-[90vh] overflow-auto">
            <div className="flex items-center justify-between gap-3 mb-4">
              <h3 className="text-xl font-black text-gb-text">Nouveau rapport de contrôle</h3>
              <button onClick={() => setCreateOpen(false)} className="h-8 px-3 rounded-lg border border-gb-border text-sm">Fermer</button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-gb-muted">Lot</label>
                <select value={newReport.lot_id} onChange={(e) => setNewReport((p: any) => ({ ...p, lot_id: e.target.value }))} className="mt-1 w-full h-10 rounded-xl border border-gb-border bg-gb-app px-3 text-sm">
                  <option value="">Aucun</option>
                  {lots.map((l) => <option key={l.id} value={l.id}>{l.lot_number ? `${l.lot_number} - ` : ""}{l.name}</option>)}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-gb-muted">Tâche</label>
                <select value={newReport.task_id} onChange={(e) => setNewReport((p: any) => ({ ...p, task_id: e.target.value }))} className="mt-1 w-full h-10 rounded-xl border border-gb-border bg-gb-app px-3 text-sm">
                  <option value="">Aucune</option>
                  {tasks.map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-gb-muted">Titre</label>
                <input value={newReport.title} onChange={(e) => setNewReport((p: any) => ({ ...p, title: e.target.value }))} className="mt-1 w-full h-10 rounded-xl border border-gb-border bg-gb-app px-3 text-sm" />
              </div>

              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-gb-muted">Discipline</label>
                <input value={newReport.discipline} onChange={(e) => setNewReport((p: any) => ({ ...p, discipline: e.target.value }))} className="mt-1 w-full h-10 rounded-xl border border-gb-border bg-gb-app px-3 text-sm" />
              </div>

              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-gb-muted">Type</label>
                <select value={newReport.type} onChange={(e) => setNewReport((p: any) => ({ ...p, type: e.target.value }))} className="mt-1 w-full h-10 rounded-xl border border-gb-border bg-gb-app px-3 text-sm">
                  {TYPES.map((t) => <option key={t} value={t}>{TYPE_LABELS[t]}</option>)}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-gb-muted">Sévérité</label>
                <select value={newReport.severity} onChange={(e) => setNewReport((p: any) => ({ ...p, severity: e.target.value }))} className="mt-1 w-full h-10 rounded-xl border border-gb-border bg-gb-app px-3 text-sm">
                  {SEVERITIES.map((s) => <option key={s} value={s}>{SEVERITY_LABELS[s]}</option>)}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-gb-muted">Statut initial</label>
                <select value={newReport.status} onChange={(e) => setNewReport((p: any) => ({ ...p, status: e.target.value }))} className="mt-1 w-full h-10 rounded-xl border border-gb-border bg-gb-app px-3 text-sm">
                  {STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-gb-muted">Localisation</label>
                <input value={newReport.location} onChange={(e) => setNewReport((p: any) => ({ ...p, location: e.target.value }))} className="mt-1 w-full h-10 rounded-xl border border-gb-border bg-gb-app px-3 text-sm" />
              </div>

              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-gb-muted">Date rapport</label>
                <input type="date" value={newReport.report_date} onChange={(e) => setNewReport((p: any) => ({ ...p, report_date: e.target.value }))} className="mt-1 w-full h-10 rounded-xl border border-gb-border bg-gb-app px-3 text-sm" />
              </div>

              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-gb-muted">Échéance traitement</label>
                <input type="date" value={newReport.due_date} onChange={(e) => setNewReport((p: any) => ({ ...p, due_date: e.target.value }))} className="mt-1 w-full h-10 rounded-xl border border-gb-border bg-gb-app px-3 text-sm" />
              </div>
            </div>

            <div className="mt-3">
              <label className="text-[10px] font-black uppercase tracking-widest text-gb-muted">Constat</label>
              <textarea rows={5} value={newReport.comment} onChange={(e) => setNewReport((p: any) => ({ ...p, comment: e.target.value }))} className="mt-1 w-full rounded-xl border border-gb-border bg-gb-app px-3 py-2 text-sm" />
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => setCreateOpen(false)} className="h-10 px-4 rounded-xl border border-gb-border font-semibold">Annuler</button>
              <button onClick={submitReport} disabled={saving} className="h-10 px-4 rounded-xl bg-gb-primary text-gb-inverse font-bold inline-flex items-center gap-2 disabled:opacity-60">
                {saving ? <Loader2 className="animate-spin" size={16} /> : <CheckCheck size={16} />}
                Créer
              </button>
            </div>
          </div>
        </div>
      )}

      {saving && (
        <div className="fixed bottom-5 right-5 rounded-xl bg-gb-surface-solid border border-gb-border px-4 py-2 text-sm inline-flex items-center gap-2 shadow-xl">
          <CircleDot size={14} className="text-gb-primary animate-pulse" />
          Enregistrement en cours...
        </div>
      )}
    </div>
  );
}
