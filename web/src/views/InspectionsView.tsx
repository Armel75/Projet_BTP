import React, { useState, useEffect, useCallback } from "react";
import {
  ClipboardCheck, Plus, X, Loader2, AlertCircle,
  CheckCircle2, XCircle, Clock, Calendar, MapPin, User,
  BookOpen, Eye, Pencil, Trash2, ArrowUpRight, ChevronRight,
  BarChart2, Activity, ListChecks, AlertTriangle, CheckCheck,
  Tag, FileDown
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { apiFetch, API_BASE } from "../lib/api";
import { usePermissions } from "../contexts/AuthContext";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

// ─── Types ────────────────────────────────────────────────────────────────────

interface InspectionItem {
  id: number;
  inspection_id: number;
  order: number;
  category?: string;
  description: string;
  result?: string; // PASS | FAIL | N/A
  comment?: string;
}

interface Inspection {
  id: number;
  title: string;
  type: string;   // DAILY | HOLD_POINT | WITNESS_POINT | FINAL
  status: string; // SCHEDULED | IN_PROGRESS | PASSED | FAILED
  scheduled_date?: string;
  date_scheduled?: string;
  completed_date?: string;
  description?: string;
  location?: string;
  reference_norm?: string;
  checklist_template_id?: number;
  inspection_result?: string;
  evidence_photos_required?: boolean;
  approval_workflow_status?: string;
  rework_required?: boolean;
  created_at: string;
  updated_at: string;
  project?: { id: number; code: string; title: string };
  lot?: { id: number; lot_number: string; name: string } | null;
  createdBy?: { id: number; firstname: string; lastname: string } | null;
  inspector?: { id: number; firstname: string; lastname: string } | null;
  items: InspectionItem[];
}

interface Project { id: number; code: string; title: string; phase?: string | null; }
interface UserOption {
  id: number;
  firstname?: string;
  lastname?: string;
  email?: string;
}

const INSPECTION_WORKFLOW_GUARD = {
  allowedPhases: ["PREPARATION", "EXECUTION"],
  reason: "Les inspections sont modifiables uniquement pendant les phases Preparation et Execution.",
} as const;

const PROJECT_PHASE_LABELS: Record<string, string> = {
  ETUDE: "Etude",
  PREPARATION: "Preparation",
  EXECUTION: "Execution",
  RECEPTION: "Reception",
  CLOTURE: "Cloture",
};

function isInspectionPhaseAllowed(phase?: string | null) {
  if (!phase) return true;
  return INSPECTION_WORKFLOW_GUARD.allowedPhases.includes(phase as "PREPARATION" | "EXECUTION");
}

function getProjectPhaseLabel(phase?: string | null) {
  if (!phase) return "Non defini";
  return PROJECT_PHASE_LABELS[phase] ?? phase;
}

// ─── Config ──────────────────────────────────────────────────────────────────

const TYPES: { value: string; label: string; icon: string; color: string; bg: string; badge: string }[] = [
  { value: "DAILY",         label: "Quotidienne",     icon: "📋", color: "text-blue-400",    bg: "bg-blue-400/10",    badge: "bg-blue-400/10 border-blue-400/20 text-blue-400" },
  { value: "HOLD_POINT",    label: "Point d'arrêt",   icon: "🛑", color: "text-red-500",     bg: "bg-red-500/10",     badge: "bg-red-500/10 border-red-500/20 text-red-500" },
  { value: "WITNESS_POINT", label: "Point de témoig.",icon: "👁️", color: "text-amber-500",   bg: "bg-amber-500/10",   badge: "bg-amber-500/10 border-amber-500/20 text-amber-500" },
  { value: "FINAL",         label: "Réception finale",icon: "🏁", color: "text-emerald-500", bg: "bg-emerald-500/10", badge: "bg-emerald-500/10 border-emerald-500/20 text-emerald-500" },
];

const STATUSES: { value: string; label: string; icon: React.FC<any>; color: string; bg: string; badge: string }[] = [
  { value: "SCHEDULED",   label: "Programmée",  icon: Clock,         color: "text-slate-400",   bg: "bg-slate-400/10",   badge: "bg-slate-400/10 border-slate-400/20 text-slate-400" },
  { value: "IN_PROGRESS", label: "En cours",    icon: Activity,      color: "text-blue-500",    bg: "bg-blue-500/10",    badge: "bg-blue-500/10 border-blue-500/20 text-blue-500" },
  { value: "PASSED",      label: "Validée",     icon: CheckCircle2,  color: "text-emerald-500", bg: "bg-emerald-500/10", badge: "bg-emerald-500/10 border-emerald-500/20 text-emerald-500" },
  { value: "FAILED",      label: "Échouée",     icon: XCircle,       color: "text-red-500",     bg: "bg-red-500/10",     badge: "bg-red-500/10 border-red-500/20 text-red-500" },
];

const ITEM_RESULTS: { value: string; label: string; color: string; bg: string; dot: string }[] = [
  { value: "PASS", label: "Conforme",     color: "text-emerald-500", bg: "bg-emerald-500/10 border-emerald-500/30", dot: "bg-emerald-500" },
  { value: "FAIL", label: "Non conforme", color: "text-red-500",     bg: "bg-red-500/10 border-red-500/30",         dot: "bg-red-500" },
  { value: "N/A",  label: "Sans objet",  color: "text-slate-400",   bg: "bg-slate-400/10 border-slate-400/30",     dot: "bg-slate-400" },
];

const WORKFLOW_STATUSES: { value: string; label: string }[] = [
  { value: "DRAFT", label: "Brouillon" },
  { value: "IN_REVIEW", label: "En revision" },
  { value: "APPROVED", label: "Approuve" },
  { value: "REJECTED", label: "Rejete" },
  { value: "ARCHIVED", label: "Archive" },
];

const INSPECTION_RESULTS: { value: string; label: string }[] = [
  { value: "PASSED", label: "Conforme" },
  { value: "FAILED", label: "Non conforme" },
  { value: "WITH_RESERVES", label: "Avec reserves" },
];

const EMPTY_FORM = {
  title: "", description: "", location: "", reference_norm: "",
  type: "DAILY", status: "SCHEDULED", project_id: "",
  scheduled_date: "", date_scheduled: "", inspector_id: "",
  checklist_template_id: "", inspection_result: "",
  evidence_photos_required: "false", approval_workflow_status: "",
  rework_required: "false",
};

const EMPTY_ITEM = { description: "", category: "", result: "", comment: "", order: 0 };

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getTypeMeta(v: string) { return TYPES.find(t => t.value === v) ?? TYPES[0]; }
function getStatusMeta(v: string) { return STATUSES.find(s => s.value === v) ?? STATUSES[0]; }
function getItemResultMeta(v?: string) { return ITEM_RESULTS.find(r => r.value === v) ?? null; }
function getWorkflowStatusLabel(v?: string) { return WORKFLOW_STATUSES.find(s => s.value === v)?.label ?? v ?? "-"; }
function getInspectionResultLabel(v?: string) { return INSPECTION_RESULTS.find(r => r.value === v)?.label ?? v ?? "-"; }

function computeScore(items: InspectionItem[]) {
  const rated = items.filter(i => i.result === "PASS" || i.result === "FAIL");
  if (!rated.length) return null;
  const passed = rated.filter(i => i.result === "PASS").length;
  return Math.round((passed / rated.length) * 100);
}

function TypeBadge({ type }: { type: string }) {
  const m = getTypeMeta(type);
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border ${m.badge}`}>
      <span>{m.icon}</span>{m.label}
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

function ScorePill({ score }: { score: number }) {
  const color = score >= 90 ? "text-emerald-500 bg-emerald-500/10 border-emerald-500/20"
               : score >= 70 ? "text-amber-500 bg-amber-500/10 border-amber-500/20"
               : "text-red-500 bg-red-500/10 border-red-500/20";
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-black px-2.5 py-1 rounded-full border ${color}`}>
      {score}%
    </span>
  );
}

async function downloadInspectionPdf(inspection: Inspection) {
  try {
    const res = await apiFetch(`${API_BASE}/inspections/${inspection.id}/pdf`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      alert(err.error || "Impossible de générer le rapport PDF d'inspection.");
      return;
    }

    const buffer = await res.arrayBuffer();
    const blob = new Blob([buffer], { type: "application/pdf" });
    if (blob.size === 0) {
      alert("Le PDF généré est vide.");
      return;
    }
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `INSP-${String(inspection.id).padStart(4, "0")}.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.setTimeout(() => window.URL.revokeObjectURL(url), 60_000);
  } catch {
    alert("Impossible de générer le rapport PDF d'inspection.");
  }
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

// ─── Checklist Panel (InspectionItems) ───────────────────────────────────────

function ChecklistPanel({
  items, onItemUpdate, canEdit
}: {
  items: InspectionItem[];
  onItemUpdate: (itemId: number, result: string, comment: string) => void;
  canEdit: boolean;
}) {
  const [editing, setEditing] = useState<number | null>(null);
  const [comment, setComment] = useState("");

  // Group by category
  const grouped = items.reduce<Record<string, InspectionItem[]>>((acc, item) => {
    const cat = item.category || "Général";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(item);
    return acc;
  }, {});

  const score = computeScore(items);
  const passCount = items.filter(i => i.result === "PASS").length;
  const failCount = items.filter(i => i.result === "FAIL").length;
  const naCount   = items.filter(i => i.result === "N/A").length;
  const pending   = items.filter(i => !i.result).length;

  return (
    <div className="space-y-4">
      {/* Score summary */}
      {items.length > 0 && (
        <div className="flex items-center gap-3 p-3 bg-gb-surface-solid border border-gb-border rounded-xl">
          <div className="flex-1 flex items-center gap-3 min-w-0 flex-wrap">
            <span className="text-xs font-bold text-gb-muted uppercase tracking-widest">Score</span>
            {score !== null ? <ScorePill score={score} /> : <span className="text-xs text-gb-muted italic">En attente</span>}
          </div>
          <div className="flex items-center gap-2 text-xs shrink-0">
            {passCount > 0 && <span className="text-emerald-500 font-bold flex items-center gap-1"><CheckCheck size={11} />{passCount}</span>}
            {failCount > 0 && <span className="text-red-500 font-bold flex items-center gap-1"><XCircle size={11} />{failCount}</span>}
            {naCount   > 0 && <span className="text-slate-400 font-bold">{naCount} N/A</span>}
            {pending   > 0 && <span className="text-gb-muted">{pending} en attente</span>}
          </div>
        </div>
      )}

      {/* Progress bar */}
      {items.length > 0 && (
        <div className="w-full h-1.5 bg-gb-border rounded-full overflow-hidden flex">
          {score !== null && (
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${score}%` }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className={`h-full rounded-full ${score >= 90 ? "bg-emerald-500" : score >= 70 ? "bg-amber-500" : "bg-red-500"}`}
            />
          )}
        </div>
      )}

      {/* Items grouped by category */}
      {Object.entries(grouped).map(([cat, catItems]) => (
        <div key={cat}>
          <div className="flex items-center gap-2 mb-2">
            <Tag size={11} className="text-gb-muted" />
            <span className="text-[10px] font-black text-gb-muted uppercase tracking-widest">{cat}</span>
            <span className="text-[10px] text-gb-muted/50">({catItems.length})</span>
          </div>
          <div className="space-y-2">
            {catItems.sort((a, b) => a.order - b.order).map((item) => {
              const resMeta = getItemResultMeta(item.result);
              const isEditing = editing === item.id;

              return (
                <motion.div
                  key={item.id}
                  layout
                  className="bg-gb-app border border-gb-border rounded-xl overflow-hidden"
                >
                  <div className="flex items-start gap-3 p-3">
                    {/* Result dot */}
                    <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${resMeta?.dot ?? "bg-gb-muted/30"}`} />
                    {/* Description */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gb-text font-medium leading-snug">{item.description}</p>
                      {item.comment && !isEditing && (
                        <p className="text-xs text-gb-muted mt-1 italic">{item.comment}</p>
                      )}
                    </div>
                    {/* Actions */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      {resMeta && (
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${resMeta.bg} ${resMeta.color}`}>
                          {resMeta.label}
                        </span>
                      )}
                      {canEdit && (
                        <button
                          onClick={() => {
                            if (isEditing) {
                              setEditing(null);
                            } else {
                              setEditing(item.id);
                              setComment(item.comment || "");
                            }
                          }}
                          className="p-1 rounded-lg text-gb-muted hover:text-gb-text hover:bg-gb-surface-hover transition-colors"
                        >
                          <Pencil size={13} />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Inline result editor */}
                  <AnimatePresence>
                    {isEditing && canEdit && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="border-t border-gb-border px-3 pb-3 pt-2.5 space-y-2.5 bg-gb-surface-solid/50">
                          <div className="flex gap-2">
                            {ITEM_RESULTS.map(r => (
                              <button
                                key={r.value}
                                onClick={() => {
                                  onItemUpdate(item.id, r.value, comment);
                                  setEditing(null);
                                }}
                                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold border transition-all ${
                                  item.result === r.value
                                    ? `${r.bg} ${r.color} scale-[1.02]`
                                    : "border-gb-border text-gb-muted hover:border-gb-primary hover:text-gb-text"
                                }`}
                              >
                                <span className={`w-1.5 h-1.5 rounded-full ${r.dot}`} />
                                {r.label}
                              </button>
                            ))}
                          </div>
                          <input
                            type="text"
                            value={comment}
                            onChange={e => setComment(e.target.value)}
                            placeholder="Observation / commentaire..."
                            className="w-full bg-gb-app border border-gb-border rounded-xl px-3 py-2 text-xs text-gb-text focus:outline-none focus:ring-2 focus:ring-gb-primary/30 focus:border-gb-primary"
                            onKeyDown={e => {
                              if (e.key === "Enter") {
                                onItemUpdate(item.id, item.result || "", comment);
                                setEditing(null);
                              }
                            }}
                          />
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </div>
        </div>
      ))}

      {items.length === 0 && (
        <div className="text-center py-8 text-gb-muted text-sm">
          <ListChecks size={32} className="mx-auto mb-2 opacity-30" />
          <p>Aucun point de contrôle défini</p>
        </div>
      )}
    </div>
  );
}

// ─── Inspection Detail Drawer ─────────────────────────────────────────────────

function InspectionDetailDrawer({
  inspection, onClose, onEdit, onStatusChange, onDelete, onItemUpdate, canEdit, canDelete, canMutate, workflowBlockMessage
}: {
  inspection: Inspection;
  onClose: () => void;
  onEdit: (inspection: Inspection) => void;
  onStatusChange: (id: number, status: string) => void;
  onDelete: (id: number) => void;
  onItemUpdate: (inspectionId: number, itemId: number, result: string, comment: string) => void;
  canEdit: boolean;
  canDelete: boolean;
  canMutate: boolean;
  workflowBlockMessage?: string | null;
}) {
  const type   = getTypeMeta(inspection.type);
  const status = getStatusMeta(inspection.status);
  const score  = computeScore(inspection.items);

  const nextStatus: Record<string, string | null> = {
    SCHEDULED: "IN_PROGRESS", IN_PROGRESS: "PASSED", PASSED: null, FAILED: null
  };
  const next = nextStatus[inspection.status];

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
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-2xl">{type.icon}</span>
              <span className={`text-xs font-bold uppercase tracking-widest ${type.color}`}>{type.label}</span>
              <span className="text-gb-muted/30">·</span>
              <span className="text-xs font-mono text-gb-muted">#{inspection.id}</span>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-lg text-gb-muted hover:text-gb-text hover:bg-gb-surface-hover transition-colors shrink-0">
              <X size={18} />
            </button>
          </div>
          <h2 className="text-xl font-black text-gb-text tracking-tight">{inspection.title}</h2>
          <div className="flex flex-wrap gap-2 mt-3">
            <StatusBadge status={inspection.status} />
            {score !== null && <ScorePill score={score} />}
            {inspection.project && (
              <span className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full border border-gb-border text-gb-muted bg-gb-surface-solid">
                {inspection.project.code}
              </span>
            )}
            {inspection.lot && (
              <span className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full border border-gb-border text-gb-muted bg-gb-surface-solid">
                Lot {inspection.lot.lot_number}
              </span>
            )}
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 p-6 space-y-6 overflow-y-auto">

          {/* Metadata grid */}
          <div className="grid grid-cols-2 gap-3">
            {inspection.scheduled_date && (
              <div className="bg-gb-surface-solid border border-gb-border rounded-xl p-3">
                <p className="text-[10px] font-bold text-gb-muted uppercase tracking-widest mb-1 flex items-center gap-1"><Calendar size={10} /> Planifiée</p>
                <p className="text-sm font-semibold text-gb-text">{format(new Date(inspection.scheduled_date), "d MMM yyyy", { locale: fr })}</p>
              </div>
            )}
            {inspection.completed_date && (
              <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-3">
                <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest mb-1 flex items-center gap-1"><CheckCircle2 size={10} /> Réalisée</p>
                <p className="text-sm font-semibold text-gb-text">{format(new Date(inspection.completed_date), "d MMM yyyy", { locale: fr })}</p>
              </div>
            )}
            {inspection.location && (
              <div className="bg-gb-surface-solid border border-gb-border rounded-xl p-3">
                <p className="text-[10px] font-bold text-gb-muted uppercase tracking-widest mb-1 flex items-center gap-1"><MapPin size={10} /> Localisation</p>
                <p className="text-sm font-semibold text-gb-text">{inspection.location}</p>
              </div>
            )}
            {inspection.inspector && (
              <div className="bg-gb-surface-solid border border-gb-border rounded-xl p-3">
                <p className="text-[10px] font-bold text-gb-muted uppercase tracking-widest mb-1 flex items-center gap-1"><User size={10} /> Contrôleur</p>
                <p className="text-sm font-semibold text-gb-text">{inspection.inspector.firstname} {inspection.inspector.lastname}</p>
              </div>
            )}
            {inspection.reference_norm && (
              <div className="col-span-2 bg-gb-surface-solid border border-gb-border rounded-xl p-3">
                <p className="text-[10px] font-bold text-gb-muted uppercase tracking-widest mb-1 flex items-center gap-1"><BookOpen size={10} /> Référence normative</p>
                <p className="text-sm font-semibold text-gb-text font-mono">{inspection.reference_norm}</p>
              </div>
            )}
            {inspection.date_scheduled && (
              <div className="bg-gb-surface-solid border border-gb-border rounded-xl p-3">
                <p className="text-[10px] font-bold text-gb-muted uppercase tracking-widest mb-1 flex items-center gap-1"><Calendar size={10} /> Date métier</p>
                <p className="text-sm font-semibold text-gb-text">{format(new Date(inspection.date_scheduled), "d MMM yyyy", { locale: fr })}</p>
              </div>
            )}
            {inspection.approval_workflow_status && (
              <div className="bg-gb-surface-solid border border-gb-border rounded-xl p-3">
                <p className="text-[10px] font-bold text-gb-muted uppercase tracking-widest mb-1">Workflow</p>
                <p className="text-sm font-semibold text-gb-text">{inspection.approval_workflow_status}</p>
              </div>
            )}
            {inspection.inspection_result && (
              <div className="bg-gb-surface-solid border border-gb-border rounded-xl p-3">
                <p className="text-[10px] font-bold text-gb-muted uppercase tracking-widest mb-1">Résultat global</p>
                <p className="text-sm font-semibold text-gb-text">{inspection.inspection_result}</p>
              </div>
            )}
            {(inspection.evidence_photos_required || inspection.rework_required) && (
              <div className="col-span-2 bg-gb-surface-solid border border-gb-border rounded-xl p-3">
                <p className="text-[10px] font-bold text-gb-muted uppercase tracking-widest mb-1">Indicateurs</p>
                <p className="text-sm font-semibold text-gb-text">
                  {inspection.evidence_photos_required ? "Preuves photo requises" : "Preuves photo non requises"}
                  {inspection.rework_required ? " · Reprise requise" : ""}
                </p>
              </div>
            )}
          </div>

          {inspection.description && (
            <Section title="Périmètre / Contexte">
              <p className="text-sm text-gb-text leading-relaxed whitespace-pre-wrap">{inspection.description}</p>
            </Section>
          )}

          {/* Checklist */}
          <Section title={`Points de contrôle (${inspection.items.length})`}>
            <ChecklistPanel
              items={inspection.items}
              canEdit={canEdit && canMutate}
              onItemUpdate={(itemId, result, comment) =>
                onItemUpdate(inspection.id, itemId, result, comment)
              }
            />
            {!canMutate && workflowBlockMessage && (
              <div className="mt-3 flex items-center gap-2 text-xs font-semibold text-amber-500 bg-amber-500/10 border border-amber-500/20 rounded-xl px-3 py-2">
                <AlertCircle size={14} />
                {workflowBlockMessage}
              </div>
            )}
          </Section>

          <Section title="Méta">
            <div className="text-xs text-gb-muted space-y-1">
              <p>Créé le {format(new Date(inspection.created_at), "d MMMM yyyy 'à' HH:mm", { locale: fr })}
                {inspection.createdBy && ` par ${inspection.createdBy.firstname} ${inspection.createdBy.lastname}`}
              </p>
            </div>
          </Section>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gb-border bg-gb-surface-solid/50 shrink-0 space-y-3">
          {/* Row 1 : actions principales */}
          <div className="flex items-center gap-3 flex-wrap">
            {canEdit && (
              <button
                onClick={() => { onClose(); onEdit(inspection); }}
                className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-gb-primary/30 text-gb-primary font-bold text-sm hover:bg-gb-primary/10 transition-colors"
              >
                <Pencil size={15} />
                Modifier
              </button>
            )}
            {canEdit && next && (
              <button
                onClick={() => onStatusChange(inspection.id, next)}
                disabled={!canMutate}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gb-primary text-gb-inverse font-bold text-sm hover:bg-gb-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ArrowUpRight size={15} />
                {next === "IN_PROGRESS" ? "Démarrer l'inspection" : "Valider (PASSED)"}
              </button>
            )}
            {canEdit && inspection.status === "IN_PROGRESS" && (
              <button
                onClick={() => onStatusChange(inspection.id, "FAILED")}
                disabled={!canMutate}
                className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-red-500/30 text-red-500 font-bold text-sm hover:bg-red-500/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <XCircle size={15} />
                Échouée
              </button>
            )}
            {canDelete && (
              <button
                onClick={() => { if (window.confirm("Supprimer cette inspection ?")) onDelete(inspection.id); }}
                disabled={!canMutate}
                className="p-2.5 rounded-xl border border-gb-danger/30 text-gb-danger hover:bg-gb-danger/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Trash2 size={16} />
              </button>
            )}
          </div>
          {/* Row 2 : PDF */}
          <div className="flex">
            <button
              onClick={() => downloadInspectionPdf(inspection)}
              className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-gb-border text-gb-text font-bold text-sm hover:bg-gb-surface-hover transition-colors w-full"
            >
              <FileDown size={15} className="text-red-500" />
              Télécharger le rapport PDF d'inspection
            </button>
          </div>

        </div>
      </motion.aside>
    </motion.div>
  );
}

// ─── Create / Edit Dialog ─────────────────────────────────────────────────────

interface ItemDraft {
  id?: number;
  description: string;
  category: string;
  result: string;
  comment: string;
  order: number;
}

function InspectionFormDialog({
  open, onClose, onSaved, projects, inspection
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  projects: Project[];
  inspection?: Inspection;
}) {
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [items, setItems] = useState<ItemDraft[]>([]);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;

    const loadUsers = async () => {
      const endpoints = [
        `${API_BASE}/resources/users?limit=200`,
        `${API_BASE}/rbac/users`,
      ];

      for (const endpoint of endpoints) {
        try {
          const res = await apiFetch(endpoint);
          if (!res.ok) continue;
          const data = await res.json();
          const list = Array.isArray(data) ? data : (Array.isArray(data?.data) ? data.data : []);
          if (!cancelled) {
            setUsers(list);
          }
          return;
        } catch {
          // Ignore and try the next endpoint.
        }
      }

      if (!cancelled) {
        setUsers([]);
      }
    };

    loadUsers();

    return () => {
      cancelled = true;
    };
  }, [open]);

  useEffect(() => {
    if (open) {
      if (inspection) {
        setForm({
          title:          inspection.title,
          description:    inspection.description ?? "",
          location:       inspection.location ?? "",
          reference_norm: inspection.reference_norm ?? "",
          type:           inspection.type,
          status:         inspection.status,
          project_id:     String(inspection.project?.id ?? ""),
          scheduled_date: inspection.scheduled_date ? inspection.scheduled_date.slice(0, 10) : "",
          date_scheduled: inspection.date_scheduled ? inspection.date_scheduled.slice(0, 10) : "",
          inspector_id:   String(inspection.inspector?.id ?? ""),
          checklist_template_id: inspection.checklist_template_id ? String(inspection.checklist_template_id) : "",
          inspection_result: inspection.inspection_result ?? "",
          evidence_photos_required: inspection.evidence_photos_required ? "true" : "false",
          approval_workflow_status: inspection.approval_workflow_status ?? "",
          rework_required: inspection.rework_required ? "true" : "false",
        });
        setItems(inspection.items.map(i => ({
          id:          i.id,
          description: i.description,
          category:    i.category ?? "",
          result:      i.result ?? "",
          comment:     i.comment ?? "",
          order:       i.order,
        })));
      } else {
        setForm({ ...EMPTY_FORM });
        setItems([]);
      }
      setError(null);
    }
  }, [open, inspection]);

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));
  const selectedProject = projects.find((p) => p.id === Number(form.project_id));
  const canMutateSelectedProject = !selectedProject || isInspectionPhaseAllowed(selectedProject.phase);
  const selectedProjectPhaseLabel = getProjectPhaseLabel(selectedProject?.phase);

  const addItem = () => {
    setItems(prev => [...prev, { ...EMPTY_ITEM, order: prev.length }]);
  };

  const updateItem = (idx: number, field: keyof ItemDraft, value: string | number) => {
    setItems(prev => prev.map((it, i) => i === idx ? { ...it, [field]: value } : it));
  };

  const removeItem = (idx: number) => {
    setItems(prev => prev.filter((_, i) => i !== idx).map((it, i) => ({ ...it, order: i })));
  };

  const save = async () => {
    if (!form.title.trim() || !form.project_id) {
      setError("Titre et projet sont obligatoires.");
      return;
    }
    if (!canMutateSelectedProject) {
      setError(`${INSPECTION_WORKFLOW_GUARD.reason} Phase actuelle: ${selectedProjectPhaseLabel}.`);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const body: Record<string, any> = {
        title:          form.title,
        description:    form.description || undefined,
        location:       form.location || undefined,
        reference_norm: form.reference_norm || undefined,
        type:           form.type,
        status:         form.status,
        project_id:     Number(form.project_id),
        scheduled_date: form.scheduled_date || undefined,
        date_scheduled: form.date_scheduled || undefined,
        inspector_id:   form.inspector_id ? Number(form.inspector_id) : undefined,
        checklist_template_id: form.checklist_template_id ? Number(form.checklist_template_id) : undefined,
        inspection_result: form.inspection_result || undefined,
        evidence_photos_required: form.evidence_photos_required === "true",
        approval_workflow_status: form.approval_workflow_status || undefined,
        rework_required: form.rework_required === "true",
        items: items
          .filter(i => i.description.trim())
          .map((i, idx) => ({
            ...(i.id ? { id: i.id } : {}),
            description: i.description,
            category:    i.category || undefined,
            result:      i.result   || undefined,
            comment:     i.comment  || undefined,
            order:       idx,
          })),
      };

      const url    = inspection ? `${API_BASE}/inspections/${inspection.id}` : `${API_BASE}/inspections`;
      const method = inspection ? "PUT" : "POST";
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
        {/* Dialog header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gb-border">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-blue-500/10 border border-blue-500/20 rounded-xl flex items-center justify-center">
              <ClipboardCheck size={18} className="text-blue-500" />
            </div>
            <div>
              <h3 className="text-base font-black text-gb-text">
                {inspection ? "Modifier l'inspection" : "Nouvelle inspection"}
              </h3>
              <p className="text-xs text-gb-muted">Définissez le périmètre et la checklist</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gb-muted hover:bg-gb-surface-hover transition-colors">
            Fermer
          </button>
        </div>
        {/* Dialog body */}
        <div className="overflow-y-auto flex-1 p-6 space-y-5">

          {/* Titre + Projet */}
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className={labelCls}>Titre <span className="text-red-400">*</span></label>
              <input className={inputCls} placeholder="Ex: Réception dalle R+2, zone B..." value={form.title} onChange={e => set("title", e.target.value)} />
            </div>
            <div className="col-span-2">
              <label className={labelCls}>Projet <span className="text-red-400">*</span></label>
              <select className={inputCls} value={form.project_id} onChange={e => set("project_id", e.target.value)}>
                <option value="">— Sélectionner un projet —</option>
                {projects.map(p => (
                  <option key={p.id} value={p.id} disabled={!isInspectionPhaseAllowed(p.phase)}>
                    {p.code} — {p.title}{!isInspectionPhaseAllowed(p.phase) ? ` (${getProjectPhaseLabel(p.phase)})` : ""}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {selectedProject && !canMutateSelectedProject && (
            <div className="flex items-center gap-2 text-sm text-amber-500 bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-3">
              <AlertCircle size={15} />
              {INSPECTION_WORKFLOW_GUARD.reason} Phase actuelle: {selectedProjectPhaseLabel}.
            </div>
          )}

          {/* Type + Statut + Date */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className={labelCls}>Type <span className="text-red-400">*</span></label>
              <select className={inputCls} value={form.type} onChange={e => set("type", e.target.value)}>
                {TYPES.map(t => <option key={t.value} value={t.value}>{t.icon} {t.label}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Statut</label>
              <select className={inputCls} value={form.status} onChange={e => set("status", e.target.value)}>
                {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Date planifiée</label>
              <input type="date" className={inputCls} value={form.scheduled_date} onChange={e => set("scheduled_date", e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className={labelCls}>Date métier planifiée</label>
              <input type="date" className={inputCls} value={form.date_scheduled} onChange={e => set("date_scheduled", e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>Responsable</label>
              <select className={inputCls} value={form.inspector_id} onChange={e => set("inspector_id", e.target.value)}>
                <option value="">— Non assigné —</option>
                {form.inspector_id && !users.some(u => String(u.id) === form.inspector_id) && (
                  <option value={form.inspector_id}>Utilisateur #{form.inspector_id}</option>
                )}
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {`${u.firstname ?? ""} ${u.lastname ?? ""}`.trim() || u.email || `Utilisateur ${u.id}`}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>Statut workflow</label>
              <select className={inputCls} value={form.approval_workflow_status} onChange={e => set("approval_workflow_status", e.target.value)}>
                <option value="">— Non défini —</option>
                {form.approval_workflow_status && !WORKFLOW_STATUSES.some(s => s.value === form.approval_workflow_status) && (
                  <option value={form.approval_workflow_status}>{form.approval_workflow_status}</option>
                )}
                {WORKFLOW_STATUSES.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className={labelCls}>Résultat inspection</label>
              <select className={inputCls} value={form.inspection_result} onChange={e => set("inspection_result", e.target.value)}>
                <option value="">— Non défini —</option>
                {form.inspection_result && !INSPECTION_RESULTS.some(r => r.value === form.inspection_result) && (
                  <option value={form.inspection_result}>{form.inspection_result}</option>
                )}
                {INSPECTION_RESULTS.map((r) => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>Preuves photo requises</label>
              <select className={inputCls} value={form.evidence_photos_required} onChange={e => set("evidence_photos_required", e.target.value)}>
                <option value="false">Non</option>
                <option value="true">Oui</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>Reprise requise</label>
              <select className={inputCls} value={form.rework_required} onChange={e => set("rework_required", e.target.value)}>
                <option value="false">Non</option>
                <option value="true">Oui</option>
              </select>
            </div>
          </div>

          {/* Location + Ref norme */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Localisation</label>
              <input className={inputCls} placeholder="R+3, Cage A, Zone Nord..." value={form.location} onChange={e => set("location", e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>Référence normative</label>
              <input className={inputCls} placeholder="DTU 20.1, Eurocode 2, Art. 3.2 CCTP..." value={form.reference_norm} onChange={e => set("reference_norm", e.target.value)} />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className={labelCls}>Périmètre / contexte <span className="text-gb-muted font-normal">(optionnel)</span></label>
            <textarea className={`${inputCls} resize-none`} rows={2} placeholder="Décrivez le périmètre, les enjeux ou le contexte de cette inspection..." value={form.description} onChange={e => set("description", e.target.value)} />
          </div>

          {/* ─── Checklist items ─────────────────────────────────────────── */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className={labelCls.replace("mb-1.5", "mb-0")}>Points de contrôle <span className="text-gb-muted font-normal normal-case tracking-normal">({items.length})</span></p>
              </div>
              <button
                type="button"
                onClick={addItem}
                className="flex items-center gap-1.5 text-xs font-bold text-gb-primary border border-gb-primary/20 bg-gb-primary/5 hover:bg-gb-primary/10 px-3 py-1.5 rounded-xl transition-colors"
              >
                <Plus size={13} /> Ajouter un point
              </button>
            </div>

            <div className="space-y-2.5">
              <AnimatePresence>
                {items.map((item, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    className="bg-gb-app border border-gb-border rounded-xl p-3 space-y-2.5"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black text-gb-muted/50 w-4 text-center shrink-0">#{idx + 1}</span>
                      <input
                        className={`${inputCls} flex-1`}
                        placeholder="Point à contrôler (ex: Coffrage conforme au plan N°...)..."
                        value={item.description}
                        onChange={e => updateItem(idx, "description", e.target.value)}
                      />
                      <button
                        type="button"
                        onClick={() => removeItem(idx)}
                        className="p-1.5 rounded-lg text-gb-muted hover:text-gb-danger hover:bg-gb-danger/10 transition-colors shrink-0"
                      >
                        <X size={14} />
                      </button>
                    </div>
                    <div className="flex gap-2 pl-6">
                      <input
                        className={`${inputCls} flex-1`}
                        placeholder="Catégorie (Structure, Étanchéité...)"
                        value={item.category}
                        onChange={e => updateItem(idx, "category", e.target.value)}
                      />
                      <select
                        className={`${inputCls} w-40 shrink-0`}
                        value={item.result}
                        onChange={e => updateItem(idx, "result", e.target.value)}
                      >
                        <option value="">Résultat...</option>
                        {ITEM_RESULTS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                      </select>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            {items.length === 0 && (
              <div
                onClick={addItem}
                className="border-2 border-dashed border-gb-border rounded-xl p-6 text-center cursor-pointer hover:border-gb-primary/40 hover:bg-gb-primary/5 transition-colors group"
              >
                <ListChecks size={24} className="mx-auto mb-2 text-gb-muted group-hover:text-gb-primary transition-colors" />
                <p className="text-sm text-gb-muted group-hover:text-gb-text transition-colors">Cliquez pour ajouter des points de contrôle</p>
              </div>
            )}
          </div>

          {error && (
            <div className="flex items-center gap-2 text-sm text-gb-danger bg-gb-danger/10 border border-gb-danger/20 rounded-xl px-4 py-3">
              <AlertCircle size={15} /> {error}
            </div>
          )}
        </div>

        {/* Dialog footer */}
        <div className="px-6 py-4 border-t border-gb-border flex items-center justify-between gap-3 bg-gb-app/30">
          <p className="text-xs text-gb-muted">{items.filter(i => i.description.trim()).length} point{items.filter(i => i.description.trim()).length !== 1 ? "s" : ""} de contrôle</p>
          <div className="flex gap-3">
            <button onClick={onClose} className="px-5 py-2.5 rounded-xl text-sm font-semibold text-gb-muted hover:text-gb-text hover:bg-gb-surface-hover transition-colors">
              Annuler
            </button>
            <button
              onClick={save}
              disabled={saving || !canMutateSelectedProject}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gb-primary text-gb-inverse font-bold text-sm hover:bg-gb-primary/90 transition-colors disabled:opacity-50"
            >
              {saving ? <Loader2 size={15} className="animate-spin" /> : <ClipboardCheck size={15} />}
              {saving ? "Enregistrement..." : inspection ? "Mettre à jour" : "Créer l'inspection"}
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Inspection Row (table) ────────────────────────────────────────────────────

function InspectionRow({ inspection, onClick }: { inspection: Inspection; onClick: () => void }) {
  const type   = getTypeMeta(inspection.type);
  const status = getStatusMeta(inspection.status);
  const StatusIcon = status.icon;
  const score  = computeScore(inspection.items);
  const failCount = inspection.items.filter(i => i.result === "FAIL").length;

  return (
    <motion.tr
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      className="border-b border-gb-border hover:bg-gb-surface-hover/50 cursor-pointer transition-colors group"
      onClick={onClick}
    >
      {/* Type indicator bar */}
      <td className="py-3 pl-4 pr-2 w-1">
        <span className={`block w-1 h-8 rounded-full ${
          inspection.status === "PASSED" ? "bg-emerald-500"
          : inspection.status === "FAILED" ? "bg-red-500"
          : inspection.status === "IN_PROGRESS" ? "bg-blue-500"
          : "bg-slate-400/50"
        }`} />
      </td>

      {/* Icon + Titre */}
      <td className="py-3 pr-4">
        <div className="flex items-start gap-2.5">
          <span className="text-xl leading-none mt-0.5">{type.icon}</span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gb-text truncate group-hover:text-gb-primary transition-colors">
              {inspection.title}
            </p>
            <p className="text-xs text-gb-muted mt-0.5 flex items-center gap-1.5">
              {inspection.project && <span className="font-mono">{inspection.project.code}</span>}
              {inspection.location && (
                <><span className="text-gb-muted/30">·</span><MapPin size={10} /><span>{inspection.location}</span></>
              )}
            </p>
          </div>
        </div>
      </td>

      {/* Type badge */}
      <td className="py-3 pr-4 hidden lg:table-cell">
        <TypeBadge type={inspection.type} />
      </td>

      {/* Statut */}
      <td className="py-3 pr-4">
        <StatusBadge status={inspection.status} />
      </td>

      {/* Score */}
      <td className="py-3 pr-4 hidden md:table-cell">
        {score !== null ? (
          <div className="flex items-center gap-2">
            <ScorePill score={score} />
            {failCount > 0 && (
              <span className="text-xs text-red-500 flex items-center gap-1">
                <AlertTriangle size={11} />{failCount}
              </span>
            )}
          </div>
        ) : (
          <span className="text-xs text-gb-muted">
            {inspection.items.length > 0 ? `${inspection.items.length} pts` : "—"}
          </span>
        )}
      </td>

      {/* Date planifiée */}
      <td className="py-3 pr-4 hidden xl:table-cell">
        {inspection.scheduled_date ? (
          <span className="text-xs text-gb-muted flex items-center gap-1">
            <Calendar size={11} />{format(new Date(inspection.scheduled_date), "d MMM yyyy", { locale: fr })}
          </span>
        ) : <span className="text-gb-muted text-xs">—</span>}
      </td>

      {/* Contrôleur */}
      <td className="py-3 pr-4 hidden xl:table-cell">
        {inspection.inspector ? (
          <span className="text-xs text-gb-muted flex items-center gap-1">
            <User size={11} />{inspection.inspector.firstname} {inspection.inspector.lastname}
          </span>
        ) : <span className="text-gb-muted text-xs">—</span>}
      </td>

      {/* Chevron */}
      <td className="py-3 pr-4 w-8">
        <ChevronRight size={16} className="text-gb-muted/40 group-hover:text-gb-muted transition-colors" />
      </td>
    </motion.tr>
  );
}

// ─── Main View ────────────────────────────────────────────────────────────────

export default function InspectionsView() {
  const { can } = usePermissions();
  const canCreate = can("inspection:create");
  const canEdit   = can("inspection:update");
  const canDelete = can("inspection:delete");

  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [workflowNotice, setWorkflowNotice] = useState<string | null>(null);

  const [filterProject, setFilterProject] = useState("");
  const [filterStatus,  setFilterStatus]  = useState("");
  const [filterType,    setFilterType]    = useState("");

  const [selected,  setSelected]  = useState<Inspection | null>(null);
  const [editing,   setEditing]   = useState<Inspection | undefined>(undefined);
  const [showForm,  setShowForm]  = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (filterProject) params.set("project_id", filterProject);
      if (filterStatus)  params.set("status",      filterStatus);
      if (filterType)    params.set("type",         filterType);

      const res = await apiFetch(`${API_BASE}/inspections?${params.toString()}`);
      if (!res.ok) throw new Error("Erreur de chargement");
      const data = await res.json();
      setInspections(Array.isArray(data) ? data : []);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [filterProject, filterStatus, filterType]);

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
    const current = inspections.find((i) => i.id === id);
    const projectPhase = current?.project?.id
      ? projects.find((p) => p.id === current.project?.id)?.phase
      : null;
    if (!isInspectionPhaseAllowed(projectPhase)) {
      setWorkflowNotice(`${INSPECTION_WORKFLOW_GUARD.reason} Phase actuelle: ${getProjectPhaseLabel(projectPhase)}.`);
      return;
    }
    try {
      const res = await apiFetch(`${API_BASE}/inspections/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, ...(status === "PASSED" || status === "FAILED" ? { completed_date: new Date().toISOString() } : {}) }),
      });
      if (!res.ok) throw new Error();
      const updated = await res.json();
      setInspections(prev => prev.map(i => i.id === id ? updated : i));
      if (selected?.id === id) setSelected(updated);
      setWorkflowNotice(null);
    } catch {}
  };

  const handleDelete = async (id: number) => {
    const current = inspections.find((i) => i.id === id);
    const projectPhase = current?.project?.id
      ? projects.find((p) => p.id === current.project?.id)?.phase
      : null;
    if (!isInspectionPhaseAllowed(projectPhase)) {
      setWorkflowNotice(`${INSPECTION_WORKFLOW_GUARD.reason} Phase actuelle: ${getProjectPhaseLabel(projectPhase)}.`);
      return;
    }
    try {
      await apiFetch(`${API_BASE}/inspections/${id}`, { method: "DELETE" });
      setInspections(prev => prev.filter(i => i.id !== id));
      setSelected(null);
      setWorkflowNotice(null);
    } catch {}
  };

  const handleItemUpdate = async (inspectionId: number, itemId: number, result: string, comment: string) => {
    const current = inspections.find((i) => i.id === inspectionId);
    const projectPhase = current?.project?.id
      ? projects.find((p) => p.id === current.project?.id)?.phase
      : null;
    if (!isInspectionPhaseAllowed(projectPhase)) {
      setWorkflowNotice(`${INSPECTION_WORKFLOW_GUARD.reason} Phase actuelle: ${getProjectPhaseLabel(projectPhase)}.`);
      return;
    }
    try {
      const inspection = inspections.find(i => i.id === inspectionId);
      if (!inspection) return;
      const updatedItems = inspection.items.map(it =>
        it.id === itemId ? { ...it, result, comment } : it
      );
      const res = await apiFetch(`${API_BASE}/inspections/${inspectionId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: updatedItems }),
      });
      if (!res.ok) throw new Error();
      const updated = await res.json();
      setInspections(prev => prev.map(i => i.id === inspectionId ? updated : i));
      if (selected?.id === inspectionId) setSelected(updated);
      setWorkflowNotice(null);
    } catch {}
  };

  const openCreate = () => { setEditing(undefined); setShowForm(true); };
  const openEdit   = (insp: Inspection) => { setEditing(insp); setShowForm(true); };

  // ─── KPI computations ────────────────────────────────────────────────────
  const total      = inspections.length;
  const scheduled  = inspections.filter(i => i.status === "SCHEDULED").length;
  const inProgress = inspections.filter(i => i.status === "IN_PROGRESS").length;
  const passed     = inspections.filter(i => i.status === "PASSED").length;
  const failed     = inspections.filter(i => i.status === "FAILED").length;
  const avgScore   = (() => {
    const withScore = inspections
      .map(i => computeScore(i.items))
      .filter((s): s is number => s !== null);
    if (!withScore.length) return null;
    return Math.round(withScore.reduce((a, b) => a + b, 0) / withScore.length);
  })();

  const activeFilters = [filterProject, filterStatus, filterType].filter(Boolean).length;

  return (
    <div className="space-y-6">
      {/* ─── Page header ─────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-gb-text flex items-center gap-2.5">
            <ClipboardCheck size={24} className="text-gb-primary" />
            Inspections qualité
          </h1>
          <p className="text-sm text-gb-muted mt-0.5">Points d'arrêt, réceptions et contrôles qualité sur le terrain</p>
        </div>
        {canCreate && (
          <button
            onClick={openCreate}
            className="flex items-center gap-2 px-5 py-2.5 bg-gb-primary text-gb-inverse font-bold text-sm rounded-xl hover:bg-gb-primary/90 transition-colors shadow-sm shadow-gb-primary/20"
          >
            <Plus size={16} /> Nouvelle inspection
          </button>
        )}
      </div>

      {/* ─── KPIs ─────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
        <KpiCard label="Total" value={total} icon={ClipboardCheck} accent="bg-gb-primary/10 text-gb-primary" sub={`${inProgress} en cours`} />
        <KpiCard label="Programmées" value={scheduled} icon={Clock} accent="bg-slate-400/10 text-slate-400" />
        <KpiCard label="Validées" value={passed} icon={CheckCircle2} accent="bg-emerald-500/10 text-emerald-500" sub={avgScore !== null ? `Score moyen ${avgScore}%` : undefined} />
        <KpiCard label="Échouées" value={failed} icon={XCircle} accent="bg-red-500/10 text-red-500" />
        <KpiCard label="Score moyen" value={avgScore !== null ? `${avgScore}%` : "—"} icon={BarChart2} accent="bg-purple-500/10 text-purple-500" />
      </div>

      {/* ─── Failed alert banner ──────────────────────────────────────────── */}
      <AnimatePresence>
        {failed > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="flex items-center gap-3 px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-xl"
          >
            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse shrink-0" />
            <p className="text-sm font-semibold text-red-500">
              {failed} inspection{failed > 1 ? "s" : ""} échouée{failed > 1 ? "s" : ""} — des points de non-conformité nécessitent une action corrective.
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

      {/* ─── Filters ──────────────────────────────────────────────────────── */}
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
          value={filterType}
          onChange={e => setFilterType(e.target.value)}
        >
          <option value="">Tous les types</option>
          {TYPES.map(t => <option key={t.value} value={t.value}>{t.icon} {t.label}</option>)}
        </select>

        {activeFilters > 0 && (
          <button
            onClick={() => { setFilterProject(""); setFilterStatus(""); setFilterType(""); }}
            className="flex items-center gap-1.5 text-xs font-semibold text-gb-muted hover:text-gb-danger border border-gb-border hover:border-gb-danger/30 px-3 py-2 rounded-xl transition-colors"
          >
            <X size={12} /> Réinitialiser ({activeFilters})
          </button>
        )}

        <span className="ml-auto text-xs text-gb-muted font-semibold">
          {inspections.length} résultat{inspections.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* ─── Table ────────────────────────────────────────────────────────── */}
      <div className="bg-gb-surface-solid border border-gb-border rounded-2xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-24 gap-3 text-gb-muted">
            <Loader2 size={20} className="animate-spin" />
            <span className="text-sm">Chargement des inspections...</span>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center py-24 gap-3 text-gb-danger">
            <AlertCircle size={20} />
            <span className="text-sm">{error}</span>
          </div>
        ) : inspections.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3 text-gb-muted">
            <ClipboardCheck size={40} className="opacity-20" />
            <p className="text-sm font-semibold">Aucune inspection trouvée</p>
            {canCreate && (
              <button
                onClick={openCreate}
                className="flex items-center gap-2 text-sm text-gb-primary font-bold hover:underline mt-1"
              >
                <Plus size={14} /> Créer la première
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gb-border">
                  <th className="py-3 pl-4 pr-2 w-1" />
                  <th className="py-3 pr-4 text-left text-[10px] font-black text-gb-muted uppercase tracking-widest">Inspection</th>
                  <th className="py-3 pr-4 text-left text-[10px] font-black text-gb-muted uppercase tracking-widest hidden lg:table-cell">Type</th>
                  <th className="py-3 pr-4 text-left text-[10px] font-black text-gb-muted uppercase tracking-widest">Statut</th>
                  <th className="py-3 pr-4 text-left text-[10px] font-black text-gb-muted uppercase tracking-widest hidden md:table-cell">Score</th>
                  <th className="py-3 pr-4 text-left text-[10px] font-black text-gb-muted uppercase tracking-widest hidden xl:table-cell">Planifiée</th>
                  <th className="py-3 pr-4 text-left text-[10px] font-black text-gb-muted uppercase tracking-widest hidden xl:table-cell">Contrôleur</th>
                  <th className="py-3 pr-4 w-8" />
                </tr>
              </thead>
              <tbody>
                <AnimatePresence>
                  {inspections.map(insp => (
                    <InspectionRow
                      key={insp.id}
                      inspection={insp}
                      onClick={() => setSelected(insp)}
                    />
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ─── Detail Drawer ─────────────────────────────────────────────────── */}
      <AnimatePresence>
        {selected && (
          <InspectionDetailDrawer
            inspection={selected}
            onClose={() => setSelected(null)}
            onEdit={(insp) => { setSelected(null); openEdit(insp); }}
            onStatusChange={handleStatusChange}
            onDelete={handleDelete}
            onItemUpdate={handleItemUpdate}
            canEdit={canEdit}
            canDelete={canDelete}
            canMutate={isInspectionPhaseAllowed(projects.find((p) => p.id === selected.project?.id)?.phase)}
            workflowBlockMessage={selected.project?.id
              ? `${INSPECTION_WORKFLOW_GUARD.reason} Phase actuelle: ${getProjectPhaseLabel(projects.find((p) => p.id === selected.project?.id)?.phase)}.`
              : INSPECTION_WORKFLOW_GUARD.reason}
          />
        )}
      </AnimatePresence>

      {/* ─── Create / Edit Form ────────────────────────────────────────────── */}
      <AnimatePresence>
        {showForm && (
          <InspectionFormDialog
            open={showForm}
            onClose={() => setShowForm(false)}
            onSaved={() => { load(); }}
            projects={projects}
            inspection={editing}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
