import React, { useState, useEffect, useCallback } from "react";
import {
  ListTodo, Plus, X, Loader2, AlertCircle, CheckCircle2, XCircle,
  Clock, Calendar, MapPin, User, Wrench, BarChart3, ArrowUpRight,
  Eye, Pencil, Trash2, AlertTriangle, ChevronRight, Activity,
  ShieldAlert, Hammer, Paintbrush, Zap, Layers
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { apiFetch, API_BASE } from "../lib/api";
import { usePermissions } from "../contexts/AuthContext";
import { format, isPast, isToday } from "date-fns";
import { fr } from "date-fns/locale";

// ─── Types ────────────────────────────────────────────────────────────────────

interface PunchItem {
  id: number;
  title: string;
  description: string;
  category: string;  // QUALITY | SAFETY | FINISHING | STRUCTURAL | MEP
  priority: string;  // LOW | MEDIUM | HIGH | BLOCKING
  status: string;    // OPEN | IN_PROGRESS | SUBMITTED | VERIFIED | CLOSED | REJECTED
  location?: string;
  image_urls?: string;
  due_date?: string;
  resolved_at?: string;
  created_at: string;
  updated_at: string;
  project?: { id: number; code: string; title: string };
  lot?: { id: number; lot_number: string; name: string } | null;
  task?: { id: number; title: string } | null;
  createdBy?: { id: number; firstname: string; lastname: string } | null;
  assignedTo?: { id: number; firstname: string; lastname: string } | null;
}

interface Project { id: number; code: string; title: string; phase?: string | null; }

const PUNCH_WORKFLOW_GUARD = {
  allowedPhases: ["PREPARATION", "EXECUTION"],
  reason: "Les reserves sont modifiables uniquement pendant les phases Preparation et Execution.",
} as const;

const PROJECT_PHASE_LABELS: Record<string, string> = {
  ETUDE: "Etude",
  PREPARATION: "Preparation",
  EXECUTION: "Execution",
  RECEPTION: "Reception",
  CLOTURE: "Cloture",
};

function isPunchPhaseAllowed(phase?: string | null) {
  if (!phase) return true;
  return PUNCH_WORKFLOW_GUARD.allowedPhases.includes(phase as "PREPARATION" | "EXECUTION");
}

function getProjectPhaseLabel(phase?: string | null) {
  if (!phase) return "Non defini";
  return PROJECT_PHASE_LABELS[phase] ?? phase;
}

// ─── Config ───────────────────────────────────────────────────────────────────

const CATEGORIES: { value: string; label: string; icon: React.FC<any>; color: string; bg: string; badge: string }[] = [
  { value: "QUALITY",    label: "Qualité",         icon: Eye,        color: "text-blue-400",    bg: "bg-blue-400/10",    badge: "bg-blue-400/10 border-blue-400/20 text-blue-400" },
  { value: "SAFETY",     label: "Sécurité",         icon: ShieldAlert, color: "text-red-500",     bg: "bg-red-500/10",     badge: "bg-red-500/10 border-red-500/20 text-red-500" },
  { value: "FINISHING",  label: "Finitions",        icon: Paintbrush, color: "text-purple-400",  bg: "bg-purple-400/10",  badge: "bg-purple-400/10 border-purple-400/20 text-purple-400" },
  { value: "STRUCTURAL", label: "Structurel",       icon: Layers,     color: "text-amber-500",   bg: "bg-amber-500/10",   badge: "bg-amber-500/10 border-amber-500/20 text-amber-500" },
  { value: "MEP",        label: "CVC / Électricité",icon: Zap,        color: "text-emerald-500", bg: "bg-emerald-500/10", badge: "bg-emerald-500/10 border-emerald-500/20 text-emerald-500" },
];

const PRIORITIES: { value: string; label: string; dot: string; badge: string; bar: string }[] = [
  { value: "LOW",      label: "Mineur",    dot: "bg-slate-400",   badge: "bg-slate-400/10 text-slate-400 border-slate-400/20",                   bar: "bg-slate-400" },
  { value: "MEDIUM",   label: "Moyen",     dot: "bg-amber-400",   badge: "bg-amber-400/10 text-amber-500 border-amber-400/20",                   bar: "bg-amber-400" },
  { value: "HIGH",     label: "Élevé",     dot: "bg-orange-500",  badge: "bg-orange-500/10 text-orange-500 border-orange-500/20",                 bar: "bg-orange-500" },
  { value: "BLOCKING", label: "Bloquant",  dot: "bg-red-600",     badge: "bg-red-600/10 text-red-600 border-red-600/20 animate-pulse",            bar: "bg-red-600" },
];

const STATUSES: { value: string; label: string; icon: React.FC<any>; color: string; badge: string }[] = [
  { value: "OPEN",        label: "Ouverte",      icon: AlertCircle,  color: "text-red-500",     badge: "bg-red-500/10 border-red-500/20 text-red-500" },
  { value: "IN_PROGRESS", label: "En cours",     icon: Activity,     color: "text-blue-500",    badge: "bg-blue-500/10 border-blue-500/20 text-blue-500" },
  { value: "SUBMITTED",   label: "Levée soumise",icon: ArrowUpRight, color: "text-amber-500",   badge: "bg-amber-500/10 border-amber-500/20 text-amber-500" },
  { value: "VERIFIED",    label: "Vérifiée",     icon: Eye,          color: "text-purple-500",  badge: "bg-purple-500/10 border-purple-500/20 text-purple-500" },
  { value: "CLOSED",      label: "Clôturée",     icon: CheckCircle2, color: "text-emerald-500", badge: "bg-emerald-500/10 border-emerald-500/20 text-emerald-500" },
  { value: "REJECTED",    label: "Rejetée",      icon: XCircle,      color: "text-slate-400",   badge: "bg-slate-400/10 border-slate-400/20 text-slate-400" },
];

// Status flow: what's the next logical step
const NEXT_STATUS: Record<string, { next: string; label: string } | null> = {
  OPEN:        { next: "IN_PROGRESS", label: "Prendre en charge" },
  IN_PROGRESS: { next: "SUBMITTED",   label: "Soumettre la levée" },
  SUBMITTED:   { next: "VERIFIED",    label: "Vérifier (MOE)" },
  VERIFIED:    { next: "CLOSED",      label: "Clôturer" },
  CLOSED:      null,
  REJECTED:    { next: "IN_PROGRESS", label: "Rouvrir" },
};

const EMPTY_FORM = {
  title: "", description: "", category: "QUALITY", priority: "MEDIUM",
  status: "OPEN", project_id: "", location: "", due_date: "",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getCategoryMeta(v: string)  { return CATEGORIES.find(c => c.value === v) ?? CATEGORIES[0]; }
function getPriorityMeta(v: string)  { return PRIORITIES.find(p => p.value === v) ?? PRIORITIES[1]; }
function getStatusMeta(v: string)    { return STATUSES.find(s => s.value === v) ?? STATUSES[0]; }

function isDueSoon(due: string | undefined): boolean {
  if (!due) return false;
  const d = new Date(due);
  return (isToday(d) || isPast(d));
}

function PriorityBadge({ priority }: { priority: string }) {
  const m = getPriorityMeta(priority);
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border ${m.badge}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${m.dot}`} />
      {m.label}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const m = getStatusMeta(status);
  const Icon = m.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border ${m.badge}`}>
      <Icon size={11} />{m.label}
    </span>
  );
}

function CategoryBadge({ category }: { category: string }) {
  const m = getCategoryMeta(category);
  const Icon = m.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border ${m.badge}`}>
      <Icon size={11} />{m.label}
    </span>
  );
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────

function KpiCard({ label, value, sub, icon: Icon, accent }: {
  label: string; value: number | string; sub?: string;
  icon: React.FC<any>; accent: string;
}) {
  return (
    <div className="bg-gb-surface-solid border border-gb-border rounded-2xl p-5 flex items-center gap-4">
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${accent}`}>
        <Icon size={20} />
      </div>
      <div className="min-w-0">
        <p className="text-2xl font-black text-gb-text">{value}</p>
        <p className="text-xs font-semibold text-gb-muted uppercase tracking-wider truncate">{label}</p>
        {sub && <p className="text-xs text-gb-muted mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

// ─── Category distribution bar ────────────────────────────────────────────────

function CategoryBar({ items, onFilter, activeFilter }: {
  items: PunchItem[];
  onFilter: (cat: string) => void;
  activeFilter: string;
}) {
  if (!items.length) return null;
  return (
    <div className="bg-gb-surface-solid border border-gb-border rounded-2xl p-5">
      <p className="text-[10px] font-black text-gb-muted uppercase tracking-widest mb-3">Répartition par catégorie</p>
      <div className="flex gap-1.5 h-2 rounded-full overflow-hidden mb-4">
        {CATEGORIES.map(cat => {
          const count = items.filter(i => i.category === cat.value).length;
          if (!count) return null;
          const pct = (count / items.length) * 100;
          return (
            <motion.div
              key={cat.value}
              initial={{ width: 0 }}
              animate={{ width: `${pct}%` }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className={`h-full rounded-full ${cat.bg.replace("/10", "").replace("bg-", "bg-")} cursor-pointer`}
              style={{ backgroundColor: undefined }}
              title={`${cat.label}: ${count}`}
            />
          );
        })}
      </div>
      <div className="flex flex-wrap gap-2">
        {CATEGORIES.map(cat => {
          const count = items.filter(i => i.category === cat.value).length;
          if (!count) return null;
          const Icon = cat.icon;
          const isActive = activeFilter === cat.value;
          return (
            <button
              key={cat.value}
              onClick={() => onFilter(isActive ? "" : cat.value)}
              className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl border transition-all ${
                isActive
                  ? `${cat.badge} scale-[1.03]`
                  : "border-gb-border text-gb-muted hover:border-gb-primary/40 hover:text-gb-text"
              }`}
            >
              <Icon size={11} />
              {cat.label}
              <span className={`ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-black ${
                isActive ? "bg-white/20" : "bg-gb-surface-hover"
              }`}>{count}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Punch Item Detail Drawer ─────────────────────────────────────────────────

function PunchItemDetailDrawer({
  item, onClose, onStatusChange, onDelete, onEdit, canEdit, canDelete, canMutate, workflowBlockMessage
}: {
  item: PunchItem;
  onClose: () => void;
  onStatusChange: (id: number, status: string) => void;
  onDelete: (id: number) => void;
  onEdit: (item: PunchItem) => void;
  canEdit: boolean;
  canDelete: boolean;
  canMutate: boolean;
  workflowBlockMessage?: string | null;
}) {
  const cat      = getCategoryMeta(item.category);
  const priority = getPriorityMeta(item.priority);
  const status   = getStatusMeta(item.status);
  const CatIcon  = cat.icon;
  const nextStep = NEXT_STATUS[item.status];
  const overdue  = isDueSoon(item.due_date) && item.status !== "CLOSED" && item.status !== "VERIFIED";

  // Parse image_urls (JSON array of strings stored in db)
  const images: string[] = (() => {
    try { return item.image_urls ? JSON.parse(item.image_urls) : []; }
    catch { return []; }
  })();

  const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div>
      <p className="text-[10px] font-black text-gb-muted uppercase tracking-widest mb-2">{title}</p>
      {children}
    </div>
  );

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex"
      onClick={onClose}
    >
      <div className="flex-1 bg-black/40 backdrop-blur-sm" />
      <motion.aside
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="w-full max-w-xl bg-gb-app border-l border-gb-border h-full overflow-y-auto flex flex-col shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-gb-border bg-gb-surface-solid/50 shrink-0">
          {/* BLOCKING alert */}
          {item.priority === "BLOCKING" && item.status !== "CLOSED" && (
            <div className="flex items-center gap-2 px-3 py-2 bg-red-600/10 border border-red-600/20 rounded-xl mb-3 text-xs font-bold text-red-600">
              <AlertTriangle size={13} className="animate-pulse" />
              Réserve BLOQUANTE — empêche la réception des travaux
            </div>
          )}
          {overdue && (
            <div className="flex items-center gap-2 px-3 py-2 bg-amber-500/10 border border-amber-500/20 rounded-xl mb-3 text-xs font-bold text-amber-500">
              <Clock size={13} />
              Échéance dépassée
            </div>
          )}
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex items-center gap-2 flex-wrap">
              <CatIcon size={20} className={cat.color} />
              <span className={`text-xs font-bold uppercase tracking-widest ${cat.color}`}>{cat.label}</span>
              <span className="text-gb-muted/30">·</span>
              <span className="text-xs font-mono text-gb-muted">#{item.id}</span>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              {canEdit && (
                <button
                  onClick={() => { onClose(); onEdit(item); }}
                  className="inline-flex items-center gap-1.5 px-3 h-8 rounded-xl text-xs font-semibold text-gb-muted hover:text-gb-primary hover:bg-gb-primary/10 transition-colors"
                >
                  <Pencil size={13} /><span>Modifier</span>
                </button>
              )}
              <button onClick={onClose} className="p-1.5 rounded-lg text-gb-muted hover:text-gb-text hover:bg-gb-surface-hover transition-colors">
                <X size={18} />
              </button>
            </div>
          </div>
          <h2 className="text-xl font-black text-gb-text tracking-tight">{item.title}</h2>
          <div className="flex flex-wrap gap-2 mt-3">
            <PriorityBadge priority={item.priority} />
            <StatusBadge status={item.status} />
            {item.project && (
              <span className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full border border-gb-border text-gb-muted bg-gb-surface-solid">
                {item.project.code}
              </span>
            )}
            {item.lot && (
              <span className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full border border-gb-border text-gb-muted bg-gb-surface-solid">
                Lot {item.lot.lot_number}
              </span>
            )}
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 p-6 space-y-6 overflow-y-auto">
          {/* Metadata grid */}
          <div className="grid grid-cols-2 gap-3">
            {item.location && (
              <div className="bg-gb-surface-solid border border-gb-border rounded-xl p-3">
                <p className="text-[10px] font-bold text-gb-muted uppercase tracking-widest mb-1 flex items-center gap-1"><MapPin size={10} /> Localisation</p>
                <p className="text-sm font-semibold text-gb-text">{item.location}</p>
              </div>
            )}
            {item.assignedTo && (
              <div className="bg-gb-surface-solid border border-gb-border rounded-xl p-3">
                <p className="text-[10px] font-bold text-gb-muted uppercase tracking-widest mb-1 flex items-center gap-1"><User size={10} /> Responsable</p>
                <p className="text-sm font-semibold text-gb-text">{item.assignedTo.firstname} {item.assignedTo.lastname}</p>
              </div>
            )}
            {item.due_date && (
              <div className={`border rounded-xl p-3 ${overdue ? "bg-amber-500/5 border-amber-500/20" : "bg-gb-surface-solid border-gb-border"}`}>
                <p className={`text-[10px] font-bold uppercase tracking-widest mb-1 flex items-center gap-1 ${overdue ? "text-amber-500" : "text-gb-muted"}`}>
                  <Calendar size={10} /> Échéance
                </p>
                <p className={`text-sm font-semibold ${overdue ? "text-amber-500" : "text-gb-text"}`}>
                  {format(new Date(item.due_date), "d MMM yyyy", { locale: fr })}
                </p>
              </div>
            )}
            {item.resolved_at && (
              <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-3">
                <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest mb-1 flex items-center gap-1"><CheckCircle2 size={10} /> Levée le</p>
                <p className="text-sm font-semibold text-gb-text">{format(new Date(item.resolved_at), "d MMM yyyy", { locale: fr })}</p>
              </div>
            )}
          </div>

          <Section title="Description / Constat">
            <p className="text-sm text-gb-text leading-relaxed whitespace-pre-wrap">{item.description}</p>
          </Section>

          {/* Images */}
          {images.length > 0 && (
            <Section title={`Photos (${images.length})`}>
              <div className="grid grid-cols-3 gap-2">
                {images.map((url, i) => (
                  <a key={i} href={url} target="_blank" rel="noopener noreferrer"
                    className="block aspect-square rounded-xl overflow-hidden border border-gb-border bg-gb-surface-hover hover:opacity-80 transition-opacity"
                  >
                    <img src={url} alt={`Photo ${i + 1}`} className="w-full h-full object-cover" />
                  </a>
                ))}
              </div>
            </Section>
          )}

          {/* Liens */}
          {(item.task || item.lot) && (
            <Section title="Liens">
              <div className="space-y-2">
                {item.task && (
                  <div className="flex items-center gap-2 text-sm text-gb-muted">
                    <Wrench size={13} />
                    <span>Tâche :</span>
                    <span className="text-gb-text font-medium">{item.task.title}</span>
                  </div>
                )}
                {item.lot && (
                  <div className="flex items-center gap-2 text-sm text-gb-muted">
                    <Hammer size={13} />
                    <span>Lot {item.lot.lot_number} :</span>
                    <span className="text-gb-text font-medium">{item.lot.name}</span>
                  </div>
                )}
              </div>
            </Section>
          )}

          <Section title="Méta">
            <div className="text-xs text-gb-muted space-y-1">
              <p>Créé le {format(new Date(item.created_at), "d MMMM yyyy 'à' HH:mm", { locale: fr })}
                {item.createdBy && ` par ${item.createdBy.firstname} ${item.createdBy.lastname}`}
              </p>
            </div>
          </Section>
        </div>

        {/* Footer actions */}
        <div className="p-6 border-t border-gb-border bg-gb-surface-solid/50 shrink-0 flex items-center gap-3">
          {!canMutate && workflowBlockMessage && (
            <div className="flex-1 flex items-center gap-2 text-xs font-semibold text-amber-500 bg-amber-500/10 border border-amber-500/20 rounded-xl px-3 py-2">
              <AlertCircle size={14} />
              {workflowBlockMessage}
            </div>
          )}
          {canEdit && nextStep && (
            <button
              onClick={() => onStatusChange(item.id, nextStep.next)}
              disabled={!canMutate}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gb-primary text-gb-inverse font-bold text-sm hover:bg-gb-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ArrowUpRight size={15} />
              {nextStep.label}
            </button>
          )}
          {canEdit && item.status === "SUBMITTED" && (
            <button
              onClick={() => onStatusChange(item.id, "REJECTED")}
              disabled={!canMutate}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-red-500/30 text-red-500 font-bold text-sm hover:bg-red-500/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <XCircle size={15} />
              Rejeter
            </button>
          )}
          {canDelete && (
            <button
              onClick={() => { if (window.confirm("Supprimer cette réserve ?")) onDelete(item.id); }}
              disabled={!canMutate}
              className="inline-flex items-center gap-1.5 px-3 h-9 rounded-xl border border-gb-danger/30 text-xs font-semibold text-gb-danger hover:bg-gb-danger/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Trash2 size={13} /><span>Supprimer</span>
            </button>
          )}
        </div>
      </motion.aside>
    </motion.div>
  );
}

// ─── Create / Edit Dialog ─────────────────────────────────────────────────────

function PunchItemFormDialog({
  open, onClose, onSaved, projects, item
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  projects: Project[];
  item?: PunchItem;
}) {
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      if (item) {
        setForm({
          title:       item.title,
          description: item.description,
          category:    item.category,
          priority:    item.priority,
          status:      item.status,
          project_id:  String(item.project?.id ?? ""),
          location:    item.location ?? "",
          due_date:    item.due_date ? item.due_date.slice(0, 10) : "",
        });
      } else {
        setForm({ ...EMPTY_FORM });
      }
      setError(null);
    }
  }, [open, item]);

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));
  const selectedProject = projects.find((p) => p.id === Number(form.project_id));
  const canMutateSelectedProject = !selectedProject || isPunchPhaseAllowed(selectedProject.phase);
  const selectedProjectPhaseLabel = getProjectPhaseLabel(selectedProject?.phase);

  const save = async () => {
    if (!form.title.trim() || !form.description.trim() || !form.project_id) {
      setError("Titre, description et projet sont obligatoires.");
      return;
    }
    if (!canMutateSelectedProject) {
      setError(`${PUNCH_WORKFLOW_GUARD.reason} Phase actuelle: ${selectedProjectPhaseLabel}.`);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const body: Record<string, any> = {
        title:       form.title,
        description: form.description,
        category:    form.category,
        priority:    form.priority,
        status:      form.status,
        project_id:  Number(form.project_id),
        location:    form.location  || undefined,
        due_date:    form.due_date  || undefined,
      };

      const url    = item ? `${API_BASE}/punch-items/${item.id}` : `${API_BASE}/punch-items`;
      const method = item ? "PUT" : "POST";
      const res = await apiFetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Erreur serveur");
      }
      onSaved();
      onClose();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  const inputCls = "w-full bg-gb-app border border-gb-border rounded-xl px-3 py-2.5 text-sm text-gb-text focus:outline-none focus:ring-2 focus:ring-gb-primary/30 focus:border-gb-primary transition-colors";
  const labelCls = "block text-xs font-bold text-gb-muted uppercase tracking-wider mb-1.5";

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <motion.div
        initial={{ scale: 0.96, y: 10 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.96 }}
        transition={{ type: "spring", stiffness: 400, damping: 30 }}
        className="relative w-full max-w-2xl bg-gb-surface-solid border border-gb-border rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gb-border">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-center justify-center">
              <ListTodo size={18} className="text-amber-500" />
            </div>
            <div>
              <h3 className="text-base font-black text-gb-text">
                {item ? "Modifier la réserve" : "Saisir une réserve"}
              </h3>
              <p className="text-xs text-gb-muted">Levée des réserves — gestion chantier</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gb-muted hover:bg-gb-surface-hover transition-colors">
            Fermer
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 p-6 space-y-5">

          {/* Titre + Projet */}
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className={labelCls}>Titre de la réserve <span className="text-red-400">*</span></label>
              <input
                className={inputCls}
                placeholder="Ex: Fissure structurelle poteau P3, niveau R+1..."
                value={form.title}
                onChange={e => set("title", e.target.value)}
              />
            </div>
            <div className="col-span-2">
              <label className={labelCls}>Projet <span className="text-red-400">*</span></label>
              <select className={inputCls} value={form.project_id} onChange={e => set("project_id", e.target.value)}>
                <option value="">— Sélectionner un projet —</option>
                {projects.map(p => (
                  <option key={p.id} value={p.id} disabled={!isPunchPhaseAllowed(p.phase)}>
                    {p.code} — {p.title}{!isPunchPhaseAllowed(p.phase) ? ` (${getProjectPhaseLabel(p.phase)})` : ""}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {selectedProject && !canMutateSelectedProject && (
            <div className="flex items-center gap-2 text-sm text-amber-500 bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-3">
              <AlertCircle size={15} />
              {PUNCH_WORKFLOW_GUARD.reason} Phase actuelle: {selectedProjectPhaseLabel}.
            </div>
          )}

          {/* Catégorie + Priorité + Statut */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className={labelCls}>Catégorie <span className="text-red-400">*</span></label>
              <select className={inputCls} value={form.category} onChange={e => set("category", e.target.value)}>
                {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Priorité <span className="text-red-400">*</span></label>
              <select className={inputCls} value={form.priority} onChange={e => set("priority", e.target.value)}>
                {PRIORITIES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Statut</label>
              <select className={inputCls} value={form.status} onChange={e => set("status", e.target.value)}>
                {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
          </div>

          {/* BLOCKING warning */}
          {form.priority === "BLOCKING" && (
            <div className="flex items-center gap-2 text-xs font-bold text-red-600 bg-red-600/10 border border-red-600/20 rounded-xl px-4 py-3">
              <AlertTriangle size={14} className="animate-pulse" />
              Réserve BLOQUANTE — la réception des travaux ne peut pas avoir lieu tant que cette réserve n'est pas levée.
            </div>
          )}

          {/* Localisation + Échéance */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Localisation</label>
              <input
                className={inputCls}
                placeholder="Bât A, R+2, Salle 204, Axe C-D..."
                value={form.location}
                onChange={e => set("location", e.target.value)}
              />
            </div>
            <div>
              <label className={labelCls}>Échéance de levée</label>
              <input type="date" className={inputCls} value={form.due_date} onChange={e => set("due_date", e.target.value)} />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className={labelCls}>Description / Constat <span className="text-red-400">*</span></label>
            <textarea
              className={`${inputCls} resize-none`}
              rows={4}
              placeholder="Décrivez précisément la non-conformité observée, les références de plans ou normes concernées..."
              value={form.description}
              onChange={e => set("description", e.target.value)}
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 text-sm text-gb-danger bg-gb-danger/10 border border-gb-danger/20 rounded-xl px-4 py-3">
              <AlertCircle size={15} /> {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gb-border flex items-center justify-end gap-3 bg-gb-app/30">
          <button onClick={onClose} className="px-5 py-2.5 rounded-xl text-sm font-semibold text-gb-muted hover:text-gb-text hover:bg-gb-surface-hover transition-colors">
            Annuler
          </button>
          <button
            onClick={save}
            disabled={saving || !canMutateSelectedProject}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gb-primary text-gb-inverse font-bold text-sm hover:bg-gb-primary/90 transition-colors disabled:opacity-50"
          >
            {saving ? <Loader2 size={15} className="animate-spin" /> : <ListTodo size={15} />}
            {saving ? "Enregistrement..." : item ? "Mettre à jour" : "Créer la réserve"}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Punch Item Row ───────────────────────────────────────────────────────────

function PunchItemRow({ item, onClick }: { item: PunchItem; onClick: () => void }) {
  const cat      = getCategoryMeta(item.category);
  const priority = getPriorityMeta(item.priority);
  const CatIcon  = cat.icon;
  const overdue  = isDueSoon(item.due_date) && item.status !== "CLOSED" && item.status !== "VERIFIED";

  return (
    <motion.tr
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      className="border-b border-gb-border hover:bg-gb-surface-hover/50 cursor-pointer transition-colors group"
      onClick={onClick}
    >
      {/* Priority bar */}
      <td className="py-3 pl-4 pr-2 w-1">
        <span className={`block w-1 h-8 rounded-full ${priority.bar}`} />
      </td>

      {/* Category icon + Title */}
      <td className="py-3 pr-4">
        <div className="flex items-start gap-2.5">
          <CatIcon size={16} className={`mt-0.5 shrink-0 ${cat.color}`} />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gb-text truncate group-hover:text-gb-primary transition-colors">
              {item.title}
            </p>
            <p className="text-xs text-gb-muted mt-0.5 flex items-center gap-1.5">
              {item.project && <span className="font-mono">{item.project.code}</span>}
              {item.location && (
                <><span className="text-gb-muted/30">·</span><MapPin size={10} /><span>{item.location}</span></>
              )}
            </p>
          </div>
        </div>
      </td>

      {/* Category */}
      <td className="py-3 pr-4 hidden lg:table-cell">
        <CategoryBadge category={item.category} />
      </td>

      {/* Priority */}
      <td className="py-3 pr-4 hidden md:table-cell">
        <PriorityBadge priority={item.priority} />
      </td>

      {/* Status */}
      <td className="py-3 pr-4">
        <StatusBadge status={item.status} />
      </td>

      {/* Assigné */}
      <td className="py-3 pr-4 hidden xl:table-cell">
        {item.assignedTo ? (
          <span className="text-xs text-gb-muted flex items-center gap-1">
            <User size={11} />{item.assignedTo.firstname} {item.assignedTo.lastname}
          </span>
        ) : <span className="text-xs text-gb-muted">—</span>}
      </td>

      {/* Échéance */}
      <td className="py-3 pr-4 hidden xl:table-cell">
        {item.due_date ? (
          <span className={`text-xs flex items-center gap-1 ${overdue ? "text-amber-500 font-bold" : "text-gb-muted"}`}>
            <Calendar size={11} />
            {format(new Date(item.due_date), "d MMM yyyy", { locale: fr })}
            {overdue && <AlertTriangle size={11} />}
          </span>
        ) : <span className="text-xs text-gb-muted">—</span>}
      </td>

      <td className="py-3 pr-4 w-8">
        <ChevronRight size={16} className="text-gb-muted/40 group-hover:text-gb-muted transition-colors" />
      </td>
    </motion.tr>
  );
}

// ─── Main View ────────────────────────────────────────────────────────────────

export default function PunchListView() {
  const { can } = usePermissions();
  const canCreate = can("punch-item:create");
  const canEdit   = can("punch-item:update");
  const canDelete = can("punch-item:delete");

  const [items, setItems] = useState<PunchItem[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [workflowNotice, setWorkflowNotice] = useState<string | null>(null);

  const [filterProject,  setFilterProject]  = useState("");
  const [filterStatus,   setFilterStatus]   = useState("");
  const [filterPriority, setFilterPriority] = useState("");
  const [filterCategory, setFilterCategory] = useState("");

  const [selected, setSelected] = useState<PunchItem | null>(null);
  const [editing,  setEditing]  = useState<PunchItem | undefined>(undefined);
  const [showForm, setShowForm] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (filterProject)  params.set("project_id", filterProject);
      if (filterStatus)   params.set("status",      filterStatus);
      if (filterPriority) params.set("priority",    filterPriority);
      if (filterCategory) params.set("category",    filterCategory);

      const res = await apiFetch(`${API_BASE}/punch-items?${params.toString()}`);
      if (!res.ok) throw new Error("Erreur de chargement");
      const data = await res.json();
      setItems(Array.isArray(data) ? data : []);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [filterProject, filterStatus, filterPriority, filterCategory]);

  const loadProjects = useCallback(async () => {
    try {
      const res = await apiFetch(`${API_BASE}/projects?limit=100`);
      if (!res.ok) return;
      const data = await res.json();
      setProjects(Array.isArray(data) ? data : (data.data ?? []));
    } catch {}
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { loadProjects(); }, [loadProjects]);

  const handleStatusChange = async (id: number, status: string) => {
    const current = items.find((i) => i.id === id);
    const projectPhase = current?.project?.id
      ? projects.find((p) => p.id === current.project?.id)?.phase
      : null;
    if (!isPunchPhaseAllowed(projectPhase)) {
      setWorkflowNotice(`${PUNCH_WORKFLOW_GUARD.reason} Phase actuelle: ${getProjectPhaseLabel(projectPhase)}.`);
      return;
    }
    try {
      const res = await apiFetch(`${API_BASE}/punch-items/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error();
      const updated = await res.json();
      setItems(prev => prev.map(i => i.id === id ? updated : i));
      if (selected?.id === id) setSelected(updated);
      setWorkflowNotice(null);
    } catch {}
  };

  const handleDelete = async (id: number) => {
    const current = items.find((i) => i.id === id);
    const projectPhase = current?.project?.id
      ? projects.find((p) => p.id === current.project?.id)?.phase
      : null;
    if (!isPunchPhaseAllowed(projectPhase)) {
      setWorkflowNotice(`${PUNCH_WORKFLOW_GUARD.reason} Phase actuelle: ${getProjectPhaseLabel(projectPhase)}.`);
      return;
    }
    try {
      await apiFetch(`${API_BASE}/punch-items/${id}`, { method: "DELETE" });
      setItems(prev => prev.filter(i => i.id !== id));
      setSelected(null);
      setWorkflowNotice(null);
    } catch {}
  };

  const openCreate = () => { setEditing(undefined); setShowForm(true); };
  const openEdit   = (pi: PunchItem) => { setEditing(pi); setShowForm(true); };

  // ─── KPI computations ─────────────────────────────────────────────────────
  const total      = items.length;
  const open       = items.filter(i => i.status === "OPEN").length;
  const blocking   = items.filter(i => i.priority === "BLOCKING" && i.status !== "CLOSED" && i.status !== "VERIFIED").length;
  const closed     = items.filter(i => i.status === "CLOSED" || i.status === "VERIFIED").length;
  const rateStr    = total > 0 ? `${Math.round((closed / total) * 100)}%` : "—";
  const overdueCnt = items.filter(i => isDueSoon(i.due_date) && i.status !== "CLOSED" && i.status !== "VERIFIED").length;

  const activeFilters = [filterProject, filterStatus, filterPriority, filterCategory].filter(Boolean).length;

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-gb-text flex items-center gap-2.5">
            <ListTodo size={24} className="text-amber-500" />
            Levée des réserves
          </h1>
          <p className="text-sm text-gb-muted mt-0.5">Gestion des réserves et levées de réserves — réception des travaux</p>
        </div>
        {canCreate && (
          <button
            onClick={openCreate}
            className="flex items-center gap-2 px-5 py-2.5 bg-gb-primary text-gb-inverse font-bold text-sm rounded-xl hover:bg-gb-primary/90 transition-colors shadow-sm shadow-gb-primary/20"
          >
            <Plus size={16} /> Saisir une réserve
          </button>
        )}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
        <KpiCard label="Total réserves"  value={total}    icon={ListTodo}      accent="bg-gb-primary/10 text-gb-primary" />
        <KpiCard label="Ouvertes"        value={open}     icon={AlertCircle}   accent="bg-red-500/10 text-red-500" sub={`${overdueCnt} en retard`} />
        <KpiCard label="Bloquantes"      value={blocking} icon={AlertTriangle} accent="bg-red-600/10 text-red-600" />
        <KpiCard label="Clôturées"       value={closed}   icon={CheckCircle2}  accent="bg-emerald-500/10 text-emerald-500" />
        <KpiCard label="Taux de levée"   value={rateStr}  icon={BarChart3}     accent="bg-purple-500/10 text-purple-500" />
      </div>

      {/* Blocking alert */}
      <AnimatePresence>
        {blocking > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="flex items-center gap-3 px-4 py-3 bg-red-600/10 border border-red-600/20 rounded-xl"
          >
            <div className="w-2 h-2 rounded-full bg-red-600 animate-pulse shrink-0" />
            <p className="text-sm font-bold text-red-600">
              {blocking} réserve{blocking > 1 ? "s" : ""} BLOQUANTE{blocking > 1 ? "S" : ""} — la réception des travaux est conditionnée à leur levée.
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {workflowNotice && (
        <div className="flex items-center gap-2 text-sm text-amber-500 bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-3">
          <AlertCircle size={15} />
          {workflowNotice}
        </div>
      )}

      {/* Category distribution */}
      {!loading && items.length > 0 && (
        <CategoryBar
          items={items}
          onFilter={cat => setFilterCategory(cat)}
          activeFilter={filterCategory}
        />
      )}

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2 text-xs font-semibold text-gb-muted">
          <Eye size={14} /> Filtrer
        </div>

        <select
          className="text-xs bg-gb-surface-solid border border-gb-border rounded-xl px-3 py-2 text-gb-text focus:outline-none focus:ring-2 focus:ring-gb-primary/30 focus:border-gb-primary transition-colors"
          value={filterProject}
          onChange={e => setFilterProject(e.target.value)}
        >
          <option value="">Tous les projets</option>
          {projects.map(p => <option key={p.id} value={p.id}>{p.code}</option>)}
        </select>

        <select
          className="text-xs bg-gb-surface-solid border border-gb-border rounded-xl px-3 py-2 text-gb-text focus:outline-none focus:ring-2 focus:ring-gb-primary/30 focus:border-gb-primary transition-colors"
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
        >
          <option value="">Tous les statuts</option>
          {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>

        <select
          className="text-xs bg-gb-surface-solid border border-gb-border rounded-xl px-3 py-2 text-gb-text focus:outline-none focus:ring-2 focus:ring-gb-primary/30 focus:border-gb-primary transition-colors"
          value={filterPriority}
          onChange={e => setFilterPriority(e.target.value)}
        >
          <option value="">Toutes priorités</option>
          {PRIORITIES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
        </select>

        {activeFilters > 0 && (
          <button
            onClick={() => { setFilterProject(""); setFilterStatus(""); setFilterPriority(""); setFilterCategory(""); }}
            className="flex items-center gap-1.5 text-xs font-semibold text-gb-muted hover:text-gb-danger border border-gb-border hover:border-gb-danger/30 px-3 py-2 rounded-xl transition-colors"
          >
            <X size={12} /> Réinitialiser ({activeFilters})
          </button>
        )}

        <span className="ml-auto text-xs text-gb-muted font-semibold">
          {items.length} résultat{items.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Table */}
      <div className="bg-gb-surface-solid border border-gb-border rounded-2xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-24 gap-3 text-gb-muted">
            <Loader2 size={20} className="animate-spin" />
            <span className="text-sm">Chargement des réserves...</span>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center py-24 gap-3 text-gb-danger">
            <AlertCircle size={20} />
            <span className="text-sm">{error}</span>
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3 text-gb-muted">
            <ListTodo size={40} className="opacity-20" />
            <p className="text-sm font-semibold">Aucune réserve trouvée</p>
            {canCreate && (
              <button
                onClick={openCreate}
                className="flex items-center gap-2 text-sm text-gb-primary font-bold hover:underline mt-1"
              >
                <Plus size={14} /> Saisir la première réserve
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gb-border">
                  <th className="py-3 pl-4 pr-2 w-1" />
                  <th className="py-3 pr-4 text-left text-[10px] font-black text-gb-muted uppercase tracking-widest">Réserve</th>
                  <th className="py-3 pr-4 text-left text-[10px] font-black text-gb-muted uppercase tracking-widest hidden lg:table-cell">Catégorie</th>
                  <th className="py-3 pr-4 text-left text-[10px] font-black text-gb-muted uppercase tracking-widest hidden md:table-cell">Priorité</th>
                  <th className="py-3 pr-4 text-left text-[10px] font-black text-gb-muted uppercase tracking-widest">Statut</th>
                  <th className="py-3 pr-4 text-left text-[10px] font-black text-gb-muted uppercase tracking-widest hidden xl:table-cell">Responsable</th>
                  <th className="py-3 pr-4 text-left text-[10px] font-black text-gb-muted uppercase tracking-widest hidden xl:table-cell">Échéance</th>
                  <th className="py-3 pr-4 w-8" />
                </tr>
              </thead>
              <tbody>
                <AnimatePresence>
                  {items.map(pi => (
                    <PunchItemRow
                      key={pi.id}
                      item={pi}
                      onClick={() => setSelected(pi)}
                    />
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Detail Drawer */}
      <AnimatePresence>
        {selected && (
          <PunchItemDetailDrawer
            item={selected}
            onClose={() => setSelected(null)}
            onStatusChange={handleStatusChange}
            onDelete={handleDelete}
            onEdit={openEdit}
            canEdit={canEdit}
            canDelete={canDelete}
            canMutate={isPunchPhaseAllowed(projects.find((p) => p.id === selected.project?.id)?.phase)}
            workflowBlockMessage={selected.project?.id
              ? `${PUNCH_WORKFLOW_GUARD.reason} Phase actuelle: ${getProjectPhaseLabel(projects.find((p) => p.id === selected.project?.id)?.phase)}.`
              : PUNCH_WORKFLOW_GUARD.reason}
          />
        )}
      </AnimatePresence>

      {/* Create / Edit Form */}
      <AnimatePresence>
        {showForm && (
          <PunchItemFormDialog
            open={showForm}
            onClose={() => setShowForm(false)}
            onSaved={() => { load(); }}
            projects={projects}
            item={editing}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
