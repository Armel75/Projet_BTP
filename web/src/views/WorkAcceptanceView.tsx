import React, { useState, useEffect, useCallback } from "react";
import {
  ClipboardSignature, Plus, X, Loader2, AlertCircle, CheckCircle2,
  XCircle, Clock, Calendar, User, FileText, ChevronRight,
  BarChart3, ArrowUpRight, Pencil, Trash2, AlertTriangle,
  Building2, ShieldCheck, Ban, RefreshCcw, CheckCheck,
  Banknote, CalendarCheck, CalendarClock, Users, Link2, Download
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { apiFetch, API_BASE } from "../lib/api";
import { usePermissions } from "../contexts/AuthContext";
import { format, addMonths, differenceInDays } from "date-fns";
import { fr } from "date-fns/locale";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Attendee {
  name: string;
  role: string;
  company: string;
  signed: boolean;
}

interface WorkAcceptance {
  id: number;
  reference?: string;
  title?: string;
  type: string;    // PROVISIONAL | FINAL
  status: string;  // PENDING | SCHEDULED | IN_PROGRESS | ACCEPTED | ACCEPTED_WITH_RESERVES | REFUSED | WITHDRAWN
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
  attendees?: string;  // JSON
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

interface Project { id: number; code: string; title: string; }

// ─── Config ───────────────────────────────────────────────────────────────────

const TYPES = [
  { value: "PROVISIONAL", label: "Réception provisoire", short: "RP",
    color: "text-amber-500",   bg: "bg-amber-500/10",   badge: "bg-amber-500/10 border-amber-500/20 text-amber-500" },
  { value: "FINAL",        label: "Réception définitive", short: "RD",
    color: "text-emerald-500", bg: "bg-emerald-500/10", badge: "bg-emerald-500/10 border-emerald-500/20 text-emerald-500" },
];

const STATUSES = [
  { value: "PENDING",                 label: "En attente",           icon: Clock,          color: "text-slate-400",   badge: "bg-slate-400/10 border-slate-400/20 text-slate-400" },
  { value: "SCHEDULED",               label: "Planifiée",            icon: CalendarClock,  color: "text-blue-400",    badge: "bg-blue-400/10 border-blue-400/20 text-blue-400" },
  { value: "IN_PROGRESS",             label: "Visite en cours",      icon: RefreshCcw,     color: "text-purple-500",  badge: "bg-purple-500/10 border-purple-500/20 text-purple-500" },
  { value: "ACCEPTED",                label: "Réceptionnée",         icon: CheckCircle2,   color: "text-emerald-500", badge: "bg-emerald-500/10 border-emerald-500/20 text-emerald-500" },
  { value: "ACCEPTED_WITH_RESERVES",  label: "Avec réserves",        icon: AlertTriangle,  color: "text-amber-500",   badge: "bg-amber-500/10 border-amber-500/20 text-amber-500" },
  { value: "REFUSED",                 label: "Refusée",              icon: XCircle,        color: "text-red-500",     badge: "bg-red-500/10 border-red-500/20 text-red-500" },
  { value: "WITHDRAWN",               label: "Retirée",              icon: Ban,            color: "text-slate-400",   badge: "bg-slate-400/10 border-slate-400/20 text-slate-400" },
];

// Status flow — next logical step
const NEXT_STATUS: Record<string, { next: string; label: string; icon: React.FC<any> } | null> = {
  PENDING:               { next: "SCHEDULED",              label: "Planifier la visite",  icon: CalendarClock },
  SCHEDULED:             { next: "IN_PROGRESS",            label: "Démarrer la visite",   icon: RefreshCcw },
  IN_PROGRESS:           { next: "ACCEPTED",               label: "Réceptionner",         icon: CheckCircle2 },
  ACCEPTED:              null,
  ACCEPTED_WITH_RESERVES:null,
  REFUSED:               { next: "SCHEDULED",              label: "Reprogrammer",         icon: CalendarClock },
  WITHDRAWN:             null,
};

const EMPTY_FORM = {
  title: "", reference: "", type: "PROVISIONAL", status: "PENDING",
  project_id: "", lot_id: "", planned_date: "",
  notes: "", observations: "", reserves_text: "",
  amount_accepted: "", penalty_amount: "", reserve_count: "0",
  warranty_months: "12", document_id: "",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getTypeMeta(v: string)   { return TYPES.find(t => t.value === v)   ?? TYPES[0]; }
function getStatusMeta(v: string) { return STATUSES.find(s => s.value === v) ?? STATUSES[0]; }

function parseAttendees(raw?: string): Attendee[] {
  try { return raw ? JSON.parse(raw) : []; } catch { return []; }
}

function fmtCurrency(n?: number | null): string {
  if (n == null) return "—";
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);
}

function fmtDate(d?: string | null): string {
  if (!d) return "—";
  return format(new Date(d), "d MMM yyyy", { locale: fr });
}

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

// ─── Warranty Timeline ────────────────────────────────────────────────────────

function WarrantyTimeline({ wa }: { wa: WorkAcceptance }) {
  if (!wa.accepted_at) return null;
  const start = new Date(wa.accepted_at);
  const end   = wa.warranty_end_date
    ? new Date(wa.warranty_end_date)
    : addMonths(start, wa.warranty_months);
  const now       = new Date();
  const totalDays = differenceInDays(end, start);
  const elapsed   = Math.min(differenceInDays(now, start), totalDays);
  const pct       = Math.round((elapsed / totalDays) * 100);
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

// ─── Attendees Table ──────────────────────────────────────────────────────────

function AttendeesTable({ raw }: { raw?: string }) {
  const list = parseAttendees(raw);
  if (!list.length) return <p className="text-xs text-gb-muted italic">Aucun participant renseigné.</p>;
  return (
    <div className="overflow-x-auto rounded-xl border border-gb-border">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-gb-border bg-gb-surface-hover">
            <th className="text-left px-3 py-2 font-black text-gb-muted uppercase tracking-widest">Nom</th>
            <th className="text-left px-3 py-2 font-black text-gb-muted uppercase tracking-widest">Rôle</th>
            <th className="text-left px-3 py-2 font-black text-gb-muted uppercase tracking-widest">Entreprise</th>
            <th className="text-center px-3 py-2 font-black text-gb-muted uppercase tracking-widest">Signé</th>
          </tr>
        </thead>
        <tbody>
          {list.map((a, i) => (
            <tr key={i} className="border-b border-gb-border last:border-0 hover:bg-gb-surface-hover/50">
              <td className="px-3 py-2 font-semibold text-gb-text">{a.name}</td>
              <td className="px-3 py-2 text-gb-muted">{a.role}</td>
              <td className="px-3 py-2 text-gb-muted">{a.company}</td>
              <td className="px-3 py-2 text-center">
                {a.signed
                  ? <CheckCheck size={13} className="text-emerald-500 inline" />
                  : <Clock size={13} className="text-gb-muted inline" />}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Detail Drawer ────────────────────────────────────────────────────────────

async function handleGeneratePdf(wa: WorkAcceptance) {
  try {
    const res = await apiFetch(`${API_BASE}/work-acceptances/${wa.id}/pdf`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      alert(err.error || 'Impossible de générer le PDF.');
      return;
    }
    const blob = await res.blob();
    const url  = window.URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `${(wa.reference || `PV-${wa.id}`).replace(/[^a-zA-Z0-9-_]/g, '_')}.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  } catch {
    alert('Impossible de générer le PDF.');
  }
}

function WorkAcceptanceDetailDrawer({
  wa, onClose, onStatusChange, onDelete, onEdit, canEdit, canDelete
}: {
  wa: WorkAcceptance;
  onClose: () => void;
  onStatusChange: (id: number, status: string) => void;
  onDelete: (id: number) => void;
  onEdit: (wa: WorkAcceptance) => void;
  canEdit: boolean;
  canDelete: boolean;
}) {
  const typeMeta   = getTypeMeta(wa.type);
  const statusMeta = getStatusMeta(wa.status);
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
        className="w-full max-w-2xl bg-gb-app border-l border-gb-border h-full overflow-y-auto flex flex-col shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* ── Header ── */}
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
                  className="p-1.5 rounded-lg text-gb-muted hover:text-gb-text hover:bg-gb-surface-hover transition-colors">
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
            {wa.title || `PV de réception — ${wa.project?.code ?? ""}`}
          </h2>

          <div className="flex flex-wrap gap-2">
            <TypeBadge type={wa.type} />
            <StatusBadge status={wa.status} />
            {wa.project && (
              <span className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full border border-gb-border text-gb-muted bg-gb-surface-solid">
                <Building2 size={11} />{wa.project.code}
              </span>
            )}
            {wa.lot && (
              <span className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full border border-gb-border text-gb-muted bg-gb-surface-solid">
                Lot {wa.lot.lot_number}
              </span>
            )}
          </div>
        </div>

        {/* ── Body ── */}
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
                { label: "Visite prévue",      value: wa.planned_date,      icon: CalendarClock },
                { label: "Visite effective",    value: wa.inspection_date,   icon: Calendar },
                { label: "Date de réception",   value: wa.accepted_at,       icon: CalendarCheck, highlight: isAccepted },
                { label: "Contre-visite",       value: wa.contra_visit_date, icon: RefreshCcw },
              ].map(({ label, value, icon: Icon, highlight }) => (
                value ? (
                  <div key={label} className={`rounded-xl p-3 border ${highlight ? "bg-emerald-500/5 border-emerald-500/20" : "bg-gb-surface-solid border-gb-border"}`}>
                    <p className={`text-[10px] font-bold uppercase tracking-widest mb-1 flex items-center gap-1 ${highlight ? "text-emerald-500" : "text-gb-muted"}`}>
                      <Icon size={10} /> {label}
                    </p>
                    <p className={`text-sm font-semibold ${highlight ? "text-emerald-500" : "text-gb-text"}`}>{fmtDate(value)}</p>
                  </div>
                ) : null
              ))}
            </div>
          </Section>

          {/* GPA timeline */}
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

          {/* Notes générales */}
          {wa.notes && (
            <Section title="Notes">
              <p className="text-sm text-gb-text leading-relaxed whitespace-pre-wrap">{wa.notes}</p>
            </Section>
          )}

          {/* Participants */}
          <Section title="Participants / Signataires">
            <AttendeesTable raw={wa.attendees} />
          </Section>

          {/* Document PV */}
          {wa.document?.file_url && (
            <Section title="PV signé">
              <a
                href={wa.document.file_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm font-semibold text-gb-primary hover:underline"
              >
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

          {/* Meta */}
          <Section title="Méta">
            <p className="text-xs text-gb-muted">
              Créé le {format(new Date(wa.created_at), "d MMMM yyyy 'à' HH:mm", { locale: fr })}
              {wa.createdBy && ` par ${wa.createdBy.firstname} ${wa.createdBy.lastname}`}
            </p>
          </Section>
        </div>

        {/* ── Footer actions ── */}
        <div className="p-6 border-t border-gb-border bg-gb-surface-solid/50 shrink-0 flex items-center gap-3 flex-wrap">
          {canEdit && nextStep && (
            <button
              onClick={() => onStatusChange(wa.id, nextStep.next)}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gb-primary text-gb-inverse font-bold text-sm hover:bg-gb-primary/90 transition-colors min-w-0"
            >
              <nextStep.icon size={15} />
              {nextStep.label}
            </button>
          )}
          {/* Special: In_Progress can also lead to ACCEPTED_WITH_RESERVES or REFUSED */}
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
          <button
            onClick={() => handleGeneratePdf(wa)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gb-border text-gb-muted hover:text-gb-text hover:bg-gb-surface-hover transition-colors text-sm font-semibold"
          >
            <Download size={15} /> Générer PDF
          </button>

          {canDelete && (
            <button
              onClick={() => { if (window.confirm("Supprimer ce PV de réception ?")) onDelete(wa.id); }}
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

// ─── Form Dialog ──────────────────────────────────────────────────────────────

function WorkAcceptanceFormDialog({
  open, onClose, onSaved, projects, wa
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  projects: Project[];
  wa?: WorkAcceptance;
}) {
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [error, setError]   = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      if (wa) {
        setForm({
          title:           wa.title          ?? "",
          reference:       wa.reference      ?? "",
          type:            wa.type,
          status:          wa.status,
          project_id:      String(wa.project?.id ?? ""),
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
    }
  }, [open, wa]);

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const uploadDocuments = async (projectId: number) => {
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
    if (!form.project_id) { setError("Le projet est obligatoire."); return; }
    setSaving(true); setError(null);
    try {
      const uploadedIds = await uploadDocuments(Number(form.project_id));
      const body: Record<string, any> = {
        type:            form.type,
        status:          form.status,
        project_id:      Number(form.project_id),
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
      onSaved(); onClose();
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
        <div className="flex items-center justify-between px-6 py-5 border-b border-gb-border">
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
              <input className={inputCls} placeholder="PV-RP-2026-001" value={form.reference} onChange={e => set("reference", e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>Intitulé du PV</label>
              <input className={inputCls} placeholder="Réception provisoire Bât A..." value={form.title} onChange={e => set("title", e.target.value)} />
            </div>
          </div>

          {/* Projet + Type + Statut */}
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-3 sm:col-span-1">
              <label className={labelCls}>Projet <span className="text-red-400">*</span></label>
              <select className={inputCls} value={form.project_id} onChange={e => set("project_id", e.target.value)}>
                <option value="">— Sélectionner —</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.code} — {p.title}</option>)}
              </select>
            </div>
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
          </div>

          {/* Date prévue + GPA */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Date prévisionnelle de visite</label>
              <input type="date" className={inputCls} value={form.planned_date} onChange={e => set("planned_date", e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>Durée GPA (mois légaux)</label>
              <input type="number" min={1} max={120} className={inputCls} value={form.warranty_months} onChange={e => set("warranty_months", e.target.value)} />
            </div>
          </div>

          {/* Financier */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className={labelCls}>Montant réceptionné (€)</label>
              <input type="number" min={0} className={inputCls} placeholder="0" value={form.amount_accepted} onChange={e => set("amount_accepted", e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>Pénalités déduites (€)</label>
              <input type="number" min={0} className={inputCls} placeholder="0" value={form.penalty_amount} onChange={e => set("penalty_amount", e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>Nombre de réserves</label>
              <input type="number" min={0} className={inputCls} value={form.reserve_count} onChange={e => set("reserve_count", e.target.value)} />
            </div>
          </div>

          {/* Réserves texte */}
          <div>
            <label className={labelCls}>Liste des réserves formelles</label>
            <textarea rows={3} className={`${inputCls} resize-none`}
              placeholder="1. Fissure façade nord - Axe B-C&#10;2. Revêtement de sol non conforme - RDC..."
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
        <div className="px-6 py-4 border-t border-gb-border flex items-center justify-end gap-3 bg-gb-app/30">
          <button onClick={onClose} className="px-5 py-2.5 rounded-xl text-sm font-semibold text-gb-muted hover:text-gb-text hover:bg-gb-surface-hover transition-colors">
            Annuler
          </button>
          <button
            onClick={save} disabled={saving || uploading}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gb-primary text-gb-inverse font-bold text-sm hover:bg-gb-primary/90 transition-colors disabled:opacity-50"
          >
            {saving ? <Loader2 size={15} className="animate-spin" /> : <ClipboardSignature size={15} />}
            {saving || uploading ? (uploading ? "Upload des fichiers..." : "Enregistrement...") : wa ? "Mettre à jour" : "Créer le PV"}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Table Row ────────────────────────────────────────────────────────────────

function WorkAcceptanceRow({ wa, onClick }: { wa: WorkAcceptance; onClick: () => void }) {
  const typeMeta   = getTypeMeta(wa.type);
  const statusMeta = getStatusMeta(wa.status);
  const StatusIcon = statusMeta.icon;
  const isAccepted = wa.status === "ACCEPTED" || wa.status === "ACCEPTED_WITH_RESERVES";

  return (
    <motion.tr
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      className="border-b border-gb-border hover:bg-gb-surface-hover/50 cursor-pointer transition-colors group"
      onClick={onClick}
    >
      {/* Type bar */}
      <td className="py-3 pl-4 pr-2 w-1">
        <span className={`block w-1 h-8 rounded-full ${typeMeta.value === "FINAL" ? "bg-emerald-500" : "bg-amber-500"}`} />
      </td>

      {/* Reference + Title */}
      <td className="py-3 pr-4">
        <p className="text-sm font-semibold text-gb-text group-hover:text-gb-primary transition-colors truncate">
          {wa.title || `PV — ${wa.project?.code ?? "—"}`}
        </p>
        <div className="flex items-center gap-2 mt-0.5 text-xs text-gb-muted">
          {wa.reference && <span className="font-mono">{wa.reference}</span>}
          {wa.reference && wa.project && <span className="text-gb-muted/30">·</span>}
          {wa.project && <span>{wa.project.code}</span>}
          {wa.lot && <><span className="text-gb-muted/30">·</span><span>Lot {wa.lot.lot_number}</span></>}
        </div>
      </td>

      {/* Type */}
      <td className="py-3 pr-4 hidden md:table-cell">
        <TypeBadge type={wa.type} />
      </td>

      {/* Status */}
      <td className="py-3 pr-4">
        <StatusBadge status={wa.status} />
      </td>

      {/* Date */}
      <td className="py-3 pr-4 hidden lg:table-cell">
        <span className="text-xs text-gb-muted flex items-center gap-1">
          <Calendar size={11} />
          {isAccepted && wa.accepted_at
            ? fmtDate(wa.accepted_at)
            : wa.planned_date
            ? fmtDate(wa.planned_date)
            : "—"}
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

// ─── Main View ────────────────────────────────────────────────────────────────

export default function WorkAcceptanceView() {
  const { can } = usePermissions();
  const canCreate = can("work-acceptance:create");
  const canEdit   = can("work-acceptance:update");
  const canDelete = can("work-acceptance:delete");

  const [items,    setItems]    = useState<WorkAcceptance[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState<string | null>(null);

  const [filterProject, setFilterProject] = useState("");
  const [filterStatus,  setFilterStatus]  = useState("");
  const [filterType,    setFilterType]    = useState("");

  const [selected, setSelected] = useState<WorkAcceptance | null>(null);
  const [editing,  setEditing]  = useState<WorkAcceptance | undefined>(undefined);
  const [showForm, setShowForm] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const params = new URLSearchParams();
      if (filterProject) params.set("project_id", filterProject);
      if (filterStatus)  params.set("status",     filterStatus);
      if (filterType)    params.set("type",        filterType);

      const res = await apiFetch(`${API_BASE}/work-acceptances?${params.toString()}`);
      if (!res.ok) throw new Error("Erreur de chargement");
      const data = await res.json();
      setItems(Array.isArray(data) ? data : []);
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

  useEffect(() => { load(); },         [load]);
  useEffect(() => { loadProjects(); }, [loadProjects]);

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
    } catch {}
  };

  const handleDelete = async (id: number) => {
    try {
      await apiFetch(`${API_BASE}/work-acceptances/${id}`, { method: "DELETE" });
      setItems(prev => prev.filter(i => i.id !== id));
      setSelected(null);
    } catch {}
  };

  const openCreate = () => { setEditing(undefined); setShowForm(true); };
  const openEdit   = (w: WorkAcceptance) => { setEditing(w); setShowForm(true); };

  // ─── KPI ──────────────────────────────────────────────────────────────────
  const total       = items.length;
  const provisional = items.filter(i => i.type === "PROVISIONAL").length;
  const finalAcc    = items.filter(i => i.type === "FINAL").length;
  const accepted    = items.filter(i => i.status === "ACCEPTED" || i.status === "ACCEPTED_WITH_RESERVES").length;
  const withRes     = items.filter(i => i.status === "ACCEPTED_WITH_RESERVES").length;
  const totalRes    = items.reduce((acc, i) => acc + (i.reserve_count ?? 0), 0);

  const activeFilters = [filterProject, filterStatus, filterType].filter(Boolean).length;

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-gb-text flex items-center gap-2.5">
            <ClipboardSignature size={24} className="text-emerald-500" />
            Réception des travaux
          </h1>
          <p className="text-sm text-gb-muted mt-0.5">Procès-verbaux de réception provisoire et définitive — GPA</p>
        </div>
        {canCreate && (
          <button
            onClick={openCreate}
            className="flex items-center gap-2 px-5 py-2.5 bg-gb-primary text-gb-inverse font-bold text-sm rounded-xl hover:bg-gb-primary/90 transition-colors shadow-sm shadow-gb-primary/20"
          >
            <Plus size={16} /> Nouveau PV
          </button>
        )}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
        <KpiCard label="Total PV"        value={total}       icon={ClipboardSignature} accent="bg-gb-primary/10 text-gb-primary" />
        <KpiCard label="Provisoires"     value={provisional} icon={CalendarClock}      accent="bg-amber-500/10 text-amber-500" />
        <KpiCard label="Définitives"     value={finalAcc}    icon={CalendarCheck}      accent="bg-emerald-500/10 text-emerald-500" />
        <KpiCard label="Réceptionnés"    value={accepted}    icon={CheckCircle2}       accent="bg-blue-500/10 text-blue-500"
          sub={withRes > 0 ? `dont ${withRes} avec réserves` : undefined} />
        <KpiCard label="Réserves totales" value={totalRes}   icon={AlertTriangle}      accent="bg-red-500/10 text-red-500" />
      </div>

      {/* Alert — PV avec réserves en attente */}
      <AnimatePresence>
        {withRes > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            className="flex items-center gap-3 px-4 py-3 bg-amber-500/10 border border-amber-500/20 rounded-xl"
          >
            <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse shrink-0" />
            <p className="text-sm font-bold text-amber-500">
              {withRes} réception{withRes > 1 ? "s" : ""} avec réserves — le solde du marché est conditionné à leur levée.
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2 text-xs font-semibold text-gb-muted">
          <FileText size={14} /> Filtrer
        </div>

        <select
          className="text-xs bg-gb-surface-solid border border-gb-border rounded-xl px-3 py-2 text-gb-text focus:outline-none focus:ring-2 focus:ring-gb-primary/30 focus:border-gb-primary transition-colors"
          value={filterProject} onChange={e => setFilterProject(e.target.value)}
        >
          <option value="">Tous les projets</option>
          {projects.map(p => <option key={p.id} value={p.id}>{p.code}</option>)}
        </select>

        <select
          className="text-xs bg-gb-surface-solid border border-gb-border rounded-xl px-3 py-2 text-gb-text focus:outline-none focus:ring-2 focus:ring-gb-primary/30 focus:border-gb-primary transition-colors"
          value={filterType} onChange={e => setFilterType(e.target.value)}
        >
          <option value="">Tous les types</option>
          {TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>

        <select
          className="text-xs bg-gb-surface-solid border border-gb-border rounded-xl px-3 py-2 text-gb-text focus:outline-none focus:ring-2 focus:ring-gb-primary/30 focus:border-gb-primary transition-colors"
          value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
        >
          <option value="">Tous les statuts</option>
          {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
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
          {items.length} résultat{items.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Table */}
      <div className="bg-gb-surface-solid border border-gb-border rounded-2xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-24 gap-3 text-gb-muted">
            <Loader2 size={20} className="animate-spin" />
            <span className="text-sm">Chargement des PV...</span>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center py-24 gap-3 text-gb-danger">
            <AlertCircle size={20} /><span className="text-sm">{error}</span>
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3 text-gb-muted">
            <ClipboardSignature size={40} className="opacity-20" />
            <p className="text-sm font-semibold">Aucun PV de réception trouvé</p>
            {canCreate && (
              <button onClick={openCreate}
                className="flex items-center gap-2 text-sm text-gb-primary font-bold hover:underline mt-1">
                <Plus size={14} /> Créer le premier PV
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gb-border">
                  <th className="py-3 pl-4 pr-2 w-1" />
                  <th className="py-3 pr-4 text-left text-[10px] font-black text-gb-muted uppercase tracking-widest">PV / Projet</th>
                  <th className="py-3 pr-4 text-left text-[10px] font-black text-gb-muted uppercase tracking-widest hidden md:table-cell">Type</th>
                  <th className="py-3 pr-4 text-left text-[10px] font-black text-gb-muted uppercase tracking-widest">Statut</th>
                  <th className="py-3 pr-4 text-left text-[10px] font-black text-gb-muted uppercase tracking-widest hidden lg:table-cell">Date</th>
                  <th className="py-3 pr-4 text-left text-[10px] font-black text-gb-muted uppercase tracking-widest hidden xl:table-cell">Réserves</th>
                  <th className="py-3 pr-4 text-left text-[10px] font-black text-gb-muted uppercase tracking-widest hidden xl:table-cell">Signatures</th>
                  <th className="py-3 pr-4 w-8" />
                </tr>
              </thead>
              <tbody>
                <AnimatePresence>
                  {items.map(wa => (
                    <WorkAcceptanceRow key={wa.id} wa={wa} onClick={() => setSelected(wa)} />
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
          <WorkAcceptanceDetailDrawer
            wa={selected}
            onClose={() => setSelected(null)}
            onStatusChange={handleStatusChange}
            onDelete={handleDelete}
            onEdit={openEdit}
            canEdit={canEdit}
            canDelete={canDelete}
          />
        )}
      </AnimatePresence>

      {/* Form Dialog */}
      <AnimatePresence>
        {showForm && (
          <WorkAcceptanceFormDialog
            open={showForm}
            onClose={() => setShowForm(false)}
            onSaved={load}
            projects={projects}
            wa={editing}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
