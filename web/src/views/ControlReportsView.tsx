import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import {
  ClipboardList, Plus, X, Loader2, AlertCircle, CheckCircle2, XCircle, Clock,
  Calendar, MapPin, User, Eye, Pencil, Archive, Activity,
  ShieldCheck, AlertTriangle, ChevronDown, Filter, Search, RotateCcw,
  ThumbsUp, ThumbsDown, Paperclip, Wrench, History, ChevronRight,
  Link2, Trash2, TrendingUp, Badge, BarChart3, Zap, Target, CheckCheck,
  SlidersHorizontal, Tag, Building2, BookOpen, FileWarning, FileDown
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { apiFetch, API_BASE } from "../lib/api";
import { usePermissions } from "../contexts/AuthContext";
import { format, isAfter, parseISO } from "date-fns";
import { fr } from "date-fns/locale";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Project { id: number; code: string; title: string; phase?: string | null; }
interface Lot { id: number; lot_number: string; name: string; }
interface Task { id: number; title: string; status: string; }
interface UserOption { id: number; firstname?: string; lastname?: string; email?: string; }

interface ControlReportAction {
  id: number;
  control_report_id: number;
  subject: string;
  description?: string;
  action_type?: string;
  priority?: string;
  responsible_id?: number;
  owner_name?: string;
  due_date?: string;
  status: string;
  completed_at?: string;
  verified_at?: string;
  verification_note?: string;
  is_overdue?: boolean;
  reopened_count?: number;
  sequence_no?: number;
  created_at: string;
  updated_at: string;
  responsible?: { id: number; firstname: string; lastname: string };
}

interface ControlReportAttachment {
  id: number;
  control_report_id: number;
  url: string;
  storage_key?: string;
  file_name?: string;
  file_type?: string;
  mime_type?: string;
  file_size_bytes?: number;
  source: string;
  caption?: string;
  taken_at?: string;
  is_primary_evidence?: boolean;
  uploaded_by?: number;
  created_at: string;
  updated_at: string;
}

interface ControlReportStatusHistory {
  id: number;
  from_status?: string;
  to_status: string;
  reason?: string;
  comment?: string;
  changed_by?: number;
  sla_breached?: boolean;
  created_at: string;
}

interface ControlReport {
  id: number;
  reference?: string;
  title?: string;
  type: string;
  category?: string;
  status: string;
  severity: string;
  priority: string;
  discipline?: string;
  sub_discipline?: string;
  location?: string;
  zone_code?: string;
  source_channel?: string;
  inspection_method?: string;
  observed_by_name?: string;
  report_date?: string;
  due_date?: string;
  target_response_at?: string;
  target_resolution_at?: string;
  first_response_at?: string;
  last_status_changed_at?: string;
  resolved_at?: string;
  closed_at?: string;
  comment?: string;
  root_cause?: string;
  corrective_action_summary?: string;
  preventive_action_summary?: string;
  closure_summary?: string;
  sla_breached: boolean;
  escalation_level?: number;
  open_actions_count?: number;
  evidence_count?: number;
  revision_no?: number;
  approval_workflow_status?: string;
  rejected_reason?: string;
  created_at: string;
  updated_at: string;
  project?: { id: number; code: string; title: string };
  lot?: { id: number; lot_number: string; name: string } | null;
  task?: { id: number; title: string; status: string } | null;
  createdBy?: { id: number; firstname: string; lastname: string } | null;
  approvedBy?: { id: number; firstname: string; lastname: string } | null;
  assignedTo?: { id: number; firstname: string; lastname: string } | null;
  actions?: ControlReportAction[];
  attachments?: ControlReportAttachment[];
  status_history?: ControlReportStatusHistory[];
}

// ─── Config ──────────────────────────────────────────────────────────────────

const CR_TYPES = [
  { value: "QUALITY",        label: "Qualité",           icon: "🔍", color: "text-blue-500",    bg: "bg-blue-500/10 border-blue-500/20" },
  { value: "SAFETY",         label: "Sécurité",          icon: "🦺", color: "text-red-500",     bg: "bg-red-500/10 border-red-500/20" },
  { value: "ENVIRONMENTAL",  label: "Environnement",     icon: "🌿", color: "text-emerald-500", bg: "bg-emerald-500/10 border-emerald-500/20" },
  { value: "STRUCTURAL",     label: "Structurel",        icon: "🏗️", color: "text-amber-500",   bg: "bg-amber-500/10 border-amber-500/20" },
  { value: "ELECTRICAL",     label: "Électrique",        icon: "⚡", color: "text-yellow-500",  bg: "bg-yellow-500/10 border-yellow-500/20" },
  { value: "PLUMBING",       label: "Plomberie",         icon: "🔧", color: "text-cyan-500",    bg: "bg-cyan-500/10 border-cyan-500/20" },
  { value: "FINISHING",      label: "Finitions",         icon: "🎨", color: "text-purple-500",  bg: "bg-purple-500/10 border-purple-500/20" },
  { value: "COMMISSIONING",  label: "Commissionnement",  icon: "🚀", color: "text-indigo-500",  bg: "bg-indigo-500/10 border-indigo-500/20" },
  { value: "AUDIT",          label: "Audit",             icon: "📋", color: "text-slate-500",   bg: "bg-slate-500/10 border-slate-500/20" },
  { value: "OTHER",          label: "Autre",             icon: "📌", color: "text-gb-muted",    bg: "bg-gb-surface-hover border-gb-border" },
];

const CR_SEVERITIES = [
  { value: "LOW",      label: "Faible",   dot: "bg-slate-400",  badge: "bg-slate-400/10 text-slate-400 border-slate-400/20" },
  { value: "MEDIUM",   label: "Modéré",   dot: "bg-amber-400",  badge: "bg-amber-400/10 text-amber-500 border-amber-400/20" },
  { value: "HIGH",     label: "Élevé",    dot: "bg-orange-500", badge: "bg-orange-500/10 text-orange-500 border-orange-500/20" },
  { value: "CRITICAL", label: "Critique", dot: "bg-red-500",    badge: "bg-red-500/10 text-red-500 border-red-500/20 animate-pulse" },
];

const CR_PRIORITIES = [
  { value: "LOW",      label: "Bas",     color: "text-slate-400",  bg: "bg-slate-400/10 border-slate-400/20" },
  { value: "MEDIUM",   label: "Moyen",   color: "text-amber-500",  bg: "bg-amber-500/10 border-amber-500/20" },
  { value: "HIGH",     label: "Élevé",   color: "text-orange-500", bg: "bg-orange-500/10 border-orange-500/20" },
  { value: "CRITICAL", label: "Urgent",  color: "text-red-500",    bg: "bg-red-500/10 border-red-500/20" },
];

const CR_STATUSES = [
  { value: "DRAFT",           label: "Brouillon",      icon: BookOpen,      color: "text-slate-400",   bg: "bg-slate-400/10 border-slate-400/20" },
  { value: "OPEN",            label: "Ouvert",         icon: AlertCircle,   color: "text-red-500",     bg: "bg-red-500/10 border-red-500/20" },
  { value: "UNDER_REVIEW",    label: "En revue",       icon: Eye,           color: "text-blue-400",    bg: "bg-blue-400/10 border-blue-400/20" },
  { value: "IN_PROGRESS",     label: "En cours",       icon: Activity,      color: "text-blue-500",    bg: "bg-blue-500/10 border-blue-500/20" },
  { value: "ACTION_REQUIRED", label: "Action requise", icon: AlertTriangle, color: "text-amber-500",   bg: "bg-amber-500/10 border-amber-500/20" },
  { value: "RESOLVED",        label: "Résolu",         icon: CheckCircle2,  color: "text-teal-500",    bg: "bg-teal-500/10 border-teal-500/20" },
  { value: "APPROVED",        label: "Approuvé",       icon: ShieldCheck,   color: "text-emerald-500", bg: "bg-emerald-500/10 border-emerald-500/20" },
  { value: "REJECTED",        label: "Rejeté",         icon: XCircle,       color: "text-red-500",     bg: "bg-red-500/10 border-red-500/20" },
  { value: "CLOSED",          label: "Clôturé",        icon: CheckCheck,    color: "text-slate-400",   bg: "bg-slate-400/10 border-slate-400/20" },
];

const ACTION_TYPES = [
  { value: "CORRECTIVE",    label: "Corrective" },
  { value: "PREVENTIVE",    label: "Préventive" },
  { value: "IMPROVEMENT",   label: "Amélioration" },
  { value: "SURVEILLANCE",  label: "Surveillance" },
];

const ACTION_STATUSES = [
  { value: "OPEN",        label: "Ouverte",   dot: "bg-red-500",     badge: "bg-red-500/10 text-red-500 border-red-500/20" },
  { value: "IN_PROGRESS", label: "En cours",  dot: "bg-blue-500",    badge: "bg-blue-500/10 text-blue-500 border-blue-500/20" },
  { value: "DONE",        label: "Réalisée",  dot: "bg-emerald-500", badge: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" },
  { value: "CANCELLED",   label: "Annulée",   dot: "bg-slate-400",   badge: "bg-slate-400/10 text-slate-400 border-slate-400/20" },
];

const SOURCE_CHANNELS = [
  { value: "MANUAL",     label: "Saisie manuelle" },
  { value: "INSPECTION", label: "Inspection" },
  { value: "AUDIT",      label: "Audit" },
  { value: "CLIENT",     label: "Client" },
  { value: "GLPI",       label: "GLPI" },
  { value: "OTHER",      label: "Autre" },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

const getTypeMeta    = (v: string) => CR_TYPES.find(t => t.value === v)      ?? CR_TYPES[0];
const getSeverityMeta= (v: string) => CR_SEVERITIES.find(s => s.value === v) ?? CR_SEVERITIES[1];
const getPriorityMeta= (v: string) => CR_PRIORITIES.find(p => p.value === v) ?? CR_PRIORITIES[1];
const getStatusMeta  = (v: string) => CR_STATUSES.find(s => s.value === v)   ?? CR_STATUSES[0];
const getActionStatus= (v: string) => ACTION_STATUSES.find(s => s.value === v) ?? ACTION_STATUSES[0];

function isOverdue(due?: string | null) {
  if (!due) return false;
  return isAfter(new Date(), parseISO(due));
}

function fmtDate(d?: string | null) {
  if (!d) return "—";
  try { return format(parseISO(d), "d MMM yyyy", { locale: fr }); } catch { return d; }
}

function fmtDateTime(d?: string | null) {
  if (!d) return "—";
  try { return format(parseISO(d), "d MMM yyyy HH:mm", { locale: fr }); } catch { return d; }
}

// ─── Badges ──────────────────────────────────────────────────────────────────

function TypeBadge({ type }: { type: string }) {
  const m = getTypeMeta(type);
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2 py-0.5 rounded-full border ${m.bg} ${m.color}`}>
      <span>{m.icon}</span>{m.label}
    </span>
  );
}

function SeverityBadge({ severity }: { severity: string }) {
  const m = getSeverityMeta(severity);
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2 py-0.5 rounded-full border ${m.badge}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${m.dot}`} />{m.label}
    </span>
  );
}

function PriorityBadge({ priority }: { priority: string }) {
  const m = getPriorityMeta(priority);
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full border ${m.bg} ${m.color}`}>
      <Zap size={9} />{m.label}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const m = getStatusMeta(status);
  const Icon = m.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2 py-0.5 rounded-full border ${m.bg} ${m.color}`}>
      <Icon size={10} />{m.label}
    </span>
  );
}

function ActionStatusBadge({ status }: { status: string }) {
  const m = getActionStatus(status);
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2 py-0.5 rounded-full border ${m.badge}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${m.dot}`} />{m.label}
    </span>
  );
}

// ─── KPI Card ────────────────────────────────────────────────────────────────

function KpiCard({ label, value, sub, icon: Icon, accent }: {
  label: string; value: number | string; sub?: string;
  icon: React.FC<React.SVGProps<SVGSVGElement> & { size?: number }>; accent: string;
}) {
  return (
    <div className="bg-gb-surface-solid border border-gb-border rounded-2xl p-4 flex items-center gap-3">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${accent}`}>
        <Icon size={18} />
      </div>
      <div className="min-w-0">
        <p className="text-xl font-black text-gb-text">{value}</p>
        <p className="text-[10px] font-bold text-gb-muted uppercase tracking-wider truncate">{label}</p>
        {sub && <p className="text-[10px] text-gb-muted truncate">{sub}</p>}
      </div>
    </div>
  );
}

// ─── Field Row ───────────────────────────────────────────────────────────────

function InfoTile({ icon: Icon, label, value }: {
  icon: React.FC<React.SVGProps<SVGSVGElement> & { size?: number }>;
  label: string; value: React.ReactNode;
}) {
  return (
    <div className="bg-gb-surface-solid border border-gb-border rounded-xl p-3">
      <p className="text-[10px] font-bold text-gb-muted uppercase tracking-widest mb-1 flex items-center gap-1">
        <Icon size={10} />{label}
      </p>
      <div className="text-sm font-semibold text-gb-text">{value}</div>
    </div>
  );
}

// ─── Create / Edit Modal ──────────────────────────────────────────────────────

const EMPTY_FORM = {
  project_id: "", lot_id: "", task_id: "", task_label: "",
  title: "", type: "QUALITY", category: "",
  severity: "MEDIUM", priority: "MEDIUM",
  discipline: "", sub_discipline: "",
  location: "", zone_code: "",
  source_channel: "MANUAL", inspection_method: "",
  report_date: "", due_date: "",
  target_response_at: "", target_resolution_at: "",
  observed_by_name: "",
  comment: "", root_cause: "",
  corrective_action_summary: "", preventive_action_summary: "",
  status: "DRAFT",
};

function CreateEditModal({
  initial, projects, onClose, onSaved,
}: {
  initial?: ControlReport | null;
  projects: Project[];
  onClose: () => void;
  onSaved: (r: ControlReport) => void;
}) {
  const isEdit = Boolean(initial);
  const [form, setForm] = useState({ ...EMPTY_FORM, ...(initial ? {
    project_id: String(initial.project?.id ?? ""),
    lot_id:     String(initial.lot?.id ?? ""),
    task_id:    String(initial.task?.id ?? ""),
    task_label: "",
    title:      initial.title ?? "",
    type:       initial.type ?? "QUALITY",
    category:   initial.category ?? "",
    severity:   initial.severity ?? "MEDIUM",
    priority:   initial.priority ?? "MEDIUM",
    discipline: initial.discipline ?? "",
    sub_discipline: initial.sub_discipline ?? "",
    location:   initial.location ?? "",
    zone_code:  initial.zone_code ?? "",
    source_channel:   initial.source_channel   ?? "MANUAL",
    inspection_method: initial.inspection_method ?? "",
    report_date: initial.report_date ? initial.report_date.substring(0, 10) : "",
    due_date:    initial.due_date    ? initial.due_date.substring(0, 10)    : "",
    target_response_at: initial.target_response_at ? initial.target_response_at.substring(0, 10) : "",
    target_resolution_at: initial.target_resolution_at ? initial.target_resolution_at.substring(0, 10) : "",
    observed_by_name: initial.observed_by_name ?? "",
    comment:     initial.comment ?? "",
    root_cause:  initial.root_cause ?? "",
    corrective_action_summary:  initial.corrective_action_summary  ?? "",
    preventive_action_summary:  initial.preventive_action_summary  ?? "",
    status:      initial.status ?? "DRAFT",
  } : {}) });

  const [lots, setLots]   = useState<Lot[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState("");

  // Load lots and tasks when project changes
  useEffect(() => {
    if (!form.project_id) { setLots([]); setTasks([]); return; }
    apiFetch(`${API_BASE}/projects/${form.project_id}/lots`).then(r => r.json()).then(d => {
      setLots(Array.isArray(d) ? d : d.data ?? d.lots ?? []);
    }).catch(() => setLots([]));
    apiFetch(`${API_BASE}/projects/${form.project_id}/tasks`).then(r => r.json()).then(d => {
      setTasks(Array.isArray(d) ? d : d.data ?? d.tasks ?? []);
    }).catch(() => setTasks([]));
  }, [form.project_id]);

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.project_id) { setError("Veuillez sélectionner un projet."); return; }
    if (!form.comment.trim()) { setError("Le champ Constat est obligatoire."); return; }
    setSaving(true); setError("");
    try {
      const payload: Record<string, unknown> = {
        project_id: Number(form.project_id),
        title:      form.title || null,
        type:       form.type,
        category:   form.category || null,
        severity:   form.severity,
        priority:   form.priority,
        discipline: form.discipline || null,
        sub_discipline: form.sub_discipline || null,
        location:   form.location || null,
        zone_code:  form.zone_code || null,
        source_channel:    form.source_channel   || null,
        inspection_method: form.inspection_method || null,
        report_date:       form.report_date || null,
        due_date:          form.due_date    || null,
        target_response_at:   form.target_response_at   || null,
        target_resolution_at: form.target_resolution_at || null,
        observed_by_name: form.observed_by_name || null,
        comment:     form.comment,
        root_cause:  form.root_cause  || null,
        corrective_action_summary: form.corrective_action_summary  || null,
        preventive_action_summary: form.preventive_action_summary  || null,
        status: form.status,
      };
      if (form.lot_id)  payload.lot_id  = Number(form.lot_id);
      if (form.task_id && form.task_id !== "UNPLANNED") payload.task_id = Number(form.task_id);
      // Tâche imprévue : on stocke le libellé dans le titre si le titre est vide
      if (form.task_id === "UNPLANNED" && form.task_label.trim() && !form.title.trim()) {
        payload.title = `[Imprévue] ${form.task_label.trim()}`;
      }

      const url    = isEdit ? `${API_BASE}/control-reports/${initial!.id}` : `${API_BASE}/control-reports`;
      const method = isEdit ? "PUT" : "POST";
      const res  = await apiFetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur serveur");
      const saved = (data && typeof data === "object" && "data" in data)
        ? (data as { data: ControlReport }).data
        : (data as ControlReport);
      if (!saved || typeof saved.id !== "number") {
        throw new Error("Réponse serveur invalide après enregistrement.");
      }
      onSaved(saved);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setSaving(false);
    }
  };

  const renderInput = (label: string, k: keyof typeof form, type = "text", required = false) => (
    <div>
      <label className="block text-xs font-bold text-gb-muted uppercase tracking-wider mb-1">{label}{required && <span className="text-gb-danger ml-1">*</span>}</label>
      <input
        type={type}
        value={form[k]}
        onChange={e => set(k, e.target.value)}
        required={required}
        className="w-full px-3 py-2 bg-gb-surface-solid border border-gb-border rounded-xl text-sm text-gb-text placeholder-gb-muted/50 focus:outline-none focus:border-gb-primary transition-colors"
      />
    </div>
  );

  const renderSelect = (label: string, k: keyof typeof form, options: { value: string; label: string }[], required = false) => (
    <div>
      <label className="block text-xs font-bold text-gb-muted uppercase tracking-wider mb-1">{label}{required && <span className="text-gb-danger ml-1">*</span>}</label>
      <select
        value={form[k]}
        onChange={e => set(k, e.target.value)}
        className="w-full px-3 py-2 bg-gb-surface-solid border border-gb-border rounded-xl text-sm text-gb-text focus:outline-none focus:border-gb-primary transition-colors"
      >
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );

  const renderTextarea = (label: string, k: keyof typeof form, required = false, rows = 3) => (
    <div>
      <label className="block text-xs font-bold text-gb-muted uppercase tracking-wider mb-1">{label}{required && <span className="text-gb-danger ml-1">*</span>}</label>
      <textarea
        value={form[k]}
        onChange={e => set(k, e.target.value)}
        required={required}
        rows={rows}
        className="w-full px-3 py-2 bg-gb-surface-solid border border-gb-border rounded-xl text-sm text-gb-text placeholder-gb-muted/50 focus:outline-none focus:border-gb-primary transition-colors resize-none"
      />
    </div>
  );

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-start justify-center p-4 overflow-y-auto"
    >
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <motion.div
        initial={{ scale: 0.96, y: 10 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.96, y: 10 }}
        className="relative w-full max-w-2xl my-6 bg-gb-app border border-gb-border rounded-2xl shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gb-border">
          <div>
            <h2 className="text-lg font-black text-gb-text">
              {isEdit ? "Modifier le rapport" : "Nouveau rapport de contrôle"}
            </h2>
            <p className="text-xs text-gb-muted mt-0.5">
              {isEdit ? `Réf. ${initial?.reference ?? `#${initial?.id}`}` : "Renseignez les informations du rapport de contrôle"}
            </p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl text-gb-muted hover:text-gb-text hover:bg-gb-surface-hover transition-colors">
            Fermer
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Legend */}
          <p className="text-[10px] text-gb-muted"><span className="text-gb-danger font-bold">*</span> Champs obligatoires</p>
          {/* Section : Identification */}
          <div>
            <p className="text-[10px] font-black text-gb-primary uppercase tracking-widest mb-3 flex items-center gap-1.5"><Tag size={10} />Identification</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-gb-muted uppercase tracking-wider mb-1">Projet <span className="text-gb-danger">*</span></label>
                <select value={form.project_id} onChange={e => set("project_id", e.target.value)} className="w-full px-3 py-2 bg-gb-surface-solid border border-gb-border rounded-xl text-sm text-gb-text focus:outline-none focus:border-gb-primary transition-colors">
                  <option value="">Sélectionner…</option>
                  {projects.map(p => <option key={p.id} value={p.id}>{p.code} — {p.title}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-gb-muted uppercase tracking-wider mb-1">Lot</label>
                <select value={form.lot_id} onChange={e => set("lot_id", e.target.value)} disabled={!form.project_id} className="w-full px-3 py-2 bg-gb-surface-solid border border-gb-border rounded-xl text-sm text-gb-text focus:outline-none focus:border-gb-primary transition-colors disabled:opacity-50">
                  <option value="">Aucun</option>
                  {lots.map(l => <option key={l.id} value={l.id}>{l.lot_number} — {l.name}</option>)}
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-gb-muted uppercase tracking-wider mb-1">Tâche</label>
                <select value={form.task_id} onChange={e => set("task_id", e.target.value)} disabled={!form.project_id} className="w-full px-3 py-2 bg-gb-surface-solid border border-gb-border rounded-xl text-sm text-gb-text focus:outline-none focus:border-gb-primary transition-colors disabled:opacity-50">
                  <option value="">Aucune</option>
                  <option value="UNPLANNED">⚠️ Tâche imprévue (hors planning)</option>
                  {tasks.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
                </select>
                {form.task_id === "UNPLANNED" && (
                  <input
                    type="text"
                    placeholder="Décrivez la tâche imprévue…"
                    value={form.task_label}
                    onChange={e => set("task_label", e.target.value)}
                    className="mt-2 w-full px-3 py-2 bg-gb-surface-solid border border-amber-500/40 rounded-xl text-sm text-gb-text placeholder-gb-muted/50 focus:outline-none focus:border-amber-500 transition-colors"
                  />
                )}
              </div>
              <div className="sm:col-span-2">
                {renderInput("Titre", "title")}
              </div>
            </div>
          </div>

          {/* Section : Classification */}
          <div>
            <p className="text-[10px] font-black text-gb-primary uppercase tracking-widest mb-3 flex items-center gap-1.5"><SlidersHorizontal size={10} />Classification</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {renderSelect("Type", "type", CR_TYPES.map(t => ({ value: t.value, label: `${t.icon} ${t.label}` })), true)}
              {renderSelect("Sévérité", "severity", CR_SEVERITIES.map(s => ({ value: s.value, label: s.label })), true)}
              {renderSelect("Priorité", "priority", CR_PRIORITIES.map(p => ({ value: p.value, label: p.label })), true)}
              {renderInput("Discipline", "discipline")}
              {renderInput("Sous-discipline", "sub_discipline")}
              {renderInput("Catégorie", "category")}
            </div>
          </div>

          {/* Section : Localisation & Source */}
          <div>
            <p className="text-[10px] font-black text-gb-primary uppercase tracking-widest mb-3 flex items-center gap-1.5"><MapPin size={10} />Localisation & Source</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {renderInput("Localisation", "location")}
              {renderInput("Zone / Repère", "zone_code")}
              {renderInput("Observé par", "observed_by_name")}
              {renderSelect("Canal source", "source_channel", SOURCE_CHANNELS)}
              {renderInput("Méthode inspection", "inspection_method")}
              {isEdit && renderSelect("Statut", "status", CR_STATUSES.map(s => ({ value: s.value, label: s.label })))}
            </div>
          </div>

          {/* Section : Dates */}
          <div>
            <p className="text-[10px] font-black text-gb-primary uppercase tracking-widest mb-3 flex items-center gap-1.5"><Calendar size={10} />Dates</p>
            <div className="grid grid-cols-2 gap-3">
              {renderInput("Date rapport", "report_date", "date")}
              {renderInput("Échéance traitement", "due_date", "date")}
              {renderInput("Cible 1ère réponse", "target_response_at", "date")}
              {renderInput("Cible résolution", "target_resolution_at", "date")}
            </div>
          </div>

          {/* Section : Constatations */}
          <div>
            <p className="text-[10px] font-black text-gb-primary uppercase tracking-widest mb-3 flex items-center gap-1.5"><FileWarning size={10} />Constatations</p>
            <div className="space-y-3">
              {renderTextarea("Constat / Description *", "comment", true, 4)}
              {renderTextarea("Cause racine (REX)", "root_cause", false, 2)}
              {renderTextarea("Action corrective résumée", "corrective_action_summary", false, 2)}
              {renderTextarea("Action préventive résumée", "preventive_action_summary", false, 2)}
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-sm text-gb-danger bg-gb-danger/10 border border-gb-danger/20 rounded-xl px-4 py-3">
              <AlertCircle size={14} />{error}
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl border border-gb-border text-gb-muted font-bold text-sm hover:bg-gb-surface-hover transition-colors">
              Annuler
            </button>
            <button type="submit" disabled={saving} className="px-5 py-2 rounded-xl bg-gb-primary text-gb-inverse font-black text-sm hover:bg-gb-primary/90 transition-colors disabled:opacity-60 flex items-center gap-2">
              {saving ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
              {isEdit ? "Enregistrer" : "Créer"}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}

// ─── Reject Modal ─────────────────────────────────────────────────────────────

function RejectModal({ report, onClose, onRejected }: {
  report: ControlReport; onClose: () => void; onRejected: (r: ControlReport) => void;
}) {
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) { setError("Motif obligatoire"); return; }
    setSaving(true); setError("");
    try {
      const res  = await apiFetch(`${API_BASE}/control-reports/${report.id}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rejected_reason: reason }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur");
      onRejected(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erreur");
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <motion.div
        initial={{ scale: 0.96, y: 10 }} animate={{ scale: 1, y: 0 }}
        className="relative w-full max-w-md bg-gb-app border border-gb-danger/30 rounded-2xl shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-gb-danger/10 flex items-center justify-center">
              <XCircle size={18} className="text-gb-danger" />
            </div>
            <div>
              <h3 className="text-base font-black text-gb-text">Rejeter le rapport</h3>
              <p className="text-xs text-gb-muted">{report.reference ?? `#${report.id}`}</p>
            </div>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gb-muted uppercase tracking-wider mb-1">Motif du rejet <span className="text-gb-danger">*</span></label>
              <textarea
                value={reason} onChange={e => setReason(e.target.value)} rows={3} required
                placeholder="Expliquez pourquoi le rapport est rejeté…"
                className="w-full px-3 py-2 bg-gb-surface-solid border border-gb-border rounded-xl text-sm text-gb-text placeholder-gb-muted/50 focus:outline-none focus:border-gb-danger resize-none transition-colors"
              />
            </div>
            {error && <p className="text-xs text-gb-danger">{error}</p>}
            <div className="flex items-center justify-end gap-3">
              <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl border border-gb-border text-gb-muted font-bold text-sm hover:bg-gb-surface-hover transition-colors">Annuler</button>
              <button type="submit" disabled={saving} className="px-4 py-2 rounded-xl bg-gb-danger text-white font-black text-sm hover:bg-gb-danger/80 disabled:opacity-60 flex items-center gap-2 transition-colors">
                {saving ? <Loader2 size={13} className="animate-spin" /> : <XCircle size={13} />} Rejeter
              </button>
            </div>
          </form>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Actions Panel ────────────────────────────────────────────────────────────

function ActionsPanel({ reportId, canEdit }: { reportId: number; canEdit: boolean }) {
  const [actions, setActions] = useState<ControlReportAction[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [newAction, setNewAction] = useState({ subject: "", action_type: "CORRECTIVE", priority: "MEDIUM", due_date: "", description: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState("");

  const load = useCallback(() => {
    setLoading(true);
    apiFetch(`${API_BASE}/control-reports/${reportId}/actions`).then(r => r.json()).then(d => {
      setActions(Array.isArray(d) ? d : []);
    }).catch(() => setActions([])).finally(() => setLoading(false));
  }, [reportId]);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAction.subject.trim()) { setError("Sujet obligatoire"); return; }
    setSaving(true); setError("");
    try {
      const res  = await apiFetch(`${API_BASE}/control-reports/${reportId}/actions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...newAction, due_date: newAction.due_date || null }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur");
      setShowForm(false);
      setNewAction({ subject: "", action_type: "CORRECTIVE", priority: "MEDIUM", due_date: "", description: "" });
      load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erreur");
    } finally { setSaving(false); }
  };

  const advanceStatus = async (action: ControlReportAction) => {
    const next: Record<string, string> = { OPEN: "IN_PROGRESS", IN_PROGRESS: "DONE" };
    const nextStatus = next[action.status];
    if (!nextStatus) return;
    await apiFetch(`${API_BASE}/control-reports/${reportId}/actions/${action.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: nextStatus }),
    });
    load();
  };

  const deleteAction = async (id: number) => {
    if (!window.confirm("Archiver cette action ?")) return;
    await apiFetch(`${API_BASE}/control-reports/${reportId}/actions/${id}`, { method: "DELETE" });
    load();
  };

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="animate-spin text-gb-muted" size={20} /></div>;

  return (
    <div className="space-y-3">
      {actions.length === 0 && !showForm && (
        <div className="text-center py-8">
          <Wrench size={28} className="mx-auto text-gb-muted/30 mb-2" />
          <p className="text-sm text-gb-muted">Aucune action corrective</p>
        </div>
      )}
      {actions.map(a => (
        <div key={a.id} className={`bg-gb-surface-solid border rounded-xl p-3 ${a.is_overdue && a.status !== "DONE" && a.status !== "CANCELLED" ? "border-red-500/30" : "border-gb-border"}`}>
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className="text-xs font-black text-gb-text truncate">{a.subject}</span>
                {a.is_overdue && a.status !== "DONE" && a.status !== "CANCELLED" && (
                  <span className="text-[10px] font-bold text-red-500 bg-red-500/10 border border-red-500/20 px-1.5 py-0.5 rounded-full">EN RETARD</span>
                )}
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <ActionStatusBadge status={a.status} />
                {a.due_date && <span className={`text-[10px] text-gb-muted flex items-center gap-1`}><Calendar size={9} />{fmtDate(a.due_date)}</span>}
                {a.responsible && <span className="text-[10px] text-gb-muted flex items-center gap-1"><User size={9} />{a.responsible.firstname} {a.responsible.lastname}</span>}
              </div>
              {a.description && <p className="text-xs text-gb-muted mt-1 truncate">{a.description}</p>}
            </div>
            {canEdit && (
              <div className="flex items-center gap-1 shrink-0">
                {a.status !== "DONE" && a.status !== "CANCELLED" && (
                  <button onClick={() => advanceStatus(a)} title="Avancer l'action" className="inline-flex items-center gap-1 px-2 py-1 rounded-lg border border-emerald-500/20 text-[11px] font-bold text-emerald-500 hover:bg-emerald-500/10 transition-colors">
                    <ChevronRight size={13} />
                    Avancer
                  </button>
                )}
                <button onClick={() => deleteAction(a.id)} title="Archiver l'action" className="inline-flex items-center gap-1 px-2 py-1 rounded-lg border border-gb-danger/20 text-[11px] font-bold text-gb-danger hover:bg-gb-danger/10 transition-colors">
                  <Trash2 size={12} />
                  Archiver
                </button>
              </div>
            )}
          </div>
        </div>
      ))}

      {canEdit && !showForm && (
        <button onClick={() => setShowForm(true)} className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 border-dashed border-gb-border text-gb-muted hover:border-gb-primary hover:text-gb-primary transition-colors text-sm font-bold">
          <Plus size={14} />Ajouter une action
        </button>
      )}

      {showForm && (
        <form onSubmit={handleCreate} className="bg-gb-surface-solid border border-gb-primary/30 rounded-xl p-3 space-y-2">
          <input
            value={newAction.subject} onChange={e => setNewAction(f => ({ ...f, subject: e.target.value }))} required
            placeholder="Sujet de l'action *" className="w-full px-3 py-2 bg-gb-app border border-gb-border rounded-lg text-sm text-gb-text placeholder-gb-muted/50 focus:outline-none focus:border-gb-primary transition-colors"
          />
          <div className="grid grid-cols-2 gap-2">
            <select value={newAction.action_type} onChange={e => setNewAction(f => ({ ...f, action_type: e.target.value }))} className="px-2 py-1.5 bg-gb-app border border-gb-border rounded-lg text-xs text-gb-text focus:outline-none">
              {ACTION_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
            <select value={newAction.priority} onChange={e => setNewAction(f => ({ ...f, priority: e.target.value }))} className="px-2 py-1.5 bg-gb-app border border-gb-border rounded-lg text-xs text-gb-text focus:outline-none">
              {CR_PRIORITIES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
            </select>
          </div>
          <input type="date" value={newAction.due_date} onChange={e => setNewAction(f => ({ ...f, due_date: e.target.value }))} className="w-full px-3 py-1.5 bg-gb-app border border-gb-border rounded-lg text-xs text-gb-text focus:outline-none" />
          <textarea value={newAction.description} onChange={e => setNewAction(f => ({ ...f, description: e.target.value }))} rows={2} placeholder="Description (optionnel)" className="w-full px-3 py-2 bg-gb-app border border-gb-border rounded-lg text-xs text-gb-text placeholder-gb-muted/50 focus:outline-none resize-none" />
          {error && <p className="text-xs text-gb-danger">{error}</p>}
          <div className="flex gap-2">
            <button type="button" onClick={() => { setShowForm(false); setError(""); }} className="flex-1 py-1.5 rounded-lg border border-gb-border text-xs text-gb-muted hover:bg-gb-surface-hover transition-colors">Annuler</button>
            <button type="submit" disabled={saving} className="flex-1 py-1.5 rounded-lg bg-gb-primary text-gb-inverse font-black text-xs hover:bg-gb-primary/90 disabled:opacity-60 flex items-center justify-center gap-1 transition-colors">
              {saving ? <Loader2 size={11} className="animate-spin" /> : <Plus size={11} />}Ajouter
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

// ─── Attachments Panel ────────────────────────────────────────────────────────

function AttachmentsPanel({ reportId, canEdit }: { reportId: number; canEdit: boolean }) {
  const [attachments, setAttachments] = useState<ControlReportAttachment[]>([]);
  const [loading, setLoading]  = useState(true);
  const [showForm, setShowForm]= useState(false);
  const [form, setForm]        = useState({ files: [] as File[], file_name: "", source: "DOCUMENT", caption: "" });
  const [saving, setSaving]    = useState(false);
  const [error, setError]      = useState("");

  const load = useCallback(() => {
    setLoading(true);
    apiFetch(`${API_BASE}/control-reports/${reportId}/attachments`).then(r => r.json()).then(d => {
      setAttachments(Array.isArray(d) ? d : []);
    }).catch(() => setAttachments([])).finally(() => setLoading(false));
  }, [reportId]);

  useEffect(() => { load(); }, [load]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.files.length) { setError("Fichier obligatoire"); return; }
    setSaving(true); setError("");
    try {
      const body = new FormData();
      form.files.forEach(f => body.append("files", f));
      if (form.files.length === 1 && form.file_name.trim()) body.append("file_name", form.file_name.trim());
      body.append("source", form.source);
      if (form.caption.trim()) body.append("caption", form.caption.trim());

      const res  = await apiFetch(`${API_BASE}/control-reports/${reportId}/attachments/upload`, {
        method: "POST",
        body,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur");
      setShowForm(false);
      setForm({ files: [], file_name: "", source: "DOCUMENT", caption: "" });
      load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erreur");
    } finally { setSaving(false); }
  };

  const openAttachment = async (attachment: ControlReportAttachment) => {
    try {
      if (/^https?:\/\//i.test(attachment.url)) {
        window.open(attachment.url, "_blank", "noopener,noreferrer");
        return;
      }

      const targetUrl = attachment.url.startsWith("/") ? `${API_BASE}${attachment.url.replace(/^\/api\/v1/, "")}` : attachment.url;
      const res = await apiFetch(targetUrl, { method: "GET" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Impossible d'ouvrir le fichier");
      }

      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      window.open(blobUrl, "_blank", "noopener,noreferrer");
      setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Impossible d'ouvrir la pièce jointe.");
    }
  };

  const deleteAttachment = async (id: number) => {
    if (!window.confirm("Supprimer cette pièce jointe ?")) return;
    await apiFetch(`${API_BASE}/control-reports/${reportId}/attachments/${id}`, { method: "DELETE" });
    load();
  };

  const isImage = (a: ControlReportAttachment) => {
    const mime = a.mime_type || "";
    const name = (a.file_name || "").toLowerCase();
    return mime.startsWith("image/") || name.endsWith(".jpg") || name.endsWith(".jpeg") || name.endsWith(".png") || name.endsWith(".webp");
  };

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="animate-spin text-gb-muted" size={20} /></div>;

  return (
    <div className="space-y-3">
      {attachments.length === 0 && !showForm && (
        <div className="text-center py-8">
          <Paperclip size={28} className="mx-auto text-gb-muted/30 mb-2" />
          <p className="text-sm text-gb-muted">Aucune pièce jointe</p>
        </div>
      )}
      <div className="grid grid-cols-1 gap-2">
        {attachments.map(a => (
          <div key={a.id} className="flex items-center gap-3 bg-gb-surface-solid border border-gb-border rounded-xl p-3">
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${isImage(a) ? "bg-purple-500/10 text-purple-500" : "bg-blue-500/10 text-blue-500"}`}>
              {isImage(a) ? "🖼️" : "📄"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-gb-text truncate">{a.file_name || a.url}</p>
              <div className="flex items-center gap-2 mt-0.5">
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full border ${a.source === "PHOTO" ? "bg-purple-500/10 text-purple-500 border-purple-500/20" : "bg-blue-500/10 text-blue-500 border-blue-500/20"}`}>
                  {a.source === "PHOTO" ? "Photo" : "Document"}
                </span>
                {a.caption && <span className="text-[10px] text-gb-muted truncate">{a.caption}</span>}
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button onClick={() => openAttachment(a)} className="flex items-center gap-1 px-2 py-1 rounded-lg text-gb-muted hover:text-gb-primary hover:bg-gb-primary/10 transition-colors text-xs font-medium">
                <Link2 size={12} />Ouvrir
              </button>
              {canEdit && (
                <button onClick={() => deleteAttachment(a.id)} className="flex items-center gap-1 px-2 py-1 rounded-lg text-gb-muted hover:text-gb-danger hover:bg-gb-danger/10 transition-colors text-xs font-medium">
                  <Trash2 size={12} />Supprimer
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {canEdit && !showForm && (
        <button onClick={() => setShowForm(true)} className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 border-dashed border-gb-border text-gb-muted hover:border-gb-primary hover:text-gb-primary transition-colors text-sm font-bold">
          <Plus size={14} />Ajouter une pièce jointe
        </button>
      )}

      {showForm && (
        <form onSubmit={handleAdd} className="bg-gb-surface-solid border border-gb-primary/30 rounded-xl p-3 space-y-2">
          <input type="file" multiple required onChange={e => setForm(f => ({ ...f, files: Array.from(e.target.files ?? []) }))} className="w-full px-3 py-2 bg-gb-app border border-gb-border rounded-lg text-sm text-gb-text file:mr-3 file:px-2 file:py-1 file:rounded-md file:border-0 file:bg-gb-primary/15 file:text-gb-primary file:font-bold" />
          <div className="grid grid-cols-2 gap-2">
            <input value={form.file_name} onChange={e => setForm(f => ({ ...f, file_name: e.target.value }))} placeholder="Nom du fichier" className="px-3 py-1.5 bg-gb-app border border-gb-border rounded-lg text-xs text-gb-text placeholder-gb-muted/50 focus:outline-none" />
            <select value={form.source} onChange={e => setForm(f => ({ ...f, source: e.target.value }))} className="px-2 py-1.5 bg-gb-app border border-gb-border rounded-lg text-xs text-gb-text focus:outline-none">
              <option value="DOCUMENT">Document</option>
              <option value="PHOTO">Photo</option>
            </select>
          </div>
          <input value={form.caption} onChange={e => setForm(f => ({ ...f, caption: e.target.value }))} placeholder="Légende (optionnel)" className="w-full px-3 py-1.5 bg-gb-app border border-gb-border rounded-lg text-xs text-gb-text placeholder-gb-muted/50 focus:outline-none" />
          {error && <p className="text-xs text-gb-danger">{error}</p>}
          <div className="flex gap-2">
            <button type="button" onClick={() => { setShowForm(false); setError(""); }} className="flex-1 py-1.5 rounded-lg border border-gb-border text-xs text-gb-muted hover:bg-gb-surface-hover transition-colors">Annuler</button>
            <button type="submit" disabled={saving} className="flex-1 py-1.5 rounded-lg bg-gb-primary text-gb-inverse font-black text-xs hover:bg-gb-primary/90 disabled:opacity-60 flex items-center justify-center gap-1 transition-colors">
              {saving ? <Loader2 size={11} className="animate-spin" /> : <Plus size={11} />}Ajouter
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

// ─── Status History Panel ─────────────────────────────────────────────────────

function StatusHistoryPanel({ history }: { history: ControlReportStatusHistory[] }) {
  if (history.length === 0) return (
    <div className="text-center py-8">
      <History size={28} className="mx-auto text-gb-muted/30 mb-2" />
      <p className="text-sm text-gb-muted">Aucun historique de statut</p>
    </div>
  );

  return (
    <div className="relative space-y-0">
      {history.map((h, i) => {
        const toMeta   = getStatusMeta(h.to_status);
        const fromMeta = h.from_status ? getStatusMeta(h.from_status) : null;
        const Icon = toMeta.icon;
        return (
          <div key={h.id} className="flex gap-3 pb-4">
            <div className="flex flex-col items-center">
              <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center shrink-0 ${toMeta.bg} border-current ${toMeta.color}`}>
                <Icon size={13} />
              </div>
              {i < history.length - 1 && <div className="w-0.5 flex-1 bg-gb-border mt-1 min-h-[16px]" />}
            </div>
            <div className="flex-1 min-w-0 pb-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`text-xs font-black ${toMeta.color}`}>{toMeta.label}</span>
                {fromMeta && <span className="text-xs text-gb-muted">← {fromMeta.label}</span>}
                {h.sla_breached && <span className="text-[10px] font-bold text-red-500 bg-red-500/10 border border-red-500/20 px-1.5 py-0.5 rounded-full">SLA dépassé</span>}
              </div>
              {h.reason && <p className="text-[11px] text-gb-muted mt-0.5">{h.reason}</p>}
              {h.comment && <p className="text-[11px] text-gb-text mt-0.5 italic">{h.comment}</p>}
              <p className="text-[10px] text-gb-muted/60 mt-1">{fmtDateTime(h.created_at)}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Detail Drawer ────────────────────────────────────────────────────────────

type DrawerTab = "details" | "actions" | "attachments" | "history";

function DetailDrawer({
  report, onClose, onEdit, onDelete, onApprove, onReject, onUpdated,
  canEdit, canDelete, canApprove,
}: {
  report: ControlReport;
  onClose: () => void;
  onEdit: (r: ControlReport) => void;
  onDelete: (id: number) => void;
  onApprove: (r: ControlReport) => void;
  onReject: (r: ControlReport) => void;
  onUpdated: (r: ControlReport) => void;
  canEdit: boolean;
  canDelete: boolean;
  canApprove: boolean;
}) {
  const [tab, setTab] = useState<DrawerTab>("details");
  const [detail, setDetail] = useState<ControlReport>(report);
  const [loading, setLoading] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [approving, setApproving] = useState(false);

  // Reload full detail on open
  useEffect(() => {
    setLoading(true);
    apiFetch(`${API_BASE}/control-reports/${report.id}`)
      .then(r => r.json())
      .then(d => { setDetail(d); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [report.id]);

  const handleApprove = async () => {
    if (!window.confirm("Approuver ce rapport ?")) return;
    setApproving(true);
    try {
      const res  = await apiFetch(`${API_BASE}/control-reports/${report.id}/approve`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) { alert(data.error || "Erreur"); return; }
      onApprove(data);
      setDetail(data);
    } finally { setApproving(false); }
  };

  const handleDownloadPdf = async () => {
    if (pdfLoading) return;
    setPdfLoading(true);
    try {
      const res = await apiFetch(`${API_BASE}/control-reports/${detail.id}/pdf`, { method: "GET" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Erreur lors de la génération du PDF");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${detail.reference ?? `CR-${detail.id}`}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Impossible de générer le PDF");
    } finally {
      setPdfLoading(false);
    }
  };

  const typeMeta = getTypeMeta(detail.type);
  const isTerminal = ["APPROVED", "REJECTED", "CLOSED"].includes(detail.status);
  const history = detail.status_history ?? [];

  const TABS: { id: DrawerTab; label: string; icon: React.FC<React.SVGProps<SVGSVGElement> & { size?: number }> }[] = [
    { id: "details",     label: "Détails",   icon: Eye },
    { id: "actions",     label: `Actions${(detail.open_actions_count ?? 0) > 0 ? ` (${detail.open_actions_count})` : ""}`, icon: Wrench },
    { id: "attachments", label: `Pièces jointes${(detail.evidence_count ?? 0) > 0 ? ` (${detail.evidence_count})` : ""}`, icon: Paperclip },
    { id: "history",     label: "Historique", icon: History },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex"
      onClick={onClose}
    >
      <div className="flex-1 bg-black/40 backdrop-blur-sm" />
      <motion.aside
        initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="w-full max-w-lg bg-gb-app border-l border-gb-border h-full overflow-y-auto flex flex-col shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-gb-border bg-gb-surface-solid/50 shrink-0">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xl">{typeMeta.icon}</span>
              <span className={`text-xs font-black uppercase tracking-widest ${typeMeta.color}`}>{typeMeta.label}</span>
              <span className="text-gb-muted/30">·</span>
              <span className="text-xs font-mono text-gb-muted">{detail.reference ?? `#${detail.id}`}</span>
              {detail.sla_breached && (
                <span className="inline-flex items-center gap-1 text-[10px] font-black text-red-500 bg-red-500/10 border border-red-500/20 px-2 py-0.5 rounded-full animate-pulse">
                  <AlertTriangle size={8} />SLA
                </span>
              )}
            </div>
            <button onClick={onClose} className="p-1.5 rounded-lg text-gb-muted hover:text-gb-text hover:bg-gb-surface-hover transition-colors shrink-0">
              <X size={18} />
            </button>
          </div>
          <h2 className="text-lg font-black text-gb-text tracking-tight leading-snug">
            {detail.title || detail.comment?.substring(0, 80) || `Rapport #${detail.id}`}
          </h2>
          <div className="flex flex-wrap gap-1.5 mt-3">
            <StatusBadge status={detail.status} />
            <SeverityBadge severity={detail.severity} />
            <PriorityBadge priority={detail.priority} />
            {detail.project && (
              <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border border-gb-border text-gb-muted bg-gb-surface-solid">
                {detail.project.code}
              </span>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gb-border shrink-0 px-4 bg-gb-surface-solid/30 overflow-x-auto no-scrollbar">
          {TABS.map(t => {
            const Icon = t.icon;
            return (
              <button key={t.id} onClick={() => setTab(t.id)} className={`flex items-center gap-1.5 px-3 py-3 text-xs font-bold uppercase tracking-wide border-b-2 transition-colors whitespace-nowrap ${tab === t.id ? "border-gb-primary text-gb-primary" : "border-transparent text-gb-muted hover:text-gb-text"}`}>
                <Icon size={12} />{t.label}
              </button>
            );
          })}
        </div>

        {/* Tab content */}
        <div className="flex-1 p-5 overflow-y-auto">
          {loading && <div className="flex justify-center py-10"><Loader2 className="animate-spin text-gb-muted" size={24} /></div>}

          {!loading && tab === "details" && (
            <div className="space-y-5">
              {/* Metadata grid */}
              <div className="grid grid-cols-2 gap-2.5">
                {detail.report_date && <InfoTile icon={Calendar} label="Date rapport" value={fmtDate(detail.report_date)} />}
                {detail.due_date && (
                  <div className={`bg-gb-surface-solid border rounded-xl p-3 ${isOverdue(detail.due_date) && !isTerminal ? "border-red-500/30 bg-red-500/5" : "border-gb-border"}`}>
                    <p className={`text-[10px] font-bold uppercase tracking-widest mb-1 flex items-center gap-1 ${isOverdue(detail.due_date) && !isTerminal ? "text-red-500" : "text-gb-muted"}`}>
                      <Clock size={10} />Échéance
                    </p>
                    <div className={`text-sm font-semibold ${isOverdue(detail.due_date) && !isTerminal ? "text-red-500" : "text-gb-text"}`}>
                      {fmtDate(detail.due_date)}
                    </div>
                  </div>
                )}
                {detail.location && <InfoTile icon={MapPin} label="Localisation" value={detail.location} />}
                {detail.zone_code && <InfoTile icon={Target} label="Zone / Repère" value={detail.zone_code} />}
                {detail.discipline && <InfoTile icon={Building2} label="Discipline" value={detail.discipline + (detail.sub_discipline ? ` / ${detail.sub_discipline}` : "")} />}
                {detail.assignedTo && <InfoTile icon={User} label="Responsable" value={`${detail.assignedTo.firstname} ${detail.assignedTo.lastname}`} />}
                {detail.observed_by_name && <InfoTile icon={Eye} label="Observé par" value={detail.observed_by_name} />}
                {detail.escalation_level != null && detail.escalation_level > 0 && (
                  <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-3">
                    <p className="text-[10px] font-bold text-amber-500 uppercase tracking-widest mb-1 flex items-center gap-1"><TrendingUp size={10} />Escalade</p>
                    <div className="text-sm font-semibold text-gb-text">Niveau {detail.escalation_level}</div>
                  </div>
                )}
                {detail.resolved_at && (
                  <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-3">
                    <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest mb-1 flex items-center gap-1"><CheckCircle2 size={10} />Résolu le</p>
                    <div className="text-sm font-semibold text-gb-text">{fmtDate(detail.resolved_at)}</div>
                  </div>
                )}
                {detail.approvedBy && (
                  <InfoTile icon={ShieldCheck} label="Approuvé par" value={`${detail.approvedBy.firstname} ${detail.approvedBy.lastname}`} />
                )}
              </div>

              {/* Constat */}
              {detail.comment && (
                <div>
                  <p className="text-[10px] font-black text-gb-muted uppercase tracking-widest mb-2">Constat</p>
                  <p className="text-sm text-gb-text leading-relaxed whitespace-pre-wrap">{detail.comment}</p>
                </div>
              )}

              {/* Root cause */}
              {detail.root_cause && (
                <div>
                  <p className="text-[10px] font-black text-gb-muted uppercase tracking-widest mb-2">Cause racine (REX)</p>
                  <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-4">
                    <p className="text-sm text-gb-text leading-relaxed whitespace-pre-wrap">{detail.root_cause}</p>
                  </div>
                </div>
              )}

              {/* Corrective / Preventive */}
              {detail.corrective_action_summary && (
                <div>
                  <p className="text-[10px] font-black text-gb-muted uppercase tracking-widest mb-2">Action corrective</p>
                  <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-4">
                    <p className="text-sm text-gb-text leading-relaxed whitespace-pre-wrap">{detail.corrective_action_summary}</p>
                  </div>
                </div>
              )}
              {detail.preventive_action_summary && (
                <div>
                  <p className="text-[10px] font-black text-gb-muted uppercase tracking-widest mb-2">Action préventive</p>
                  <div className="bg-purple-500/5 border border-purple-500/20 rounded-xl p-4">
                    <p className="text-sm text-gb-text leading-relaxed whitespace-pre-wrap">{detail.preventive_action_summary}</p>
                  </div>
                </div>
              )}
              {detail.closure_summary && (
                <div>
                  <p className="text-[10px] font-black text-gb-muted uppercase tracking-widest mb-2">Résumé clôture</p>
                  <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-4">
                    <p className="text-sm text-gb-text leading-relaxed whitespace-pre-wrap">{detail.closure_summary}</p>
                  </div>
                </div>
              )}
              {detail.rejected_reason && (
                <div>
                  <p className="text-[10px] font-black text-gb-danger uppercase tracking-widest mb-2">Motif de rejet</p>
                  <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-4">
                    <p className="text-sm text-gb-text leading-relaxed whitespace-pre-wrap">{detail.rejected_reason}</p>
                  </div>
                </div>
              )}

              {/* Meta */}
              <div className="text-xs text-gb-muted space-y-1 pt-2 border-t border-gb-border">
                <p>Créé le {fmtDateTime(detail.created_at)}{detail.createdBy ? ` par ${detail.createdBy.firstname} ${detail.createdBy.lastname}` : ""}</p>
                {detail.revision_no != null && detail.revision_no > 0 && <p>Révision n°{detail.revision_no}</p>}
              </div>
            </div>
          )}

          {!loading && tab === "actions" && (
            <ActionsPanel reportId={detail.id} canEdit={canEdit} />
          )}

          {!loading && tab === "attachments" && (
            <AttachmentsPanel reportId={detail.id} canEdit={canEdit} />
          )}

          {!loading && tab === "history" && (
            <StatusHistoryPanel history={history} />
          )}
        </div>

        {/* Footer actions */}
        <div className="p-5 border-t border-gb-border bg-gb-surface-solid/50 shrink-0 space-y-2">
          {/* Approve / Reject row */}
          {canApprove && !isTerminal && (
            <div className="flex gap-2">
              <button
                onClick={handleApprove} disabled={approving}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-emerald-500 text-white font-black text-sm hover:bg-emerald-600 disabled:opacity-60 transition-colors"
              >
                {approving ? <Loader2 size={14} className="animate-spin" /> : <ThumbsUp size={14} />}
                Approuver
              </button>
              <button
                onClick={() => onReject(detail)}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border border-gb-danger/40 text-gb-danger font-black text-sm hover:bg-gb-danger/10 transition-colors"
              >
                <ThumbsDown size={14} />Rejeter
              </button>
            </div>
          )}

          {/* Edit / PDF / Archive row */}
          {(canEdit || canDelete) && (
            <div className="flex gap-2">
              {canEdit && (
                <button onClick={() => onEdit(detail)} className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border border-gb-border text-gb-text font-bold text-sm hover:bg-gb-surface-hover transition-colors">
                  <Pencil size={13} />Modifier
                </button>
              )}
              <button
                onClick={handleDownloadPdf}
                disabled={pdfLoading}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border border-gb-border text-gb-text font-bold text-sm hover:bg-gb-surface-hover transition-colors disabled:opacity-60"
              >
                {pdfLoading ? <Loader2 size={13} className="animate-spin" /> : <FileDown size={13} />}PDF
              </button>
              {canDelete && (
                <button
                  onClick={() => { if (window.confirm("Archiver ce rapport ? Il restera dans l'historique pour la traçabilité.")) onDelete(detail.id); }}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border border-gb-border text-gb-muted font-bold text-sm hover:bg-gb-surface-hover hover:text-gb-danger transition-colors"
                >
                  <Archive size={13} />Archiver
                </button>
              )}
            </div>
          )}
        </div>
      </motion.aside>
    </motion.div>
  );
}

// ─── Report Card (list item) ──────────────────────────────────────────────────

function ReportCard({ report, onClick }: { report: ControlReport; onClick: () => void }) {
  const typeMeta   = getTypeMeta(report.type);
  const statusMeta = getStatusMeta(report.status);
  const dueSoon    = report.due_date && !["APPROVED", "CLOSED", "REJECTED"].includes(report.status) && isOverdue(report.due_date);
  const [pdfLoading, setPdfLoading] = React.useState(false);

  const handleDownloadPdf = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (pdfLoading) return;
    setPdfLoading(true);
    try {
      const res = await apiFetch(`${API_BASE}/control-reports/${report.id}/pdf`, { method: "GET" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Erreur lors de la génération du PDF");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${report.reference ?? `CR-${report.id}`}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Impossible de générer le PDF");
    } finally {
      setPdfLoading(false);
    }
  };

  return (
    <motion.div
      layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
      onClick={onClick}
      className={`group bg-gb-surface-solid border rounded-2xl p-4 cursor-pointer hover:border-gb-primary/40 hover:shadow-md transition-all duration-200 ${dueSoon ? "border-red-500/30" : "border-gb-border"} ${report.sla_breached ? "ring-1 ring-red-500/20" : ""}`}
    >
      <div className="flex items-start gap-3">
        {/* Type icon */}
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-lg ${typeMeta.bg}`}>
          {typeMeta.icon}
        </div>

        {/* Main content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-sm font-black text-gb-text truncate">
                {report.title || report.comment?.substring(0, 60) || `Rapport #${report.id}`}
              </p>
              <p className="text-[10px] text-gb-muted font-mono mt-0.5">{report.reference ?? `#${report.id}`}</p>
            </div>
            <div className="shrink-0 flex items-center gap-1.5">
              {report.sla_breached && <AlertTriangle size={13} className="text-red-500 animate-pulse" />}
              <button
                type="button"
                onClick={handleDownloadPdf}
                disabled={pdfLoading}
                className="flex items-center gap-1 px-2 py-1 rounded-lg border border-gb-border text-[10px] font-bold text-gb-muted hover:text-red-500 hover:border-red-400/50 disabled:opacity-50 transition-colors"
                title="Télécharger le PDF"
              >
                {pdfLoading ? <Loader2 size={10} className="animate-spin" /> : <FileDown size={10} />}PDF
              </button>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onClick(); }}
                className="px-2 py-1 rounded-lg border border-gb-border text-[10px] font-bold text-gb-muted group-hover:text-gb-primary group-hover:border-gb-primary/40 transition-colors"
                title="Voir plus d'infos"
              >
                Voir plus d'infos
              </button>
            </div>
          </div>

          {/* Badges */}
          <div className="flex flex-wrap items-center gap-1.5 mt-2">
            <StatusBadge status={report.status} />
            <SeverityBadge severity={report.severity} />
            <PriorityBadge priority={report.priority} />
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between mt-2.5 flex-wrap gap-y-1">
            <div className="flex items-center gap-3">
              {report.project && (
                <span className="text-[10px] text-gb-muted flex items-center gap-1">
                  <Building2 size={9} />{report.project.code}
                </span>
              )}
              {report.due_date && (
                <span className={`text-[10px] flex items-center gap-1 ${dueSoon ? "text-red-500 font-bold" : "text-gb-muted"}`}>
                  <Clock size={9} />{fmtDate(report.due_date)}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {(report.open_actions_count ?? 0) > 0 && (
                <span className="text-[10px] text-amber-500 flex items-center gap-1 font-bold">
                  <Wrench size={9} />{report.open_actions_count} action{(report.open_actions_count ?? 0) > 1 ? "s" : ""}
                </span>
              )}
              {(report.evidence_count ?? 0) > 0 && (
                <span className="text-[10px] text-gb-muted flex items-center gap-1">
                  <Paperclip size={9} />{report.evidence_count}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Main View ────────────────────────────────────────────────────────────────

export default function ControlReportsView() {
  const { can } = usePermissions();
  const canCreate  = can("control-report:create");
  const canEdit    = can("control-report:update");
  const canApprove = can("control-report:approve");
  const canRead    = can("control-report:read");

  const [reports, setReports]     = useState<ControlReport[]>([]);
  const [projects, setProjects]   = useState<Project[]>([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState("");

  const [searchParams, setSearchParams] = useSearchParams();

  // Filters
  const [filterProject,  setFilterProject]  = useState(searchParams.get("project_id") ?? "");
  const [filterStatus,   setFilterStatus]   = useState("");
  const [filterType,     setFilterType]     = useState("");
  const [filterSeverity, setFilterSeverity] = useState("");
  const [filterPriority, setFilterPriority] = useState("");
  const [search,         setSearch]         = useState("");
  const [showFilters,    setShowFilters]     = useState(false);

  // Modals / drawers
  const [selected,    setSelected]   = useState<ControlReport | null>(null);
  // If ?create=1 is in URL, open create modal immediately
  const [editTarget,  setEditTarget] = useState<ControlReport | null | undefined>(
    searchParams.get("create") === "1" ? null : undefined
  );
  const [rejectTarget,setRejectTarget] = useState<ControlReport | null>(null);

  // Clean query params after consuming them (avoid re-opening on navigation)
  useEffect(() => {
    if (searchParams.get("create") === "1" || searchParams.get("project_id")) {
      setSearchParams({}, { replace: true });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadProjects = useCallback(() => {
    apiFetch(`${API_BASE}/projects?limit=100`).then(r => r.json()).then(d => {
      setProjects(Array.isArray(d) ? d : d.data ?? d.projects ?? []);
    }).catch(() => setProjects([]));
  }, []);

  const loadReports = useCallback(() => {
    setLoading(true); setError("");
    const params = new URLSearchParams();
    if (filterProject)  params.set("project_id", filterProject);
    if (filterStatus)   params.set("status",   filterStatus);
    if (filterType)     params.set("type",      filterType);
    if (filterSeverity) params.set("severity",  filterSeverity);
    if (filterPriority) params.set("priority",  filterPriority);

    apiFetch(`${API_BASE}/control-reports?${params.toString()}`)
      .then(r => r.json())
      .then(d => setReports(Array.isArray(d) ? d : d.data ?? d.reports ?? []))
      .catch(() => setError("Impossible de charger les rapports."))
      .finally(() => setLoading(false));
  }, [filterProject, filterStatus, filterType, filterSeverity, filterPriority]);

  useEffect(() => { loadProjects(); }, [loadProjects]);
  useEffect(() => { loadReports(); }, [loadReports]);

  // Derived KPIs
  const kpis = useMemo(() => ({
    total:     reports.length,
    open:      reports.filter(r => ["OPEN", "IN_PROGRESS", "ACTION_REQUIRED", "UNDER_REVIEW"].includes(r.status)).length,
    sla:       reports.filter(r => r.sla_breached && !["APPROVED", "CLOSED"].includes(r.status)).length,
    approved:  reports.filter(r => r.status === "APPROVED").length,
    actions:   reports.reduce((acc, r) => acc + (r.open_actions_count ?? 0), 0),
  }), [reports]);

  // Filtered list (client-side search)
  const filtered = useMemo(() => {
    if (!search.trim()) return reports;
    const q = search.toLowerCase();
    return reports.filter(r =>
      r.title?.toLowerCase().includes(q) ||
      r.reference?.toLowerCase().includes(q) ||
      r.comment?.toLowerCase().includes(q) ||
      r.location?.toLowerCase().includes(q) ||
      r.discipline?.toLowerCase().includes(q) ||
      r.project?.code.toLowerCase().includes(q) ||
      r.project?.title.toLowerCase().includes(q)
    );
  }, [reports, search]);

  const handleSaved = (r: ControlReport) => {
    setEditTarget(undefined);
    if (!r || typeof r.id !== "number") {
      loadReports();
      return;
    }
    setReports(prev => {
      const idx = prev.findIndex(p => p.id === r.id);
      return idx >= 0 ? prev.map(p => p.id === r.id ? r : p) : [r, ...prev];
    });
    setSelected(r);
  };

  const handleDelete = async (id: number) => {
    await apiFetch(`${API_BASE}/control-reports/${id}`, { method: "DELETE" });
    setSelected(null);
    setReports(prev => prev.filter(r => r.id !== id));
  };

  const handleApprove = (r: ControlReport) => {
    setReports(prev => prev.map(p => p.id === r.id ? r : p));
    setSelected(null);
  };

  const handleRejected = (r: ControlReport) => {
    setRejectTarget(null);
    setReports(prev => prev.map(p => p.id === r.id ? r : p));
    setSelected(null);
  };

  const resetFilters = () => {
    setFilterProject(""); setFilterStatus(""); setFilterType("");
    setFilterSeverity(""); setFilterPriority(""); setSearch("");
  };

  const hasActiveFilters = filterProject || filterStatus || filterType || filterSeverity || filterPriority || search;

  if (!canRead) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <ShieldCheck size={40} className="text-gb-muted/30 mb-3" />
        <p className="font-bold text-gb-muted">Accès non autorisé</p>
        <p className="text-xs text-gb-muted/60 mt-1">Vous n'avez pas la permission de consulter les rapports de contrôle.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Page header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-black text-gb-text tracking-tight flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gb-primary/10 flex items-center justify-center">
              <ClipboardList size={18} className="text-gb-primary" />
            </div>
            Rapports de contrôle
          </h1>
          <p className="text-sm text-gb-muted mt-0.5">Qualité · Sécurité · Non-conformités · Actions correctives</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowFilters(f => !f)}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl border font-bold text-sm transition-colors ${showFilters || hasActiveFilters ? "bg-gb-primary/10 border-gb-primary/30 text-gb-primary" : "border-gb-border text-gb-muted hover:bg-gb-surface-hover"}`}
          >
            <Filter size={14} />
            Filtres
            {hasActiveFilters && <span className="w-2 h-2 rounded-full bg-gb-primary" />}
          </button>
          {canCreate && (
            <button
              onClick={() => setEditTarget(null)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gb-primary text-gb-inverse font-black text-sm hover:bg-gb-primary/90 transition-colors shadow-sm"
            >
              <Plus size={15} />
              <span className="hidden sm:inline">Nouveau rapport</span>
              <span className="sm:hidden">Nouveau</span>
            </button>
          )}
        </div>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <KpiCard label="Total"    value={kpis.total}    icon={ClipboardList} accent="bg-gb-primary/10 text-gb-primary" />
        <KpiCard label="Ouverts"  value={kpis.open}     icon={AlertCircle}   accent="bg-red-500/10 text-red-500"     sub={kpis.open > 0 ? "Non clôturés" : "Tout est OK"} />
        <KpiCard label="SLA dépassé" value={kpis.sla}  icon={AlertTriangle}  accent={kpis.sla > 0 ? "bg-red-500/10 text-red-500" : "bg-slate-500/10 text-slate-500"} />
        <KpiCard label="Approuvés" value={kpis.approved} icon={ShieldCheck}  accent="bg-emerald-500/10 text-emerald-500" />
        <KpiCard label="Actions ouvertes" value={kpis.actions} icon={Wrench} accent={kpis.actions > 0 ? "bg-amber-500/10 text-amber-500" : "bg-slate-500/10 text-slate-500"} />
      </div>

      {/* Filter panel */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-gb-surface-solid border border-gb-border rounded-2xl p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-black text-gb-muted uppercase tracking-widest flex items-center gap-1.5"><SlidersHorizontal size={11} />Filtres actifs</p>
                {hasActiveFilters && (
                  <button onClick={resetFilters} className="text-xs text-gb-primary hover:underline flex items-center gap-1"><RotateCcw size={10} />Réinitialiser</button>
                )}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
                <div className="relative">
                  <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-gb-muted pointer-events-none" />
                  <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher…" className="w-full pl-7 pr-3 py-2 bg-gb-app border border-gb-border rounded-xl text-xs text-gb-text placeholder-gb-muted/50 focus:outline-none focus:border-gb-primary transition-colors" />
                </div>
                <select value={filterProject} onChange={e => setFilterProject(e.target.value)} className="px-3 py-2 bg-gb-app border border-gb-border rounded-xl text-xs text-gb-text focus:outline-none focus:border-gb-primary transition-colors">
                  <option value="">Tous les projets</option>
                  {projects.map(p => <option key={p.id} value={p.id}>{p.code}</option>)}
                </select>
                <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="px-3 py-2 bg-gb-app border border-gb-border rounded-xl text-xs text-gb-text focus:outline-none focus:border-gb-primary transition-colors">
                  <option value="">Tous les statuts</option>
                  {CR_STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
                <select value={filterType} onChange={e => setFilterType(e.target.value)} className="px-3 py-2 bg-gb-app border border-gb-border rounded-xl text-xs text-gb-text focus:outline-none focus:border-gb-primary transition-colors">
                  <option value="">Tous les types</option>
                  {CR_TYPES.map(t => <option key={t.value} value={t.value}>{t.icon} {t.label}</option>)}
                </select>
                <select value={filterSeverity} onChange={e => setFilterSeverity(e.target.value)} className="px-3 py-2 bg-gb-app border border-gb-border rounded-xl text-xs text-gb-text focus:outline-none focus:border-gb-primary transition-colors">
                  <option value="">Toutes sévérités</option>
                  {CR_SEVERITIES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 text-sm text-gb-danger bg-gb-danger/10 border border-gb-danger/20 rounded-xl px-4 py-3">
          <AlertCircle size={14} />{error}
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="text-center space-y-3">
            <Loader2 size={32} className="animate-spin text-gb-primary mx-auto" />
            <p className="text-sm text-gb-muted">Chargement des rapports…</p>
          </div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-2xl bg-gb-primary/10 flex items-center justify-center mb-4">
            <ClipboardList size={28} className="text-gb-primary/50" />
          </div>
          <p className="font-black text-gb-text mb-1">{hasActiveFilters ? "Aucun résultat" : "Aucun rapport de contrôle"}</p>
          <p className="text-sm text-gb-muted max-w-xs">
            {hasActiveFilters ? "Modifiez vos filtres pour voir plus de résultats." : "Créez votre premier rapport de contrôle qualité ou sécurité."}
          </p>
          {!hasActiveFilters && canCreate && (
            <button onClick={() => setEditTarget(null)} className="mt-4 flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gb-primary text-gb-inverse font-black text-sm hover:bg-gb-primary/90 transition-colors">
              <Plus size={14} />Nouveau rapport
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-xs text-gb-muted px-1">{filtered.length} rapport{filtered.length > 1 ? "s" : ""}{hasActiveFilters ? " filtrés" : ""}</p>
          <AnimatePresence mode="popLayout">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              {filtered.map(r => (
                <ReportCard key={r.id} report={r} onClick={() => setSelected(r)} />
              ))}
            </div>
          </AnimatePresence>
        </div>
      )}

      {/* Modals & Drawers */}
      <AnimatePresence>
        {selected && !editTarget && !rejectTarget && (
          <DetailDrawer
            key={selected.id}
            report={selected}
            canEdit={canEdit}
            canDelete={canEdit}
            canApprove={canApprove}
            onClose={() => setSelected(null)}
            onEdit={r => { setSelected(null); setEditTarget(r); }}
            onDelete={handleDelete}
            onApprove={handleApprove}
            onReject={r => { setSelected(null); setRejectTarget(r); }}
            onUpdated={r => { setReports(prev => prev.map(p => p.id === r.id ? r : p)); setSelected(r); }}
          />
        )}

        {editTarget !== undefined && (
          <CreateEditModal
            key={editTarget ? `edit-${editTarget.id}` : "new"}
            initial={editTarget}
            projects={projects}
            onClose={() => setEditTarget(undefined)}
            onSaved={handleSaved}
          />
        )}

        {rejectTarget && (
          <RejectModal
            report={rejectTarget}
            onClose={() => setRejectTarget(null)}
            onRejected={handleRejected}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
