import React, { useState, useEffect, useCallback } from "react";
import {
  ClipboardSignature, Plus, X, Loader2, AlertCircle, CheckCircle2,
  XCircle, Clock, Calendar, ChevronRight, Pencil, Trash2,
  AlertTriangle, Ban, RefreshCcw, CheckCheck, CalendarClock,
  CalendarCheck, Banknote, Link2, User, ShieldCheck, Download,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { apiFetch, API_BASE } from "../../lib/api";
import { usePermissions } from "../../contexts/AuthContext";
import { format, addMonths, differenceInDays } from "date-fns";
import { fr } from "date-fns/locale";

// ─── Types ────────────────────────────────────────────────────────────────────

interface WorkAcceptance {
  id: number;
  reference?: string;
  title?: string;
  type: string;
  status: string;
  planned_date?: string;
  inspection_date?: string;
  accepted_at?: string;
  contra_visit_date?: string;
  warranty_months: number;
  warranty_end_date?: string;
  amount_accepted?: number;
  penalty_amount?: number;
  reserve_count: number;
  notes?: string;
  observations?: string;
  reserves_text?: string;
  attendees?: string;
  signed_by_owner: boolean;
  signed_by_contractor: boolean;
  document_id?: number;
  document?: { id: number; name?: string; file_url?: string; file_name?: string } | null;
  created_at: string;
  updated_at: string;
  project?: { id: number; code: string; title: string };
  lot?: { id: number; lot_number: string; name: string } | null;
  createdBy?: { id: number; firstname: string; lastname: string } | null;
  inspector?: { id: number; firstname: string; lastname: string } | null;
}

interface ProjectReceptionsTabProps {
  projectId: number;
  lots: Array<{ id: number; lot_number: string; name: string }>;
  onRefresh: () => void;
}

// ─── Config ───────────────────────────────────────────────────────────────────

const TYPES = [
  {
    value: "PROVISIONAL", label: "Réception provisoire", short: "RP",
    color: "text-amber-500", bg: "bg-amber-500/10",
    badge: "bg-amber-500/10 border-amber-500/20 text-amber-500",
  },
  {
    value: "FINAL", label: "Réception définitive", short: "RD",
    color: "text-emerald-500", bg: "bg-emerald-500/10",
    badge: "bg-emerald-500/10 border-emerald-500/20 text-emerald-500",
  },
];

const STATUSES = [
  { value: "PENDING",                label: "En attente",       icon: Clock,         badge: "bg-slate-400/10 border-slate-400/20 text-slate-400" },
  { value: "SCHEDULED",              label: "Planifiée",        icon: CalendarClock, badge: "bg-blue-400/10 border-blue-400/20 text-blue-400" },
  { value: "IN_PROGRESS",            label: "Visite en cours",  icon: RefreshCcw,    badge: "bg-purple-500/10 border-purple-500/20 text-purple-500" },
  { value: "ACCEPTED",               label: "Réceptionnée",     icon: CheckCircle2,  badge: "bg-emerald-500/10 border-emerald-500/20 text-emerald-500" },
  { value: "ACCEPTED_WITH_RESERVES", label: "Avec réserves",    icon: AlertTriangle, badge: "bg-amber-500/10 border-amber-500/20 text-amber-500" },
  { value: "REFUSED",                label: "Refusée",          icon: XCircle,       badge: "bg-red-500/10 border-red-500/20 text-red-500" },
  { value: "WITHDRAWN",              label: "Retirée",          icon: Ban,           badge: "bg-slate-400/10 border-slate-400/20 text-slate-400" },
];

const NEXT_STATUS: Record<string, { next: string; label: string; icon: React.FC<any> } | null> = {
  PENDING:               { next: "SCHEDULED",   label: "Planifier la visite", icon: CalendarClock },
  SCHEDULED:             { next: "IN_PROGRESS", label: "Démarrer la visite",  icon: RefreshCcw },
  IN_PROGRESS:           { next: "ACCEPTED",    label: "Réceptionner",        icon: CheckCircle2 },
  ACCEPTED:              null,
  ACCEPTED_WITH_RESERVES:null,
  REFUSED:               { next: "SCHEDULED",   label: "Reprogrammer",        icon: CalendarClock },
  WITHDRAWN:             null,
};

const EMPTY_FORM = {
  title: "", reference: "", type: "PROVISIONAL", status: "PENDING",
  lot_id: "", planned_date: "", notes: "", observations: "",
  reserves_text: "", amount_accepted: "", penalty_amount: "",
  reserve_count: "0", warranty_months: "12", document_id: "",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getTypeMeta(v: string) { return TYPES.find(t => t.value === v) ?? TYPES[0]; }
function getStatusMeta(v: string) { return STATUSES.find(s => s.value === v) ?? STATUSES[0]; }

function fmtDate(d?: string | null): string {
  if (!d) return "—";
  try { return format(new Date(d), "d MMM yyyy", { locale: fr }); } catch { return "—"; }
}

function fmtCurrency(n?: number | null): string {
  if (n == null) return "—";
  return new Intl.NumberFormat("fr-FR", { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n) + " FCFA";
}

// ─── Badges ───────────────────────────────────────────────────────────────────

function TypeBadge({ type }: { type: string }) {
  const m = getTypeMeta(type);
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full border ${m.badge}`}>
      {m.short} — {m.label}
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

function SignaturePill({ label, signed }: { label: string; signed: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border ${
      signed
        ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500"
        : "bg-gb-surface-hover border-gb-border text-gb-muted"
    }`}>
      {signed ? <CheckCheck size={11} /> : <Clock size={11} />}
      {label}
    </span>
  );
}

// ─── Warranty Timeline ────────────────────────────────────────────────────────

function WarrantyTimeline({ wa }: { wa: WorkAcceptance }) {
  if (!wa.accepted_at) return null;
  const start     = new Date(wa.accepted_at);
  const end       = wa.warranty_end_date ? new Date(wa.warranty_end_date) : addMonths(start, wa.warranty_months);
  const now       = new Date();
  const totalDays = differenceInDays(end, start);
  const elapsed   = Math.min(differenceInDays(now, start), totalDays);
  const pct       = totalDays > 0 ? Math.round((elapsed / totalDays) * 100) : 0;
  const remaining = Math.max(differenceInDays(end, now), 0);
  const expired   = now > end;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs">
        <span className="font-bold text-gb-muted uppercase tracking-widest">Garantie de parfait achèvement (GPA)</span>
        <span className={`font-black ${expired ? "text-red-500" : "text-gb-text"}`}>
          {expired ? "Expirée" : `${remaining} j restants`}
        </span>
      </div>
      <div className="w-full h-2 bg-gb-border rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          className={`h-full rounded-full ${expired ? "bg-red-500" : pct > 75 ? "bg-amber-500" : "bg-emerald-500"}`}
        />
      </div>
      <div className="flex justify-between text-[10px] text-gb-muted">
        <span>{fmtDate(wa.accepted_at)}</span>
        <span className="font-semibold">{wa.warranty_months} mois</span>
        <span>{fmtDate(end.toISOString())}</span>
      </div>
    </div>
  );
}

// ─── Detail Drawer ────────────────────────────────────────────────────────────

function ReceptionDetailDrawer({
  wa, onClose, onStatusChange, onDelete, onEdit, onGeneratePdf, canEdit, canDelete,
}: {
  wa: WorkAcceptance;
  onClose: () => void;
  onStatusChange: (id: number, status: string) => void;
  onDelete: (id: number) => void;
  onEdit: (wa: WorkAcceptance) => void;
  onGeneratePdf: (wa: WorkAcceptance) => void;
  canEdit: boolean;
  canDelete: boolean;
}) {
  const typeMeta   = getTypeMeta(wa.type);
  const nextStep   = NEXT_STATUS[wa.status];
  const isAccepted = wa.status === "ACCEPTED" || wa.status === "ACCEPTED_WITH_RESERVES";

  const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div>
      <p className="text-[10px] font-black text-gb-muted uppercase tracking-widest mb-2">{title}</p>
      {children}
    </div>
  );

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
        className="w-full max-w-2xl bg-gb-app border-l border-gb-border h-full overflow-y-auto flex flex-col shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-gb-border bg-gb-surface-solid/50 shrink-0">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex items-center gap-2 flex-wrap">
              <ClipboardSignature size={18} className={typeMeta.color} />
              <span className={`text-xs font-black uppercase tracking-widest ${typeMeta.color}`}>{typeMeta.label}</span>
              {wa.reference && (
                <><span className="text-gb-muted/30">·</span>
                <span className="text-xs font-mono text-gb-muted">{wa.reference}</span></>
              )}
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              {canEdit && (
                <button onClick={() => { onClose(); onEdit(wa); }}
                  className="p-1.5 rounded-lg text-gb-muted hover:text-gb-text hover:bg-gb-surface-hover transition-colors" title="Modifier">
                  <Pencil size={16} />
                </button>
              )}
              <button onClick={onClose}
                className="p-1.5 rounded-lg text-gb-muted hover:text-gb-text hover:bg-gb-surface-hover transition-colors">
                <X size={18} />
              </button>
            </div>
          </div>
          <h2 className="text-xl font-black text-gb-text tracking-tight mb-3">
            {wa.title || `PV de réception ${wa.reference ? `— ${wa.reference}` : ""}`}
          </h2>
          <div className="flex flex-wrap gap-2">
            <TypeBadge type={wa.type} />
            <StatusBadge status={wa.status} />
            {wa.lot && (
              <span className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full border border-gb-border text-gb-muted bg-gb-surface-solid">
                Lot {wa.lot.lot_number} — {wa.lot.name}
              </span>
            )}
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 p-6 space-y-6 overflow-y-auto">

          {/* Signatures */}
          <Section title="État des signatures">
            <div className="flex flex-wrap gap-2">
              <SignaturePill label="MOA (Maître d'ouvrage)" signed={wa.signed_by_owner} />
              <SignaturePill label="Entreprise"             signed={wa.signed_by_contractor} />
            </div>
          </Section>

          {/* Dates */}
          <Section title="Calendrier">
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Visite prévue",    value: wa.planned_date,      icon: CalendarClock, highlight: false },
                { label: "Visite effective", value: wa.inspection_date,   icon: Calendar,      highlight: false },
                { label: "Date réception",   value: wa.accepted_at,       icon: CalendarCheck, highlight: isAccepted },
                { label: "Contre-visite",    value: wa.contra_visit_date, icon: RefreshCcw,    highlight: false },
              ].filter(i => !!i.value).map(({ label, value, icon: Icon, highlight }) => (
                <div key={label} className={`rounded-xl p-3 border ${highlight ? "bg-emerald-500/5 border-emerald-500/20" : "bg-gb-surface-solid border-gb-border"}`}>
                  <p className={`text-[10px] font-bold uppercase tracking-widest mb-1 flex items-center gap-1 ${highlight ? "text-emerald-500" : "text-gb-muted"}`}>
                    <Icon size={10} /> {label}
                  </p>
                  <p className={`text-sm font-semibold ${highlight ? "text-emerald-500" : "text-gb-text"}`}>{fmtDate(value)}</p>
                </div>
              ))}
            </div>
          </Section>

          {/* GPA */}
          {isAccepted && (
            <div className="bg-gb-surface-solid border border-gb-border rounded-xl p-4">
              <WarrantyTimeline wa={wa} />
            </div>
          )}

          {/* Financier */}
          {(wa.amount_accepted != null || wa.penalty_amount != null) && (
            <Section title="Éléments financiers">
              <div className="grid grid-cols-2 gap-3">
                {wa.amount_accepted != null && (
                  <div className="bg-gb-surface-solid border border-gb-border rounded-xl p-3">
                    <p className="text-[10px] font-bold text-gb-muted uppercase tracking-widest mb-1 flex items-center gap-1">
                      <Banknote size={10} /> Montant réceptionné
                    </p>
                    <p className="text-sm font-black text-gb-text">{fmtCurrency(wa.amount_accepted)}</p>
                  </div>
                )}
                {wa.penalty_amount != null && (
                  <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-3">
                    <p className="text-[10px] font-bold text-red-500 uppercase tracking-widest mb-1 flex items-center gap-1">
                      <Ban size={10} /> Pénalités déduites
                    </p>
                    <p className="text-sm font-black text-red-500">{fmtCurrency(wa.penalty_amount)}</p>
                  </div>
                )}
              </div>
            </Section>
          )}

          {/* Réserves */}
          {(wa.reserve_count > 0 || wa.reserves_text) && (
            <Section title={`Réserves (${wa.reserve_count})`}>
              {wa.reserves_text && (
                <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-4">
                  <p className="text-sm text-gb-text whitespace-pre-wrap leading-relaxed">{wa.reserves_text}</p>
                </div>
              )}
            </Section>
          )}

          {/* Observations */}
          {wa.observations && (
            <Section title="Compte-rendu de visite">
              <p className="text-sm text-gb-text leading-relaxed whitespace-pre-wrap">{wa.observations}</p>
            </Section>
          )}

          {/* Notes */}
          {wa.notes && (
            <Section title="Notes internes">
              <p className="text-sm text-gb-text leading-relaxed whitespace-pre-wrap">{wa.notes}</p>
            </Section>
          )}

          {/* Document PV */}
          {wa.document?.file_url && (
            <Section title="PV signé">
              <a href={wa.document.file_url} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm font-semibold text-gb-primary hover:underline">
                <Link2 size={14} /> {wa.document.file_name || wa.document.name || "Ouvrir le PV"}
              </a>
            </Section>
          )}

          {/* Inspecteur */}
          {wa.inspector && (
            <Section title="Inspecteur / Maître d'œuvre">
              <p className="text-sm font-semibold text-gb-text flex items-center gap-2">
                <User size={14} className="text-gb-muted" />
                {wa.inspector.firstname} {wa.inspector.lastname}
              </p>
            </Section>
          )}

          {/* Méta */}
          <Section title="Méta">
            <p className="text-xs text-gb-muted">
              Créé le {format(new Date(wa.created_at), "d MMMM yyyy 'à' HH:mm", { locale: fr })}
              {wa.createdBy && ` par ${wa.createdBy.firstname} ${wa.createdBy.lastname}`}
            </p>
          </Section>
        </div>

        {/* Footer actions */}
        <div className="p-6 border-t border-gb-border bg-gb-surface-solid/50 shrink-0 flex items-center gap-3 flex-wrap">
          <button
            onClick={() => onGeneratePdf(wa)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gb-border text-gb-text font-bold text-sm hover:bg-gb-surface-hover transition-colors"
          >
            <Download size={15} /> Generer PDF
          </button>
          {canEdit && nextStep && (
            <button
              onClick={() => onStatusChange(wa.id, nextStep.next)}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gb-primary text-gb-inverse font-bold text-sm hover:bg-gb-primary/90 transition-colors min-w-0"
            >
              <nextStep.icon size={15} />
              {nextStep.label}
            </button>
          )}
          {canEdit && wa.status === "IN_PROGRESS" && (
            <>
              <button
                onClick={() => onStatusChange(wa.id, "ACCEPTED_WITH_RESERVES")}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-amber-500/30 text-amber-500 font-bold text-sm hover:bg-amber-500/10 transition-colors"
              >
                <AlertTriangle size={15} /> Avec réserves
              </button>
              <button
                onClick={() => onStatusChange(wa.id, "REFUSED")}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-red-500/30 text-red-500 font-bold text-sm hover:bg-red-500/10 transition-colors"
              >
                <XCircle size={15} /> Refuser
              </button>
            </>
          )}
          {canDelete && (
            <button
              onClick={() => { if (window.confirm("Supprimer ce PV de réception ?")) onDelete(wa.id); }}
              className="p-2.5 rounded-xl border border-gb-danger/30 text-gb-danger hover:bg-gb-danger/10 transition-colors"
              title="Supprimer"
            >
              <Trash2 size={16} />
            </button>
          )}
        </div>
      </motion.aside>
    </motion.div>
  );
}

// ─── Form Dialog ──────────────────────────────────────────────────────────────

function ReceptionFormDialog({
  open, onClose, onSaved, projectId, lots, wa,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  projectId: number;
  lots: Array<{ id: number; lot_number: string; name: string }>;
  wa?: WorkAcceptance;
}) {
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [error, setError]   = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    if (wa) {
      setForm({
        title:           wa.title          ?? "",
        reference:       wa.reference      ?? "",
        type:            wa.type,
        status:          wa.status,
        lot_id:          String(wa.lot?.id ?? ""),
        planned_date:    wa.planned_date     ? wa.planned_date.slice(0, 10)    : "",
        notes:           wa.notes           ?? "",
        observations:    wa.observations    ?? "",
        reserves_text:   wa.reserves_text   ?? "",
        amount_accepted: wa.amount_accepted != null ? String(wa.amount_accepted) : "",
        penalty_amount:  wa.penalty_amount  != null ? String(wa.penalty_amount)  : "",
        reserve_count:   String(wa.reserve_count ?? 0),
        warranty_months: String(wa.warranty_months ?? 12),
        document_id:     wa.document_id != null ? String(wa.document_id) : "",
      });
    } else {
      setForm({ ...EMPTY_FORM });
    }
    setSelectedFiles([]);
    setError(null);
  }, [open, wa]);

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const uploadDocuments = async () => {
    if (selectedFiles.length === 0) return [] as number[];
    const fd = new FormData();
    selectedFiles.forEach((f) => fd.append("files", f));
    fd.append("project_id", String(projectId));
    fd.append("category", "QUALITY");
    fd.append("phase", "RECEPTION");
    setUploading(true);
    try {
      const res = await apiFetch(`${API_BASE}/documents/uploads`, { method: "POST", body: fd });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.error || `Erreur upload (${res.status})`);
      }
      const body = await res.json().catch(() => ({}));
      const files = Array.isArray(body?.files) ? body.files : [];
      return files
        .map((f: any) => Number(f.documentId ?? f.id))
        .filter((id: number) => Number.isFinite(id) && id > 0);
    } finally {
      setUploading(false);
    }
  };

  const save = async () => {
    setSaving(true); setError(null);
    try {
      const uploadedIds = await uploadDocuments();
      const body: Record<string, any> = {
        type:            form.type,
        status:          form.status,
        project_id:      projectId,
        warranty_months: Number(form.warranty_months) || 12,
        reserve_count:   Number(form.reserve_count)   || 0,
      };
      if (form.title)          body.title          = form.title;
      if (form.reference)      body.reference      = form.reference;
      if (form.lot_id)         body.lot_id         = Number(form.lot_id);
      if (form.planned_date)   body.planned_date   = form.planned_date;
      if (form.notes)          body.notes          = form.notes;
      if (form.observations)   body.observations   = form.observations;
      if (form.reserves_text)  body.reserves_text  = form.reserves_text;
      if (form.amount_accepted)body.amount_accepted= Number(form.amount_accepted);
      if (form.penalty_amount) body.penalty_amount = Number(form.penalty_amount);
      body.document_id = uploadedIds[0] || (form.document_id ? Number(form.document_id) : undefined);

      const url    = wa ? `${API_BASE}/work-acceptances/${wa.id}` : `${API_BASE}/work-acceptances`;
      const method = wa ? "PUT" : "POST";
      const res = await apiFetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error || "Erreur serveur"); }
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
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <motion.div
        initial={{ scale: 0.96, y: 10 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.96 }}
        transition={{ type: "spring", stiffness: 400, damping: 30 }}
        className="relative w-full max-w-2xl bg-gb-surface-solid border border-gb-border rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gb-border shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center justify-center">
              <ClipboardSignature size={18} className="text-emerald-500" />
            </div>
            <div>
              <h3 className="text-base font-black text-gb-text">{wa ? "Modifier le PV" : "Nouveau PV de réception"}</h3>
              <p className="text-xs text-gb-muted">Réception officielle des travaux</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gb-muted hover:bg-gb-surface-hover transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 p-6 space-y-5">

          {/* Ref + Titre */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>N° PV (référence)</label>
              <input className={inputCls} placeholder="PV-RP-2026-001"
                value={form.reference} onChange={e => set("reference", e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>Intitulé du PV</label>
              <input className={inputCls} placeholder="Réception provisoire Bât A..."
                value={form.title} onChange={e => set("title", e.target.value)} />
            </div>
          </div>

          {/* Type + Statut + Lot */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className={labelCls}>Type <span className="text-red-400">*</span></label>
              <select className={inputCls} value={form.type} onChange={e => set("type", e.target.value)}>
                {TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Statut</label>
              <select className={inputCls} value={form.status} onChange={e => set("status", e.target.value)}>
                {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Lot concerné</label>
              <select className={inputCls} value={form.lot_id} onChange={e => set("lot_id", e.target.value)}>
                <option value="">— Tous les lots —</option>
                {lots.map(l => <option key={l.id} value={l.id}>Lot {l.lot_number} — {l.name}</option>)}
              </select>
            </div>
          </div>

          {/* Date prévisionnelle + GPA */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Date prévisionnelle de visite</label>
              <input type="date" className={inputCls} value={form.planned_date}
                onChange={e => set("planned_date", e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>Durée GPA (mois légaux)</label>
              <input type="number" min={1} max={120} className={inputCls}
                value={form.warranty_months} onChange={e => set("warranty_months", e.target.value)} />
            </div>
          </div>

          {/* Financier */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className={labelCls}>Montant réceptionné (FCFA)</label>
              <input type="number" min={0} className={inputCls} placeholder="0"
                value={form.amount_accepted} onChange={e => set("amount_accepted", e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>Pénalités déduites (FCFA)</label>
              <input type="number" min={0} className={inputCls} placeholder="0"
                value={form.penalty_amount} onChange={e => set("penalty_amount", e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>Nombre de réserves</label>
              <input type="number" min={0} className={inputCls}
                value={form.reserve_count} onChange={e => set("reserve_count", e.target.value)} />
            </div>
          </div>

          {/* Réserves texte */}
          <div>
            <label className={labelCls}>Liste des réserves formelles</label>
            <textarea rows={3} className={`${inputCls} resize-none`}
              placeholder={"1. Fissure façade nord - Axe B-C\n2. Revêtement de sol non conforme - RDC..."}
              value={form.reserves_text} onChange={e => set("reserves_text", e.target.value)} />
          </div>

          {/* Observations */}
          <div>
            <label className={labelCls}>Compte-rendu / Observations de visite</label>
            <textarea rows={3} className={`${inputCls} resize-none`}
              placeholder="Résumé des constats effectués lors de la visite de réception..."
              value={form.observations} onChange={e => set("observations", e.target.value)} />
          </div>

          {/* Notes */}
          <div>
            <label className={labelCls}>Notes internes</label>
            <textarea rows={2} className={`${inputCls} resize-none`}
              placeholder="Notes complémentaires..."
              value={form.notes} onChange={e => set("notes", e.target.value)} />
          </div>

          {/* Document upload */}
          <div>
            <label className={labelCls}>Pièces jointes (multiple)</label>
            <input
              type="file"
              multiple
              className={inputCls}
              onChange={e => setSelectedFiles(Array.from(e.target.files || []))}
            />
            {selectedFiles.length > 0 && <p className="text-[11px] text-gb-muted mt-1">{selectedFiles.length} fichier(s) prêt(s) à l'upload.</p>}
            {!selectedFiles.length && wa?.document?.file_url && (
              <a href={wa.document.file_url} target="_blank" rel="noreferrer" className="text-[11px] text-gb-primary hover:underline mt-1 inline-block">
                Document actuel: {wa.document.file_name || wa.document.name || "ouvrir"}
              </a>
            )}
          </div>

          {error && (
            <div className="flex items-center gap-2 text-sm text-gb-danger bg-gb-danger/10 border border-gb-danger/20 rounded-xl px-4 py-3">
              <AlertCircle size={15} /> {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gb-border flex items-center justify-end gap-3 bg-gb-app/30 shrink-0">
          <button onClick={onClose}
            className="px-5 py-2.5 rounded-xl text-sm font-semibold text-gb-muted hover:text-gb-text hover:bg-gb-surface-hover transition-colors">
            Annuler
          </button>
          <button onClick={save} disabled={saving || uploading}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gb-primary text-gb-inverse font-bold text-sm hover:bg-gb-primary/90 transition-colors disabled:opacity-50">
            {saving ? <Loader2 size={15} className="animate-spin" /> : <ClipboardSignature size={15} />}
            {saving || uploading ? (uploading ? "Upload des fichiers..." : "Enregistrement...") : wa ? "Mettre à jour" : "Créer le PV"}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Row ──────────────────────────────────────────────────────────────────────

function ReceptionRow({ wa, onClick }: { wa: WorkAcceptance; onClick: () => void }) {
  const typeMeta   = getTypeMeta(wa.type);
  const statusMeta = getStatusMeta(wa.status);
  const StatusIcon = statusMeta.icon;
  const isAccepted = wa.status === "ACCEPTED" || wa.status === "ACCEPTED_WITH_RESERVES";

  return (
    <motion.tr
      initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
      className="border-b border-gb-border hover:bg-gb-surface-hover/50 cursor-pointer transition-colors group"
      onClick={onClick}
    >
      {/* Type bar */}
      <td className="py-3 pl-4 pr-2 w-1">
        <span className={`block w-1 h-8 rounded-full ${typeMeta.value === "FINAL" ? "bg-emerald-500" : "bg-amber-500"}`} />
      </td>

      {/* Title + Ref */}
      <td className="py-3 pr-4">
        <p className="text-sm font-semibold text-gb-text group-hover:text-gb-primary transition-colors truncate">
          {wa.title || `PV de réception ${wa.reference ? `— ${wa.reference}` : ""}`}
        </p>
        <div className="flex items-center gap-2 mt-0.5 text-xs text-gb-muted">
          {wa.reference && <span className="font-mono">{wa.reference}</span>}
          {wa.lot && <><span className="text-gb-muted/30">·</span><span>Lot {wa.lot.lot_number}</span></>}
        </div>
      </td>

      {/* Type */}
      <td className="py-3 pr-4 hidden md:table-cell">
        <TypeBadge type={wa.type} />
      </td>

      {/* Status */}
      <td className="py-3 pr-4">
        <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border ${statusMeta.badge}`}>
          <StatusIcon size={11} />{statusMeta.label}
        </span>
      </td>

      {/* Date */}
      <td className="py-3 pr-4 hidden lg:table-cell">
        <span className="text-xs text-gb-muted flex items-center gap-1">
          <Calendar size={11} />
          {isAccepted && wa.accepted_at
            ? fmtDate(wa.accepted_at)
            : wa.planned_date ? fmtDate(wa.planned_date) : "—"}
        </span>
      </td>

      {/* Réserves */}
      <td className="py-3 pr-4 hidden xl:table-cell">
        {wa.reserve_count > 0 ? (
          <span className="text-xs font-bold text-amber-500 flex items-center gap-1">
            <AlertTriangle size={11} /> {wa.reserve_count}
          </span>
        ) : (
          <span className="text-xs text-gb-muted/40">—</span>
        )}
      </td>

      {/* Signatures */}
      <td className="py-3 pr-4 hidden xl:table-cell">
        <div className="flex gap-1">
          <span title="MOA" className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black border ${wa.signed_by_owner ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-500" : "bg-gb-surface-hover border-gb-border text-gb-muted"}`}>M</span>
          <span title="Entreprise" className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black border ${wa.signed_by_contractor ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-500" : "bg-gb-surface-hover border-gb-border text-gb-muted"}`}>E</span>
        </div>
      </td>

      <td className="py-3 pr-4 w-8">
        <ChevronRight size={16} className="text-gb-muted/40 group-hover:text-gb-muted transition-colors" />
      </td>
    </motion.tr>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ProjectReceptionsTab({ projectId, lots, onRefresh }: ProjectReceptionsTabProps) {
  const { can } = usePermissions();
  const canCreate = can("work-acceptance:create");
  const canEdit   = can("work-acceptance:approve");
  const canDelete = can("work-acceptance:approve");

  const [items,    setItems]    = useState<WorkAcceptance[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState<string | null>(null);
  const [selected, setSelected] = useState<WorkAcceptance | null>(null);
  const [editing,  setEditing]  = useState<WorkAcceptance | undefined>(undefined);
  const [showForm, setShowForm] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await apiFetch(`${API_BASE}/work-acceptances?project_id=${projectId}`);
      if (!res.ok) throw new Error("Erreur de chargement des réceptions");
      const data = await res.json();
      setItems(Array.isArray(data) ? data : []);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => { load(); }, [load]);

  const handleStatusChange = async (id: number, status: string) => {
    try {
      const res = await apiFetch(`${API_BASE}/work-acceptances/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error();
      const updated = await res.json();
      setItems(prev => prev.map(i => i.id === id ? updated : i));
      if (selected?.id === id) setSelected(updated);
      onRefresh();
    } catch {}
  };

  const handleDelete = async (id: number) => {
    try {
      await apiFetch(`${API_BASE}/work-acceptances/${id}`, { method: "DELETE" });
      setItems(prev => prev.filter(i => i.id !== id));
      setSelected(null);
      onRefresh();
    } catch {}
  };

  const handleSaved = () => {
    load();
    onRefresh();
  };

  const handleGeneratePdf = async (wa: WorkAcceptance) => {
    try {
      const res = await apiFetch(`${API_BASE}/work-acceptances/${wa.id}/pdf`);
      if (!res.ok) throw new Error('Impossible de generer le PDF.');

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      const safeName = (wa.reference || `PV-${wa.id}`).replace(/[^a-zA-Z0-9-_]/g, '_');
      link.href = url;
      link.download = `${safeName}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      setError('Erreur lors de la generation du PDF.');
    }
  };

  const openCreate = () => { setEditing(undefined); setShowForm(true); };
  const openEdit   = (w: WorkAcceptance) => { setEditing(w); setShowForm(true); };

  // KPIs
  const total       = items.length;
  const provisional = items.filter(i => i.type === "PROVISIONAL").length;
  const finalAcc    = items.filter(i => i.type === "FINAL").length;
  const accepted    = items.filter(i => i.status === "ACCEPTED" || i.status === "ACCEPTED_WITH_RESERVES").length;
  const totalRes    = items.reduce((acc, i) => acc + (i.reserve_count ?? 0), 0);

  return (
    <div className="space-y-6">

      {/* ── Header ── */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center justify-center">
              <ClipboardSignature size={16} className="text-emerald-500" />
            </div>
            <h2 className="text-base font-black text-gb-text">Réceptions des travaux</h2>
          </div>
          <p className="text-sm text-gb-muted ml-10">Procès-verbaux de réception provisoire et définitive — GPA</p>
        </div>
        {canCreate && (
          <button
            onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gb-primary text-gb-inverse font-bold text-sm hover:bg-gb-primary/90 transition-all shadow-lg shadow-gb-primary/20 shrink-0"
          >
            <Plus size={15} />
            <span className="hidden sm:inline">Nouveau PV</span>
          </button>
        )}
      </div>

      {/* ── KPIs ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total PV",      value: total,       icon: ClipboardSignature, accent: "bg-gb-surface-hover text-gb-muted" },
          { label: "Provisoires",   value: provisional, icon: CalendarClock,      accent: "bg-amber-500/10 text-amber-500" },
          { label: "Définitives",   value: finalAcc,    icon: ShieldCheck,        accent: "bg-emerald-500/10 text-emerald-500" },
          { label: "Réserves tot.", value: totalRes,    icon: AlertTriangle,      accent: totalRes > 0 ? "bg-amber-500/10 text-amber-500" : "bg-gb-surface-hover text-gb-muted" },
        ].map(({ label, value, icon: Icon, accent }) => (
          <div key={label} className="bg-gb-surface-solid border border-gb-border rounded-xl p-4 flex items-center gap-3">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${accent}`}>
              <Icon size={17} />
            </div>
            <div>
              <p className="text-xl font-black text-gb-text">{value}</p>
              <p className="text-[10px] font-semibold text-gb-muted uppercase tracking-wider">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Accepted callout ── */}
      {accepted > 0 && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
          <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
          <p className="text-sm font-semibold text-emerald-600">
            {accepted} réception{accepted > 1 ? "s" : ""} validée{accepted > 1 ? "s" : ""} — condition de workflow satisfaite
          </p>
        </div>
      )}

      {/* ── Content ── */}
      {loading ? (
        <div className="flex items-center justify-center py-16 text-gb-muted">
          <Loader2 size={28} className="animate-spin mr-3" />
          <span className="text-sm">Chargement des réceptions...</span>
        </div>
      ) : error ? (
        <div className="flex items-center gap-2 text-sm text-gb-danger bg-gb-danger/10 border border-gb-danger/20 rounded-xl px-4 py-3">
          <AlertCircle size={15} /> {error}
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-14 h-14 bg-gb-surface-hover rounded-2xl flex items-center justify-center mb-4">
            <ClipboardSignature size={24} className="text-gb-muted/50" />
          </div>
          <p className="text-base font-bold text-gb-text mb-1">Aucun PV de réception</p>
          <p className="text-sm text-gb-muted mb-6 max-w-xs">
            Créez un premier procès-verbal pour enregistrer la réception des travaux.
          </p>
          {canCreate && (
            <button onClick={openCreate}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gb-primary text-gb-inverse font-bold text-sm hover:bg-gb-primary/90 transition-all">
              <Plus size={15} /> Nouveau PV de réception
            </button>
          )}
        </div>
      ) : (
        <div className="bg-gb-surface-solid border border-gb-border rounded-2xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gb-border bg-gb-surface-hover">
                <th className="w-1 pl-4" />
                <th className="text-left px-4 py-3 text-[10px] font-black text-gb-muted uppercase tracking-widest">PV / Référence</th>
                <th className="text-left px-4 py-3 text-[10px] font-black text-gb-muted uppercase tracking-widest hidden md:table-cell">Type</th>
                <th className="text-left px-4 py-3 text-[10px] font-black text-gb-muted uppercase tracking-widest">Statut</th>
                <th className="text-left px-4 py-3 text-[10px] font-black text-gb-muted uppercase tracking-widest hidden lg:table-cell">Date</th>
                <th className="text-left px-4 py-3 text-[10px] font-black text-gb-muted uppercase tracking-widest hidden xl:table-cell">Réserves</th>
                <th className="text-left px-4 py-3 text-[10px] font-black text-gb-muted uppercase tracking-widest hidden xl:table-cell">Signatures</th>
                <th className="w-8" />
              </tr>
            </thead>
            <tbody>
              <AnimatePresence>
                {items.map(wa => (
                  <ReceptionRow key={wa.id} wa={wa} onClick={() => setSelected(wa)} />
                ))}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
      )}

      {/* ── Drawers & Modals ── */}
      <AnimatePresence>
        {selected && (
          <ReceptionDetailDrawer
            wa={selected}
            onClose={() => setSelected(null)}
            onStatusChange={handleStatusChange}
            onDelete={handleDelete}
            onEdit={openEdit}
            onGeneratePdf={handleGeneratePdf}
            canEdit={canEdit}
            canDelete={canDelete}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showForm && (
          <ReceptionFormDialog
            open={showForm}
            onClose={() => { setShowForm(false); setEditing(undefined); }}
            onSaved={handleSaved}
            projectId={projectId}
            lots={lots}
            wa={editing}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
