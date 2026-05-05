import React, { useState, useEffect, useRef } from "react";
import { apiFetch, API_BASE } from "../../lib/api";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "../ui/dialog";
import { Button } from "../ui/button";
import {
  Loader2, FileText, Building2, Calendar, Banknote, Save, X,
  Upload, Paperclip, CheckCircle2, AlertCircle, Trash2,
} from "lucide-react";
import { motion } from "motion/react";

interface TenderFormDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  tender: any | null;
  onSaved: () => void;
}

const TYPES = [
  { value: "OPEN",        label: "Appel d'offres ouvert" },
  { value: "RESTRICTED",  label: "Appel d'offres restreint" },
  { value: "NEGOTIATED",  label: "Marché négocié" },
];

const CATEGORIES = [
  { value: "TRAVAUX",     label: "Travaux" },
  { value: "FOURNITURES", label: "Fournitures" },
  { value: "SERVICES",    label: "Services" },
  { value: "MOE",         label: "Maîtrise d'œuvre" },
];

const STATUSES = [
  { value: "DRAFT",       label: "Brouillon" },
  { value: "PUBLISHED",   label: "Publié" },
  { value: "OPEN",        label: "Ouvert" },
  { value: "EVALUATION",  label: "En évaluation" },
  { value: "AWARDED",     label: "Attribué" },
  { value: "CANCELLED",   label: "Annulé" },
  { value: "CLOSED",      label: "Clôturé" },
];

const CURRENCIES = ["EUR", "USD", "XAF", "MAD", "DZD"];

const inputCls = "w-full bg-gb-app border border-gb-border rounded-xl h-10 px-3 text-sm text-gb-text placeholder:text-gb-muted focus:ring-2 focus:ring-gb-primary outline-none transition-all";
const selectCls = "w-full bg-gb-app border border-gb-border rounded-xl h-10 px-3 text-sm text-gb-text focus:ring-2 focus:ring-gb-primary outline-none transition-all";
const textareaCls = "w-full bg-gb-app border border-gb-border rounded-xl px-3 py-2.5 text-sm text-gb-text placeholder:text-gb-muted focus:ring-2 focus:ring-gb-primary outline-none transition-all resize-none";

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[10px] font-black uppercase tracking-widest text-gb-muted">
        {label}{required && <span className="text-gb-danger ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}

function SectionTitle({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 mt-1">
      <h3 className="text-[10px] font-black uppercase tracking-widest text-gb-muted">{label}</h3>
      <div className="flex-1 h-px bg-gb-border/60 ml-2" />
    </div>
  );
}

const EMPTY = {
  title: "", type: "OPEN", category: "TRAVAUX",
  status: "DRAFT", currency: "EUR", project_id: "",
  lot_id: "", budget_estimate: "", submission_deadline: "",
  opening_date: "", notes: "", description: "",
};

type UploadedFile = {
  documentId: number;
  url: string;
  filename: string;
  size?: number;
};

function parseDocumentUrls(tender: any): UploadedFile[] {
  // New approach: tender.documents is a Document[] with direct tender_id FK
  if (tender?.documents && Array.isArray(tender.documents) && tender.documents.length > 0) {
    return tender.documents.map((doc: any) => ({
      documentId: doc.id,
      url: doc.file_url ?? "",
      filename: doc.file_name ?? doc.name ?? "Pièce jointe",
      size: doc.file_size ?? undefined,
    }));
  }
  return [];
}

export default function TenderFormDialog({ open, onOpenChange, tender, onSaved }: TenderFormDialogProps) {
  const [form, setForm] = useState({ ...EMPTY });
  const [projects, setProjects] = useState<any[]>([]);
  const [lots, setLots] = useState<any[]>([]);
  const [attachments, setAttachments] = useState<UploadedFile[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  // ── Génère une référence unique AO-{year}-{3 chiffres aléatoires}
  function genRef() {
    const year = new Date().getFullYear();
    const rand = String(Math.floor(Math.random() * 900) + 100);
    return `AO-${year}-${rand}`;
  }

  useEffect(() => {
    if (!open) return;
    apiFetch(`${API_BASE}/projects?limit=100`)
      .then(r => r.json()).then(d => setProjects(Array.isArray(d) ? d : (d?.data ?? []))).catch(() => {});
  }, [open]);

  useEffect(() => {
    if (!form.project_id) { setLots([]); return; }
    apiFetch(`${API_BASE}/projects/${form.project_id}/lots`)
      .then(r => r.json()).then(d => setLots(Array.isArray(d) ? d : (d?.data ?? []))).catch(() => {});
  }, [form.project_id]);

  useEffect(() => {
    if (!open) return;
    if (tender) {
      setForm({
        title:               tender.title ?? "",
        type:                tender.type ?? "OPEN",
        category:            tender.category ?? "TRAVAUX",
        status:              tender.status ?? "DRAFT",
        currency:            tender.currency ?? "EUR",
        project_id:          tender.project_id ? String(tender.project_id) : "",
        lot_id:              tender.lot_id ? String(tender.lot_id) : "",
        budget_estimate:     tender.budget_estimate != null ? String(tender.budget_estimate) : "",
        submission_deadline: tender.submission_deadline ? tender.submission_deadline.split("T")[0] : "",
        opening_date:        tender.opening_date ? tender.opening_date.split("T")[0] : "",
        notes:               tender.notes ?? "",
        description:         tender.description ?? "",
      });
      setAttachments(parseDocumentUrls(tender));
    } else {
      setForm({ ...EMPTY });
      setAttachments([]);
    }
    setError(null);
    setUploadError(null);
  }, [open, tender]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) { setError("Le titre est obligatoire"); return; }
    if (!form.project_id)   { setError("Le projet est obligatoire"); return; }
    if (uploading)           { setError("Veuillez attendre la fin de l'envoi du fichier."); return; }
    setSaving(true);
    setError(null);
    try {
      const payload: Record<string, any> = {
        title:               form.title,
        type:                form.type,
        category:            form.category,
        status:              form.status,
        currency:            form.currency,
        project_id:          Number(form.project_id),
        lot_id:              form.lot_id ? Number(form.lot_id) : undefined,
        budget_estimate:     form.budget_estimate ? Number(form.budget_estimate) : undefined,
        submission_deadline: form.submission_deadline || undefined,
        opening_date:        form.opening_date || undefined,
        // Send document IDs for proper DB relations (skip documentId=0 legacy entries)
        document_ids:        attachments.filter(a => a.documentId > 0).map(a => a.documentId),
        notes:               form.notes || undefined,
        description:         form.description || undefined,
      };
      if (tender) {
        await apiFetch(`${API_BASE}/procurement/tenders/${tender.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        payload.reference = genRef();
        await apiFetch(`${API_BASE}/procurement/tenders`, {
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl w-full max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden rounded-2xl">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-gb-border shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-500/10 flex items-center justify-center">
              <FileText size={16} className="text-blue-500" />
            </div>
            <DialogTitle className="text-lg font-extrabold text-gb-text">
              {tender ? "Modifier l'appel d'offres" : "Nouvel appel d'offres"}
            </DialogTitle>
          </div>
        </DialogHeader>

        <form onSubmit={submit} className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          <SectionTitle label="Identification" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <Field label="Intitulé de l'AO" required>
                <input value={form.title} onChange={e => set("title", e.target.value)} placeholder="ex: Gros œuvre - Bâtiment A" className={inputCls} />
              </Field>
            </div>
            <Field label="Statut">
              <select value={form.status} onChange={e => set("status", e.target.value)} className={selectCls}>
                {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </Field>
          </div>

          <SectionTitle label="Type & Catégorie" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Type de consultation" required>
              <select value={form.type} onChange={e => set("type", e.target.value)} className={selectCls}>
                {TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </Field>
            <Field label="Catégorie" required>
              <select value={form.category} onChange={e => set("category", e.target.value)} className={selectCls}>
                {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </Field>
          </div>

          <SectionTitle label="Périmètre" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Projet" required>
              <select value={form.project_id} onChange={e => set("project_id", e.target.value)} className={selectCls}>
                <option value="">Sélectionner…</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.code} — {p.title}</option>)}
              </select>
            </Field>
            <Field label="Lot (optionnel)">
              <select value={form.lot_id} onChange={e => set("lot_id", e.target.value)} className={selectCls} disabled={!form.project_id}>
                <option value="">Tous lots</option>
                {lots.map(l => <option key={l.id} value={l.id}>Lot {l.lot_number} — {l.name}</option>)}
              </select>
            </Field>
          </div>

          <SectionTitle label="Conditions financières" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Budget estimé (HT)">
              <input type="number" min={0} value={form.budget_estimate} onChange={e => set("budget_estimate", e.target.value)} placeholder="0" className={inputCls} />
            </Field>
            <Field label="Devise">
              <select value={form.currency} onChange={e => set("currency", e.target.value)} className={selectCls}>
                {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </Field>
          </div>

          <SectionTitle label="Calendrier" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Date limite de dépôt">
              <input type="date" value={form.submission_deadline} onChange={e => set("submission_deadline", e.target.value)} className={inputCls} />
            </Field>
            <Field label="Date d'ouverture des plis">
              <input type="date" value={form.opening_date} onChange={e => set("opening_date", e.target.value)} className={inputCls} />
            </Field>
          </div>

          <SectionTitle label="Documents & Informations" />
          <div className="space-y-4">
            <Field label="Pièces jointes DCE (plusieurs fichiers)">
              <div className="space-y-2">
                {!form.project_id && (
                  <p className="text-xs text-gb-muted italic px-1">Sélectionnez d'abord un projet pour activer l'upload.</p>
                )}
                {/* input file hors du flux du form pour éviter tout submit parasite */}
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  multiple
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip,.rar"
                  onChange={async (e) => {
                    const files = e.target.files ? Array.from(e.target.files) : [];
                    if (!files.length) return;
                    setUploading(true);
                    setUploadError(null);
                    try {
                      const fd = new FormData();
                      files.forEach((file) => fd.append("files", file));
                      fd.append("project_id", form.project_id);
                      const res = await apiFetch(`${API_BASE}/procurement/tenders/dce-uploads`, {
                        method: "POST",
                        body: fd,
                        noAutoLogout: true, // un échec d'upload ne doit jamais déconnecter l'utilisateur
                      });
                      if (!res.ok) {
                        const errData = await res.json().catch(() => ({}));
                        throw new Error(errData?.error ?? "Échec de l'envoi");
                      }
                      const data = await res.json();
                      setAttachments((prev) => [...prev, ...(Array.isArray(data.files) ? data.files : [])]);
                    } catch (err: any) {
                      setUploadError(err?.message ?? "Impossible d'envoyer le fichier. Réessayez.");
                    } finally {
                      setUploading(false);
                      e.target.value = "";
                    }
                  }}
                />
                <div
                  role="button"
                  tabIndex={form.project_id && !uploading ? 0 : -1}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (!form.project_id || uploading) return;
                    fileInputRef.current?.click();
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      e.stopPropagation();
                      if (!form.project_id || uploading) return;
                      fileInputRef.current?.click();
                    }
                  }}
                  className={`flex items-center gap-3 min-h-[52px] px-4 py-3 rounded-xl border-2 border-dashed transition-colors select-none ${
                    !form.project_id
                      ? "opacity-40 cursor-not-allowed border-gb-border"
                      : uploading
                      ? "cursor-wait border-gb-primary/40 bg-gb-primary/5"
                      : attachments.length > 0
                      ? "cursor-pointer border-emerald-500/40 bg-emerald-500/5 hover:border-emerald-500/60"
                      : "cursor-pointer border-gb-border hover:border-gb-primary/50 hover:bg-gb-primary/5"
                  }`}
                >
                  {uploading ? (
                    <><Loader2 size={16} className="text-gb-primary animate-spin shrink-0" /><span className="text-sm text-gb-primary font-semibold">Envoi en cours…</span></>
                  ) : attachments.length > 0 ? (
                    <><CheckCircle2 size={16} className="text-emerald-500 shrink-0" /><span className="text-sm text-emerald-600 truncate font-semibold">{attachments.length} pièce(s) jointe(s)</span><span className="ml-auto text-[11px] font-semibold text-gb-muted">Ajouter d'autres fichiers</span></>
                  ) : (
                    <><Upload size={16} className="text-gb-muted shrink-0" /><span className="text-sm text-gb-muted font-semibold">Cliquer pour charger vos pièces DCE (PDF, Word, Excel, ZIP…)</span></>
                  )}
                </div>
                {uploadError && (
                  <p className="flex items-center gap-1.5 text-xs text-gb-danger"><AlertCircle size={12} />{uploadError}</p>
                )}
                {attachments.length > 0 && (
                  <div className="space-y-1.5">
                    {attachments.map((file, idx) => (
                      <div key={`${file.url}-${idx}`} className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gb-border bg-gb-app">
                        <Paperclip size={13} className="text-gb-muted shrink-0" />
                        <a href={file.url} target="_blank" rel="noreferrer" className="text-xs font-medium text-gb-text truncate hover:text-gb-primary hover:underline">
                          {file.filename}
                        </a>
                        <button
                          type="button"
                          onClick={() => setAttachments((prev) => prev.filter((_, i) => i !== idx))}
                          className="ml-auto p-1 rounded text-gb-danger hover:bg-gb-danger/10"
                          title="Retirer ce fichier"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Field>
            <Field label="Description / Objet">
              <textarea value={form.description} onChange={e => set("description", e.target.value)} rows={3} placeholder="Décrire le périmètre de la consultation…" className={textareaCls} />
            </Field>
            <Field label="Notes internes">
              <textarea value={form.notes} onChange={e => set("notes", e.target.value)} rows={2} placeholder="Observations, consignes particulières…" className={textareaCls} />
            </Field>
          </div>

          {error && (
            <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2 bg-gb-danger/10 border border-gb-danger/20 rounded-xl px-4 py-3 text-sm text-gb-danger">
              {error}
            </motion.div>
          )}
        </form>

        <div className="px-6 py-4 border-t border-gb-border bg-gb-app shrink-0 flex justify-end gap-3">
          <Button type="button" variant="outline" className="h-10 rounded-xl border-gb-border" onClick={() => onOpenChange(false)}>
            <X size={14} className="mr-1.5" /> Annuler
          </Button>
          <Button type="submit" className="h-10 rounded-xl px-6 shadow-lg shadow-gb-primary/20" onClick={submit} disabled={saving}>
            {saving ? <Loader2 size={14} className="animate-spin mr-1.5" /> : <Save size={14} className="mr-1.5" />}
            {tender ? "Enregistrer" : "Créer l'AO"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
