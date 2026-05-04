import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  Users, Plus, Search, Loader2, Calendar, MapPin,
  ChevronRight, Pencil, Trash2, X, Clock, CheckCircle2,
  AlertCircle, XCircle, PlayCircle, Building2, Layers,
  FileText, ListChecks, UserPlus, UserCheck, UserX,
  AlarmClock, CheckCheck, CircleDot, CircleOff,
  ChevronDown, Send, StickyNote, CalendarClock,
  Flag, Info, FileDown, Sheet,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { apiFetch, API_BASE } from "../lib/api";
import { format, isPast, isToday, isFuture } from "date-fns";
import { fr } from "date-fns/locale";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Attendee {
  id: number;
  meeting_id: number;
  user_id?: number;
  name?: string;
  status: string;
  company?: string;
  role_title?: string;
  created_at: string;
  updated_at: string;
  user?: { id: number; firstname: string; lastname: string; email: string };
}

interface ActionItem {
  id: number;
  meeting_id: number;
  subject: string;
  responsible_id?: number;
  due_date?: string;
  status: string;
  comment?: string;
  created_at: string;
  updated_at: string;
  responsible?: { id: number; firstname: string; lastname: string };
  createdBy?: { id: number; firstname: string; lastname: string };
}

interface Meeting {
  id: number;
  project_id: number;
  tenant_id: number;
  lot_id?: number;
  title: string;
  reference?: string;
  type: string;
  date: string;
  end_date?: string;
  location?: string;
  status: string;
  agenda?: string;
  minutes?: string;
  conclusion?: string;
  next_meeting_date?: string;
  next_meeting_location?: string;
  distribution_list?: string;
  created_at: string;
  updated_at: string;
  project?: { id: number; code: string; title: string; phase?: string | null };
  lot?: { id: number; lot_number: string; name: string };
  createdBy?: { id: number; firstname: string; lastname: string };
  attendees: Attendee[];
  actionItems: ActionItem[];
}

interface Project { id: number; code: string; title: string; phase?: string | null; }
interface Lot     { id: number; lot_number: string; name: string; }
interface UserRef { id: number; firstname: string; lastname: string; email: string; }

const MEETING_WORKFLOW_GUARD = {
  allowedPhases: ["PREPARATION", "EXECUTION"],
  reason: "Les reunions sont modifiables uniquement pendant les phases Preparation et Execution.",
} as const;

const PROJECT_PHASE_LABELS: Record<string, string> = {
  ETUDE: "Etude",
  PREPARATION: "Preparation",
  EXECUTION: "Execution",
  RECEPTION: "Reception",
  CLOTURE: "Cloture",
};

function isMeetingPhaseAllowed(phase?: string | null) {
  if (!phase) return true;
  return MEETING_WORKFLOW_GUARD.allowedPhases.includes(phase as "PREPARATION" | "EXECUTION");
}

function getProjectPhaseLabel(phase?: string | null) {
  if (!phase) return "Non defini";
  return PROJECT_PHASE_LABELS[phase] ?? phase;
}

// ─── Config ───────────────────────────────────────────────────────────────────

const MEETING_TYPES: { value: string; label: string; color: string; bg: string; dot: string }[] = [
  { value: "CHANTIER",      label: "Chantier",      color: "text-amber-600",   bg: "bg-amber-500/10 border-amber-500/20",   dot: "bg-amber-500" },
  { value: "COORDINATION",  label: "Coordination",  color: "text-blue-600",    bg: "bg-blue-500/10 border-blue-500/20",     dot: "bg-blue-500" },
  { value: "SECURITE",      label: "Sécurité",      color: "text-red-600",     bg: "bg-red-500/10 border-red-500/20",       dot: "bg-red-500" },
  { value: "OPR",           label: "OPR",           color: "text-purple-600",  bg: "bg-purple-500/10 border-purple-500/20", dot: "bg-purple-500" },
  { value: "VISA",          label: "VISA",          color: "text-cyan-600",    bg: "bg-cyan-500/10 border-cyan-500/20",     dot: "bg-cyan-500" },
  { value: "CODIR",         label: "CODIR",         color: "text-emerald-600", bg: "bg-emerald-500/10 border-emerald-500/20", dot: "bg-emerald-500" },
  { value: "KICK_OFF",      label: "Kick-off",      color: "text-gb-primary",  bg: "bg-gb-primary/10 border-gb-primary/20", dot: "bg-gb-primary" },
];

const MEETING_STATUSES: { value: string; label: string; icon: React.FC<any>; color: string; bg: string }[] = [
  { value: "PLANNED",     label: "Planifiée",   icon: CalendarClock, color: "text-blue-600",    bg: "bg-blue-500/10 border-blue-500/20" },
  { value: "IN_PROGRESS", label: "En cours",    icon: PlayCircle,    color: "text-amber-600",   bg: "bg-amber-500/10 border-amber-500/20" },
  { value: "DONE",        label: "Tenue",       icon: CheckCircle2,  color: "text-emerald-600", bg: "bg-emerald-500/10 border-emerald-500/20" },
  { value: "CANCELLED",   label: "Annulée",     icon: XCircle,       color: "text-slate-400",   bg: "bg-slate-400/10 border-slate-400/20" },
];

const ATTENDEE_STATUSES: { value: string; label: string; icon: React.FC<any>; color: string }[] = [
  { value: "INVITED",   label: "Invité",    icon: UserPlus,  color: "text-slate-400" },
  { value: "PRESENT",   label: "Présent",   icon: UserCheck, color: "text-emerald-500" },
  { value: "ABSENT",    label: "Absent",    icon: UserX,     color: "text-red-500" },
  { value: "EXCUSED",   label: "Excusé",    icon: AlertCircle, color: "text-amber-500" },
  { value: "DELEGATED", label: "Délégué",   icon: Send,      color: "text-blue-500" },
];

const ACTION_STATUSES: { value: string; label: string; icon: React.FC<any>; color: string; bg: string }[] = [
  { value: "OPEN",        label: "Ouvert",      icon: CircleDot,    color: "text-red-500",     bg: "bg-red-500/10 border-red-500/20" },
  { value: "IN_PROGRESS", label: "En cours",    icon: PlayCircle,   color: "text-amber-600",   bg: "bg-amber-500/10 border-amber-500/20" },
  { value: "CLOSED",      label: "Clôturé",     icon: CheckCheck,   color: "text-emerald-600", bg: "bg-emerald-500/10 border-emerald-500/20" },
  { value: "CANCELLED",   label: "Annulé",      icon: CircleOff,    color: "text-slate-400",   bg: "bg-slate-400/10 border-slate-400/20" },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const getType   = (v: string) => MEETING_TYPES.find(t => t.value === v)   ?? MEETING_TYPES[0];
const getStatus = (v: string) => MEETING_STATUSES.find(s => s.value === v) ?? MEETING_STATUSES[0];
const getAttSt  = (v: string) => ATTENDEE_STATUSES.find(s => s.value === v) ?? ATTENDEE_STATUSES[0];
const getActSt  = (v: string) => ACTION_STATUSES.find(s => s.value === v)  ?? ACTION_STATUSES[0];

const displayName = (u?: { firstname: string; lastname: string } | null, name?: string | null) =>
  u ? `${u.firstname} ${u.lastname}` : name ?? "—";

// ─── Atoms ────────────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const s = getStatus(status);
  const Icon = s.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 h-6 px-2.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${s.bg} ${s.color}`}>
      <Icon size={10} />{s.label}
    </span>
  );
}

function TypeBadge({ type }: { type: string }) {
  const t = getType(type);
  return (
    <span className={`inline-flex items-center gap-1.5 h-6 px-2.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${t.bg} ${t.color}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${t.dot} shrink-0`} />{t.label}
    </span>
  );
}

function KpiCard({ label, value, icon: Icon, accent, alert }: {
  label: string; value: number | string;
  icon: React.FC<any>; accent: string; alert?: boolean;
}) {
  return (
    <div className={`bg-gb-surface-solid border rounded-2xl p-5 flex items-center gap-4 transition-all ${alert ? "border-gb-danger/40" : "border-gb-border"}`}>
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${accent}`}>
        <Icon size={20} />
      </div>
      <div className="min-w-0">
        <p className="text-2xl font-black text-gb-text">{value}</p>
        <p className="text-xs font-semibold text-gb-muted uppercase tracking-wider truncate">{label}</p>
      </div>
    </div>
  );
}

// ─── Form Dialog ──────────────────────────────────────────────────────────────

const EMPTY_FORM = {
  title: "", reference: "", type: "CHANTIER", date: "", end_date: "",
  location: "", status: "PLANNED", agenda: "",
  minutes: "", conclusion: "", next_meeting_date: "",
  next_meeting_location: "", distribution_list: "",
  project_id: "", lot_id: "",
};

function MeetingFormDialog({ open, onClose, meeting, onSaved }: {
  open: boolean; onClose: () => void;
  meeting: Meeting | null; onSaved: () => void;
}) {
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [projects, setProjects] = useState<Project[]>([]);
  const [lots, setLots] = useState<Lot[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<"info" | "content" | "next">("info");

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  useEffect(() => {
    if (!open) return;
    apiFetch(`${API_BASE}/projects?limit=100`)
      .then(r => r.json())
      .then(d => setProjects(Array.isArray(d) ? d : (d.data ?? [])))
      .catch(() => {});
  }, [open]);

  useEffect(() => {
    if (!form.project_id) { setLots([]); return; }
    apiFetch(`${API_BASE}/project-management/lots?projectId=${form.project_id}`)
      .then(r => r.json()).then(d => setLots(Array.isArray(d) ? d : [])).catch(() => {});
  }, [form.project_id]);

  useEffect(() => {
    if (!open) return;
    if (meeting) {
      setForm({
        title:                 meeting.title,
        reference:             meeting.reference ?? "",
        type:                  meeting.type,
        date:                  meeting.date        ? meeting.date.slice(0, 16)             : "",
        end_date:              meeting.end_date    ? meeting.end_date.slice(0, 16)         : "",
        location:              meeting.location    ?? "",
        status:                meeting.status,
        agenda:                meeting.agenda      ?? "",
        minutes:               meeting.minutes     ?? "",
        conclusion:            meeting.conclusion  ?? "",
        next_meeting_date:     meeting.next_meeting_date ? meeting.next_meeting_date.slice(0, 16) : "",
        next_meeting_location: meeting.next_meeting_location ?? "",
        distribution_list:     meeting.distribution_list ?? "",
        project_id:            meeting.project_id  ? String(meeting.project_id) : "",
        lot_id:                meeting.lot_id      ? String(meeting.lot_id)     : "",
      });
    } else {
      setForm({ ...EMPTY_FORM });
    }
    setError(null);
    setTab("info");
  }, [open, meeting]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim())  { setError("Le titre est obligatoire"); return; }
    if (!form.project_id)    { setError("Le projet est obligatoire"); return; }
    if (!form.date)          { setError("La date est obligatoire"); return; }
    const selectedProject = projects.find((p) => p.id === Number(form.project_id));
    if (!isMeetingPhaseAllowed(selectedProject?.phase)) {
      setError(`${MEETING_WORKFLOW_GUARD.reason} Phase actuelle: ${getProjectPhaseLabel(selectedProject?.phase)}.`);
      return;
    }
    setSaving(true); setError(null);
    try {
      const payload: Record<string, any> = {
        ...form,
        project_id: Number(form.project_id),
        lot_id:     form.lot_id ? Number(form.lot_id) : undefined,
      };
      ["end_date", "next_meeting_date"].forEach(f => { if (!payload[f]) delete payload[f]; });
      ["lot_id"].forEach(f => { if (!payload[f]) delete payload[f]; });

      if (meeting) {
        await apiFetch(`${API_BASE}/meetings/${meeting.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        await apiFetch(`${API_BASE}/meetings`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }
      onSaved();
    } catch (err: any) {
      setError(err.message ?? "Erreur lors de l'enregistrement");
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  const inputCls  = "w-full bg-gb-app border border-gb-border rounded-xl h-10 px-3 text-sm text-gb-text placeholder:text-gb-muted focus:ring-2 focus:ring-gb-primary outline-none transition-all";
  const selectCls = "w-full bg-gb-app border border-gb-border rounded-xl h-10 px-3 text-sm text-gb-text focus:ring-2 focus:ring-gb-primary outline-none transition-all";
  const areaCls   = "w-full bg-gb-app border border-gb-border rounded-xl px-3 py-2.5 text-sm text-gb-text placeholder:text-gb-muted focus:ring-2 focus:ring-gb-primary outline-none transition-all resize-none";
  const selectedProject = projects.find((p) => p.id === Number(form.project_id));
  const canMutateSelectedProject = !selectedProject || isMeetingPhaseAllowed(selectedProject.phase);

  const F = ({ label, req, children }: { label: string; req?: boolean; children: React.ReactNode }) => (
    <div className="flex flex-col gap-1.5">
      <label className="text-[10px] font-black uppercase tracking-widest text-gb-muted">
        {label}{req && <span className="text-gb-danger ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );

  const TABS = [
    { id: "info",    label: "Informations" },
    { id: "content", label: "Contenu" },
    { id: "next",    label: "Suivi" },
  ];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
        <motion.div
          initial={{ opacity: 0, scale: 0.97, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.97, y: 10 }}
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
          className="relative bg-gb-app border border-gb-border rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-5 border-b border-gb-border shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gb-primary/10 flex items-center justify-center">
                <Calendar size={16} className="text-gb-primary" />
              </div>
              <h2 className="text-lg font-extrabold text-gb-text">
                {meeting ? "Modifier la réunion" : "Nouvelle réunion"}
              </h2>
            </div>
            <button onClick={onClose} className="p-2 rounded-xl text-gb-muted hover:text-gb-text hover:bg-gb-surface-hover transition-colors">
              <X size={18} />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-gb-border px-6 shrink-0 bg-gb-surface-solid/30">
            {TABS.map(t => (
              <button key={t.id} onClick={() => setTab(t.id as any)}
                className={`text-xs font-bold uppercase tracking-widest py-3 px-4 border-b-2 transition-colors ${
                  tab === t.id ? "border-gb-primary text-gb-primary" : "border-transparent text-gb-muted hover:text-gb-text"
                }`}>
                {t.label}
              </button>
            ))}
          </div>

          {/* Body */}
          <form onSubmit={submit} className="flex-1 overflow-y-auto px-6 py-5">
            {tab === "info" && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <F label="Titre" req>
                      <input value={form.title} onChange={e => set("title", e.target.value)} placeholder="Réunion de chantier — Semaine 18" className={inputCls} />
                    </F>
                  </div>
                  <F label="Référence">
                    <input value={form.reference} onChange={e => set("reference", e.target.value)} placeholder="CR-2026-042" className={inputCls} />
                  </F>
                  <F label="Type">
                    <select value={form.type} onChange={e => set("type", e.target.value)} className={selectCls}>
                      {MEETING_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                  </F>
                  <F label="Date de début" req>
                    <input type="datetime-local" value={form.date} onChange={e => set("date", e.target.value)} className={inputCls} />
                  </F>
                  <F label="Date de fin">
                    <input type="datetime-local" value={form.end_date} onChange={e => set("end_date", e.target.value)} className={inputCls} />
                  </F>
                  <F label="Lieu">
                    <input value={form.location} onChange={e => set("location", e.target.value)} placeholder="Salle de chantier, Zone A…" className={inputCls} />
                  </F>
                  <F label="Statut">
                    <select value={form.status} onChange={e => set("status", e.target.value)} className={selectCls}>
                      {MEETING_STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                    </select>
                  </F>
                  <F label="Projet" req>
                    <select value={form.project_id} onChange={e => set("project_id", e.target.value)} className={selectCls}>
                      <option value="">Sélectionner…</option>
                      {projects.map(p => (
                        <option key={p.id} value={p.id} disabled={!isMeetingPhaseAllowed(p.phase)}>
                          {p.code} — {p.title}{!isMeetingPhaseAllowed(p.phase) ? ` (${getProjectPhaseLabel(p.phase)})` : ""}
                        </option>
                      ))}
                    </select>
                  </F>
                  <F label="Lot (optionnel)">
                    <select value={form.lot_id} onChange={e => set("lot_id", e.target.value)} className={selectCls} disabled={!form.project_id}>
                      <option value="">Tous lots</option>
                      {lots.map(l => <option key={l.id} value={l.id}>Lot {l.lot_number} — {l.name}</option>)}
                    </select>
                  </F>
                  <div className="md:col-span-2">
                    <F label="Liste de diffusion (emails séparés par virgule)">
                      <input value={form.distribution_list} onChange={e => set("distribution_list", e.target.value)}
                        placeholder="john@bntp.fr, marie@architecte.fr" className={inputCls} />
                    </F>
                  </div>
                </div>
              </div>
            )}

            {tab === "content" && (
              <div className="space-y-4">
                <F label="Ordre du jour">
                  <textarea value={form.agenda} onChange={e => set("agenda", e.target.value)} rows={4}
                    placeholder="1. Avancement lots Gros Œuvre&#10;2. Revue planning&#10;3. Points sécurité…"
                    className={areaCls} />
                </F>
                <F label="Compte-rendu / Procès-verbal">
                  <textarea value={form.minutes} onChange={e => set("minutes", e.target.value)} rows={5}
                    placeholder="Présents : …&#10;Discussion : …"
                    className={areaCls} />
                </F>
                <F label="Conclusions & décisions">
                  <textarea value={form.conclusion} onChange={e => set("conclusion", e.target.value)} rows={3}
                    placeholder="Décisions prises, points validés…"
                    className={areaCls} />
                </F>
              </div>
            )}

            {tab === "next" && (
              <div className="space-y-4">
                <div className="bg-gb-surface-solid border border-gb-border rounded-2xl p-4 space-y-4">
                  <p className="text-[10px] font-black uppercase tracking-widest text-gb-muted">Prochaine réunion</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <F label="Date">
                      <input type="datetime-local" value={form.next_meeting_date} onChange={e => set("next_meeting_date", e.target.value)} className={inputCls} />
                    </F>
                    <F label="Lieu">
                      <input value={form.next_meeting_location} onChange={e => set("next_meeting_location", e.target.value)} placeholder="Même lieu…" className={inputCls} />
                    </F>
                  </div>
                </div>
              </div>
            )}

            {error && (
              <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                className="mt-4 flex items-center gap-2 bg-gb-danger/10 border border-gb-danger/20 rounded-xl px-4 py-3 text-sm text-gb-danger">
                <AlertCircle size={14} /> {error}
              </motion.div>
            )}
            {selectedProject && !canMutateSelectedProject && (
              <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                className="mt-4 flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-3 text-sm text-amber-500">
                <AlertCircle size={14} />
                {MEETING_WORKFLOW_GUARD.reason} Phase actuelle: {getProjectPhaseLabel(selectedProject.phase)}.
              </motion.div>
            )}
          </form>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-gb-border bg-gb-app shrink-0 flex justify-end gap-3">
            <button type="button" onClick={onClose}
              className="h-10 px-5 rounded-xl border border-gb-border text-gb-text text-sm font-semibold hover:bg-gb-surface-hover transition-colors">
              Annuler
            </button>
            <button type="button" onClick={submit} disabled={saving || !canMutateSelectedProject}
              className="h-10 px-6 rounded-xl bg-gb-primary text-white text-sm font-bold shadow-lg shadow-gb-primary/20 hover:opacity-90 transition-all disabled:opacity-60 flex items-center gap-2">
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Calendar size={14} />}
              {meeting ? "Enregistrer" : "Créer la réunion"}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// ─── Meeting Detail Drawer ────────────────────────────────────────────────────

function MeetingDetailDrawer({
  meeting,
  onClose,
  onEdit,
  onDelete,
  onUpdated,
  canMutate = true,
  workflowBlockMessage = null,
}: {
  meeting: Meeting;
  onClose: () => void;
  onEdit: (m: Meeting) => void;
  onDelete: (id: number) => void;
  onUpdated: () => void;
  canMutate?: boolean;
  workflowBlockMessage?: string | null;
}) {
  const [tab, setTab] = useState<"overview" | "attendees" | "actions">("overview");
  const [attendees, setAttendees] = useState<Attendee[]>(meeting.attendees ?? []);
  const [actionItems, setActionItems] = useState<ActionItem[]>(meeting.actionItems ?? []);
  const [users, setUsers] = useState<UserRef[]>([]);

  // Attendee form
  const [newAttUserId, setNewAttUserId] = useState("");
  const [newAttName, setNewAttName]     = useState("");
  const [newAttCompany, setNewAttCompany] = useState("");
  const [newAttRole, setNewAttRole]     = useState("");
  const [addingAtt, setAddingAtt]       = useState(false);

  // Action item form
  const [newActSubject, setNewActSubject]     = useState("");
  const [newActResponsible, setNewActResponsible] = useState("");
  const [newActDue, setNewActDue]             = useState("");
  const [newActStatus, setNewActStatus]       = useState("OPEN");
  const [newActComment, setNewActComment]     = useState("");
  const [addingAct, setAddingAct]             = useState(false);

  const downloadMeetingPdf = async () => {
    try {
      const res = await apiFetch(`${API_BASE}/meetings/${meeting.id}/pdf`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert(err.error || "Impossible de générer le compte-rendu PDF.");
        return;
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${(meeting.reference || `CR-${meeting.id}`).replace(/[^a-zA-Z0-9-_]/g, "_")}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      alert("Impossible de générer le compte-rendu PDF.");
    }
  };

  const downloadMeetingExcel = async () => {
    try {
      const res = await apiFetch(`${API_BASE}/meetings/${meeting.id}/excel`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert(err.error || "Impossible d'exporter le compte-rendu Excel/CSV.");
        return;
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${(meeting.reference || `CR-${meeting.id}`).replace(/[^a-zA-Z0-9-_]/g, "_")}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      alert("Impossible d'exporter le compte-rendu Excel/CSV.");
    }
  };

  const type   = getType(meeting.type);
  const status = getStatus(meeting.status);

  useEffect(() => {
    apiFetch(`${API_BASE}/resources/users?limit=200`)
      .then(r => r.json()).then(d => setUsers(Array.isArray(d) ? d : [])).catch(() => {});
  }, []);

  const fetchAttendees = useCallback(async () => {
    const r = await apiFetch(`${API_BASE}/meetings/${meeting.id}/attendees`);
    const d = await r.json();
    setAttendees(Array.isArray(d) ? d : []);
  }, [meeting.id]);

  const fetchActions = useCallback(async () => {
    const r = await apiFetch(`${API_BASE}/meetings/${meeting.id}/action-items`);
    const d = await r.json();
    setActionItems(Array.isArray(d) ? d : []);
  }, [meeting.id]);

  const addAttendee = async () => {
    if (!canMutate) return;
    if (!newAttUserId && !newAttName.trim()) return;
    setAddingAtt(true);
    try {
      await apiFetch(`${API_BASE}/meetings/${meeting.id}/attendees`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id:    newAttUserId ? Number(newAttUserId) : undefined,
          name:       newAttName   || undefined,
          company:    newAttCompany || undefined,
          role_title: newAttRole    || undefined,
        }),
      });
      setNewAttUserId(""); setNewAttName(""); setNewAttCompany(""); setNewAttRole("");
      await fetchAttendees();
    } finally { setAddingAtt(false); }
  };

  const updateAttStatus = async (id: number, status: string) => {
    if (!canMutate) return;
    await apiFetch(`${API_BASE}/meetings/${meeting.id}/attendees/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    await fetchAttendees();
  };

  const removeAttendee = async (id: number) => {
    if (!canMutate) return;
    await apiFetch(`${API_BASE}/meetings/${meeting.id}/attendees/${id}`, { method: "DELETE" });
    await fetchAttendees();
  };

  const addActionItem = async () => {
    if (!canMutate) return;
    if (!newActSubject.trim()) return;
    setAddingAct(true);
    try {
      await apiFetch(`${API_BASE}/meetings/${meeting.id}/action-items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject:        newActSubject,
          responsible_id: newActResponsible ? Number(newActResponsible) : undefined,
          due_date:       newActDue || undefined,
          status:         newActStatus,
          comment:        newActComment || undefined,
        }),
      });
      setNewActSubject(""); setNewActResponsible(""); setNewActDue("");
      setNewActStatus("OPEN"); setNewActComment("");
      await fetchActions();
      onUpdated();
    } finally { setAddingAct(false); }
  };

  const updateActionStatus = async (id: number, status: string) => {
    if (!canMutate) return;
    await apiFetch(`${API_BASE}/meetings/${meeting.id}/action-items/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    await fetchActions();
    onUpdated();
  };

  const deleteAction = async (id: number) => {
    if (!canMutate) return;
    await apiFetch(`${API_BASE}/meetings/${meeting.id}/action-items/${id}`, { method: "DELETE" });
    await fetchActions();
    onUpdated();
  };

  const inputCls  = "bg-gb-app border border-gb-border rounded-xl h-9 px-3 text-sm text-gb-text placeholder:text-gb-muted focus:ring-2 focus:ring-gb-primary outline-none transition-all";
  const selectCls = "bg-gb-app border border-gb-border rounded-xl h-9 px-3 text-sm text-gb-text focus:ring-2 focus:ring-gb-primary outline-none transition-all";

  const TABS = [
    { id: "overview",  label: "Détails",          count: null },
    { id: "attendees", label: "Participants",      count: attendees.length },
    { id: "actions",   label: "Points d'action",  count: actionItems.filter(a => a.status !== "CLOSED" && a.status !== "CANCELLED").length },
  ];

  const InfoRow = ({ icon: Icon, label, value }: { icon: React.FC<any>; label: string; value: React.ReactNode }) => (
    <div className="flex items-start gap-3">
      <Icon size={14} className="text-gb-muted mt-0.5 shrink-0" />
      <div>
        <p className="text-[10px] font-black uppercase tracking-widest text-gb-muted">{label}</p>
        <div className="text-sm font-semibold text-gb-text">{value}</div>
      </div>
    </div>
  );

  const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div>
      <p className="text-[10px] font-black uppercase tracking-widest text-gb-muted mb-2">{title}</p>
      {children}
    </div>
  );

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex" onClick={onClose}
    >
      <div className="flex-1 bg-black/40 backdrop-blur-sm" />
      <motion.aside
        initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="w-full max-w-xl bg-gb-app border-l border-gb-border h-full overflow-y-auto flex flex-col shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-gb-border bg-gb-surface-solid/50 shrink-0">
          <div className="flex items-start justify-between gap-3 mb-4">
            <div className="flex items-center gap-2">
              <span className={`w-2.5 h-2.5 rounded-full ${type.dot} shrink-0`} />
              <span className={`text-xs font-bold uppercase tracking-widest ${type.color}`}>{type.label}</span>
              <span className="text-gb-muted/30">·</span>
              <span className="text-xs font-mono text-gb-muted">#{meeting.id}</span>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={() => onEdit(meeting)}
                disabled={!canMutate}
                className="p-2 rounded-xl text-gb-muted hover:text-gb-primary hover:bg-gb-primary/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed" title="Modifier">
                <Pencil size={15} />
              </button>
              <button onClick={() => { if (confirm("Supprimer cette réunion ?")) onDelete(meeting.id); }}
                disabled={!canMutate}
                className="p-2 rounded-xl text-gb-muted hover:text-gb-danger hover:bg-gb-danger/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed" title="Supprimer">
                <Trash2 size={15} />
              </button>
              <button onClick={onClose} className="p-2 rounded-xl text-gb-muted hover:text-gb-text hover:bg-gb-surface-hover transition-colors">
                <X size={18} />
              </button>
            </div>
          </div>

          <h2 className="text-xl font-extrabold text-gb-text tracking-tight leading-tight mb-1">{meeting.title}</h2>
          {meeting.reference && <p className="text-xs font-mono text-gb-muted mb-3">{meeting.reference}</p>}

          <div className="flex flex-wrap gap-2">
            <StatusBadge status={meeting.status} />
            <TypeBadge type={meeting.type} />
          </div>

          {/* Date/heure mis en avant */}
          <div className="mt-4 flex items-center gap-2 bg-gb-surface-hover border border-gb-border rounded-xl px-4 py-2.5">
            <Calendar size={14} className="text-gb-muted shrink-0" />
            <div className="text-sm font-bold text-gb-text">
              {format(new Date(meeting.date), "EEEE d MMMM yyyy", { locale: fr })}
              <span className="ml-2 text-gb-muted font-normal">
                {format(new Date(meeting.date), "HH:mm")}
                {meeting.end_date && ` → ${format(new Date(meeting.end_date), "HH:mm")}`}
              </span>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gb-border px-6 shrink-0">
          {TABS.map(t => (
            <button key={t.id}
              onClick={() => {
                setTab(t.id as any);
                if (t.id === "attendees") fetchAttendees();
                if (t.id === "actions")   fetchActions();
              }}
              className={`text-xs font-bold uppercase tracking-widest py-3 px-4 border-b-2 transition-colors flex items-center gap-1.5 ${
                tab === t.id ? "border-gb-primary text-gb-primary" : "border-transparent text-gb-muted hover:text-gb-text"
              }`}>
              {t.label}
              {t.count !== null && t.count > 0 && (
                <span className={`inline-flex items-center justify-center w-4 h-4 rounded-full text-[9px] font-black ${
                  tab === t.id ? "bg-gb-primary text-white" : "bg-gb-surface-hover text-gb-muted"
                }`}>{t.count}</span>
              )}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {!canMutate && workflowBlockMessage && (
            <div className="flex items-center gap-2 text-sm text-amber-500 bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-3">
              <AlertCircle size={14} />
              {workflowBlockMessage}
            </div>
          )}

          {/* ── OVERVIEW ── */}
          {tab === "overview" && (
            <>
              <div className="grid grid-cols-2 gap-x-6 gap-y-5">
                {meeting.location && <InfoRow icon={MapPin} label="Lieu" value={meeting.location} />}
                {meeting.project  && <InfoRow icon={Building2} label="Projet" value={`${meeting.project.code} — ${meeting.project.title}`} />}
                {meeting.lot      && <InfoRow icon={Layers} label="Lot" value={`Lot ${meeting.lot.lot_number} — ${meeting.lot.name}`} />}
                {meeting.createdBy && <InfoRow icon={Info} label="Créé par" value={`${meeting.createdBy.firstname} ${meeting.createdBy.lastname}`} />}
              </div>

              {meeting.agenda && (
                <Section title="Ordre du jour">
                  <pre className="text-sm text-gb-text leading-relaxed bg-gb-surface-solid border border-gb-border rounded-xl p-4 whitespace-pre-wrap font-sans">
                    {meeting.agenda}
                  </pre>
                </Section>
              )}

              {meeting.minutes && (
                <Section title="Compte-rendu">
                  <pre className="text-sm text-gb-text leading-relaxed bg-gb-surface-solid border border-gb-border rounded-xl p-4 whitespace-pre-wrap font-sans">
                    {meeting.minutes}
                  </pre>
                </Section>
              )}

              {meeting.conclusion && (
                <Section title="Conclusions & décisions">
                  <pre className="text-sm text-gb-text leading-relaxed bg-amber-500/5 border border-amber-500/20 rounded-xl p-4 whitespace-pre-wrap font-sans">
                    {meeting.conclusion}
                  </pre>
                </Section>
              )}

              {(meeting.next_meeting_date || meeting.next_meeting_location) && (
                <div className="bg-gb-primary/5 border border-gb-primary/20 rounded-2xl p-4 flex items-start gap-3">
                  <CalendarClock size={16} className="text-gb-primary mt-0.5 shrink-0" />
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-gb-primary mb-1">Prochaine réunion</p>
                    {meeting.next_meeting_date && (
                      <p className="text-sm font-bold text-gb-text">
                        {format(new Date(meeting.next_meeting_date), "EEEE d MMMM yyyy 'à' HH:mm", { locale: fr })}
                      </p>
                    )}
                    {meeting.next_meeting_location && (
                      <p className="text-xs text-gb-muted mt-0.5 flex items-center gap-1"><MapPin size={10} />{meeting.next_meeting_location}</p>
                    )}
                  </div>
                </div>
              )}

              {meeting.distribution_list && (
                <Section title="Liste de diffusion">
                  <div className="flex flex-wrap gap-1.5">
                    {meeting.distribution_list.split(",").map(e => e.trim()).filter(Boolean).map(email => (
                      <span key={email} className="text-xs font-mono px-2.5 py-1 rounded-full bg-gb-surface-solid border border-gb-border text-gb-muted">
                        {email}
                      </span>
                    ))}
                  </div>
                </Section>
              )}
            </>
          )}

          {/* ── ATTENDEES ── */}
          {tab === "attendees" && (
            <>
              {/* Add form */}
              <div className="bg-gb-surface-solid border border-gb-border rounded-2xl p-4 space-y-3">
                <p className="text-[10px] font-black uppercase tracking-widest text-gb-muted">Ajouter un participant</p>
                <div className="grid grid-cols-2 gap-2">
                  <select value={newAttUserId} onChange={e => { setNewAttUserId(e.target.value); if (e.target.value) setNewAttName(""); }}
                    className={`${selectCls} col-span-2`}>
                    <option value="">Utilisateur interne…</option>
                    {users.map(u => <option key={u.id} value={u.id}>{u.firstname} {u.lastname}</option>)}
                  </select>
                  {!newAttUserId && (
                    <input value={newAttName} onChange={e => setNewAttName(e.target.value)} placeholder="Nom (externe)" className={inputCls} />
                  )}
                  <input value={newAttCompany} onChange={e => setNewAttCompany(e.target.value)} placeholder="Entreprise" className={inputCls} />
                  <input value={newAttRole} onChange={e => setNewAttRole(e.target.value)} placeholder="Fonction / Qualité" className={inputCls} />
                </div>
                <button onClick={addAttendee}
                  disabled={!canMutate || addingAtt || (!newAttUserId && !newAttName.trim())}
                  className="w-full h-9 rounded-xl bg-gb-primary text-white text-xs font-bold flex items-center justify-center gap-2 hover:opacity-90 transition-all disabled:opacity-50">
                  {addingAtt ? <Loader2 size={13} className="animate-spin" /> : <UserPlus size={13} />}
                  Ajouter
                </button>
              </div>

              {/* List */}
              <div className="space-y-2">
                {attendees.length === 0 ? (
                  <p className="text-sm text-gb-muted text-center py-8">Aucun participant</p>
                ) : attendees.map(a => {
                  const attSt = getAttSt(a.status);
                  const AttIcon = attSt.icon;
                  return (
                    <div key={a.id} className="flex items-center gap-3 p-3 rounded-xl border border-gb-border bg-gb-surface-solid">
                      <div className="w-8 h-8 rounded-full bg-gb-surface-hover flex items-center justify-center shrink-0">
                        <span className="text-xs font-black text-gb-muted">
                          {displayName(a.user, a.name).charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-gb-text truncate">{displayName(a.user, a.name)}</p>
                        <p className="text-[11px] text-gb-muted">
                          {a.role_title && <span>{a.role_title}</span>}
                          {a.role_title && a.company && <span> · </span>}
                          {a.company && <span>{a.company}</span>}
                        </p>
                      </div>
                      {/* Status cycler */}
                      <div className="flex items-center gap-1 shrink-0">
                        <select value={a.status} onChange={e => updateAttStatus(a.id, e.target.value)}
                          disabled={!canMutate}
                          className={`h-7 px-2 rounded-lg border text-[10px] font-black uppercase tracking-widest outline-none transition-all ${attSt.color} bg-transparent border-current/30`}>
                          {ATTENDEE_STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                        </select>
                        <button onClick={() => removeAttendee(a.id)}
                          disabled={!canMutate}
                          className="p-1.5 rounded-lg text-gb-muted hover:text-gb-danger hover:bg-gb-danger/10 transition-colors">
                          <X size={12} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Synthèse présences */}
              {attendees.length > 0 && (
                <div className="grid grid-cols-3 gap-2 pt-2">
                  {[
                    { label: "Présents", key: "PRESENT", color: "text-emerald-500", bg: "bg-emerald-500/10" },
                    { label: "Absents",  key: "ABSENT",  color: "text-red-500",     bg: "bg-red-500/10" },
                    { label: "Excusés",  key: "EXCUSED", color: "text-amber-500",   bg: "bg-amber-500/10" },
                  ].map(item => (
                    <div key={item.key} className={`${item.bg} rounded-xl p-3 text-center`}>
                      <p className={`text-xl font-black ${item.color}`}>{attendees.filter(a => a.status === item.key).length}</p>
                      <p className={`text-[10px] font-bold uppercase tracking-widest ${item.color}`}>{item.label}</p>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {/* ── ACTION ITEMS ── */}
          {tab === "actions" && (
            <>
              {/* Add form */}
              <div className="bg-gb-surface-solid border border-gb-border rounded-2xl p-4 space-y-3">
                <p className="text-[10px] font-black uppercase tracking-widest text-gb-muted">Nouveau point d'action</p>
                <input value={newActSubject} onChange={e => setNewActSubject(e.target.value)}
                  placeholder="Sujet du point d'action…" className={`${inputCls} w-full`} />
                <div className="grid grid-cols-2 gap-2">
                  <select value={newActResponsible} onChange={e => setNewActResponsible(e.target.value)} className={selectCls}>
                    <option value="">Responsable…</option>
                    {users.map(u => <option key={u.id} value={u.id}>{u.firstname} {u.lastname}</option>)}
                  </select>
                  <input type="date" value={newActDue} onChange={e => setNewActDue(e.target.value)}
                    className={inputCls} placeholder="Échéance" />
                  <select value={newActStatus} onChange={e => setNewActStatus(e.target.value)} className={`${selectCls} col-span-2`}>
                    {ACTION_STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                </div>
                <textarea value={newActComment} onChange={e => setNewActComment(e.target.value)} rows={2}
                  placeholder="Commentaire (optionnel)…"
                  className="w-full bg-gb-app border border-gb-border rounded-xl px-3 py-2 text-sm text-gb-text placeholder:text-gb-muted focus:ring-2 focus:ring-gb-primary outline-none transition-all resize-none" />
                <button onClick={addActionItem}
                  disabled={!canMutate || addingAct || !newActSubject.trim()}
                  className="w-full h-9 rounded-xl bg-gb-primary text-white text-xs font-bold flex items-center justify-center gap-2 hover:opacity-90 transition-all disabled:opacity-50">
                  {addingAct ? <Loader2 size={13} className="animate-spin" /> : <ListChecks size={13} />}
                  Ajouter le point
                </button>
              </div>

              {/* List */}
              <div className="space-y-2">
                {actionItems.length === 0 ? (
                  <p className="text-sm text-gb-muted text-center py-8">Aucun point d'action</p>
                ) : actionItems.map(a => {
                  const actSt  = getActSt(a.status);
                  const ActIcon = actSt.icon;
                  const overdue = a.due_date && isPast(new Date(a.due_date)) && a.status !== "CLOSED" && a.status !== "CANCELLED";
                  return (
                    <div key={a.id}
                      className={`p-3 rounded-xl border transition-all ${
                        actSt.value === "CLOSED" ? "opacity-60" :
                        overdue ? "border-gb-danger/30 bg-gb-danger/5" :
                        "border-gb-border bg-gb-surface-solid"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${actSt.bg}`}>
                          <ActIcon size={12} className={actSt.color} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-gb-text">{a.subject}</p>
                          <div className="flex flex-wrap items-center gap-2 mt-1">
                            {a.responsible && (
                              <span className="text-[11px] text-gb-muted flex items-center gap-1">
                                <Flag size={9} className="text-gb-muted" />
                                {a.responsible.firstname} {a.responsible.lastname}
                              </span>
                            )}
                            {a.due_date && (
                              <span className={`text-[11px] flex items-center gap-1 ${overdue ? "text-gb-danger font-bold" : "text-gb-muted"}`}>
                                <AlarmClock size={9} />
                                {format(new Date(a.due_date), "d MMM yyyy", { locale: fr })}
                                {overdue && " — en retard"}
                              </span>
                            )}
                          </div>
                          {a.comment && <p className="text-xs text-gb-muted/70 italic mt-1 truncate">{a.comment}</p>}
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <select value={a.status} onChange={e => updateActionStatus(a.id, e.target.value)}
                            disabled={!canMutate}
                            className={`h-7 px-2 rounded-lg border text-[10px] font-black uppercase tracking-widest outline-none transition-all ${actSt.color} bg-transparent border-current/30`}>
                            {ACTION_STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                          </select>
                          <button onClick={() => { if (confirm("Supprimer ce point ?")) deleteAction(a.id); }}
                            disabled={!canMutate}
                            className="p-1.5 rounded-lg text-gb-muted hover:text-gb-danger hover:bg-gb-danger/10 transition-colors">
                            <X size={12} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Synthèse */}
              {actionItems.length > 0 && (
                <div className="grid grid-cols-2 gap-2 pt-2">
                  <div className="bg-red-500/10 rounded-xl p-3 text-center">
                    <p className="text-xl font-black text-red-500">{actionItems.filter(a => a.status === "OPEN").length}</p>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-red-500">Ouverts</p>
                  </div>
                  <div className="bg-emerald-500/10 rounded-xl p-3 text-center">
                    <p className="text-xl font-black text-emerald-600">{actionItems.filter(a => a.status === "CLOSED").length}</p>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-600">Clôturés</p>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-gb-border bg-gb-surface-solid/50 shrink-0 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={downloadMeetingPdf}
              className="inline-flex items-center gap-2 h-9 px-4 rounded-xl border border-gb-border text-gb-text text-xs font-bold hover:bg-gb-surface-hover transition-colors"
            >
              <FileDown size={14} className="text-red-500" />
              Télécharger le compte-rendu PDF
            </button>
            <button
              onClick={downloadMeetingExcel}
              className="inline-flex items-center gap-2 h-9 px-4 rounded-xl border border-gb-border text-gb-text text-xs font-bold hover:bg-gb-surface-hover transition-colors"
            >
              <Sheet size={14} className="text-emerald-500" />
              Exporter le compte-rendu Excel / CSV
            </button>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-gb-muted font-mono">ID #{meeting.id}</span>
            <span className="text-[10px] text-gb-muted">
              Modifié {format(new Date(meeting.updated_at), "d MMM yyyy", { locale: fr })}
            </span>
          </div>
        </div>
      </motion.aside>
    </motion.div>
  );
}

// ─── Main View ────────────────────────────────────────────────────────────────

export default function MeetingsView() {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading]   = useState(false);
  const [search, setSearch]     = useState("");
  const [filterProject, setFilterProject]     = useState("");
  const [filterType, setFilterType]           = useState("");
  const [filterStatus, setFilterStatus]       = useState("");
  const [projects, setProjects]               = useState<Project[]>([]);
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null);
  const [drawerOpen, setDrawerOpen]           = useState(false);
  const [formOpen, setFormOpen]               = useState(false);
  const [editMeeting, setEditMeeting]         = useState<Meeting | null>(null);
  const [workflowNotice, setWorkflowNotice]   = useState<string | null>(null);

  const fetchMeetings = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterProject) params.set("project_id", filterProject);
      if (filterType)    params.set("type",        filterType);
      if (filterStatus)  params.set("status",      filterStatus);
      const r = await apiFetch(`${API_BASE}/meetings?${params}`);
      const d = await r.json();
      setMeetings(Array.isArray(d) ? d : []);
    } catch {
      setMeetings([]);
    } finally {
      setLoading(false);
    }
  }, [filterProject, filterType, filterStatus]);

  useEffect(() => { fetchMeetings(); }, [fetchMeetings]);

  useEffect(() => {
    apiFetch(`${API_BASE}/projects?limit=100`)
      .then(r => r.json())
      .then(d => setProjects(Array.isArray(d) ? d : (d.data ?? [])))
      .catch(() => {});
  }, []);

  const resolveProjectPhase = useCallback((meeting?: Meeting | null) => {
    if (!meeting) return null;
    return meeting.project?.phase ?? projects.find((p) => p.id === meeting.project_id)?.phase ?? null;
  }, [projects]);

  const filtered = meetings.filter(m =>
    !search ||
    m.title.toLowerCase().includes(search.toLowerCase()) ||
    (m.reference ?? "").toLowerCase().includes(search.toLowerCase()) ||
    (m.project?.title ?? "").toLowerCase().includes(search.toLowerCase())
  );

  // KPIs
  const total       = meetings.length;
  const planned     = meetings.filter(m => m.status === "PLANNED").length;
  const done        = meetings.filter(m => m.status === "DONE").length;
  const openActions = meetings.reduce((acc, m) =>
    acc + (m.actionItems ?? []).filter(a => a.status === "OPEN" || a.status === "IN_PROGRESS").length, 0);

  const handleDelete = async (id: number) => {
    const current = meetings.find((m) => m.id === id);
    const phase = resolveProjectPhase(current);
    if (!isMeetingPhaseAllowed(phase)) {
      setWorkflowNotice(`${MEETING_WORKFLOW_GUARD.reason} Phase actuelle: ${getProjectPhaseLabel(phase)}.`);
      return;
    }
    try {
      await apiFetch(`${API_BASE}/meetings/${id}`, { method: "DELETE" });
      setDrawerOpen(false); setSelectedMeeting(null);
      fetchMeetings();
      setWorkflowNotice(null);
    } catch { /* ignore */ }
  };

  const selectCls = "bg-gb-app border border-gb-border rounded-xl h-9 px-3 text-sm text-gb-text focus:ring-2 focus:ring-gb-primary outline-none transition-all";

  // Groupement par semaine/mois pour la liste
  const groupedByMonth: Record<string, Meeting[]> = {};
  filtered.forEach(m => {
    const key = format(new Date(m.date), "MMMM yyyy", { locale: fr });
    if (!groupedByMonth[key]) groupedByMonth[key] = [];
    groupedByMonth[key].push(m);
  });

  return (
    <div className="space-y-6 pb-8">
      {/* Title */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-gb-text">Réunions</h1>
          <p className="text-sm text-gb-muted mt-0.5">Compte-rendus, participants, points d'action</p>
        </div>
        <button
          onClick={() => { setEditMeeting(null); setFormOpen(true); }}
          className="h-10 px-5 rounded-xl bg-gb-primary text-white text-sm font-bold shadow-lg shadow-gb-primary/20 hover:opacity-90 transition-all flex items-center gap-2">
          <Plus size={16} /> Nouvelle réunion
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Total réunions"     value={total}       icon={Calendar}    accent="bg-blue-500/10 text-blue-500" />
        <KpiCard label="Planifiées"         value={planned}     icon={CalendarClock} accent="bg-amber-500/10 text-amber-600" />
        <KpiCard label="Tenues"             value={done}        icon={CheckCircle2} accent="bg-emerald-500/10 text-emerald-600" />
        <KpiCard label="Actions ouvertes"   value={openActions} icon={ListChecks}
          accent={openActions > 0 ? "bg-gb-danger/10 text-gb-danger" : "bg-gb-surface-hover text-gb-muted"}
          alert={openActions > 0} />
      </div>

      {/* Toolbar */}
      <div className="bg-gb-surface-solid border border-gb-border rounded-2xl p-4">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gb-muted pointer-events-none" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Rechercher par titre, référence, projet…"
              className="w-full bg-gb-app border border-gb-border rounded-xl h-9 pl-8 pr-4 text-sm text-gb-text placeholder:text-gb-muted focus:ring-2 focus:ring-gb-primary outline-none transition-all" />
          </div>
          <div className="flex flex-wrap gap-2">
            <select value={filterProject} onChange={e => setFilterProject(e.target.value)} className={selectCls}>
              <option value="">Tous projets</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.code}</option>)}
            </select>
            <select value={filterType} onChange={e => setFilterType(e.target.value)} className={selectCls}>
              <option value="">Type</option>
              {MEETING_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className={selectCls}>
              <option value="">Statut</option>
              {MEETING_STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
        </div>
      </div>

      {workflowNotice && (
        <div className="flex items-center gap-2 text-sm text-amber-500 bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-3">
          <AlertCircle size={14} />
          {workflowNotice}
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center p-24">
          <Loader2 className="w-8 h-8 text-gb-primary animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="p-20 text-center bg-gb-surface-solid border border-dashed border-gb-border rounded-3xl">
          <Calendar className="mx-auto text-gb-muted/20 mb-6" size={64} />
          <h3 className="text-xl font-bold text-gb-text mb-2">Aucune réunion</h3>
          <p className="text-gb-muted text-sm">Planifiez votre première réunion de chantier.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedByMonth).map(([month, items]) => (
            <div key={month}>
              {/* Month header */}
              <div className="flex items-center gap-3 mb-3">
                <span className="text-[11px] font-black uppercase tracking-widest text-gb-muted capitalize">{month}</span>
                <div className="flex-1 h-px bg-gb-border/60" />
                <span className="text-[10px] text-gb-muted font-semibold">{items.length} réunion{items.length > 1 ? "s" : ""}</span>
              </div>

              {/* Meeting cards */}
              <div className="space-y-2">
                <AnimatePresence initial={false}>
                  {items.map((m, i) => {
                    const type   = getType(m.type);
                    const status = getStatus(m.status);
                    const StatusIcon = status.icon;
                    const dateObj    = new Date(m.date);
                    const isTd       = isToday(dateObj);
                    const isPst      = isPast(dateObj) && m.status === "PLANNED";
                    const openAct    = (m.actionItems ?? []).filter(a => a.status === "OPEN").length;

                    return (
                      <motion.div
                        key={m.id}
                        initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.03 }}
                        onClick={() => { setSelectedMeeting(m); setDrawerOpen(true); }}
                        className={`group relative flex items-center gap-4 bg-gb-surface-solid border rounded-2xl p-4 cursor-pointer hover:border-gb-primary/40 hover:bg-gb-surface-hover transition-all ${
                          isTd ? "border-gb-primary/40 bg-gb-primary/5" :
                          isPst ? "border-amber-500/30" :
                          "border-gb-border"
                        }`}
                      >
                        {/* Color bar */}
                        <div className={`w-1 self-stretch rounded-full ${type.dot} shrink-0`} />

                        {/* Date column */}
                        <div className={`w-14 shrink-0 text-center rounded-xl py-2 ${isTd ? "bg-gb-primary/10" : "bg-gb-surface-hover"}`}>
                          <p className={`text-xs font-black uppercase ${isTd ? "text-gb-primary" : "text-gb-muted"}`}>
                            {format(dateObj, "MMM", { locale: fr })}
                          </p>
                          <p className={`text-2xl font-black leading-none ${isTd ? "text-gb-primary" : "text-gb-text"}`}>
                            {format(dateObj, "d")}
                          </p>
                          <p className={`text-[10px] font-semibold ${isTd ? "text-gb-primary/70" : "text-gb-muted"}`}>
                            {format(dateObj, "HH:mm")}
                          </p>
                        </div>

                        {/* Main info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            {isTd && (
                              <span className="text-[9px] font-black uppercase tracking-widest text-gb-primary bg-gb-primary/10 px-2 py-0.5 rounded-full border border-gb-primary/20">
                                Aujourd'hui
                              </span>
                            )}
                            <TypeBadge type={m.type} />
                          </div>
                          <p className="font-extrabold text-gb-text truncate">{m.title}</p>
                          <div className="flex items-center gap-3 mt-1 flex-wrap">
                            {m.reference && <span className="text-[11px] font-mono text-gb-muted">{m.reference}</span>}
                            {m.location  && (
                              <span className="text-[11px] text-gb-muted flex items-center gap-1">
                                <MapPin size={9} />{m.location}
                              </span>
                            )}
                            {m.project && (
                              <span className="text-[11px] text-gb-muted flex items-center gap-1">
                                <Building2 size={9} />{m.project.code}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Right side */}
                        <div className="flex flex-col items-end gap-2 shrink-0">
                          <StatusBadge status={m.status} />
                          <div className="flex items-center gap-2 text-[11px] text-gb-muted">
                            {m.attendees && m.attendees.length > 0 && (
                              <span className="flex items-center gap-1">
                                <Users size={10} />{m.attendees.length}
                              </span>
                            )}
                            {openAct > 0 && (
                              <span className="flex items-center gap-1 text-gb-danger">
                                <ListChecks size={10} />{openAct} action{openAct > 1 ? "s" : ""}
                              </span>
                            )}
                          </div>
                        </div>

                        <ChevronRight size={16} className="text-gb-muted group-hover:text-gb-primary transition-colors shrink-0" />
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Detail Drawer */}
      <AnimatePresence>
        {drawerOpen && selectedMeeting && (
          <MeetingDetailDrawer
            meeting={selectedMeeting}
            onClose={() => { setDrawerOpen(false); setSelectedMeeting(null); }}
            onEdit={m => { setEditMeeting(m); setDrawerOpen(false); setFormOpen(true); }}
            onDelete={handleDelete}
            onUpdated={fetchMeetings}
            canMutate={isMeetingPhaseAllowed(resolveProjectPhase(selectedMeeting))}
            workflowBlockMessage={`${MEETING_WORKFLOW_GUARD.reason} Phase actuelle: ${getProjectPhaseLabel(resolveProjectPhase(selectedMeeting))}.`}
          />
        )}
      </AnimatePresence>

      {/* Form Dialog */}
      <MeetingFormDialog
        open={formOpen}
        onClose={() => { setFormOpen(false); setEditMeeting(null); }}
        meeting={editMeeting}
        onSaved={() => { setFormOpen(false); setEditMeeting(null); fetchMeetings(); }}
      />
    </div>
  );
}
