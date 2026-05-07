import React, { useState, useEffect, useRef } from "react";
import { apiFetch, API_BASE } from "../../lib/api";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "../ui/dialog";
import { Button } from "../ui/button";
import {
  Loader2, FileText, Building2, Calendar, Banknote, Save, X,
  Upload, Paperclip, CheckCircle2, AlertCircle, Trash2,
  Users, Mail, MapPin, ShieldCheck,
  Check, ChevronLeft, ChevronRight,
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

const SUBMISSION_MODES = [
  { value: "PLATFORM", label: "Plateforme sécurisée" },
  { value: "EMAIL", label: "Remise par email" },
  { value: "PHYSICAL", label: "Remise physique" },
];

const EVALUATION_METHODS = [
  { value: "WEIGHTED", label: "Notation pondérée" },
  { value: "LOWEST_PRICE", label: "Prix le plus bas" },
  { value: "TECHNICAL_FIRST", label: "Technique puis financier" },
];

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
  opening_date: "", publication_date: "", clarification_deadline: "",
  site_visit_date: "", site_visit_location: "",
  submission_mode: "PLATFORM", evaluation_method: "WEIGHTED",
  technical_weight: "60", financial_weight: "40", commercial_weight: "0",
  notes: "", description: "", award_notes: "",
};

type SupplierOption = {
  id: number;
  name: string;
  email?: string;
  contact_name?: string;
  specialty?: string;
};

type UploadedFile = {
  documentId: number;
  url: string;
  filename: string;
  size?: number;
};

type StepConfig = {
  id: number;
  label: string;
  icon: React.ElementType;
};

const TENDER_STEPS: StepConfig[] = [
  { id: 1, label: "Essentiels", icon: FileText },
  { id: 2, label: "Calendrier", icon: Calendar },
  { id: 3, label: "Consultation", icon: Users },
  { id: 4, label: "Finalisation", icon: ShieldCheck },
];

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

function StepBar({ current, steps }: { current: number; steps: StepConfig[] }) {
  return (
    <div className="flex items-center gap-0 w-full mb-6">
      {steps.map((step, idx) => {
        const done = current > step.id;
        const active = current === step.id;
        const Icon = step.icon;

        return (
          <React.Fragment key={step.id}>
            <div className="flex flex-col items-center gap-1.5 flex-shrink-0">
              <div
                className={[
                  "w-9 h-9 rounded-full flex items-center justify-center border-2 transition-all duration-300",
                  done ? "bg-gb-primary border-gb-primary text-white" : "",
                  active ? "bg-gb-primary/10 border-gb-primary text-gb-primary shadow-[0_0_0_4px_rgba(var(--gb-primary-rgb),0.15)]" : "",
                  !done && !active ? "bg-gb-app border-gb-border text-gb-muted" : "",
                ].join(" ")}
              >
                {done ? <Check className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
              </div>
              <span
                className={[
                  "text-[10px] font-medium leading-none whitespace-nowrap",
                  active ? "text-gb-primary" : done ? "text-gb-primary/70" : "text-gb-muted",
                ].join(" ")}
              >
                {step.label}
              </span>
            </div>
            {idx < steps.length - 1 && (
              <div
                className={[
                  "flex-1 h-0.5 mb-4 mx-1 rounded-full transition-all duration-500",
                  current > step.id ? "bg-gb-primary" : "bg-gb-border",
                ].join(" ")}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

export default function TenderFormDialog({ open, onOpenChange, tender, onSaved }: TenderFormDialogProps) {
  const steps = TENDER_STEPS;
  const formId = "tender-form-dialog-form";
  const [form, setForm] = useState({ ...EMPTY });
  const [step, setStep] = useState(1);
  const [projects, setProjects] = useState<any[]>([]);
  const [lots, setLots] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<SupplierOption[]>([]);
  const [selectedSupplierIds, setSelectedSupplierIds] = useState<number[]>([]);
  const [attachments, setAttachments] = useState<UploadedFile[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  useEffect(() => {
    if (!open) return;
    setStep(1);
    Promise.all([
      apiFetch(`${API_BASE}/projects?limit=100`).then(r => r.json()).catch(() => []),
      apiFetch(`${API_BASE}/procurement/suppliers`).then(r => r.json()).catch(() => []),
    ]).then(([projectData, supplierData]) => {
      setProjects(Array.isArray(projectData) ? projectData : (projectData?.data ?? []));
      setSuppliers(Array.isArray(supplierData) ? supplierData : []);
    }).catch(() => {});
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
        publication_date:    tender.publication_date ? tender.publication_date.split("T")[0] : "",
        clarification_deadline: tender.clarification_deadline ? tender.clarification_deadline.split("T")[0] : "",
        site_visit_date:     tender.site_visit_date ? tender.site_visit_date.split("T")[0] : "",
        site_visit_location: tender.site_visit_location ?? "",
        submission_mode:     tender.submission_mode ?? "PLATFORM",
        evaluation_method:   tender.evaluation_method ?? "WEIGHTED",
        technical_weight:    tender.technical_weight != null ? String(tender.technical_weight) : "60",
        financial_weight:    tender.financial_weight != null ? String(tender.financial_weight) : "40",
        commercial_weight:   tender.commercial_weight != null ? String(tender.commercial_weight) : "0",
        notes:               tender.notes ?? "",
        description:         tender.description ?? "",
        award_notes:         tender.award_notes ?? "",
      });
      setSelectedSupplierIds(
        Array.isArray(tender.invitedSuppliers)
          ? tender.invitedSuppliers.map((item: any) => Number(item.supplier_id)).filter((id: number) => Number.isFinite(id) && id > 0)
          : []
      );
      setAttachments(parseDocumentUrls(tender));
    } else {
      setForm({ ...EMPTY });
      setSelectedSupplierIds([]);
      setAttachments([]);
    }
    setError(null);
    setUploadError(null);
  }, [open, tender]);

  const handleClose = () => {
    if (saving) return;
    setError(null);
    setUploadError(null);
    setStep(1);
    onOpenChange(false);
  };

  const validateStep = (currentStep: number) => {
    if (currentStep === 1) {
      if (!form.title.trim()) return "Le titre est obligatoire";
      if (!form.project_id) return "Le projet est obligatoire";
    }

    if (currentStep === 4 && uploading) {
      return "Veuillez attendre la fin de l'envoi du fichier.";
    }

    return null;
  };

  const goNext = () => {
    const nextError = validateStep(step);
    if (nextError) {
      setError(nextError);
      return;
    }

    setError(null);
    setStep((current) => Math.min(current + 1, steps.length));
  };

  const goPrev = () => {
    setError(null);
    setStep((current) => Math.max(current - 1, 1));
  };

  const submit = async () => {
    const submitError = validateStep(step);
    if (submitError) { setError(submitError); return; }
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
        publication_date:    form.publication_date || undefined,
        clarification_deadline: form.clarification_deadline || undefined,
        site_visit_date:     form.site_visit_date || undefined,
        site_visit_location: form.site_visit_location || undefined,
        submission_mode:     form.submission_mode,
        evaluation_method:   form.evaluation_method,
        technical_weight:    form.technical_weight ? Number(form.technical_weight) : undefined,
        financial_weight:    form.financial_weight ? Number(form.financial_weight) : undefined,
        commercial_weight:   form.commercial_weight ? Number(form.commercial_weight) : undefined,
        // Send document IDs for proper DB relations (skip documentId=0 legacy entries)
        document_ids:        attachments.filter(a => a.documentId > 0).map(a => a.documentId),
        invited_supplier_ids: selectedSupplierIds,
        notes:               form.notes || undefined,
        description:         form.description || undefined,
        award_notes:         form.award_notes || undefined,
      };
      if (tender) {
        const response = await apiFetch(`${API_BASE}/procurement/tenders/${tender.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!response.ok) {
          const body = await response.json().catch(() => ({}));
          throw new Error(body?.error || `Erreur HTTP ${response.status}`);
        }
      } else {
        const response = await apiFetch(`${API_BASE}/procurement/tenders`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!response.ok) {
          const body = await response.json().catch(() => ({}));
          throw new Error(body?.error || `Erreur HTTP ${response.status}`);
        }
      }
      onSaved();
    } catch (err: any) {
      setError(err.message ?? "Erreur lors de l'enregistrement");
    } finally {
      setSaving(false);
    }
  };

  const handleFormSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (step < steps.length) {
      goNext();
      return;
    }

    await submit();
  };

  const weightTotal = [form.technical_weight, form.financial_weight, form.commercial_weight]
    .map((value) => Number(value || 0))
    .reduce((sum, value) => sum + (Number.isFinite(value) ? value : 0), 0);

  const toggleInvitedSupplier = (supplierId: number) => {
    setSelectedSupplierIds((current) =>
      current.includes(supplierId)
        ? current.filter((id) => id !== supplierId)
        : [...current, supplierId]
    );
  };

  const summaryCard = (
    <div className="rounded-2xl border border-gb-border bg-gb-surface-solid/40 p-4 space-y-3">
      <p className="text-[10px] font-black uppercase tracking-widest text-gb-muted">Récapitulatif</p>
      <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
        <span className="text-gb-muted">Intitulé</span>
        <span className="font-semibold text-gb-text truncate">{form.title || "Non renseigné"}</span>
        <span className="text-gb-muted">Projet</span>
        <span className="font-semibold text-gb-text truncate">{projects.find((project) => String(project.id) === form.project_id)?.title || "Non renseigné"}</span>
        <span className="text-gb-muted">Budget</span>
        <span className="font-semibold text-gb-text">{form.budget_estimate ? `${Number(form.budget_estimate).toLocaleString("fr-FR")} ${form.currency}` : "Non renseigné"}</span>
        <span className="text-gb-muted">Fournisseurs</span>
        <span className="font-semibold text-gb-text">{selectedSupplierIds.length} sélectionné(s)</span>
        <span className="text-gb-muted">Pièces DCE</span>
        <span className="font-semibold text-gb-text">{attachments.length} fichier(s)</span>
      </div>
    </div>
  );

  const stepContent: Record<number, React.ReactNode> = {
    1: (
      <div className="space-y-5">
        <div className="space-y-1 mb-2">
          <p className="text-base font-semibold text-gb-text">Identification de l'appel d'offres</p>
          <p className="text-xs text-gb-muted">Commencez par le cadrage essentiel de la consultation. La logique métier existante reste inchangée.</p>
        </div>

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
      </div>
    ),
    2: (
      <div className="space-y-5">
        <div className="space-y-1 mb-2">
          <p className="text-base font-semibold text-gb-text">Budget & calendrier</p>
          <p className="text-xs text-gb-muted">Regroupez ici les paramètres financiers et le planning de consultation pour éviter un formulaire long d’un seul bloc.</p>
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
          <Field label="Date de publication">
            <input type="date" value={form.publication_date} onChange={e => set("publication_date", e.target.value)} className={inputCls} />
          </Field>
          <Field label="Date limite de clarification">
            <input type="date" value={form.clarification_deadline} onChange={e => set("clarification_deadline", e.target.value)} className={inputCls} />
          </Field>
          <Field label="Date de visite de site">
            <input type="date" value={form.site_visit_date} onChange={e => set("site_visit_date", e.target.value)} className={inputCls} />
          </Field>
          <Field label="Lieu de visite">
            <div className="relative">
              <MapPin size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gb-muted" />
              <input value={form.site_visit_location} onChange={e => set("site_visit_location", e.target.value)} placeholder="Base vie, chantier, salle de réunion..." className={`${inputCls} pl-9`} />
            </div>
          </Field>
        </div>
      </div>
    ),
    3: (
      <div className="space-y-5">
        <div className="space-y-1 mb-2">
          <p className="text-base font-semibold text-gb-text">Pilotage de consultation</p>
          <p className="text-xs text-gb-muted">La short-list fournisseurs et la méthode d’analyse sont organisées dans une étape dédiée, plus premium et plus lisible.</p>
        </div>

        <SectionTitle label="Pilotage premium" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Mode de remise">
            <select value={form.submission_mode} onChange={e => set("submission_mode", e.target.value)} className={selectCls}>
              {SUBMISSION_MODES.map((mode) => <option key={mode.value} value={mode.value}>{mode.label}</option>)}
            </select>
          </Field>
          <Field label="Méthode d'évaluation">
            <select value={form.evaluation_method} onChange={e => set("evaluation_method", e.target.value)} className={selectCls}>
              {EVALUATION_METHODS.map((method) => <option key={method.value} value={method.value}>{method.label}</option>)}
            </select>
          </Field>
        </div>

        <div className="rounded-2xl border border-gb-border bg-gb-surface-solid/40 p-4 space-y-4">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-gb-muted">Grille d'évaluation</p>
              <p className="text-sm text-gb-muted mt-1">Définissez la pondération cible de la consultation pour fiabiliser l'analyse comparative.</p>
            </div>
            <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold ${weightTotal === 100 ? "bg-emerald-500/10 text-emerald-600" : "bg-amber-500/10 text-amber-600"}`}>
              <ShieldCheck size={12} /> Total {weightTotal}%
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Field label="Technique %">
              <input type="number" min={0} max={100} value={form.technical_weight} onChange={e => set("technical_weight", e.target.value)} className={inputCls} />
            </Field>
            <Field label="Financier %">
              <input type="number" min={0} max={100} value={form.financial_weight} onChange={e => set("financial_weight", e.target.value)} className={inputCls} />
            </Field>
            <Field label="Commercial %">
              <input type="number" min={0} max={100} value={form.commercial_weight} onChange={e => set("commercial_weight", e.target.value)} className={inputCls} />
            </Field>
          </div>
        </div>

        <SectionTitle label="Consultation fournisseurs" />
        <div className="rounded-2xl border border-gb-border bg-gb-surface-solid/40 p-4 space-y-3">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <p className="text-sm font-bold text-gb-text">Fournisseurs invités</p>
              <p className="text-xs text-gb-muted mt-1">Préparez votre short-list dès la création de l'AO. Rien n'est retiré du flux actuel.</p>
            </div>
            <span className="inline-flex items-center gap-2 rounded-full bg-gb-app border border-gb-border px-3 py-1 text-xs font-semibold text-gb-muted">
              <Users size={12} /> {selectedSupplierIds.length} sélectionné(s)
            </span>
          </div>
          {suppliers.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gb-border px-4 py-5 text-sm text-gb-muted">
              Aucun fournisseur disponible pour l'invitation.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-72 overflow-y-auto pr-1">
              {suppliers.map((supplier) => {
                const selected = selectedSupplierIds.includes(supplier.id);
                return (
                  <button
                    key={supplier.id}
                    type="button"
                    onClick={() => toggleInvitedSupplier(supplier.id)}
                    className={`text-left rounded-xl border px-4 py-3 transition-all ${selected ? "border-gb-primary bg-gb-primary/5 shadow-sm" : "border-gb-border bg-gb-app hover:border-gb-primary/30"}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-gb-text truncate">{supplier.name}</p>
                        {supplier.specialty && <p className="text-[11px] font-semibold text-gb-primary mt-1">{supplier.specialty}</p>}
                        <div className="mt-2 space-y-1">
                          {supplier.contact_name && <p className="text-xs text-gb-muted truncate">{supplier.contact_name}</p>}
                          {supplier.email && <p className="text-xs text-gb-muted truncate flex items-center gap-1"><Mail size={11} />{supplier.email}</p>}
                        </div>
                      </div>
                      {selected && <CheckCircle2 size={16} className="text-gb-primary shrink-0 mt-0.5" />}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    ),
    4: (
      <div className="space-y-5">
        <div className="space-y-1 mb-2">
          <p className="text-base font-semibold text-gb-text">Documents & finalisation</p>
          <p className="text-xs text-gb-muted">Vous terminez la consultation avec les pièces DCE, les notes et un récapitulatif clair avant enregistrement.</p>
        </div>

        <SectionTitle label="Documents & Informations" />
        <div className="space-y-4">
          <Field label="Pièces jointes DCE (plusieurs fichiers)">
            <div className="space-y-2">
              {!form.project_id && (
                <p className="text-xs text-gb-muted italic px-1">Sélectionnez d'abord un projet pour activer l'upload.</p>
              )}
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
                      noAutoLogout: true,
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
          <Field label="Synthèse d'attribution (optionnel)">
            <textarea value={form.award_notes} onChange={e => set("award_notes", e.target.value)} rows={3} placeholder="Arguments de recommandation, vigilance, points contractuels..." className={textareaCls} />
          </Field>
        </div>

        {summaryCard}
      </div>
    ),
  };

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => { if (!nextOpen) handleClose(); }}>
      <DialogContent className="max-w-2xl w-full max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden rounded-2xl">
        <DialogHeader className="px-6 pt-6 pb-0 shrink-0">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-blue-500/10 flex items-center justify-center">
                <FileText size={16} className="text-blue-500" />
              </div>
              <DialogTitle className="text-lg font-extrabold text-gb-text">
                {tender ? "Modifier l'appel d'offres" : "Nouvel appel d'offres"}
              </DialogTitle>
            </div>
            <Button type="button" variant="ghost" size="icon-sm" onClick={handleClose} disabled={saving} className="text-gb-muted hover:text-gb-text">
              <X className="w-4 h-4" />
              <span className="sr-only">Fermer</span>
            </Button>
          </div>
        </DialogHeader>

        <div className="px-6 pt-5 pb-4">
          <StepBar current={step} steps={steps} />
        </div>

        <form id={formId} onSubmit={(e) => e.preventDefault()} className="flex-1 overflow-y-auto px-6 pb-5">
          <div className="min-h-[420px]">
            {stepContent[step]}
          </div>

          {error && (
            <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2 bg-gb-danger/10 border border-gb-danger/20 rounded-xl px-4 py-3 text-sm text-gb-danger mt-4">
              <AlertCircle size={14} className="shrink-0" />
              {error}
            </motion.div>
          )}
        </form>

        <div className="px-6 py-4 border-t border-gb-border bg-gb-app shrink-0 flex items-center justify-between gap-3">
          <Button type="button" variant="outline" className="h-10 rounded-xl border-gb-border" onClick={step === 1 ? handleClose : goPrev} disabled={saving}>
            {step > 1 && <ChevronLeft size={14} className="mr-1.5" />}
            {step === 1 ? "Annuler" : "Précédent"}
          </Button>

          <div className="flex items-center gap-2">
            <div className="flex gap-1 mr-2">
              {steps.map((currentStep) => (
                <div
                  key={currentStep.id}
                  className={[
                    "w-1.5 h-1.5 rounded-full transition-all duration-300",
                    step === currentStep.id ? "bg-gb-primary w-3" : step > currentStep.id ? "bg-gb-primary/50" : "bg-gb-border",
                  ].join(" ")}
                />
              ))}
            </div>

            {step < steps.length ? (
              <Button type="button" className="h-10 rounded-xl px-5 shadow-lg shadow-gb-primary/20" onClick={goNext}>
                Suivant
                <ChevronRight size={14} className="ml-1.5" />
              </Button>
            ) : (
              <Button type="button" className="h-10 rounded-xl px-6 shadow-lg shadow-gb-primary/20" disabled={saving} onClick={() => void handleFormSubmit()}>
                {saving ? <Loader2 size={14} className="animate-spin mr-1.5" /> : <Save size={14} className="mr-1.5" />}
                {tender ? "Enregistrer" : "Créer l'AO"}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
