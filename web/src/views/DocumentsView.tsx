import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  FileText, Plus, Search, Loader2, FolderOpen,
  ChevronRight, Download, Upload, Pencil, Trash2,
  Archive, ArchiveRestore, FileImage, File, FileSpreadsheet,
  Clock, CheckCircle2, AlertTriangle, X, Calendar,
  RotateCcw, Shield, Tag, Building2, Layers, Info,
  FilePlus2,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { apiFetch, API_BASE } from "../lib/api";
import { format, isPast, isWithinInterval, addDays } from "date-fns";
import { fr } from "date-fns/locale";

// ─── Types ────────────────────────────────────────────────────────────────────

interface DocumentVersion {
  id: number;
  version: number;
  file_url: string;
  file_name?: string;
  file_size?: number;
  file_type?: string;
  revision?: string;
  is_current: boolean;
  status: string;
  comment?: string;
  created_at: string;
  createdBy?: { id: number; firstname: string; lastname: string };
}

interface BtpDocument {
  id: number;
  name: string;
  reference?: string;
  category: string;
  discipline: string;
  phase: string;
  status: string;
  approval_status?: string;
  revision: string;
  file_url?: string;
  file_name?: string;
  file_size?: number;
  file_type?: string;
  confidentiality: string;
  security_clearance_level?: string;
  supersedes_document_id?: number;
  document_change_log?: string;
  expiry_date?: string;
  description?: string;
  tags?: string;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
  project?: { id: number; code: string; title: string };
  lot?: { id: number; lot_number: string; name: string };
  createdBy?: { id: number; firstname: string; lastname: string };
  documentVersions: DocumentVersion[];
}

interface Project { id: number; code: string; title: string; }
interface Lot { id: number; lot_number: string; name: string; }

// ─── Config ───────────────────────────────────────────────────────────────────

const DISCIPLINES: { value: string; label: string; bar: string; badge: string }[] = [
  { value: "ARCH",    label: "Architecture", bar: "bg-blue-500",   badge: "text-blue-500 bg-blue-500/10 border-blue-500/20" },
  { value: "STRUCT",  label: "Structure",    bar: "bg-orange-500", badge: "text-orange-500 bg-orange-500/10 border-orange-500/20" },
  { value: "MEP",     label: "MEP",          bar: "bg-cyan-500",   badge: "text-cyan-500 bg-cyan-500/10 border-cyan-500/20" },
  { value: "CIVIL",   label: "Génie Civil",  bar: "bg-amber-500",  badge: "text-amber-500 bg-amber-500/10 border-amber-500/20" },
  { value: "ELEC",    label: "Électricité",  bar: "bg-yellow-500", badge: "text-yellow-600 bg-yellow-500/10 border-yellow-500/20" },
  { value: "PLUMB",   label: "Plomberie",    bar: "bg-teal-500",   badge: "text-teal-500 bg-teal-500/10 border-teal-500/20" },
  { value: "GENERAL", label: "Général",      bar: "bg-slate-400",  badge: "text-slate-400 bg-slate-400/10 border-slate-400/20" },
];

const PHASES: { value: string; label: string; color: string }[] = [
  { value: "APD",       label: "APD",       color: "text-purple-500" },
  { value: "PRO",       label: "PRO",       color: "text-blue-500" },
  { value: "DCE",       label: "DCE",       color: "text-cyan-500" },
  { value: "EXE",       label: "EXE",       color: "text-emerald-500" },
  { value: "RECEPTION", label: "Réception", color: "text-amber-500" },
  { value: "DOE",       label: "DOE",       color: "text-orange-500" },
];

const CATEGORIES: { value: string; label: string }[] = [
  { value: "PLAN",     label: "Plan" },
  { value: "REPORT",   label: "Rapport" },
  { value: "CONTRACT", label: "Contrat" },
  { value: "PERMIT",   label: "Permis" },
  { value: "SPEC",     label: "CCTP / Spéc." },
  { value: "DRAWING",  label: "Dessin" },
  { value: "OTHER",    label: "Autre" },
];

const STATUSES: { value: string; label: string; cls: string }[] = [
  { value: "DRAFT",      label: "Brouillon",   cls: "bg-slate-400/10 text-slate-500 border-slate-400/20" },
  { value: "IN_REVIEW",  label: "En révision", cls: "bg-amber-500/10 text-amber-600 border-amber-500/20" },
  { value: "APPROVED",   label: "Approuvé",    cls: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" },
  { value: "SUPERSEDED", label: "Remplacé",    cls: "bg-slate-400/10 text-slate-400 border-slate-400/20" },
];

const FILE_TYPE_CFG: Record<string, { icon: React.FC<any>; color: string; bg: string }> = {
  pdf:   { icon: FileText,        color: "text-red-500",     bg: "bg-red-500/10" },
  docx:  { icon: FileText,        color: "text-blue-500",    bg: "bg-blue-500/10" },
  xlsx:  { icon: FileSpreadsheet, color: "text-emerald-500", bg: "bg-emerald-500/10" },
  pptx:  { icon: FileText,        color: "text-orange-500",  bg: "bg-orange-500/10" },
  image: { icon: FileImage,       color: "text-purple-500",  bg: "bg-purple-500/10" },
  dwg:   { icon: File,            color: "text-cyan-500",    bg: "bg-cyan-500/10" },
  other: { icon: File,            color: "text-gb-muted",    bg: "bg-gb-surface-hover" },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const getDisc   = (v: string) => DISCIPLINES.find(d => d.value === v) ?? DISCIPLINES[DISCIPLINES.length - 1];
const getPhase  = (v: string) => PHASES.find(p => p.value === v) ?? PHASES[0];
const getStatus = (v: string) => STATUSES.find(s => s.value === v) ?? STATUSES[0];
const getFileCfg = (t?: string) => FILE_TYPE_CFG[t ?? "other"] ?? FILE_TYPE_CFG.other;

const formatBytes = (bytes?: number) => {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
};

// Remapper /api/v1/ → /api/btp/ via le proxy Vite
const resolveFileUrl = (url?: string | null) => {
  if (!url) return null;
  if (url.startsWith("/api/v1/")) return `${API_BASE}/${url.slice("/api/v1/".length)}`;
  return url;
};

// ─── Atoms ────────────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const s = getStatus(status);
  return (
    <span className={`inline-flex items-center h-6 px-2.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${s.cls}`}>
      {s.label}
    </span>
  );
}

function FileTypeIcon({ type, size = 14 }: { type?: string; size?: number }) {
  const cfg  = getFileCfg(type);
  const Icon = cfg.icon;
  return (
    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${cfg.bg}`}>
      <Icon size={size} className={cfg.color} />
    </div>
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
  name: "", reference: "", category: "PLAN", discipline: "GENERAL",
  phase: "EXE", status: "DRAFT", revision: "A", confidentiality: "INTERNAL",
  approval_status: "", security_clearance_level: "", supersedes_document_id: "", document_change_log: "",
  description: "", tags: "", project_id: "", lot_id: "", expiry_date: "",
};

function DocFormDialog({ open, onClose, doc, onSaved }: {
  open: boolean; onClose: () => void;
  doc: BtpDocument | null; onSaved: () => void;
}) {
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [file, setFile] = useState<File | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [lots, setLots] = useState<Lot[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  useEffect(() => {
    if (!open) return;
    apiFetch(`${API_BASE}/projects?limit=100`)
      .then(r => r.json()).then(d => setProjects(Array.isArray(d) ? d : [])).catch(() => {});
  }, [open]);

  useEffect(() => {
    if (!form.project_id) { setLots([]); return; }
    apiFetch(`${API_BASE}/project-management/lots?projectId=${form.project_id}`)
      .then(r => r.json()).then(d => setLots(Array.isArray(d) ? d : [])).catch(() => {});
  }, [form.project_id]);

  useEffect(() => {
    if (!open) return;
    if (doc) {
      setForm({
        name:            doc.name,
        reference:       doc.reference ?? "",
        category:        doc.category,
        discipline:      doc.discipline,
        phase:           doc.phase,
        status:          doc.status,
        approval_status: doc.approval_status ?? "",
        revision:        doc.revision,
        confidentiality: doc.confidentiality,
        security_clearance_level: doc.security_clearance_level ?? "",
        supersedes_document_id: doc.supersedes_document_id ? String(doc.supersedes_document_id) : "",
        document_change_log: doc.document_change_log ?? "",
        description:     doc.description ?? "",
        tags:            doc.tags ?? "",
        project_id:      doc.project?.id ? String(doc.project.id) : "",
        lot_id:          doc.lot?.id     ? String(doc.lot.id)     : "",
        expiry_date:     doc.expiry_date ? doc.expiry_date.split("T")[0] : "",
      });
    } else {
      setForm({ ...EMPTY_FORM });
      setFile(null);
    }
    setError(null);
  }, [open, doc]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim())  { setError("Le nom est obligatoire"); return; }
    if (!form.project_id)   { setError("Le projet est obligatoire"); return; }
    setSaving(true); setError(null);
    try {
      if (doc) {
        // Modification : JSON sans re-upload de fichier
        const payload: Record<string, any> = { ...form };
        if (form.lot_id)      payload.lot_id      = Number(form.lot_id);
        if (form.project_id)  payload.project_id  = Number(form.project_id);
        payload.supersedes_document_id = form.supersedes_document_id ? Number(form.supersedes_document_id) : null;
        if (!form.expiry_date) delete payload.expiry_date;
        if (!form.approval_status) delete payload.approval_status;
        if (!form.security_clearance_level) delete payload.security_clearance_level;
        await apiFetch(`${API_BASE}/documents/${doc.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        // Création : multipart/form-data avec fichier optionnel
        const fd = new FormData();
        Object.entries(form).forEach(([k, v]) => { if (v) fd.append(k, v); });
        if (file) fd.append("file", file);
        await apiFetch(`${API_BASE}/documents`, { method: "POST", body: fd });
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

  const F = ({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) => (
    <div className="flex flex-col gap-1.5">
      <label className="text-[10px] font-black uppercase tracking-widest text-gb-muted">
        {label}{required && <span className="text-gb-danger ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );

  const Sep = ({ label }: { label: string }) => (
    <div className="flex items-center gap-3 pt-1">
      <span className="text-[10px] font-black uppercase tracking-widest text-gb-muted whitespace-nowrap">{label}</span>
      <div className="flex-1 h-px bg-gb-border/60" />
    </div>
  );

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
                <FilePlus2 size={16} className="text-gb-primary" />
              </div>
              <h2 className="text-lg font-extrabold text-gb-text">
                {doc ? "Modifier le document" : "Nouveau document"}
              </h2>
            </div>
            <button onClick={onClose} className="p-2 rounded-xl text-gb-muted hover:text-gb-text hover:bg-gb-surface-hover transition-colors">
              <X size={18} />
            </button>
          </div>

          {/* Body */}
          <form onSubmit={submit} className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
            <Sep label="Identification" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <F label="Nom du document" required>
                  <input value={form.name} onChange={e => set("name", e.target.value)} placeholder="Plan de façade Nord — Bâtiment A" className={inputCls} />
                </F>
              </div>
              <F label="Référence (codification)">
                <input value={form.reference} onChange={e => set("reference", e.target.value)} placeholder="ARC-FAC-P-001-A" className={inputCls} />
              </F>
              <F label="Révision">
                <input value={form.revision} onChange={e => set("revision", e.target.value)} placeholder="A" className={inputCls} />
              </F>
            </div>

            <Sep label="Classification" />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <F label="Catégorie" required>
                <select value={form.category} onChange={e => set("category", e.target.value)} className={selectCls}>
                  {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </F>
              <F label="Discipline">
                <select value={form.discipline} onChange={e => set("discipline", e.target.value)} className={selectCls}>
                  {DISCIPLINES.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                </select>
              </F>
              <F label="Phase">
                <select value={form.phase} onChange={e => set("phase", e.target.value)} className={selectCls}>
                  {PHASES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                </select>
              </F>
              <F label="Statut">
                <select value={form.status} onChange={e => set("status", e.target.value)} className={selectCls}>
                  {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </F>
            </div>

            <Sep label="Périmètre" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <F label="Projet" required>
                <select value={form.project_id} onChange={e => set("project_id", e.target.value)} className={selectCls}>
                  <option value="">Sélectionner un projet…</option>
                  {projects.map(p => <option key={p.id} value={p.id}>{p.code} — {p.title}</option>)}
                </select>
              </F>
              <F label="Lot (optionnel)">
                <select value={form.lot_id} onChange={e => set("lot_id", e.target.value)} className={selectCls} disabled={!form.project_id}>
                  <option value="">Tous lots</option>
                  {lots.map(l => <option key={l.id} value={l.id}>Lot {l.lot_number} — {l.name}</option>)}
                </select>
              </F>
            </div>

            <Sep label="Accès & Validité" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <F label="Confidentialité">
                <select value={form.confidentiality} onChange={e => set("confidentiality", e.target.value)} className={selectCls}>
                  <option value="PUBLIC">Public</option>
                  <option value="INTERNAL">Interne</option>
                  <option value="RESTRICTED">Restreint</option>
                </select>
              </F>
              <F label="Niveau de sécurité">
                <input value={form.security_clearance_level} onChange={e => set("security_clearance_level", e.target.value)} className={inputCls}
                  placeholder="Ex: CONFIDENTIEL" />
              </F>
              <F label="Statut d'approbation">
                <input value={form.approval_status} onChange={e => set("approval_status", e.target.value)} className={inputCls}
                  placeholder="Ex: PENDING_APPROVAL" />
              </F>
              <F label="Date d'expiration">
                <input type="date" value={form.expiry_date} onChange={e => set("expiry_date", e.target.value)} className={inputCls} />
              </F>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <F label="Document remplacé (ID)">
                <input value={form.supersedes_document_id} onChange={e => set("supersedes_document_id", e.target.value)} className={inputCls}
                  placeholder="Ex: 123" />
              </F>
              <F label="Journal des changements">
                <input value={form.document_change_log} onChange={e => set("document_change_log", e.target.value)} className={inputCls}
                  placeholder="Résumé des modifications" />
              </F>
            </div>

            {!doc && (
              <>
                <Sep label="Fichier" />
                <F label="Fichier à charger (optionnel)">
                  <div
                    onClick={() => fileRef.current?.click()}
                    className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all hover:border-gb-primary/50 hover:bg-gb-primary/5 ${file ? "border-gb-primary/50 bg-gb-primary/5" : "border-gb-border"}`}
                  >
                    {file ? (
                      <div className="flex items-center justify-center gap-3">
                        <FileTypeIcon type={file.type.includes("pdf") ? "pdf" : file.type.startsWith("image/") ? "image" : "other"} />
                        <div className="text-left">
                          <p className="text-sm font-bold text-gb-text truncate max-w-xs">{file.name}</p>
                          <p className="text-xs text-gb-muted">{formatBytes(file.size)}</p>
                        </div>
                        <button type="button" onClick={e => { e.stopPropagation(); setFile(null); }} className="ml-auto p-1.5 rounded-lg hover:bg-gb-surface-hover text-gb-muted">
                          <X size={14} />
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-2 text-gb-muted">
                        <Upload size={24} className="text-gb-muted/40" />
                        <p className="text-sm font-semibold">Cliquer pour sélectionner ou glisser-déposer</p>
                        <p className="text-xs">PDF, DWG, DOCX, XLSX, images — max 100 Mo</p>
                      </div>
                    )}
                  </div>
                  <input ref={fileRef} type="file" className="hidden" onChange={e => setFile(e.target.files?.[0] ?? null)} />
                </F>
              </>
            )}

            <F label="Description">
              <textarea value={form.description} onChange={e => set("description", e.target.value)} rows={3}
                placeholder="Objet du document, notes importantes…"
                className="w-full bg-gb-app border border-gb-border rounded-xl px-3 py-2.5 text-sm text-gb-text placeholder:text-gb-muted focus:ring-2 focus:ring-gb-primary outline-none transition-all resize-none" />
            </F>

            {error && (
              <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-2 bg-gb-danger/10 border border-gb-danger/20 rounded-xl px-4 py-3 text-sm text-gb-danger">
                <AlertTriangle size={14} /> {error}
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
              {saving ? <Loader2 size={14} className="animate-spin" /> : <FileText size={14} />}
              {doc ? "Enregistrer" : "Créer le document"}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// ─── Detail Drawer ────────────────────────────────────────────────────────────

function DocDetailDrawer({ doc, onClose, onEdit, onDelete, onArchive, onVersionAdded }: {
  doc: BtpDocument;
  onClose: () => void;
  onEdit: (d: BtpDocument) => void;
  onDelete: (id: number) => void;
  onArchive: (id: number, archived: boolean) => void;
  onVersionAdded: () => void;
}) {
  const [activeTab, setActiveTab] = useState<"overview" | "versions">("overview");
  const [versionFile, setVersionFile] = useState<File | null>(null);
  const [versionComment, setVersionComment] = useState("");
  const [versionRevision, setVersionRevision] = useState("");
  const [uploadingVersion, setUploadingVersion] = useState(false);
  const [versionError, setVersionError] = useState<string | null>(null);
  const [versions, setVersions] = useState<DocumentVersion[]>(doc.documentVersions ?? []);
  const versionFileRef = useRef<HTMLInputElement>(null);

  const disc    = getDisc(doc.discipline);
  const fileHref = resolveFileUrl(doc.file_url);
  const isExpired      = doc.expiry_date ? isPast(new Date(doc.expiry_date)) : false;
  const isExpiringSoon = !isExpired && doc.expiry_date
    ? isWithinInterval(new Date(doc.expiry_date), { start: new Date(), end: addDays(new Date(), 30) })
    : false;

  const fetchVersions = useCallback(async () => {
    try {
      const r = await apiFetch(`${API_BASE}/documents/${doc.id}/versions`);
      const d = await r.json();
      setVersions(Array.isArray(d) ? d : []);
    } catch { /* ignore */ }
  }, [doc.id]);

  const submitNewVersion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!versionFile) { setVersionError("Sélectionnez un fichier"); return; }
    setUploadingVersion(true); setVersionError(null);
    try {
      const fd = new FormData();
      fd.append("file", versionFile);
      if (versionComment)  fd.append("comment",  versionComment);
      if (versionRevision) fd.append("revision", versionRevision);
      await apiFetch(`${API_BASE}/documents/${doc.id}/versions`, { method: "POST", body: fd });
      setVersionFile(null); setVersionComment(""); setVersionRevision("");
      await fetchVersions();
      onVersionAdded();
    } catch (err: any) {
      setVersionError(err.message ?? "Erreur upload");
    } finally {
      setUploadingVersion(false);
    }
  };

  const InfoRow = ({ icon: Icon, label, value }: { icon: React.FC<any>; label: string; value: React.ReactNode }) => (
    <div className="flex items-start gap-3">
      <Icon size={14} className="text-gb-muted mt-0.5 shrink-0" />
      <div className="min-w-0">
        <p className="text-[10px] font-black uppercase tracking-widest text-gb-muted">{label}</p>
        <div className="text-sm font-semibold text-gb-text">{value}</div>
      </div>
    </div>
  );

  const TABS = [
    { id: "overview", label: "Vue d'ensemble" },
    { id: "versions", label: `Versions (${versions.length})` },
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
        className="w-full max-w-xl bg-gb-app border-l border-gb-border h-full overflow-y-auto flex flex-col shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-gb-border bg-gb-surface-solid/50 shrink-0">
          <div className="flex items-start justify-between gap-3 mb-4">
            <div className="flex items-center gap-3">
              <FileTypeIcon type={doc.file_type} size={16} />
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-gb-muted">
                  {disc.label} · {getPhase(doc.phase).label}
                </p>
                <p className="text-[10px] font-mono text-gb-muted/60">#{doc.id}</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={() => onEdit(doc)}
                className="p-2 rounded-xl text-gb-muted hover:text-gb-primary hover:bg-gb-primary/10 transition-colors" title="Modifier">
                <Pencil size={15} />
              </button>
              <button onClick={() => onArchive(doc.id, !doc.is_archived)}
                className="p-2 rounded-xl text-gb-muted hover:text-amber-500 hover:bg-amber-500/10 transition-colors"
                title={doc.is_archived ? "Désarchiver" : "Archiver"}>
                {doc.is_archived ? <ArchiveRestore size={15} /> : <Archive size={15} />}
              </button>
              <button onClick={() => { if (confirm("Supprimer ce document définitivement ?")) onDelete(doc.id); }}
                className="p-2 rounded-xl text-gb-muted hover:text-gb-danger hover:bg-gb-danger/10 transition-colors" title="Supprimer">
                <Trash2 size={15} />
              </button>
              <button onClick={onClose} className="p-2 rounded-xl text-gb-muted hover:text-gb-text hover:bg-gb-surface-hover transition-colors">
                <X size={18} />
              </button>
            </div>
          </div>

          <h2 className="text-xl font-extrabold text-gb-text tracking-tight leading-tight mb-1">{doc.name}</h2>
          {doc.reference && <p className="text-xs font-mono text-gb-muted mb-3">{doc.reference}</p>}

          <div className="flex flex-wrap gap-2">
            <StatusBadge status={doc.status} />
            <span className={`inline-flex items-center h-6 px-2.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${disc.badge}`}>
              {disc.label}
            </span>
            <span className="inline-flex items-center h-6 px-2.5 rounded-full text-[10px] font-black uppercase tracking-widest border border-gb-border text-gb-muted bg-gb-surface-hover">
              Rev. {doc.revision}
            </span>
            {isExpired && (
              <span className="inline-flex items-center gap-1 h-6 px-2.5 rounded-full text-[10px] font-black border border-gb-danger/30 text-gb-danger bg-gb-danger/10">
                <AlertTriangle size={10} /> Expiré
              </span>
            )}
            {isExpiringSoon && (
              <span className="inline-flex items-center gap-1 h-6 px-2.5 rounded-full text-[10px] font-black border border-amber-500/30 text-amber-600 bg-amber-500/10">
                <Clock size={10} /> Expire bientôt
              </span>
            )}
          </div>

          {fileHref && (
            <a href={fileHref} target="_blank" rel="noreferrer"
              className="mt-4 flex items-center gap-2 w-full justify-center bg-gb-primary/10 hover:bg-gb-primary/20 border border-gb-primary/30 rounded-xl h-10 text-sm font-bold text-gb-primary transition-colors">
              <Download size={14} />
              {doc.file_name ?? "Télécharger le fichier"}{doc.file_size ? ` (${formatBytes(doc.file_size)})` : ""}
            </a>
          )}
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gb-border px-6 shrink-0">
          {TABS.map(t => (
            <button key={t.id}
              onClick={() => { setActiveTab(t.id as any); if (t.id === "versions") fetchVersions(); }}
              className={`text-xs font-bold uppercase tracking-widest py-3 px-4 border-b-2 transition-colors ${
                activeTab === t.id ? "border-gb-primary text-gb-primary" : "border-transparent text-gb-muted hover:text-gb-text"
              }`}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {activeTab === "overview" && (
            <>
              <div className="grid grid-cols-2 gap-x-6 gap-y-5">
                {doc.project && <InfoRow icon={Building2} label="Projet" value={`${doc.project.code} — ${doc.project.title}`} />}
                {doc.lot && <InfoRow icon={Layers} label="Lot" value={`Lot ${doc.lot.lot_number} — ${doc.lot.name}`} />}
                <InfoRow icon={Tag} label="Catégorie" value={CATEGORIES.find(c => c.value === doc.category)?.label ?? doc.category} />
                <InfoRow icon={Shield} label="Confidentialité"
                  value={doc.confidentiality === "PUBLIC" ? "Public" : doc.confidentiality === "RESTRICTED" ? "Restreint" : "Interne"} />
                {doc.security_clearance_level && <InfoRow icon={Shield} label="Niveau de sécurité" value={doc.security_clearance_level} />}
                {doc.approval_status && <InfoRow icon={CheckCircle2} label="Statut approbation" value={doc.approval_status} />}
                {doc.supersedes_document_id && <InfoRow icon={RotateCcw} label="Remplace document ID" value={doc.supersedes_document_id} />}
                <InfoRow icon={Calendar} label="Créé le"
                  value={format(new Date(doc.created_at), "d MMM yyyy", { locale: fr })} />
                {doc.expiry_date && (
                  <InfoRow icon={Clock} label="Expiration"
                    value={<span className={isExpired ? "text-gb-danger" : isExpiringSoon ? "text-amber-600" : ""}>
                      {format(new Date(doc.expiry_date), "d MMM yyyy", { locale: fr })}
                    </span>} />
                )}
                {doc.createdBy && (
                  <InfoRow icon={Info} label="Créé par" value={`${doc.createdBy.firstname} ${doc.createdBy.lastname}`} />
                )}
                <InfoRow icon={RotateCcw} label="Mis à jour"
                  value={format(new Date(doc.updated_at), "d MMM yyyy", { locale: fr })} />
              </div>

              {doc.document_change_log && (
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-gb-muted mb-2">Journal des changements</p>
                  <p className="text-sm text-gb-text leading-relaxed bg-gb-surface-solid border border-gb-border rounded-xl p-4">
                    {doc.document_change_log}
                  </p>
                </div>
              )}

              {doc.description && (
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-gb-muted mb-2">Description</p>
                  <p className="text-sm text-gb-text leading-relaxed bg-gb-surface-solid border border-gb-border rounded-xl p-4">
                    {doc.description}
                  </p>
                </div>
              )}

              {doc.tags && (
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-gb-muted mb-2">Tags</p>
                  <div className="flex flex-wrap gap-1.5">
                    {doc.tags.split(",").map(t => t.trim()).filter(Boolean).map(tag => (
                      <span key={tag} className="text-xs font-medium px-2.5 py-1 rounded-full bg-gb-surface-solid border border-gb-border text-gb-muted">
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {activeTab === "versions" && (
            <>
              {/* Upload nouvelle version */}
              <div className="bg-gb-surface-solid border border-gb-border rounded-2xl p-4 space-y-3">
                <p className="text-[10px] font-black uppercase tracking-widest text-gb-muted">Nouvelle version</p>
                <div
                  onClick={() => versionFileRef.current?.click()}
                  className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all hover:border-gb-primary/50 hover:bg-gb-primary/5 ${versionFile ? "border-gb-primary/50 bg-gb-primary/5" : "border-gb-border"}`}
                >
                  {versionFile ? (
                    <div className="flex items-center gap-2">
                      <FileText size={14} className="text-gb-primary shrink-0" />
                      <span className="text-sm font-semibold text-gb-text truncate flex-1">{versionFile.name}</span>
                      <span className="text-xs text-gb-muted shrink-0">{formatBytes(versionFile.size)}</span>
                      <button type="button" onClick={e => { e.stopPropagation(); setVersionFile(null); }}
                        className="p-1 rounded hover:bg-gb-surface-hover text-gb-muted"><X size={12} /></button>
                    </div>
                  ) : (
                    <p className="text-xs text-gb-muted">Cliquer pour sélectionner le fichier de la nouvelle version</p>
                  )}
                </div>
                <input ref={versionFileRef} type="file" className="hidden" onChange={e => setVersionFile(e.target.files?.[0] ?? null)} />
                <div className="flex gap-2">
                  <input value={versionRevision} onChange={e => setVersionRevision(e.target.value)} placeholder="Rév. (B, C…)"
                    className="w-28 bg-gb-app border border-gb-border rounded-xl h-9 px-3 text-sm text-gb-text focus:ring-2 focus:ring-gb-primary outline-none" />
                  <input value={versionComment} onChange={e => setVersionComment(e.target.value)} placeholder="Commentaire de révision…"
                    className="flex-1 bg-gb-app border border-gb-border rounded-xl h-9 px-3 text-sm text-gb-text focus:ring-2 focus:ring-gb-primary outline-none" />
                </div>
                {versionError && (
                  <p className="text-xs text-gb-danger flex items-center gap-1.5"><AlertTriangle size={12} />{versionError}</p>
                )}
                <button onClick={submitNewVersion} disabled={uploadingVersion || !versionFile}
                  className="w-full h-9 rounded-xl bg-gb-primary text-white text-xs font-bold flex items-center justify-center gap-2 hover:opacity-90 transition-all disabled:opacity-50">
                  {uploadingVersion ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />}
                  Publier la version
                </button>
              </div>

              {/* Historique */}
              <div className="space-y-2">
                <p className="text-[10px] font-black uppercase tracking-widest text-gb-muted">Historique</p>
                {versions.length === 0 ? (
                  <p className="text-sm text-gb-muted text-center py-8">Aucune version enregistrée</p>
                ) : versions.map(v => (
                  <div key={v.id}
                    className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${v.is_current ? "bg-gb-primary/5 border-gb-primary/20" : "bg-gb-surface-solid border-gb-border"}`}>
                    <div className="w-8 h-8 rounded-lg bg-gb-surface-hover flex items-center justify-center shrink-0">
                      <span className="text-xs font-black text-gb-muted">v{v.version}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-gb-text truncate">{v.file_name ?? `Version ${v.version}`}</p>
                      <p className="text-[11px] text-gb-muted">
                        {v.revision && <span className="font-mono mr-1.5">Rev.{v.revision}</span>}
                        {formatBytes(v.file_size)}
                        {v.createdBy && ` · ${v.createdBy.firstname} ${v.createdBy.lastname}`}
                        {` · ${format(new Date(v.created_at), "d MMM yy", { locale: fr })}`}
                      </p>
                      {v.comment && <p className="text-xs text-gb-muted/70 truncate mt-0.5 italic">{v.comment}</p>}
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {v.is_current && (
                        <span className="text-[9px] font-black uppercase tracking-widest text-gb-primary bg-gb-primary/10 px-2 py-0.5 rounded-full border border-gb-primary/20">
                          Actuelle
                        </span>
                      )}
                      {resolveFileUrl(v.file_url) && (
                        <a href={resolveFileUrl(v.file_url)!} target="_blank" rel="noreferrer"
                          className="p-1.5 rounded-lg text-gb-muted hover:text-gb-primary hover:bg-gb-primary/10 transition-colors">
                          <Download size={13} />
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-gb-border bg-gb-surface-solid/50 shrink-0 flex items-center justify-between">
          <span className="text-[10px] text-gb-muted font-mono">ID #{doc.id}</span>
          <span className="text-[10px] text-gb-muted">
            Modifié {format(new Date(doc.updated_at), "d MMM yyyy à HH:mm", { locale: fr })}
          </span>
        </div>
      </motion.aside>
    </motion.div>
  );
}

// ─── Main View ────────────────────────────────────────────────────────────────

export default function DocumentsView() {
  const [docs, setDocs] = useState<BtpDocument[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [filterProject, setFilterProject] = useState("");
  const [filterDiscipline, setFilterDiscipline] = useState("");
  const [filterPhase, setFilterPhase] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedDoc, setSelectedDoc] = useState<BtpDocument | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editDoc, setEditDoc] = useState<BtpDocument | null>(null);

  const fetchDocs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterProject)    params.set("project_id",  filterProject);
      if (filterDiscipline) params.set("discipline",  filterDiscipline);
      if (filterPhase)      params.set("phase",       filterPhase);
      if (filterCategory)   params.set("category",    filterCategory);
      if (filterStatus)     params.set("status",      filterStatus);
      params.set("is_archived", String(showArchived));
      const res  = await apiFetch(`${API_BASE}/documents?${params}`);
      const data = await res.json();
      setDocs(Array.isArray(data) ? data : []);
    } catch {
      setDocs([]);
    } finally {
      setLoading(false);
    }
  }, [filterProject, filterDiscipline, filterPhase, filterCategory, filterStatus, showArchived]);

  useEffect(() => { fetchDocs(); }, [fetchDocs]);

  useEffect(() => {
    apiFetch(`${API_BASE}/projects?limit=100`)
      .then(r => r.json()).then(d => setProjects(Array.isArray(d) ? d : [])).catch(() => {});
  }, []);

  const filtered = docs.filter(d =>
    !search ||
    d.name.toLowerCase().includes(search.toLowerCase()) ||
    (d.reference ?? "").toLowerCase().includes(search.toLowerCase()) ||
    (d.project?.title ?? "").toLowerCase().includes(search.toLowerCase())
  );

  const total        = docs.length;
  const inReview     = docs.filter(d => d.status === "IN_REVIEW").length;
  const approved     = docs.filter(d => d.status === "APPROVED").length;
  const expiringSoon = docs.filter(d =>
    d.expiry_date && isWithinInterval(new Date(d.expiry_date), { start: new Date(), end: addDays(new Date(), 30) })
  ).length;

  const handleDelete = async (id: number) => {
    try {
      await apiFetch(`${API_BASE}/documents/${id}`, { method: "DELETE" });
      setDrawerOpen(false);
      setSelectedDoc(null);
      fetchDocs();
    } catch { /* ignore */ }
  };

  const handleArchive = async (id: number, archived: boolean) => {
    try {
      await apiFetch(`${API_BASE}/documents/${id}/archive`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ archived }),
      });
      setDrawerOpen(false);
      setSelectedDoc(null);
      fetchDocs();
    } catch { /* ignore */ }
  };

  const selectCls = "bg-gb-app border border-gb-border rounded-xl h-9 px-3 text-sm text-gb-text focus:ring-2 focus:ring-gb-primary outline-none transition-all";

  return (
    <div className="space-y-6 pb-8">
      {/* Title */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-gb-text">Gestion documentaire</h1>
          <p className="text-sm text-gb-muted mt-0.5">Plans, rapports, permis, spécifications — GED BTP</p>
        </div>
        <button
          onClick={() => { setEditDoc(null); setFormOpen(true); }}
          className="h-10 px-5 rounded-xl bg-gb-primary text-white text-sm font-bold shadow-lg shadow-gb-primary/20 hover:opacity-90 transition-all flex items-center gap-2">
          <Plus size={16} /> Nouveau document
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Total documents"   value={total}        icon={FileText}      accent="bg-blue-500/10 text-blue-500" />
        <KpiCard label="En révision"       value={inReview}     icon={RotateCcw}     accent="bg-amber-500/10 text-amber-600" />
        <KpiCard label="Approuvés"         value={approved}     icon={CheckCircle2}  accent="bg-emerald-500/10 text-emerald-600" />
        <KpiCard label="Expirent bientôt"  value={expiringSoon} icon={AlertTriangle}
          accent={expiringSoon > 0 ? "bg-gb-danger/10 text-gb-danger" : "bg-gb-surface-hover text-gb-muted"}
          alert={expiringSoon > 0} />
      </div>

      {/* Toolbar */}
      <div className="bg-gb-surface-solid border border-gb-border rounded-2xl p-4 flex flex-col gap-3">
        <div className="flex flex-col md:flex-row gap-3 items-center">
          <div className="relative flex-1 min-w-0">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gb-muted pointer-events-none" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Rechercher par nom, référence, projet…"
              className="w-full bg-gb-app border border-gb-border rounded-xl h-9 pl-8 pr-4 text-sm text-gb-text placeholder:text-gb-muted focus:ring-2 focus:ring-gb-primary outline-none transition-all" />
          </div>
          <div className="flex flex-wrap gap-2">
            <select value={filterProject} onChange={e => setFilterProject(e.target.value)} className={selectCls}>
              <option value="">Tous projets</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.code}</option>)}
            </select>
            <select value={filterDiscipline} onChange={e => setFilterDiscipline(e.target.value)} className={selectCls}>
              <option value="">Discipline</option>
              {DISCIPLINES.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
            </select>
            <select value={filterPhase} onChange={e => setFilterPhase(e.target.value)} className={selectCls}>
              <option value="">Phase</option>
              {PHASES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
            </select>
            <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)} className={selectCls}>
              <option value="">Catégorie</option>
              {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className={selectCls}>
              <option value="">Statut</option>
              {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
            <button onClick={() => setShowArchived(v => !v)}
              className={`h-9 px-3 rounded-xl border text-xs font-bold uppercase tracking-widest transition-all flex items-center gap-1.5 ${
                showArchived ? "bg-amber-500/10 border-amber-500/30 text-amber-600" : "border-gb-border text-gb-muted hover:bg-gb-surface-hover"
              }`}>
              <Archive size={13} /> {showArchived ? "Archivés" : "Actifs"}
            </button>
          </div>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center p-24">
          <Loader2 className="w-8 h-8 text-gb-primary animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="p-20 text-center bg-gb-surface-solid border border-dashed border-gb-border rounded-3xl">
          <FolderOpen className="mx-auto text-gb-muted/20 mb-6" size={64} />
          <h3 className="text-xl font-bold text-gb-text mb-2">Aucun document</h3>
          <p className="text-gb-muted text-sm">Créez votre premier document pour alimenter la GED.</p>
        </div>
      ) : (
        <div className="bg-gb-surface-solid border border-gb-border rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gb-border">
                <th className="w-1" />
                <th className="py-3 px-4 text-left text-[10px] font-black uppercase tracking-widest text-gb-muted">Document</th>
                <th className="py-3 px-4 text-left text-[10px] font-black uppercase tracking-widest text-gb-muted hidden lg:table-cell">Phase</th>
                <th className="py-3 px-4 text-left text-[10px] font-black uppercase tracking-widest text-gb-muted hidden xl:table-cell">Catégorie</th>
                <th className="py-3 px-4 text-center text-[10px] font-black uppercase tracking-widest text-gb-muted hidden md:table-cell">Rév.</th>
                <th className="py-3 px-4 text-left text-[10px] font-black uppercase tracking-widest text-gb-muted hidden xl:table-cell">Expiration</th>
                <th className="py-3 px-4 text-left text-[10px] font-black uppercase tracking-widest text-gb-muted">Statut</th>
                <th className="w-10" />
              </tr>
            </thead>
            <tbody>
              <AnimatePresence initial={false}>
                {filtered.map((d, i) => {
                  const disc    = getDisc(d.discipline);
                  const expired = d.expiry_date ? isPast(new Date(d.expiry_date)) : false;
                  const soon    = !expired && d.expiry_date
                    ? isWithinInterval(new Date(d.expiry_date), { start: new Date(), end: addDays(new Date(), 30) })
                    : false;
                  return (
                    <motion.tr key={d.id}
                      initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.025 }}
                      onClick={() => { setSelectedDoc(d); setDrawerOpen(true); }}
                      className="border-b border-gb-border/50 last:border-0 hover:bg-gb-surface-hover cursor-pointer group transition-colors"
                    >
                      <td className="pl-3 pr-0 py-4">
                        <div className={`w-1 h-10 rounded-full ${disc.bar}`} title={disc.label} />
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <FileTypeIcon type={d.file_type} />
                          <div className="min-w-0">
                            <p className="font-bold text-gb-text truncate max-w-xs">{d.name}</p>
                            <p className="text-[11px] text-gb-muted mt-0.5 flex items-center gap-1.5">
                              {d.reference && <span className="font-mono">{d.reference}</span>}
                              {d.reference && d.project && <span>·</span>}
                              {d.project && <span>{d.project.title}</span>}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 hidden lg:table-cell">
                        <span className={`text-xs font-bold ${getPhase(d.phase).color}`}>{getPhase(d.phase).label}</span>
                      </td>
                      <td className="px-4 py-4 hidden xl:table-cell">
                        <span className="text-xs font-semibold text-gb-muted">
                          {CATEGORIES.find(c => c.value === d.category)?.label ?? d.category}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-center hidden md:table-cell">
                        <span className="text-xs font-mono font-black text-gb-text">{d.revision}</span>
                      </td>
                      <td className="px-4 py-4 hidden xl:table-cell">
                        {d.expiry_date ? (
                          <span className={`flex items-center gap-1 text-xs font-semibold ${expired ? "text-gb-danger" : soon ? "text-amber-600" : "text-gb-muted"}`}>
                            {(expired || soon) && <AlertTriangle size={11} />}
                            {format(new Date(d.expiry_date), "dd/MM/yy")}
                          </span>
                        ) : (
                          <span className="text-gb-muted/40 text-xs">—</span>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        <StatusBadge status={d.status} />
                      </td>
                      <td className="pr-3">
                        <ChevronRight size={16} className="text-gb-muted group-hover:text-gb-primary transition-colors" />
                      </td>
                    </motion.tr>
                  );
                })}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
      )}

      {/* Detail Drawer */}
      <AnimatePresence>
        {drawerOpen && selectedDoc && (
          <DocDetailDrawer
            doc={selectedDoc}
            onClose={() => { setDrawerOpen(false); setSelectedDoc(null); }}
            onEdit={d => { setEditDoc(d); setDrawerOpen(false); setFormOpen(true); }}
            onDelete={handleDelete}
            onArchive={handleArchive}
            onVersionAdded={fetchDocs}
          />
        )}
      </AnimatePresence>

      {/* Form Dialog */}
      <DocFormDialog
        open={formOpen}
        onClose={() => { setFormOpen(false); setEditDoc(null); }}
        doc={editDoc}
        onSaved={() => { setFormOpen(false); setEditDoc(null); fetchDocs(); }}
      />
    </div>
  );
}
