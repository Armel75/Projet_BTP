import React, { useState, useEffect, useCallback } from "react";
import {
  ShieldAlert, Plus, Filter, X, Loader2, AlertCircle,
  ChevronDown, TrendingUp, Clock, CheckCircle2, XCircle,
  MapPin, User, Calendar, Wrench, DollarSign, AlertTriangle,
  Eye, Pencil, Trash2, BarChart3, Activity, ArrowUpRight
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { apiFetch, API_BASE } from "../lib/api";
import { usePermissions } from "../contexts/AuthContext";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Incident {
  id: number;
  type: string;
  severity: string;
  status: string;
  title?: string;
  description: string;
  location?: string;
  incident_date?: string;
  root_cause?: string;
  corrective_action?: string;
  cost_impact?: number;
  delay_impact_days?: number;
  created_at: string;
  resolved_at?: string;
  project?: { id: number; code: string; title: string };
  task?: { id: number; title: string } | null;
  lot?: { id: number; lot_number: string; name: string } | null;
  createdBy?: { id: number; firstname: string; lastname: string } | null;
  assignedTo?: { id: number; firstname: string; lastname: string } | null;
}

interface Project { id: number; code: string; title: string; }

// ─── Config ──────────────────────────────────────────────────────────────────

const TYPES: { value: string; label: string; icon: string; color: string; bg: string }[] = [
  { value: "SAFETY",       label: "Sécurité",      icon: "🦺", color: "text-red-500",    bg: "bg-red-500/10 border-red-500/20" },
  { value: "QUALITY",      label: "Qualité",        icon: "🔍", color: "text-blue-500",   bg: "bg-blue-500/10 border-blue-500/20" },
  { value: "DELAY",        label: "Délai",          icon: "⏱️", color: "text-amber-500",  bg: "bg-amber-500/10 border-amber-500/20" },
  { value: "TECHNICAL",    label: "Technique",      icon: "⚙️", color: "text-purple-500", bg: "bg-purple-500/10 border-purple-500/20" },
  { value: "ENVIRONMENTAL",label: "Environnement",  icon: "🌿", color: "text-emerald-500",bg: "bg-emerald-500/10 border-emerald-500/20" },
];

const SEVERITIES: { value: string; label: string; dot: string; badge: string }[] = [
  { value: "LOW",      label: "Faible",    dot: "bg-slate-400",    badge: "bg-slate-400/10 text-slate-400 border-slate-400/20" },
  { value: "MEDIUM",   label: "Modéré",    dot: "bg-amber-400",    badge: "bg-amber-400/10 text-amber-500 border-amber-400/20" },
  { value: "HIGH",     label: "Élevé",     dot: "bg-orange-500",   badge: "bg-orange-500/10 text-orange-500 border-orange-500/20" },
  { value: "CRITICAL", label: "Critique",  dot: "bg-red-500",      badge: "bg-red-500/10 text-red-500 border-red-500/20 animate-pulse" },
];

const STATUSES: { value: string; label: string; icon: React.FC<any>; color: string; bg: string }[] = [
  { value: "OPEN",        label: "Ouvert",      icon: AlertCircle,  color: "text-red-500",    bg: "bg-red-500/10 border-red-500/20" },
  { value: "IN_PROGRESS", label: "En cours",    icon: Activity,     color: "text-blue-500",   bg: "bg-blue-500/10 border-blue-500/20" },
  { value: "RESOLVED",    label: "Résolu",      icon: CheckCircle2, color: "text-emerald-500",bg: "bg-emerald-500/10 border-emerald-500/20" },
  { value: "CLOSED",      label: "Clôturé",     icon: XCircle,      color: "text-slate-400",  bg: "bg-slate-400/10 border-slate-400/20" },
];

const EMPTY_FORM = {
  title: "", description: "", location: "", type: "SAFETY", severity: "MEDIUM",
  status: "OPEN", project_id: "", incident_date: "", root_cause: "",
  corrective_action: "", cost_impact: "", delay_impact_days: "",
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getTypeMeta(v: string) { return TYPES.find(t => t.value === v) ?? TYPES[0]; }
function getSeverityMeta(v: string) { return SEVERITIES.find(s => s.value === v) ?? SEVERITIES[0]; }
function getStatusMeta(v: string) { return STATUSES.find(s => s.value === v) ?? STATUSES[0]; }

function SeverityBadge({ severity }: { severity: string }) {
  const m = getSeverityMeta(severity);
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
    <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border ${m.bg} ${m.color}`}>
      <Icon size={11} />
      {m.label}
    </span>
  );
}

function TypeBadge({ type }: { type: string }) {
  const m = getTypeMeta(type);
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border ${m.bg} ${m.color}`}>
      <span>{m.icon}</span>
      {m.label}
    </span>
  );
}

// ─── KPI Card ────────────────────────────────────────────────────────────────

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

// ─── Incident Detail Drawer ───────────────────────────────────────────────────

function IncidentDetailDrawer({
  incident, onClose, onStatusChange, onDelete, canEdit, canDelete
}: {
  incident: Incident;
  onClose: () => void;
  onStatusChange: (id: number, status: string) => void;
  onDelete: (id: number) => void;
  canEdit: boolean;
  canDelete: boolean;
}) {
  const type = getTypeMeta(incident.type);
  const severity = getSeverityMeta(incident.severity);

  const nextStatus: Record<string, string | null> = {
    OPEN: "IN_PROGRESS", IN_PROGRESS: "RESOLVED", RESOLVED: "CLOSED", CLOSED: null
  };
  const next = nextStatus[incident.status];

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
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex items-center gap-2">
              <span className="text-2xl">{type.icon}</span>
              <span className={`text-xs font-bold uppercase tracking-widest ${type.color}`}>{type.label}</span>
              <span className="text-gb-muted/30">·</span>
              <span className="text-xs font-mono text-gb-muted">#{incident.id}</span>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-lg text-gb-muted hover:text-gb-text hover:bg-gb-surface-hover transition-colors">
              <X size={18} />
            </button>
          </div>
          <h2 className="text-xl font-black text-gb-text tracking-tight">
            {incident.title || incident.description.substring(0, 80)}
          </h2>
          <div className="flex flex-wrap gap-2 mt-3">
            <SeverityBadge severity={incident.severity} />
            <StatusBadge status={incident.status} />
            {incident.project && (
              <span className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full border border-gb-border text-gb-muted bg-gb-surface-solid">
                {incident.project.code}
              </span>
            )}
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 p-6 space-y-6">

          {/* Metadata grid */}
          <div className="grid grid-cols-2 gap-3">
            {incident.incident_date && (
              <div className="bg-gb-surface-solid border border-gb-border rounded-xl p-3">
                <p className="text-[10px] font-bold text-gb-muted uppercase tracking-widest mb-1 flex items-center gap-1"><Calendar size={10} /> Date incident</p>
                <p className="text-sm font-semibold text-gb-text">{format(new Date(incident.incident_date), "d MMM yyyy HH:mm", { locale: fr })}</p>
              </div>
            )}
            {incident.location && (
              <div className="bg-gb-surface-solid border border-gb-border rounded-xl p-3">
                <p className="text-[10px] font-bold text-gb-muted uppercase tracking-widest mb-1 flex items-center gap-1"><MapPin size={10} /> Localisation</p>
                <p className="text-sm font-semibold text-gb-text">{incident.location}</p>
              </div>
            )}
            {incident.assignedTo && (
              <div className="bg-gb-surface-solid border border-gb-border rounded-xl p-3">
                <p className="text-[10px] font-bold text-gb-muted uppercase tracking-widest mb-1 flex items-center gap-1"><User size={10} /> Responsable</p>
                <p className="text-sm font-semibold text-gb-text">{incident.assignedTo.firstname} {incident.assignedTo.lastname}</p>
              </div>
            )}
            {incident.cost_impact != null && (
              <div className="bg-gb-surface-solid border border-gb-border rounded-xl p-3">
                <p className="text-[10px] font-bold text-gb-muted uppercase tracking-widest mb-1 flex items-center gap-1"><DollarSign size={10} /> Impact financier</p>
                <p className="text-sm font-semibold text-gb-text">{incident.cost_impact.toLocaleString("fr-FR")} FCFA</p>
              </div>
            )}
            {incident.delay_impact_days != null && (
              <div className="bg-gb-surface-solid border border-gb-border rounded-xl p-3">
                <p className="text-[10px] font-bold text-gb-muted uppercase tracking-widest mb-1 flex items-center gap-1"><Clock size={10} /> Impact délai</p>
                <p className="text-sm font-semibold text-gb-text">{incident.delay_impact_days} jour{incident.delay_impact_days > 1 ? "s" : ""}</p>
              </div>
            )}
            {incident.resolved_at && (
              <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-3">
                <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest mb-1 flex items-center gap-1"><CheckCircle2 size={10} /> Résolu le</p>
                <p className="text-sm font-semibold text-gb-text">{format(new Date(incident.resolved_at), "d MMM yyyy", { locale: fr })}</p>
              </div>
            )}
          </div>

          <Section title="Description">
            <p className="text-sm text-gb-text leading-relaxed whitespace-pre-wrap">{incident.description}</p>
          </Section>

          {incident.root_cause && (
            <Section title="Causes racines (REX)">
              <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-4">
                <p className="text-sm text-gb-text leading-relaxed whitespace-pre-wrap">{incident.root_cause}</p>
              </div>
            </Section>
          )}

          {incident.corrective_action && (
            <Section title="Action corrective">
              <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-4">
                <p className="text-sm text-gb-text leading-relaxed whitespace-pre-wrap">{incident.corrective_action}</p>
              </div>
            </Section>
          )}

          {(incident.task || incident.lot) && (
            <Section title="Liens">
              <div className="space-y-2">
                {incident.task && (
                  <div className="flex items-center gap-2 text-sm text-gb-muted">
                    <Wrench size={13} className="text-gb-muted" />
                    <span>Tâche :</span>
                    <span className="text-gb-text font-medium">{incident.task.title}</span>
                  </div>
                )}
                {incident.lot && (
                  <div className="flex items-center gap-2 text-sm text-gb-muted">
                    <BarChart3 size={13} className="text-gb-muted" />
                    <span>Lot {incident.lot.lot_number} :</span>
                    <span className="text-gb-text font-medium">{incident.lot.name}</span>
                  </div>
                )}
              </div>
            </Section>
          )}

          <Section title="Méta">
            <div className="text-xs text-gb-muted space-y-1">
              <p>Créé le {format(new Date(incident.created_at), "d MMMM yyyy 'à' HH:mm", { locale: fr })}
                {incident.createdBy && ` par ${incident.createdBy.firstname} ${incident.createdBy.lastname}`}
              </p>
            </div>
          </Section>
        </div>

        {/* Footer actions */}
        <div className="p-6 border-t border-gb-border bg-gb-surface-solid/50 shrink-0 flex items-center gap-3">
          {canEdit && next && (
            <button
              onClick={() => onStatusChange(incident.id, next)}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gb-primary text-gb-inverse font-bold text-sm hover:bg-gb-primary/90 transition-colors"
            >
              <ArrowUpRight size={15} />
              {next === "IN_PROGRESS" ? "Prendre en charge" : next === "RESOLVED" ? "Marquer résolu" : "Clôturer"}
            </button>
          )}
          {canDelete && (
            <button
              onClick={() => { if (window.confirm("Supprimer cet incident ?")) onDelete(incident.id); }}
              className="p-2.5 rounded-xl border border-gb-danger/30 text-gb-danger hover:bg-gb-danger/10 transition-colors"
            >
              <Trash2 size={16} />
            </button>
          )}
        </div>
      </motion.aside>
    </motion.div>
  );
}

// ─── Create / Edit Dialog ──────────────────────────────────────────────────────

function IncidentFormDialog({
  open, onClose, onSaved, projects, incident
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  projects: Project[];
  incident?: Incident;
}) {
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      if (incident) {
        setForm({
          title:             incident.title ?? "",
          description:       incident.description,
          location:          incident.location ?? "",
          type:              incident.type,
          severity:          incident.severity,
          status:            incident.status,
          project_id:        String(incident.project?.id ?? ""),
          incident_date:     incident.incident_date ? incident.incident_date.slice(0, 16) : "",
          root_cause:        incident.root_cause ?? "",
          corrective_action: incident.corrective_action ?? "",
          cost_impact:       incident.cost_impact != null ? String(incident.cost_impact) : "",
          delay_impact_days: incident.delay_impact_days != null ? String(incident.delay_impact_days) : "",
        });
      } else {
        setForm({ ...EMPTY_FORM });
      }
      setError(null);
    }
  }, [open, incident]);

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const save = async () => {
    if (!form.description.trim() || !form.project_id) {
      setError("Description et projet sont obligatoires.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const body: Record<string, any> = {
        ...form,
        project_id: Number(form.project_id),
        cost_impact:       form.cost_impact       ? Number(form.cost_impact)       : undefined,
        delay_impact_days: form.delay_impact_days ? Number(form.delay_impact_days) : undefined,
        incident_date:     form.incident_date || undefined,
      };
      // Remove empty strings
      Object.keys(body).forEach(k => { if (body[k] === "") delete body[k]; });

      const url    = incident ? `${API_BASE}/incidents/${incident.id}` : `${API_BASE}/incidents`;
      const method = incident ? "PUT" : "POST";
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
      onClick={onClose}
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
        {/* Dialog header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gb-border">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center justify-center">
              <ShieldAlert size={18} className="text-red-500" />
            </div>
            <div>
              <h3 className="text-base font-black text-gb-text">
                {incident ? "Modifier l'incident" : "Déclarer un incident"}
              </h3>
              <p className="text-xs text-gb-muted">Remplissez les informations ci-dessous</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gb-muted hover:bg-gb-surface-hover transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Dialog body */}
        <div className="overflow-y-auto flex-1 p-6 space-y-5">

          {/* Titre + Projet */}
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className={labelCls}>Titre <span className="text-gb-muted font-normal">(optionnel)</span></label>
              <input className={inputCls} placeholder="Résumé court de l'incident..." value={form.title} onChange={e => set("title", e.target.value)} />
            </div>
            <div className="col-span-2">
              <label className={labelCls}>Projet <span className="text-red-400">*</span></label>
              <select className={inputCls} value={form.project_id} onChange={e => set("project_id", e.target.value)}>
                <option value="">— Sélectionner un projet —</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.code} — {p.title}</option>)}
              </select>
            </div>
          </div>

          {/* Type + Sévérité + Statut */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className={labelCls}>Type <span className="text-red-400">*</span></label>
              <select className={inputCls} value={form.type} onChange={e => set("type", e.target.value)}>
                {TYPES.map(t => <option key={t.value} value={t.value}>{t.icon} {t.label}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Sévérité <span className="text-red-400">*</span></label>
              <select className={inputCls} value={form.severity} onChange={e => set("severity", e.target.value)}>
                {SEVERITIES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Statut</label>
              <select className={inputCls} value={form.status} onChange={e => set("status", e.target.value)}>
                {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
          </div>

          {/* Date + Localisation */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Date de survenue</label>
              <input type="datetime-local" className={inputCls} value={form.incident_date} onChange={e => set("incident_date", e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>Localisation</label>
              <input className={inputCls} placeholder="Zone A, Niveau 3..." value={form.location} onChange={e => set("location", e.target.value)} />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className={labelCls}>Description <span className="text-red-400">*</span></label>
            <textarea className={`${inputCls} resize-none`} rows={3} placeholder="Décrivez précisément les faits constatés..." value={form.description} onChange={e => set("description", e.target.value)} />
          </div>

          {/* Causes racines */}
          <div>
            <label className={labelCls}>Causes racines <span className="text-gb-muted font-normal">(REX / Analyse 5 Pourquoi)</span></label>
            <textarea className={`${inputCls} resize-none`} rows={2} placeholder="Identifier les causes profondes pour éviter la récurrence..." value={form.root_cause} onChange={e => set("root_cause", e.target.value)} />
          </div>

          {/* Action corrective */}
          <div>
            <label className={labelCls}>Action corrective</label>
            <textarea className={`${inputCls} resize-none`} rows={2} placeholder="Mesures correctives mises en œuvre ou planifiées..." value={form.corrective_action} onChange={e => set("corrective_action", e.target.value)} />
          </div>

          {/* Impacts */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Impact financier (FCFA)</label>
              <input type="number" min="0" className={inputCls} placeholder="0" value={form.cost_impact} onChange={e => set("cost_impact", e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>Impact délai (jours)</label>
              <input type="number" min="0" className={inputCls} placeholder="0" value={form.delay_impact_days} onChange={e => set("delay_impact_days", e.target.value)} />
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-sm text-gb-danger bg-gb-danger/10 border border-gb-danger/20 rounded-xl px-4 py-3">
              <AlertCircle size={15} /> {error}
            </div>
          )}
        </div>

        {/* Dialog footer */}
        <div className="px-6 py-4 border-t border-gb-border flex items-center justify-end gap-3 bg-gb-app/30">
          <button onClick={onClose} className="px-5 py-2.5 rounded-xl text-sm font-semibold text-gb-muted hover:text-gb-text hover:bg-gb-surface-hover transition-colors">
            Annuler
          </button>
          <button
            onClick={save}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gb-primary text-gb-inverse font-bold text-sm hover:bg-gb-primary/90 transition-colors disabled:opacity-50"
          >
            {saving ? <Loader2 size={15} className="animate-spin" /> : <ShieldAlert size={15} />}
            {saving ? "Enregistrement..." : incident ? "Mettre à jour" : "Déclarer l'incident"}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Incident Row (table) ─────────────────────────────────────────────────────

function IncidentRow({ incident, onClick }: { incident: Incident; onClick: () => void }) {
  const type = getTypeMeta(incident.type);
  const sev  = getSeverityMeta(incident.severity);

  return (
    <motion.tr
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      className="border-b border-gb-border hover:bg-gb-surface-hover/50 cursor-pointer transition-colors group"
      onClick={onClick}
    >
      {/* Sévérité indicator */}
      <td className="py-3 pl-4 pr-2 w-1">
        <span className={`block w-1 h-8 rounded-full ${sev.dot}`} />
      </td>
      {/* Type + Titre */}
      <td className="py-3 pr-4">
        <div className="flex items-start gap-2.5">
          <span className="text-lg leading-none mt-0.5">{type.icon}</span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gb-text truncate group-hover:text-gb-primary transition-colors">
              {incident.title || incident.description.substring(0, 60)}
            </p>
            <p className="text-xs text-gb-muted mt-0.5 flex items-center gap-1">
              {incident.project && <span className="font-mono">{incident.project.code}</span>}
              {incident.location && <><span className="text-gb-muted/40">·</span><MapPin size={10} /><span>{incident.location}</span></>}
            </p>
          </div>
        </div>
      </td>
      {/* Sévérité */}
      <td className="py-3 pr-4 hidden md:table-cell">
        <SeverityBadge severity={incident.severity} />
      </td>
      {/* Statut */}
      <td className="py-3 pr-4">
        <StatusBadge status={incident.status} />
      </td>
      {/* Impacts */}
      <td className="py-3 pr-4 hidden lg:table-cell">
        <div className="flex flex-col gap-0.5">
          {incident.cost_impact != null && (
            <span className="text-xs text-gb-muted flex items-center gap-1">
              <DollarSign size={11} />{incident.cost_impact.toLocaleString("fr-FR")} FCFA
            </span>
          )}
          {incident.delay_impact_days != null && (
            <span className="text-xs text-gb-muted flex items-center gap-1">
              <Clock size={11} />{incident.delay_impact_days}j
            </span>
          )}
          {incident.cost_impact == null && incident.delay_impact_days == null && (
            <span className="text-xs text-gb-muted">—</span>
          )}
        </div>
      </td>
      {/* Assigné */}
      <td className="py-3 pr-4 hidden xl:table-cell">
        {incident.assignedTo ? (
          <span className="text-xs text-gb-muted">
            {incident.assignedTo.firstname} {incident.assignedTo.lastname[0]}.
          </span>
        ) : <span className="text-xs text-gb-muted">—</span>}
      </td>
      {/* Date */}
      <td className="py-3 pr-4 text-xs text-gb-muted hidden sm:table-cell whitespace-nowrap">
        {incident.incident_date
          ? format(new Date(incident.incident_date), "d MMM yyyy", { locale: fr })
          : format(new Date(incident.created_at), "d MMM yyyy", { locale: fr })}
      </td>
      {/* Chevron */}
      <td className="py-3 pr-4">
        <ChevronDown size={14} className="-rotate-90 text-gb-muted/40 group-hover:text-gb-muted transition-colors" />
      </td>
    </motion.tr>
  );
}

// ─── Main View ────────────────────────────────────────────────────────────────

export default function IncidentsView() {
  const { can } = usePermissions();

  const [incidents, setIncidents]   = useState<Incident[]>([]);
  const [projects,  setProjects]    = useState<Project[]>([]);
  const [loading,   setLoading]     = useState(true);
  const [error,     setError]       = useState<string | null>(null);

  // Filters
  const [filterProject,  setFilterProject]  = useState("");
  const [filterStatus,   setFilterStatus]   = useState("");
  const [filterSeverity, setFilterSeverity] = useState("");
  const [filterType,     setFilterType]     = useState("");
  const [showFilter,     setShowFilter]     = useState(false);

  // Selected incident (detail drawer)
  const [selected,   setSelected]   = useState<Incident | null>(null);
  const [editTarget, setEditTarget] = useState<Incident | undefined>(undefined);
  const [showCreate, setShowCreate] = useState(false);

  // ── Load ─────────────────────────────────────────────────────────────────

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const params = new URLSearchParams();
      if (filterProject)  params.set("project_id", filterProject);
      if (filterStatus)   params.set("status",     filterStatus);
      if (filterSeverity) params.set("severity",   filterSeverity);
      if (filterType)     params.set("type",        filterType);

      const [iRes, pRes] = await Promise.all([
        apiFetch(`${API_BASE}/incidents?${params}`),
        apiFetch(`${API_BASE}/projects?limit=100`),
      ]);
      if (iRes.ok) setIncidents(await iRes.json());
      else setError("Impossible de charger les incidents.");
      if (pRes.ok) {
        const data = await pRes.json();
        setProjects(data.data ?? data);
      }
    } catch { setError("Erreur réseau."); }
    finally { setLoading(false); }
  }, [filterProject, filterStatus, filterSeverity, filterType]);

  useEffect(() => { load(); }, [load]);

  // ── Actions ──────────────────────────────────────────────────────────────

  const handleStatusChange = async (id: number, status: string) => {
    const res = await apiFetch(`${API_BASE}/incidents/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (res.ok) {
      const updated = await res.json();
      setIncidents(prev => prev.map(i => i.id === id ? updated : i));
      setSelected(updated);
    }
  };

  const handleDelete = async (id: number) => {
    const res = await apiFetch(`${API_BASE}/incidents/${id}`, { method: "DELETE" });
    if (res.ok || res.status === 204) {
      setIncidents(prev => prev.filter(i => i.id !== id));
      setSelected(null);
    }
  };

  // ── KPIs ─────────────────────────────────────────────────────────────────

  const total      = incidents.length;
  const open       = incidents.filter(i => i.status === "OPEN").length;
  const critical   = incidents.filter(i => i.severity === "CRITICAL").length;
  const resolved   = incidents.filter(i => i.status === "RESOLVED" || i.status === "CLOSED").length;
  const safety     = incidents.filter(i => i.type === "SAFETY").length;

  const activeFilterCount = [filterProject, filterStatus, filterSeverity, filterType].filter(Boolean).length;

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 pb-10">

      {/* Page header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight text-gb-text flex items-center gap-3">
            <ShieldAlert className="text-red-500" size={32} />
            <span>Gestion des Incidents</span>
          </h2>
          <p className="text-gb-muted mt-1 text-sm">Suivi HSE, qualité et blocages chantier — conformité PPSPS.</p>
        </div>
        {can("incident:create") && (
          <button
            onClick={() => { setEditTarget(undefined); setShowCreate(true); }}
            className="flex items-center gap-2 px-5 py-2.5 bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl shadow-lg shadow-red-500/20 transition-colors text-sm shrink-0"
          >
            <Plus size={16} />
            Déclarer un incident
          </button>
        )}
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard label="Total incidents"  value={total}    icon={ShieldAlert}  accent="bg-gb-surface-hover text-gb-muted" />
        <KpiCard label="Ouverts"          value={open}     icon={AlertCircle}  accent="bg-red-500/10 text-red-500" sub={open > 0 ? "Action requise" : "Aucun en attente"} />
        <KpiCard label="Critiques"        value={critical} icon={AlertTriangle} accent="bg-orange-500/10 text-orange-500" />
        <KpiCard label="Résolus / Clos"   value={resolved} icon={CheckCircle2} accent="bg-emerald-500/10 text-emerald-500" sub={`sur ${total}`} />
      </div>

      {/* Type distribution mini-bar */}
      {total > 0 && (
        <div className="bg-gb-surface-solid border border-gb-border rounded-2xl p-4">
          <p className="text-xs font-bold text-gb-muted uppercase tracking-widest mb-3">Répartition par type</p>
          <div className="flex gap-2 flex-wrap">
            {TYPES.map(t => {
              const count = incidents.filter(i => i.type === t.value).length;
              if (count === 0) return null;
              const pct = Math.round((count / total) * 100);
              return (
                <button
                  key={t.value}
                  onClick={() => setFilterType(filterType === t.value ? "" : t.value)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all ${
                    filterType === t.value ? `${t.bg} ${t.color} ring-2 ring-current` : "border-gb-border text-gb-muted hover:border-gb-primary/50"
                  }`}
                >
                  <span>{t.icon}</span>
                  <span>{t.label}</span>
                  <span className="font-black">{count}</span>
                  <span className="text-[10px] opacity-60">{pct}%</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Table container */}
      <div className="bg-gb-surface-solid border border-gb-border rounded-2xl overflow-hidden">

        {/* Toolbar */}
        <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-gb-border">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-gb-text">
              {total} incident{total !== 1 ? "s" : ""}
            </span>
            {activeFilterCount > 0 && (
              <span className="text-xs bg-gb-primary/10 text-gb-primary border border-gb-primary/20 px-2 py-0.5 rounded-full font-semibold">
                {activeFilterCount} filtre{activeFilterCount > 1 ? "s" : ""}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {activeFilterCount > 0 && (
              <button
                onClick={() => { setFilterProject(""); setFilterStatus(""); setFilterSeverity(""); setFilterType(""); }}
                className="flex items-center gap-1 text-xs text-gb-muted hover:text-gb-danger transition-colors"
              >
                <X size={12} /> Réinitialiser
              </button>
            )}
            <div className="relative">
              <button
                onClick={() => setShowFilter(v => !v)}
                className="flex items-center gap-1.5 px-3 py-2 border border-gb-border rounded-lg text-sm text-gb-muted hover:text-gb-text hover:bg-gb-surface-hover transition-colors"
              >
                <Filter size={14} />
                Filtrer
                {activeFilterCount > 0 && (
                  <span className="w-4 h-4 bg-gb-primary text-gb-inverse text-[9px] font-black rounded-full flex items-center justify-center">{activeFilterCount}</span>
                )}
              </button>
              <AnimatePresence>
                {showFilter && (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    className="absolute right-0 top-full mt-2 z-20 bg-gb-surface-solid border border-gb-border rounded-xl shadow-xl p-4 space-y-3 w-72"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-gb-text">Filtres</span>
                      <button onClick={() => setShowFilter(false)} className="p-1 rounded text-gb-muted hover:text-gb-text"><X size={13} /></button>
                    </div>
                    <div>
                      <label className="block text-xs text-gb-muted mb-1">Projet</label>
                      <select value={filterProject} onChange={e => setFilterProject(e.target.value)} className="w-full bg-gb-app border border-gb-border rounded-lg px-2 py-1.5 text-sm">
                        <option value="">Tous les projets</option>
                        {projects.map(p => <option key={p.id} value={p.id}>{p.code} — {p.title}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-gb-muted mb-1">Statut</label>
                      <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="w-full bg-gb-app border border-gb-border rounded-lg px-2 py-1.5 text-sm">
                        <option value="">Tous</option>
                        {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-gb-muted mb-1">Sévérité</label>
                      <select value={filterSeverity} onChange={e => setFilterSeverity(e.target.value)} className="w-full bg-gb-app border border-gb-border rounded-lg px-2 py-1.5 text-sm">
                        <option value="">Toutes</option>
                        {SEVERITIES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-gb-muted mb-1">Type</label>
                      <select value={filterType} onChange={e => setFilterType(e.target.value)} className="w-full bg-gb-app border border-gb-border rounded-lg px-2 py-1.5 text-sm">
                        <option value="">Tous</option>
                        {TYPES.map(t => <option key={t.value} value={t.value}>{t.icon} {t.label}</option>)}
                      </select>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div className="flex items-center justify-center p-20">
            <Loader2 className="w-8 h-8 text-gb-primary animate-spin" />
          </div>
        ) : error ? (
          <div className="flex items-center gap-3 p-10 text-gb-danger justify-center">
            <AlertCircle size={18} /> {error}
          </div>
        ) : incidents.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4 text-gb-muted">
            <div className="w-16 h-16 rounded-2xl bg-gb-surface-hover flex items-center justify-center">
              <ShieldAlert size={28} className="text-gb-muted/50" />
            </div>
            <div className="text-center">
              <p className="font-semibold text-gb-text">Aucun incident déclaré</p>
              <p className="text-sm mt-1">
                {activeFilterCount > 0 ? "Aucun résultat pour ces filtres." : "Tout est sous contrôle sur le chantier."}
              </p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gb-border">
                  <th className="w-1" />
                  <th className="text-left py-3 px-4 text-xs font-black text-gb-muted uppercase tracking-widest">Incident</th>
                  <th className="text-left py-3 px-4 text-xs font-black text-gb-muted uppercase tracking-widest hidden md:table-cell">Sévérité</th>
                  <th className="text-left py-3 px-4 text-xs font-black text-gb-muted uppercase tracking-widest">Statut</th>
                  <th className="text-left py-3 px-4 text-xs font-black text-gb-muted uppercase tracking-widest hidden lg:table-cell">Impacts</th>
                  <th className="text-left py-3 px-4 text-xs font-black text-gb-muted uppercase tracking-widest hidden xl:table-cell">Responsable</th>
                  <th className="text-left py-3 px-4 text-xs font-black text-gb-muted uppercase tracking-widest hidden sm:table-cell">Date</th>
                  <th className="w-8" />
                </tr>
              </thead>
              <tbody>
                <AnimatePresence>
                  {incidents.map(incident => (
                    <IncidentRow
                      key={incident.id}
                      incident={incident}
                      onClick={() => setSelected(incident)}
                    />
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Safety alert bar for critical open incidents */}
      {critical > 0 && open > 0 && incidents.some(i => i.severity === "CRITICAL" && i.status === "OPEN") && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 bg-red-500/10 border border-red-500/30 rounded-xl px-5 py-3"
        >
          <AlertTriangle size={16} className="text-red-500 shrink-0 animate-pulse" />
          <p className="text-sm font-semibold text-red-500">
            {incidents.filter(i => i.severity === "CRITICAL" && i.status === "OPEN").length} incident(s) critique(s) ouvert(s) — intervention immédiate requise.
          </p>
        </motion.div>
      )}

      {/* Incident detail drawer */}
      <AnimatePresence>
        {selected && (
          <IncidentDetailDrawer
            incident={selected}
            onClose={() => setSelected(null)}
            onStatusChange={handleStatusChange}
            onDelete={handleDelete}
            canEdit={can("incident:update")}
            canDelete={can("incident:delete")}
          />
        )}
      </AnimatePresence>

      {/* Create / Edit dialog */}
      <AnimatePresence>
        {showCreate && (
          <IncidentFormDialog
            open={showCreate}
            onClose={() => { setShowCreate(false); setEditTarget(undefined); }}
            onSaved={load}
            projects={projects}
            incident={editTarget}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
