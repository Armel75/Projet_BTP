import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  MessageSquare, Plus, Search, Loader2, AlertTriangle,
  ChevronRight, Pencil, Trash2, X, Clock, CheckCircle2,
  AlertCircle, XCircle, PlayCircle, Building2, Layers,
  FileText, Send, Paperclip, Eye, EyeOff, Flag,
  Circle, CircleDot, CircleOff, TrendingUp, CalendarClock,
  DollarSign, Timer, Filter, ArrowUpRight, Info,
  ClipboardList, Flame, ArrowDown, Minus, ChevronDown,
  CalendarX, CheckCheck, RotateCcw, Hash, BookOpen,
  PenLine, UserCheck,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { apiFetch, API_BASE } from "../lib/api";
import { format, isPast, isToday, differenceInDays, formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Comment {
  id: number;
  rfi_id: number;
  user_id?: number;
  content: string;
  document_id?: number;
  document?: { id: number; name?: string; file_url?: string; file_name?: string };
  created_at: string;
  updated_at: string;
  user?: { id: number; firstname: string; lastname: string; email: string };
}

interface RFI {
  id: number;
  project_id: number;
  tenant_id: number;
  lot_id?: number;
  number: string;
  reference?: string;
  category: string;
  discipline?: string;
  subject: string;
  question: string;
  drawing_ref?: string;
  spec_section?: string;
  status: string;
  priority: string;
  submitted_by?: number;
  assigned_to?: number;
  reviewed_by?: number;
  answer?: string;
  official_response?: string;
  due_date?: string;
  answered_date?: string;
  closed_date?: string;
  cost_impact: boolean;
  cost_impact_amount?: number;
  schedule_impact: boolean;
  schedule_impact_days?: number;
  distribution_list?: string;
  created_at: string;
  updated_at: string;
  project?: { id: number; code: string; title: string };
  lot?: { id: number; lot_number: string; name: string };
  submittedBy?: { id: number; firstname: string; lastname: string; email: string };
  assignedTo?:  { id: number; firstname: string; lastname: string; email: string };
  reviewedBy?:  { id: number; firstname: string; lastname: string; email: string };
  comments: Comment[];
}

interface Project { id: number; code: string; title: string; }
interface Lot     { id: number; lot_number: string; name: string; }
interface UserRef { id: number; firstname: string; lastname: string; email: string; }

// ─── Config ───────────────────────────────────────────────────────────────────

const RFI_STATUSES = [
  { value: "DRAFT",        label: "Brouillon",   icon: PenLine,      color: "text-slate-400",   bg: "bg-slate-400/10 border-slate-400/20" },
  { value: "OPEN",         label: "Ouverte",     icon: CircleDot,    color: "text-blue-500",    bg: "bg-blue-500/10 border-blue-500/20" },
  { value: "UNDER_REVIEW", label: "En revue",    icon: Eye,          color: "text-amber-500",   bg: "bg-amber-500/10 border-amber-500/20" },
  { value: "ANSWERED",     label: "Répondue",    icon: CheckCircle2, color: "text-emerald-500", bg: "bg-emerald-500/10 border-emerald-500/20" },
  { value: "CLOSED",       label: "Clôturée",    icon: CheckCheck,   color: "text-gb-muted",    bg: "bg-gb-surface-hover border-gb-border" },
  { value: "CANCELLED",    label: "Annulée",     icon: CircleOff,    color: "text-slate-400",   bg: "bg-slate-400/10 border-slate-400/20" },
] as const;

const RFI_PRIORITIES = [
  { value: "URGENT", label: "Urgent",  icon: Flame,         color: "text-red-500",    bg: "bg-red-500/10 border-red-500/20",       dot: "bg-red-500" },
  { value: "HIGH",   label: "Haute",   icon: ArrowUpRight,  color: "text-orange-500", bg: "bg-orange-500/10 border-orange-500/20", dot: "bg-orange-500" },
  { value: "NORMAL", label: "Normale", icon: Minus,         color: "text-blue-500",   bg: "bg-blue-500/10 border-blue-500/20",     dot: "bg-blue-400" },
  { value: "LOW",    label: "Basse",   icon: ArrowDown,     color: "text-slate-400",  bg: "bg-slate-400/10 border-slate-400/20",   dot: "bg-slate-400" },
] as const;

const RFI_CATEGORIES = [
  { value: "CLARIFICATION", label: "Clarification",    color: "text-blue-500" },
  { value: "DESIGN_CHANGE", label: "Modification conception", color: "text-purple-500" },
  { value: "SITE_CONDITION",label: "Condition de site", color: "text-amber-500" },
  { value: "SUBSTITUTION",  label: "Substitution",     color: "text-cyan-500" },
  { value: "COORDINATION",  label: "Coordination",     color: "text-emerald-500" },
  { value: "SAFETY",        label: "Sécurité",         color: "text-red-500" },
] as const;

const DISCIPLINES = [
  "STRUCTURE", "GROS_OEUVRE", "CHARPENTE", "FACADES",
  "SECOND_OEUVRE", "MEP", "VRD", "PAYSAGE",
];

const DISCIPLINE_LABELS: Record<string, string> = {
  STRUCTURE: "Structure", GROS_OEUVRE: "Gros Œuvre", CHARPENTE: "Charpente",
  FACADES: "Façades", SECOND_OEUVRE: "Second Œuvre", MEP: "MEP/CVC",
  VRD: "VRD", PAYSAGE: "Paysage",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const getStatus   = (v: string) => RFI_STATUSES.find(s => s.value === v)   ?? RFI_STATUSES[1];
const getPriority = (v: string) => RFI_PRIORITIES.find(p => p.value === v) ?? RFI_PRIORITIES[2];
const getCategory = (v: string) => RFI_CATEGORIES.find(c => c.value === v) ?? RFI_CATEGORIES[0];

const fullName = (u?: { firstname: string; lastname: string } | null) =>
  u ? `${u.firstname} ${u.lastname}` : "—";

const isOverdue = (rfi: RFI) =>
  rfi.due_date &&
  isPast(new Date(rfi.due_date)) &&
  rfi.status !== "CLOSED" &&
  rfi.status !== "CANCELLED" &&
  rfi.status !== "ANSWERED";

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

function PriorityBadge({ priority }: { priority: string }) {
  const p = getPriority(priority);
  const Icon = p.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 h-6 px-2.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${p.bg} ${p.color}`}>
      <Icon size={10} />{p.label}
    </span>
  );
}

function KpiCard({ label, value, icon: Icon, accent, alert, sub }: {
  label: string; value: number | string; icon: React.FC<any>;
  accent: string; alert?: boolean; sub?: string;
}) {
  return (
    <div className={`bg-gb-surface-solid border rounded-2xl p-5 flex items-center gap-4 transition-all ${alert ? "border-gb-danger/40" : "border-gb-border"}`}>
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${accent}`}>
        <Icon size={20} />
      </div>
      <div className="min-w-0">
        <p className="text-2xl font-black text-gb-text">{value}</p>
        <p className="text-xs font-semibold text-gb-muted uppercase tracking-wider truncate">{label}</p>
        {sub && <p className="text-[10px] text-gb-muted/60 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

function RFIFormField({ label, req, children, half }: { label: string; req?: boolean; children: React.ReactNode; half?: boolean }) {
  return (
    <div className={`flex flex-col gap-1.5 ${half ? "" : ""}`}>
      <label className="text-[10px] font-black uppercase tracking-widest text-gb-muted">
        {label}{req && <span className="text-gb-danger ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}

// ─── Form Dialog ──────────────────────────────────────────────────────────────

const EMPTY_FORM = {
  reference: "", category: "CLARIFICATION", discipline: "",
  subject: "", question: "", drawing_ref: "", spec_section: "",
  status: "OPEN", priority: "NORMAL",
  submitted_by: "", assigned_to: "", reviewed_by: "",
  answer: "", official_response: "", due_date: "",
  cost_impact: false, cost_impact_amount: "",
  schedule_impact: false, schedule_impact_days: "",
  distribution_list: "",
  project_id: "", lot_id: "",
};

function RFIFormDialog({ open, onClose, rfi, onSaved }: {
  open: boolean; onClose: () => void;
  rfi: RFI | null; onSaved: () => void;
}) {
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [projects, setProjects] = useState<Project[]>([]);
  const [lots, setLots] = useState<Lot[]>([]);
  const [users, setUsers] = useState<UserRef[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<"identification" | "question" | "impacts" | "diffusion">("identification");

  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));

  useEffect(() => {
    if (!open) return;
    apiFetch(`${API_BASE}/projects?limit=100`).then(r => r.json()).then(d => setProjects(Array.isArray(d) ? d : Array.isArray(d?.data) ? d.data : [])).catch(() => {});
    apiFetch(`${API_BASE}/resources/users?limit=200`).then(r => r.json()).then(d => setUsers(Array.isArray(d) ? d : Array.isArray(d?.data) ? d.data : [])).catch(() => {});
  }, [open]);

  useEffect(() => {
    if (!form.project_id) { setLots([]); return; }
    apiFetch(`${API_BASE}/projects/${form.project_id}/lots`)
      .then(r => r.json()).then(d => setLots(Array.isArray(d) ? d : Array.isArray(d?.data) ? d.data : [])).catch(() => {});
  }, [form.project_id]);

  useEffect(() => {
    if (!open) return;
    if (rfi) {
      setForm({
        reference:    rfi.reference    ?? "",
        category:     rfi.category,
        discipline:   rfi.discipline   ?? "",
        subject:      rfi.subject,
        question:     rfi.question,
        drawing_ref:  rfi.drawing_ref  ?? "",
        spec_section: rfi.spec_section ?? "",
        status:       rfi.status,
        priority:     rfi.priority,
        submitted_by: rfi.submitted_by ? String(rfi.submitted_by) : "",
        assigned_to:  rfi.assigned_to  ? String(rfi.assigned_to)  : "",
        reviewed_by:  rfi.reviewed_by  ? String(rfi.reviewed_by)  : "",
        answer:             rfi.answer             ?? "",
        official_response:  rfi.official_response  ?? "",
        due_date:           rfi.due_date ? rfi.due_date.slice(0, 10) : "",
        cost_impact:        rfi.cost_impact,
        cost_impact_amount: rfi.cost_impact_amount  ? String(rfi.cost_impact_amount)  : "",
        schedule_impact:    rfi.schedule_impact,
        schedule_impact_days: rfi.schedule_impact_days ? String(rfi.schedule_impact_days) : "",
        distribution_list:  rfi.distribution_list ?? "",
        project_id: rfi.project_id ? String(rfi.project_id) : "",
        lot_id:     rfi.lot_id     ? String(rfi.lot_id)     : "",
      });
    } else {
      setForm({ ...EMPTY_FORM });
    }
    setError(null);
    setTab("identification");
  }, [open, rfi]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.project_id)       { setError("Le projet est obligatoire"); return; }
    if (!form.subject.trim())   { setError("Le sujet est obligatoire"); return; }
    if (!form.question.trim())  { setError("La question est obligatoire"); return; }
    setSaving(true); setError(null);

    try {
      const payload: Record<string, any> = {
        ...form,
        project_id: Number(form.project_id),
        lot_id:     form.lot_id     ? Number(form.lot_id)     : undefined,
        submitted_by: form.submitted_by ? Number(form.submitted_by) : undefined,
        assigned_to:  form.assigned_to  ? Number(form.assigned_to)  : undefined,
        reviewed_by:  form.reviewed_by  ? Number(form.reviewed_by)  : undefined,
        cost_impact_amount:   form.cost_impact_amount   ? Number(form.cost_impact_amount)   : undefined,
        schedule_impact_days: form.schedule_impact_days ? Number(form.schedule_impact_days) : undefined,
      };
      ["lot_id","submitted_by","assigned_to","reviewed_by","cost_impact_amount","schedule_impact_days"].forEach(k => {
        if (!payload[k]) delete payload[k];
      });
      if (!payload.due_date) delete payload.due_date;

      if (rfi) {
        await apiFetch(`${API_BASE}/rfis/${rfi.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        await apiFetch(`${API_BASE}/rfis`, {
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

  const TABS = [
    { id: "identification", label: "Identification" },
    { id: "question",       label: "Question" },
    { id: "impacts",        label: "Impacts" },
    { id: "diffusion",      label: "Diffusion" },
  ];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
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
                <ClipboardList size={16} className="text-gb-primary" />
              </div>
              <h2 className="text-lg font-extrabold text-gb-text">
                {rfi ? "Modifier la demande de renseignements" : "Nouvelle demande de renseignements"}
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
          <form onSubmit={submit} className="flex-1 overflow-y-auto px-6 py-5 space-y-4">

            {tab === "identification" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <RFIFormField label="Projet" req>
                  <select value={form.project_id} onChange={e => set("project_id", e.target.value)} className={selectCls}>
                    <option value="">Sélectionner…</option>
                    {projects.map(p => <option key={p.id} value={p.id}>{p.code} — {p.title}</option>)}
                  </select>
                </RFIFormField>
                <RFIFormField label="Lot (optionnel)">
                  <select value={form.lot_id} onChange={e => set("lot_id", e.target.value)} className={selectCls} disabled={!form.project_id}>
                    <option value="">Tous lots</option>
                    {lots.map(l => <option key={l.id} value={l.id}>Lot {l.lot_number} — {l.name}</option>)}
                  </select>
                </RFIFormField>
                <RFIFormField label="Référence client / MOE">
                  <input value={form.reference} onChange={e => set("reference", e.target.value)} placeholder="MOE-RFI-042" className={inputCls} />
                </RFIFormField>
                <RFIFormField label="Catégorie">
                  <select value={form.category} onChange={e => set("category", e.target.value)} className={selectCls}>
                    {RFI_CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </select>
                </RFIFormField>
                <RFIFormField label="Discipline">
                  <select value={form.discipline} onChange={e => set("discipline", e.target.value)} className={selectCls}>
                    <option value="">—</option>
                    {DISCIPLINES.map(d => <option key={d} value={d}>{DISCIPLINE_LABELS[d]}</option>)}
                  </select>
                </RFIFormField>
                <RFIFormField label="Priorité">
                  <select value={form.priority} onChange={e => set("priority", e.target.value)} className={selectCls}>
                    {RFI_PRIORITIES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                  </select>
                </RFIFormField>
                <RFIFormField label="Statut">
                  <select value={form.status} onChange={e => set("status", e.target.value)} className={selectCls}>
                    {RFI_STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                </RFIFormField>
                <RFIFormField label="Soumis par">
                  <select value={form.submitted_by} onChange={e => set("submitted_by", e.target.value)} className={selectCls}>
                    <option value="">—</option>
                    {users.map(u => <option key={u.id} value={u.id}>{u.firstname} {u.lastname}</option>)}
                  </select>
                </RFIFormField>
                <RFIFormField label="Assigné à (responsable réponse)">
                  <select value={form.assigned_to} onChange={e => set("assigned_to", e.target.value)} className={selectCls}>
                    <option value="">—</option>
                    {users.map(u => <option key={u.id} value={u.id}>{u.firstname} {u.lastname}</option>)}
                  </select>
                </RFIFormField>
                <RFIFormField label="Révisé par (MOE / BET)">
                  <select value={form.reviewed_by} onChange={e => set("reviewed_by", e.target.value)} className={selectCls}>
                    <option value="">—</option>
                    {users.map(u => <option key={u.id} value={u.id}>{u.firstname} {u.lastname}</option>)}
                  </select>
                </RFIFormField>
                <RFIFormField label="Date limite de réponse">
                  <input type="date" value={form.due_date} onChange={e => set("due_date", e.target.value)} className={inputCls} />
                </RFIFormField>
              </div>
            )}

            {tab === "question" && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <RFIFormField label="Référence plan / DWG">
                    <input value={form.drawing_ref} onChange={e => set("drawing_ref", e.target.value)} placeholder="PL-STR-004, Rev.B" className={inputCls} />
                  </RFIFormField>
                  <RFIFormField label="Section CCTP concernée">
                    <input value={form.spec_section} onChange={e => set("spec_section", e.target.value)} placeholder="Section 07 — Étanchéité" className={inputCls} />
                  </RFIFormField>
                </div>
                <RFIFormField label="Sujet (résumé)" req>
                  <input value={form.subject} onChange={e => set("subject", e.target.value)}
                    placeholder="Clarification sur le détail d'accrochage façade Nord…" className={inputCls} />
                </RFIFormField>
                <RFIFormField label="Question détaillée" req>
                  <textarea value={form.question} onChange={e => set("question", e.target.value)} rows={5}
                    placeholder="Décrire précisément la question, les plans concernés, le contexte…"
                    className={areaCls} />
                </RFIFormField>
                <RFIFormField label="Réponse (brouillon)">
                  <textarea value={form.answer} onChange={e => set("answer", e.target.value)} rows={3}
                    placeholder="Réponse préliminaire…" className={areaCls} />
                </RFIFormField>
                <RFIFormField label="Réponse officielle">
                  <textarea value={form.official_response} onChange={e => set("official_response", e.target.value)} rows={3}
                    placeholder="Réponse formelle MOE validée…" className={areaCls} />
                </RFIFormField>
              </div>
            )}

            {tab === "impacts" && (
              <div className="space-y-5">
                {/* Impact coût */}
                <div className={`rounded-2xl border p-5 transition-all ${form.cost_impact ? "border-orange-400/40 bg-orange-500/5" : "border-gb-border bg-gb-surface-solid"}`}>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${form.cost_impact ? "bg-orange-500/10" : "bg-gb-surface-hover"}`}>
                        <DollarSign size={16} className={form.cost_impact ? "text-orange-500" : "text-gb-muted"} />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-gb-text">Impact financier</p>
                        <p className="text-xs text-gb-muted">Cette RFI génère-t-elle un coût supplémentaire ?</p>
                      </div>
                    </div>
                    <button type="button" onClick={() => set("cost_impact", !form.cost_impact)}
                      className={`w-11 h-6 rounded-full transition-all relative ${form.cost_impact ? "bg-orange-500" : "bg-gb-border"}`}>
                      <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${form.cost_impact ? "left-5" : "left-0.5"}`} />
                    </button>
                  </div>
                  <AnimatePresence>
                    {form.cost_impact && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
                        <RFIFormField label="Montant estimé (FCFA)">
                          <input type="number" value={form.cost_impact_amount} onChange={e => set("cost_impact_amount", e.target.value)}
                            placeholder="Ex : 12500" className={inputCls} min="0" step="100" />
                        </RFIFormField>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Impact planning */}
                <div className={`rounded-2xl border p-5 transition-all ${form.schedule_impact ? "border-red-400/40 bg-red-500/5" : "border-gb-border bg-gb-surface-solid"}`}>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${form.schedule_impact ? "bg-red-500/10" : "bg-gb-surface-hover"}`}>
                        <Timer size={16} className={form.schedule_impact ? "text-red-500" : "text-gb-muted"} />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-gb-text">Impact planning</p>
                        <p className="text-xs text-gb-muted">Cette RFI retarde-t-elle des travaux ?</p>
                      </div>
                    </div>
                    <button type="button" onClick={() => set("schedule_impact", !form.schedule_impact)}
                      className={`w-11 h-6 rounded-full transition-all relative ${form.schedule_impact ? "bg-red-500" : "bg-gb-border"}`}>
                      <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${form.schedule_impact ? "left-5" : "left-0.5"}`} />
                    </button>
                  </div>
                  <AnimatePresence>
                    {form.schedule_impact && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
                        <RFIFormField label="Nombre de jours de retard estimés">
                          <input type="number" value={form.schedule_impact_days} onChange={e => set("schedule_impact_days", e.target.value)}
                            placeholder="Ex : 5" className={inputCls} min="1" step="1" />
                        </RFIFormField>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            )}

            {tab === "diffusion" && (
              <div className="space-y-4">
                <div className="bg-gb-surface-solid border border-gb-border rounded-2xl p-4 space-y-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Send size={13} className="text-gb-muted" />
                    <p className="text-[10px] font-black uppercase tracking-widest text-gb-muted">Liste de diffusion</p>
                  </div>
                  <p className="text-xs text-gb-muted/70">Adresses e-mail des destinataires (MOA, BET, contrôleur technique, OPC…), séparées par des virgules.</p>
                  <textarea value={form.distribution_list} onChange={e => set("distribution_list", e.target.value)} rows={4}
                    placeholder="moa@client.fr, bet-structure@ingenieurs.fr, opc@mission.fr…"
                    className="w-full bg-gb-app border border-gb-border rounded-xl px-3 py-2.5 text-sm text-gb-text placeholder:text-gb-muted focus:ring-2 focus:ring-gb-primary outline-none transition-all resize-none" />
                </div>
              </div>
            )}

            {error && (
              <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-2 bg-gb-danger/10 border border-gb-danger/20 rounded-xl px-4 py-3 text-sm text-gb-danger">
                <AlertCircle size={14} /> {error}
              </motion.div>
            )}
          </form>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-gb-border bg-gb-app shrink-0 flex justify-end gap-3">
            <button type="button" onClick={onClose}
              className="h-10 px-5 rounded-xl border border-gb-border text-gb-text text-sm font-semibold hover:bg-gb-surface-hover transition-colors">
              Annuler
            </button>
            <button type="button" onClick={submit} disabled={saving}
              className="h-10 px-6 rounded-xl bg-gb-primary text-white text-sm font-bold shadow-lg shadow-gb-primary/20 hover:opacity-90 transition-all disabled:opacity-60 flex items-center gap-2">
              {saving ? <Loader2 size={14} className="animate-spin" /> : <ClipboardList size={14} />}
              {rfi ? "Enregistrer" : "Créer la demande de renseignements"}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// ─── RFI Detail Drawer ────────────────────────────────────────────────────────

function RFIDetailDrawer({ rfi, onClose, onEdit, onDelete, onUpdated }: {
  rfi: RFI;
  onClose: () => void;
  onEdit: (r: RFI) => void;
  onDelete: (id: number) => void;
  onUpdated: () => void;
}) {
  const [tab, setTab] = useState<"detail" | "comments" | "impacts">("detail");
  const [comments, setComments] = useState<Comment[]>(rfi.comments ?? []);
  const [newComment, setNewComment] = useState("");
  const [newCommentFiles, setNewCommentFiles] = useState<File[]>([]);
  const [postingComment, setPostingComment] = useState(false);
  const [editCommentId, setEditCommentId] = useState<number | null>(null);
  const [editContent, setEditContent] = useState("");
  const commentsEndRef = useRef<HTMLDivElement>(null);

  const status   = getStatus(rfi.status);
  const priority = getPriority(rfi.priority);
  const category = getCategory(rfi.category);
  const overdue  = isOverdue(rfi);

  const fetchComments = useCallback(async () => {
    const r = await apiFetch(`${API_BASE}/rfis/${rfi.id}/comments`);
    const d = await r.json();
    setComments(Array.isArray(d) ? d : []);
  }, [rfi.id]);

  const uploadCommentFiles = async () => {
    if (newCommentFiles.length === 0) return [] as number[];
    const fd = new FormData();
    newCommentFiles.forEach((f) => fd.append("files", f));
    fd.append("project_id", String(rfi.project_id));
    fd.append("category", "RFI");
    fd.append("phase", "EXE");

    const uploadRes = await apiFetch(`${API_BASE}/documents/uploads`, { method: "POST", body: fd });
    if (!uploadRes.ok) {
      const b = await uploadRes.json().catch(() => ({}));
      throw new Error(b.error || `Erreur upload (${uploadRes.status})`);
    }
    const uploadBody = await uploadRes.json().catch(() => ({}));
    const files = Array.isArray(uploadBody?.files) ? uploadBody.files : [];
    return files
      .map((f: any) => Number(f.documentId ?? f.id))
      .filter((id: number) => Number.isFinite(id) && id > 0);
  };

  const postComment = async () => {
    if (!newComment.trim()) return;
    setPostingComment(true);
    try {
      const documentIds = await uploadCommentFiles();
      await apiFetch(`${API_BASE}/rfis/${rfi.id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: newComment.trim(), document_id: documentIds[0] || undefined }),
      });
      setNewComment("");
      setNewCommentFiles([]);
      await fetchComments();
      onUpdated();
      setTimeout(() => commentsEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    } finally { setPostingComment(false); }
  };

  const saveEditComment = async (id: number) => {
    if (!editContent.trim()) return;
    await apiFetch(`${API_BASE}/rfis/${rfi.id}/comments/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: editContent }),
    });
    setEditCommentId(null);
    await fetchComments();
  };

  const deleteComment = async (id: number) => {
    await apiFetch(`${API_BASE}/rfis/${rfi.id}/comments/${id}`, { method: "DELETE" });
    await fetchComments();
    onUpdated();
  };

  const StatusIcon   = status.icon;
  const PriorityIcon = priority.icon;

  const InfoBlock = ({ icon: Icon, label, value }: { icon: React.FC<any>; label: string; value: React.ReactNode }) => (
    <div>
      <p className="text-[9px] font-black uppercase tracking-widest text-gb-muted/70 mb-0.5 flex items-center gap-1">
        <Icon size={9} className="text-gb-muted/60" />{label}
      </p>
      <div className="text-sm font-semibold text-gb-text">{value}</div>
    </div>
  );

  const TABS = [
    { id: "detail",   label: "Détail",      count: null },
    { id: "comments", label: "Commentaires", count: comments.length },
    { id: "impacts",  label: "Impacts",      count: (rfi.cost_impact || rfi.schedule_impact) ? 1 : null },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex" onClick={onClose}
    >
      <div className="flex-1 bg-black/40 backdrop-blur-sm" />
      <motion.aside
        initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="w-full max-w-xl bg-gb-app border-l border-gb-border h-full flex flex-col shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`p-6 border-b border-gb-border shrink-0 ${overdue ? "bg-red-500/5" : "bg-gb-surface-solid/50"}`}>
          <div className="flex items-start justify-between gap-3 mb-4">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-mono font-bold text-gb-primary bg-gb-primary/10 px-2.5 py-1 rounded-lg border border-gb-primary/20">
                {rfi.number}
              </span>
              {rfi.reference && <span className="text-xs font-mono text-gb-muted">{rfi.reference}</span>}
              {overdue && (
                <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-red-500 bg-red-500/10 border border-red-500/20 px-2 py-0.5 rounded-full">
                  <AlertTriangle size={9} /> En retard
                </span>
              )}
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button onClick={() => onEdit(rfi)}
                className="p-2 rounded-xl text-gb-muted hover:text-gb-primary hover:bg-gb-primary/10 transition-colors">
                <Pencil size={15} />
              </button>
              <button onClick={() => { if (confirm("Supprimer cette demande de renseignements ?")) onDelete(rfi.id); }}
                className="p-2 rounded-xl text-gb-muted hover:text-gb-danger hover:bg-gb-danger/10 transition-colors">
                <Trash2 size={15} />
              </button>
              <button onClick={onClose} className="p-2 rounded-xl text-gb-muted hover:text-gb-text hover:bg-gb-surface-hover transition-colors">
                <X size={18} />
              </button>
            </div>
          </div>

          <h2 className="text-xl font-extrabold text-gb-text tracking-tight leading-tight mb-3">
            {rfi.subject}
          </h2>

          <div className="flex flex-wrap gap-2 mb-4">
            <StatusBadge status={rfi.status} />
            <PriorityBadge priority={rfi.priority} />
            <span className={`inline-flex items-center h-6 px-2.5 rounded-full text-[10px] font-black uppercase tracking-widest border bg-gb-surface-hover border-gb-border ${category.color}`}>
              {category.label}
            </span>
            {rfi.discipline && (
              <span className="inline-flex items-center h-6 px-2.5 rounded-full text-[10px] font-black uppercase tracking-widest border bg-gb-surface-hover border-gb-border text-gb-muted">
                {DISCIPLINE_LABELS[rfi.discipline] ?? rfi.discipline}
              </span>
            )}
          </div>

          {/* Meta grid */}
          <div className="grid grid-cols-3 gap-3 text-sm">
            {rfi.project && (
              <InfoBlock icon={Building2} label="Projet" value={rfi.project.code} />
            )}
            {rfi.due_date && (
              <InfoBlock icon={CalendarX} label="Échéance"
                value={
                  <span className={overdue ? "text-gb-danger font-bold" : ""}>
                    {format(new Date(rfi.due_date), "d MMM yyyy", { locale: fr })}
                  </span>
                }
              />
            )}
            {rfi.assignedTo && (
              <InfoBlock icon={UserCheck} label="Responsable" value={`${rfi.assignedTo.firstname} ${rfi.assignedTo.lastname}`} />
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gb-border px-6 shrink-0">
          {TABS.map(t => (
            <button key={t.id}
              onClick={() => { setTab(t.id as any); if (t.id === "comments") fetchComments(); }}
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

          {/* ── DETAIL ── */}
          {tab === "detail" && (
            <>
              <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                {rfi.submittedBy && (
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-widest text-gb-muted mb-0.5">Soumis par</p>
                    <p className="text-sm font-semibold text-gb-text">{fullName(rfi.submittedBy)}</p>
                  </div>
                )}
                {rfi.reviewedBy && (
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-widest text-gb-muted mb-0.5">Révisé par (MOE)</p>
                    <p className="text-sm font-semibold text-gb-text">{fullName(rfi.reviewedBy)}</p>
                  </div>
                )}
                {rfi.drawing_ref && (
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-widest text-gb-muted mb-0.5">Réf. plan</p>
                    <p className="text-sm font-mono text-gb-text">{rfi.drawing_ref}</p>
                  </div>
                )}
                {rfi.spec_section && (
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-widest text-gb-muted mb-0.5">Section CCTP</p>
                    <p className="text-sm font-mono text-gb-text">{rfi.spec_section}</p>
                  </div>
                )}
                {rfi.lot && (
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-widest text-gb-muted mb-0.5">Lot</p>
                    <p className="text-sm text-gb-text">Lot {rfi.lot.lot_number} — {rfi.lot.name}</p>
                  </div>
                )}
                {rfi.answered_date && (
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-widest text-gb-muted mb-0.5">Date réponse</p>
                    <p className="text-sm text-gb-text">{format(new Date(rfi.answered_date), "d MMM yyyy", { locale: fr })}</p>
                  </div>
                )}
              </div>

              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-gb-muted mb-2">Question</p>
                <pre className="text-sm text-gb-text leading-relaxed bg-gb-surface-solid border border-gb-border rounded-xl p-4 whitespace-pre-wrap font-sans">
                  {rfi.question}
                </pre>
              </div>

              {rfi.official_response ? (
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600 mb-2 flex items-center gap-1.5">
                    <CheckCircle2 size={11} /> Réponse officielle
                  </p>
                  <pre className="text-sm text-gb-text leading-relaxed bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-4 whitespace-pre-wrap font-sans">
                    {rfi.official_response}
                  </pre>
                </div>
              ) : rfi.answer ? (
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-amber-600 mb-2 flex items-center gap-1.5">
                    <PenLine size={11} /> Réponse (brouillon)
                  </p>
                  <pre className="text-sm text-gb-text leading-relaxed bg-amber-500/5 border border-amber-500/20 rounded-xl p-4 whitespace-pre-wrap font-sans">
                    {rfi.answer}
                  </pre>
                </div>
              ) : (
                <div className="flex items-center gap-3 p-4 bg-gb-surface-solid border border-dashed border-gb-border rounded-xl text-gb-muted text-sm">
                  <AlertCircle size={14} className="shrink-0" />
                  Aucune réponse enregistrée
                </div>
              )}

              {rfi.distribution_list && (
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-gb-muted mb-2">Liste de diffusion</p>
                  <div className="flex flex-wrap gap-1.5">
                    {rfi.distribution_list.split(",").map(e => e.trim()).filter(Boolean).map(email => (
                      <span key={email} className="text-xs font-mono px-2.5 py-1 rounded-full bg-gb-surface-solid border border-gb-border text-gb-muted">
                        {email}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {/* ── COMMENTS ── */}
          {tab === "comments" && (
            <>
              {/* Thread */}
              <div className="space-y-3">
                {comments.length === 0 ? (
                  <div className="text-center py-10">
                    <MessageSquare size={32} className="text-gb-muted/20 mx-auto mb-3" />
                    <p className="text-sm text-gb-muted">Aucun commentaire — soyez le premier à intervenir</p>
                  </div>
                ) : comments.map(c => (
                  <div key={c.id} className="group flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-gb-surface-hover border border-gb-border flex items-center justify-center shrink-0 mt-0.5">
                      <span className="text-[11px] font-black text-gb-muted">
                        {(c.user ? `${c.user.firstname.charAt(0)}${c.user.lastname.charAt(0)}` : "??")}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="text-xs font-bold text-gb-text">
                          {c.user ? `${c.user.firstname} ${c.user.lastname}` : "Utilisateur"}
                        </span>
                        <span className="text-[10px] text-gb-muted">
                          {formatDistanceToNow(new Date(c.created_at), { locale: fr, addSuffix: true })}
                        </span>
                      </div>
                      {editCommentId === c.id ? (
                        <div className="space-y-2">
                          <textarea value={editContent} onChange={e => setEditContent(e.target.value)} rows={3}
                            className="w-full bg-gb-app border border-gb-border rounded-xl px-3 py-2 text-sm text-gb-text focus:ring-2 focus:ring-gb-primary outline-none resize-none" />
                          <div className="flex gap-2">
                            <button onClick={() => saveEditComment(c.id)}
                              className="h-7 px-3 rounded-lg bg-gb-primary text-white text-xs font-bold">Sauvegarder</button>
                            <button onClick={() => setEditCommentId(null)}
                              className="h-7 px-3 rounded-lg border border-gb-border text-xs text-gb-muted">Annuler</button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <p className="text-sm text-gb-text leading-relaxed whitespace-pre-wrap">{c.content}</p>
                          {c.document?.file_url && (
                            <a href={c.document.file_url} target="_blank" rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 mt-1.5 text-xs text-gb-primary hover:underline">
                              <Paperclip size={11} /> {c.document.file_name || c.document.name || "Pièce jointe"}
                            </a>
                          )}
                        </>
                      )}
                    </div>
                    <div className="opacity-0 group-hover:opacity-100 flex items-start gap-1 transition-opacity pt-1 shrink-0">
                      <button onClick={() => { setEditCommentId(c.id); setEditContent(c.content); }}
                        className="p-1 rounded text-gb-muted hover:text-gb-primary transition-colors">
                        <Pencil size={11} />
                      </button>
                      <button onClick={() => { if (confirm("Supprimer ce commentaire ?")) deleteComment(c.id); }}
                        className="p-1 rounded text-gb-muted hover:text-gb-danger transition-colors">
                        <Trash2 size={11} />
                      </button>
                    </div>
                  </div>
                ))}
                <div ref={commentsEndRef} />
              </div>

              {/* New comment */}
              <div className="bg-gb-surface-solid border border-gb-border rounded-2xl p-4 space-y-3 sticky bottom-0">
                <textarea value={newComment} onChange={e => setNewComment(e.target.value)}
                  placeholder="Ajouter un commentaire, une demande de précision, une décision…"
                  rows={3} onKeyDown={e => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) postComment(); }}
                  className="w-full bg-gb-app border border-gb-border rounded-xl px-3 py-2 text-sm text-gb-text placeholder:text-gb-muted focus:ring-2 focus:ring-gb-primary outline-none resize-none" />
                <div className="flex items-center gap-2">
                  <input
                    type="file"
                    multiple
                    onChange={e => setNewCommentFiles(Array.from(e.target.files || []))}
                    className="flex-1 h-8 bg-gb-app border border-gb-border rounded-lg px-2 text-xs text-gb-text file:mr-2 file:border-0 file:bg-transparent"
                  />
                  <button onClick={postComment} disabled={postingComment || !newComment.trim()}
                    className="h-8 px-4 rounded-xl bg-gb-primary text-white text-xs font-bold flex items-center gap-1.5 hover:opacity-90 transition-all disabled:opacity-50">
                    {postingComment ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
                    Envoyer
                  </button>
                </div>
                {newCommentFiles.length > 0 && (
                  <p className="text-[10px] text-gb-muted">{newCommentFiles.length} fichier(s) sélectionné(s).</p>
                )}
                <p className="text-[10px] text-gb-muted/50">⌘ + Entrée pour envoyer rapidement</p>
              </div>
            </>
          )}

          {/* ── IMPACTS ── */}
          {tab === "impacts" && (
            <>
              {!rfi.cost_impact && !rfi.schedule_impact ? (
                <div className="text-center py-12 text-gb-muted">
                  <CheckCircle2 size={32} className="mx-auto mb-3 text-emerald-500/30" />
                  <p className="text-sm font-semibold">Aucun impact identifié</p>
                  <p className="text-xs mt-1 text-gb-muted/60">Cette RFI n'a pas d'impact financier ni planning déclaré.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {rfi.cost_impact && (
                    <div className="bg-orange-500/5 border border-orange-400/30 rounded-2xl p-5">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center">
                          <DollarSign size={18} className="text-orange-500" />
                        </div>
                        <div>
                          <p className="text-sm font-black text-orange-600">Impact financier</p>
                          <p className="text-xs text-gb-muted">Coût supplémentaire potentiel</p>
                        </div>
                      </div>
                      {rfi.cost_impact_amount ? (
                        <p className="text-3xl font-black text-orange-500">
                          {rfi.cost_impact_amount.toLocaleString("fr-FR")} FCFA
                        </p>
                      ) : (
                        <p className="text-sm text-gb-muted italic">Montant non encore estimé</p>
                      )}
                    </div>
                  )}

                  {rfi.schedule_impact && (
                    <div className="bg-red-500/5 border border-red-400/30 rounded-2xl p-5">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center">
                          <Timer size={18} className="text-red-500" />
                        </div>
                        <div>
                          <p className="text-sm font-black text-red-600">Impact planning</p>
                          <p className="text-xs text-gb-muted">Décalage potentiel des travaux</p>
                        </div>
                      </div>
                      {rfi.schedule_impact_days ? (
                        <p className="text-3xl font-black text-red-500">
                          {rfi.schedule_impact_days} jour{rfi.schedule_impact_days > 1 ? "s" : ""}
                        </p>
                      ) : (
                        <p className="text-sm text-gb-muted italic">Durée non encore estimée</p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-gb-border bg-gb-surface-solid/50 shrink-0 flex items-center justify-between">
          <span className="text-[10px] text-gb-muted font-mono">ID #{rfi.id}</span>
          <span className="text-[10px] text-gb-muted">
            Modifié {format(new Date(rfi.updated_at), "d MMM yyyy", { locale: fr })}
          </span>
        </div>
      </motion.aside>
    </motion.div>
  );
}

// ─── Main View ────────────────────────────────────────────────────────────────

export default function RFIsView() {
  const [rfis, setRFIs]         = useState<RFI[]>([]);
  const [loading, setLoading]   = useState(false);
  const [search, setSearch]     = useState("");
  const [filterProject, setFilterProject] = useState("");
  const [filterStatus, setFilterStatus]   = useState("");
  const [filterPriority, setFilterPriority] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [projects, setProjects]           = useState<Project[]>([]);
  const [selectedRFI, setSelectedRFI]     = useState<RFI | null>(null);
  const [drawerOpen, setDrawerOpen]       = useState(false);
  const [formOpen, setFormOpen]           = useState(false);
  const [editRFI, setEditRFI]             = useState<RFI | null>(null);

  const fetchRFIs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterProject)  params.set("project_id", filterProject);
      if (filterStatus)   params.set("status",      filterStatus);
      if (filterPriority) params.set("priority",    filterPriority);
      if (filterCategory) params.set("category",    filterCategory);
      const r = await apiFetch(`${API_BASE}/rfis?${params}`);
      const d = await r.json();
      setRFIs(Array.isArray(d) ? d : []);
    } catch {
      setRFIs([]);
    } finally {
      setLoading(false);
    }
  }, [filterProject, filterStatus, filterPriority, filterCategory]);

  useEffect(() => { fetchRFIs(); }, [fetchRFIs]);

  useEffect(() => {
    apiFetch(`${API_BASE}/projects?limit=100`).then(r => r.json()).then(d => setProjects(Array.isArray(d) ? d : Array.isArray(d?.data) ? d.data : [])).catch(() => {});
  }, []);

  const filtered = rfis.filter(r =>
    !search ||
    r.number.toLowerCase().includes(search.toLowerCase()) ||
    r.subject.toLowerCase().includes(search.toLowerCase()) ||
    (r.reference ?? "").toLowerCase().includes(search.toLowerCase()) ||
    (r.project?.title ?? "").toLowerCase().includes(search.toLowerCase())
  );

  // KPIs
  const total          = rfis.length;
  const openCount      = rfis.filter(r => r.status === "OPEN" || r.status === "UNDER_REVIEW").length;
  const overdueCount   = rfis.filter(r => isOverdue(r)).length;
  const costImpactTotal = rfis
    .filter(r => r.cost_impact && r.cost_impact_amount)
    .reduce((acc, r) => acc + (r.cost_impact_amount ?? 0), 0);
  const withImpact = rfis.filter(r => r.cost_impact || r.schedule_impact).length;

  const handleDelete = async (id: number) => {
    try {
      await apiFetch(`${API_BASE}/rfis/${id}`, { method: "DELETE" });
      setDrawerOpen(false); setSelectedRFI(null);
      fetchRFIs();
    } catch { /* ignore */ }
  };

  const selectCls = "bg-gb-app border border-gb-border rounded-xl h-9 px-3 text-sm text-gb-text focus:ring-2 focus:ring-gb-primary outline-none transition-all";

  // Grouper par statut en respectant l'ordre du workflow
  const STATUS_ORDER = ["DRAFT", "OPEN", "UNDER_REVIEW", "ANSWERED", "CLOSED", "CANCELLED"];
  const groupedByStatus: Record<string, RFI[]> = {};
  STATUS_ORDER.forEach(s => { groupedByStatus[s] = []; });
  filtered.forEach(r => {
    if (groupedByStatus[r.status]) groupedByStatus[r.status].push(r);
    else groupedByStatus[r.status] = [r];
  });

  const ACTIVE_GROUPS = STATUS_ORDER.filter(s => groupedByStatus[s]?.length > 0);

  return (
    <div className="space-y-6 pb-8">
      {/* Title */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-gb-text">Demande de renseignements</h1>
          <p className="text-sm text-gb-muted mt-0.5">Demandes de renseignements</p>
        </div>
        <button
          onClick={() => { setEditRFI(null); setFormOpen(true); }}
          className="h-10 px-5 rounded-xl bg-gb-primary text-white text-sm font-bold shadow-lg shadow-gb-primary/20 hover:opacity-90 transition-all flex items-center gap-2">
          <Plus size={16} /> Nouvelle demande de renseignements
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Total demandes de renseignements" value={total} icon={ClipboardList} accent="bg-blue-500/10 text-blue-500" />
        <KpiCard label="Ouvertes / En revue" value={openCount} icon={CircleDot}        accent="bg-amber-500/10 text-amber-600"
          alert={openCount > 0} />
        <KpiCard label="En retard"        value={overdueCount} icon={AlertTriangle}     accent={overdueCount > 0 ? "bg-gb-danger/10 text-gb-danger" : "bg-gb-surface-hover text-gb-muted"}
          alert={overdueCount > 0} />
        <KpiCard
          label="Impact coût cumulé"
          value={costImpactTotal > 0 ? `${costImpactTotal.toLocaleString("fr-FR")} FCFA` : withImpact > 0 ? `${withImpact} avec impact` : "—"}
          icon={DollarSign}
          accent={costImpactTotal > 0 ? "bg-orange-500/10 text-orange-500" : "bg-gb-surface-hover text-gb-muted"}
          alert={costImpactTotal > 0}
          sub={costImpactTotal > 0 ? `${withImpact} demande${withImpact > 1 ? "s" : ""} de renseignements concernée${withImpact > 1 ? "s" : ""}` : undefined}
        />
      </div>

      {/* Toolbar */}
      <div className="bg-gb-surface-solid border border-gb-border rounded-2xl p-4">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gb-muted pointer-events-none" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Rechercher par numéro, sujet, référence, projet…"
              className="w-full bg-gb-app border border-gb-border rounded-xl h-9 pl-8 pr-4 text-sm text-gb-text placeholder:text-gb-muted focus:ring-2 focus:ring-gb-primary outline-none transition-all" />
          </div>
          <div className="flex flex-wrap gap-2">
            <select value={filterProject} onChange={e => setFilterProject(e.target.value)} className={selectCls}>
              <option value="">Tous projets</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.code}</option>)}
            </select>
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className={selectCls}>
              <option value="">Statut</option>
              {RFI_STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
            <select value={filterPriority} onChange={e => setFilterPriority(e.target.value)} className={selectCls}>
              <option value="">Priorité</option>
              {RFI_PRIORITIES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
            </select>
            <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)} className={selectCls}>
              <option value="">Catégorie</option>
              {RFI_CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center p-24">
          <Loader2 className="w-8 h-8 text-gb-primary animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="p-20 text-center bg-gb-surface-solid border border-dashed border-gb-border rounded-3xl">
          <ClipboardList className="mx-auto text-gb-muted/20 mb-6" size={64} />
          <h3 className="text-xl font-bold text-gb-text mb-2">Aucune demande de renseignements</h3>
          <p className="text-gb-muted text-sm">Créez votre première demande de renseignements.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {ACTIVE_GROUPS.map(statusKey => {
            const items  = groupedByStatus[statusKey];
            if (!items?.length) return null;
            const s = getStatus(statusKey);
            const SIcon = s.icon;

            return (
              <div key={statusKey}>
                {/* Status group header */}
                <div className="flex items-center gap-3 mb-3">
                  <div className={`flex items-center gap-2 px-3 h-7 rounded-full border text-[10px] font-black uppercase tracking-widest ${s.bg} ${s.color}`}>
                    <SIcon size={10} />{s.label}
                  </div>
                  <div className="flex-1 h-px bg-gb-border/60" />
                  <span className="text-[10px] text-gb-muted font-semibold">{items.length} demande{items.length > 1 ? "s" : ""} de renseignements</span>
                </div>

                {/* RFI cards */}
                <div className="space-y-2">
                  <AnimatePresence initial={false}>
                    {items.map((r, i) => {
                      const prio    = getPriority(r.priority);
                      const cat     = getCategory(r.category);
                      const overdue = isOverdue(r);
                      const openComments = r.comments?.length ?? 0;

                      return (
                        <motion.div key={r.id}
                          initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.025 }}
                          onClick={() => { setSelectedRFI(r); setDrawerOpen(true); }}
                          className={`group relative flex items-start gap-4 bg-gb-surface-solid border rounded-2xl px-5 py-4 cursor-pointer hover:border-gb-primary/40 hover:bg-gb-surface-hover transition-all ${
                            overdue ? "border-gb-danger/30 bg-gb-danger/5" : "border-gb-border"
                          }`}
                        >
                          {/* Priority indicator bar */}
                          <div className={`w-1 self-stretch rounded-full ${prio.dot} shrink-0 mt-0.5`} />

                          {/* Number + content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <span className="text-xs font-mono font-black text-gb-primary bg-gb-primary/10 px-2 py-0.5 rounded-md">
                                {r.number}
                              </span>
                              {r.reference && <span className="text-[10px] font-mono text-gb-muted">{r.reference}</span>}
                              <PriorityBadge priority={r.priority} />
                              <span className={`text-[10px] font-bold ${cat.color}`}>{cat.label}</span>
                              {r.discipline && (
                                <span className="text-[10px] text-gb-muted/60 font-mono">
                                  {DISCIPLINE_LABELS[r.discipline] ?? r.discipline}
                                </span>
                              )}
                            </div>

                            <p className="font-extrabold text-gb-text truncate">{r.subject}</p>

                            <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                              {r.project && (
                                <span className="text-[11px] text-gb-muted flex items-center gap-1">
                                  <Building2 size={9} />{r.project.code}
                                </span>
                              )}
                              {r.assignedTo && (
                                <span className="text-[11px] text-gb-muted flex items-center gap-1">
                                  <UserCheck size={9} />{r.assignedTo.firstname} {r.assignedTo.lastname}
                                </span>
                              )}
                              {r.due_date && (
                                <span className={`text-[11px] flex items-center gap-1 ${overdue ? "text-gb-danger font-bold" : "text-gb-muted"}`}>
                                  <CalendarX size={9} />
                                  {format(new Date(r.due_date), "d MMM", { locale: fr })}
                                  {overdue && " — en retard"}
                                </span>
                              )}
                              {r.drawing_ref && (
                                <span className="text-[11px] text-gb-muted font-mono flex items-center gap-1">
                                  <BookOpen size={9} />{r.drawing_ref}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Right side */}
                          <div className="flex flex-col items-end gap-2 shrink-0">
                            <StatusBadge status={r.status} />
                            <div className="flex items-center gap-2 text-[11px] text-gb-muted">
                              {openComments > 0 && (
                                <span className="flex items-center gap-1">
                                  <MessageSquare size={10} />{openComments}
                                </span>
                              )}
                              {r.cost_impact && (
                                <span className="flex items-center gap-1 text-orange-500">
                                  <DollarSign size={10} />
                                  {r.cost_impact_amount ? `${r.cost_impact_amount.toLocaleString("fr-FR")} FCFA` : "Impact $"}
                                </span>
                              )}
                              {r.schedule_impact && (
                                <span className="flex items-center gap-1 text-red-500">
                                  <Timer size={10} />
                                  {r.schedule_impact_days ? `${r.schedule_impact_days}j` : "Impact planning"}
                                </span>
                              )}
                            </div>
                          </div>

                          <ChevronRight size={16} className="text-gb-muted group-hover:text-gb-primary transition-colors shrink-0 mt-1" />
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Detail Drawer */}
      <AnimatePresence>
        {drawerOpen && selectedRFI && (
          <RFIDetailDrawer
            rfi={selectedRFI}
            onClose={() => { setDrawerOpen(false); setSelectedRFI(null); }}
            onEdit={r => { setEditRFI(r); setDrawerOpen(false); setFormOpen(true); }}
            onDelete={handleDelete}
            onUpdated={fetchRFIs}
          />
        )}
      </AnimatePresence>

      {/* Form Dialog */}
      <RFIFormDialog
        open={formOpen}
        onClose={() => { setFormOpen(false); setEditRFI(null); }}
        rfi={editRFI}
        onSaved={() => { fetchRFIs(); }}
      />
    </div>
  );
}
