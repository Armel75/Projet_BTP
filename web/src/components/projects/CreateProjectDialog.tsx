import React, { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Loader2, AlertCircle, FolderPlus, Users, BarChart3, FileText, Check, ChevronRight, ChevronLeft, X, PencilLine } from "lucide-react";
import { apiFetch, API_BASE } from "../../lib/api";

type ProjectDialogMode = "create" | "edit";

type StepConfig = {
  id: number;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
};

function Field({
  id,
  label,
  required,
  children,
}: {
  id?: string;
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>
        {label}
        {required && <span className="text-gb-danger ml-0.5">*</span>}
      </Label>
      {children}
    </div>
  );
}

interface CreateProjectDialogProps {
  open: boolean;
  onClose: () => void;
  onSaved: (project: any) => void;
  project?: any | null;
}

const STATUS_OPTIONS = [
  { value: "PLANNING", label: "Planification" },
  { value: "ACTIVE", label: "En cours" },
  { value: "ON_HOLD", label: "En pause" },
  { value: "COMPLETED", label: "Termine" },
];

const CURRENCY_OPTIONS = ["EUR", "USD", "FCFA", "MAD", "DZD", "GBP"];

const DOC_CATEGORY_OPTIONS = [
  { value: "PLAN", label: "Plan / Dessin" },
  { value: "REPORT", label: "Rapport" },
  { value: "CONTRACT", label: "Contrat" },
  { value: "OTHER", label: "Autre" },
];

const INITIAL_FORM = {
  title: "",
  status: "PLANNING",
  location: "",
  currency: "EUR",
  budget_initial: "",
  client_name: "",
  client_contact_name: "",
  client_phone: "",
  city: "",
  country: "",
  budget_approved: "",
  budget_committed: "",
  contingency_budget: "",
  permit_number: "",
  permit_type: "",
  risk_classification: "",
  building_type: "",
  erp_project_id: "",
  start_date: "",
  end_date: "",
  doc_name: "",
  doc_category: "PLAN",
  doc_description: "",
};

const CREATE_STEPS: StepConfig[] = [
  { id: 1, label: "Essentiels", icon: FolderPlus },
  { id: 2, label: "Client", icon: Users },
  { id: 3, label: "Avance", icon: BarChart3 },
  { id: 4, label: "Document", icon: FileText },
];

const EDIT_STEPS: StepConfig[] = [
  { id: 1, label: "Essentiels", icon: PencilLine },
  { id: 2, label: "Client", icon: Users },
  { id: 3, label: "Avance", icon: BarChart3 },
];

function formatDateInput(value?: string | Date | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

function buildFormState(project?: any | null) {
  if (!project) return { ...INITIAL_FORM };

  return {
    ...INITIAL_FORM,
    title: project.title ?? "",
    status: project.status ?? "PLANNING",
    location: project.location ?? "",
    currency: project.currency ?? "EUR",
    budget_initial: project.budget_initial !== null && project.budget_initial !== undefined ? String(project.budget_initial) : "",
    client_name: project.client_name ?? "",
    client_contact_name: project.client_contact_name ?? "",
    client_phone: project.client_phone ?? "",
    city: project.city ?? "",
    country: project.country ?? "",
    budget_approved: project.budget_approved !== null && project.budget_approved !== undefined ? String(project.budget_approved) : "",
    budget_committed: project.budget_committed !== null && project.budget_committed !== undefined ? String(project.budget_committed) : "",
    contingency_budget: project.contingency_budget !== null && project.contingency_budget !== undefined ? String(project.contingency_budget) : "",
    permit_number: project.permit_number ?? "",
    permit_type: project.permit_type ?? "",
    risk_classification: project.risk_classification ?? "",
    building_type: project.building_type ?? "",
    erp_project_id: project.erp_project_id ?? "",
    start_date: formatDateInput(project.start_date),
    end_date: formatDateInput(project.end_date),
    doc_name: project.document?.name ?? "",
    doc_category: project.document?.category ?? "PLAN",
    doc_description: project.document?.description ?? "",
  };
}

function buildProjectPayload(form: typeof INITIAL_FORM) {
  return {
    title: form.title,
    status: form.status,
    location: form.location,
    currency: form.currency,
    budget_initial: Number(form.budget_initial),
    budget_approved: form.budget_approved ? Number(form.budget_approved) : null,
    budget_committed: form.budget_committed ? Number(form.budget_committed) : null,
    contingency_budget: form.contingency_budget ? Number(form.contingency_budget) : null,
    start_date: form.start_date || null,
    end_date: form.end_date || null,
    client_name: form.client_name || null,
    client_contact_name: form.client_contact_name || null,
    client_phone: form.client_phone || null,
    city: form.city || null,
    country: form.country || null,
    permit_number: form.permit_number || null,
    permit_type: form.permit_type || null,
    risk_classification: form.risk_classification || null,
    building_type: form.building_type || null,
    erp_project_id: form.erp_project_id || null,
  };
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

export function CreateProjectDialog({ open, onClose, onSaved, project }: CreateProjectDialogProps) {
  const mode: ProjectDialogMode = project ? "edit" : "create";
  const steps = mode === "create" ? CREATE_STEPS : EDIT_STEPS;

  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ ...INITIAL_FORM });

  useEffect(() => {
    if (!open) return;
    setError(null);
    setStep(1);
    setForm(buildFormState(project));
  }, [open, project]);

  const set =
    (key: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((prev) => ({ ...prev, [key]: e.target.value }));

  const handleClose = () => {
    if (submitting) return;
    setError(null);
    setStep(1);
    setForm({ ...INITIAL_FORM });
    onClose();
  };

  const validateStep = (currentStep: number): string | null => {
    if (currentStep === 1) {
      if (!form.title.trim()) return "Le titre du projet est requis.";
      if (!form.location.trim()) return "La localisation est requise.";
      if (!form.budget_initial || Number.isNaN(Number(form.budget_initial))) {
        return "Le budget initial est requis (nombre).";
      }
      if (form.start_date && form.end_date && form.start_date > form.end_date) {
        return "La date de fin doit etre posterieure a la date de debut.";
      }
    }

    if (mode === "create" && currentStep === 4 && !form.doc_name.trim()) {
      return "Le nom du document principal est requis.";
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

  const handleSubmit = async () => {
    const submitError = validateStep(step);
    if (submitError) {
      setError(submitError);
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const payload = buildProjectPayload(form);
      const url = mode === "create" ? `${API_BASE}/projects` : `${API_BASE}/projects/${project.id}`;
      const method = mode === "create" ? "POST" : "PATCH";
      const body =
        mode === "create"
          ? {
              ...payload,
              doc_name: form.doc_name,
              doc_category: form.doc_category,
              doc_description: form.doc_description || null,
            }
          : payload;

      const res = await apiFetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Une erreur est survenue.");
        return;
      }

      onSaved(data);
      handleClose();
    } catch (e: any) {
      setError(e.message ?? "Erreur reseau.");
    } finally {
      setSubmitting(false);
    }
  };

  const summaryCard = (
    <div className="mt-2 p-3 rounded-lg bg-gb-app border border-gb-border space-y-1.5">
      <p className="text-[10px] font-semibold text-gb-muted uppercase tracking-wider">Recapitulatif</p>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
        <span className="text-gb-muted">Projet</span>
        <span className="text-gb-text font-medium truncate">{form.title || "Non renseigne"}</span>
        <span className="text-gb-muted">Localisation</span>
        <span className="text-gb-text truncate">{form.location || "Non renseignee"}</span>
        <span className="text-gb-muted">Budget</span>
        <span className="text-gb-text">
          {form.budget_initial ? `${Number(form.budget_initial).toLocaleString("fr-FR")} ${form.currency}` : "Non renseigne"}
        </span>
        {form.client_name && (
          <>
            <span className="text-gb-muted">Client</span>
            <span className="text-gb-text truncate">{form.client_name}</span>
          </>
        )}
      </div>
    </div>
  );

  const stepContent: Record<number, React.ReactNode> = {
    1: (
      <div className="space-y-4">
        <div className="space-y-1 mb-2">
          <p className="text-base font-semibold text-gb-text">
            {mode === "create" ? "Informations essentielles" : "Edition des informations essentielles"}
          </p>
          <p className="text-xs text-gb-muted">
            {mode === "create"
              ? "Code projet genere automatiquement · format PROJ-2026-001"
              : "Les informations structurelles restent modifiables tant qu'aucune tache n'est rattachee au projet."}
          </p>
        </div>

        <Field label="Statut initial">
          <Select value={form.status} onValueChange={(value) => value && setForm((prev) => ({ ...prev, status: value }))}>
            <SelectTrigger className="bg-gb-app border-gb-border">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-gb-surface-solid border-gb-border">
              {STATUS_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field id="title" label="Titre du projet" required>
          <Input
            id="title"
            value={form.title}
            onChange={set("title")}
            placeholder="Ex: Construction Centre Sportif Douala Nord"
            className="bg-gb-app border-gb-border"
          />
        </Field>

        <Field id="location" label="Localisation" required>
          <Input
            id="location"
            value={form.location}
            onChange={set("location")}
            placeholder="Ex: Douala, Cameroun"
            className="bg-gb-app border-gb-border"
          />
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field id="budget_initial" label="Budget initial" required>
            <Input
              id="budget_initial"
              type="number"
              min="0"
              step="1000"
              value={form.budget_initial}
              onChange={set("budget_initial")}
              placeholder="500000000"
              className="bg-gb-app border-gb-border"
            />
          </Field>

          <Field label="Devise">
            <Select value={form.currency} onValueChange={(value) => value && setForm((prev) => ({ ...prev, currency: value }))}>
              <SelectTrigger className="bg-gb-app border-gb-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-gb-surface-solid border-gb-border">
                {CURRENCY_OPTIONS.map((currency) => (
                  <SelectItem key={currency} value={currency}>
                    {currency}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field id="start_date" label="Date de debut">
            <Input id="start_date" type="date" value={form.start_date} onChange={set("start_date")} className="bg-gb-app border-gb-border" />
          </Field>
          <Field id="end_date" label="Date de fin prevue">
            <Input id="end_date" type="date" value={form.end_date} onChange={set("end_date")} className="bg-gb-app border-gb-border" />
          </Field>
        </div>
      </div>
    ),

    2: (
      <div className="space-y-4">
        <div className="space-y-1 mb-2">
          <p className="text-base font-semibold text-gb-text">Client &amp; localisation</p>
          <p className="text-xs text-gb-muted">Tous les champs sont optionnels.</p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field id="client_name" label="Client">
            <Input id="client_name" value={form.client_name} onChange={set("client_name")} placeholder="Ex: Mairie de Douala" className="bg-gb-app border-gb-border" />
          </Field>
          <Field id="client_contact_name" label="Contact client">
            <Input id="client_contact_name" value={form.client_contact_name} onChange={set("client_contact_name")} placeholder="Ex: Jean Dupont" className="bg-gb-app border-gb-border" />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field id="client_phone" label="Telephone client">
            <Input id="client_phone" value={form.client_phone} onChange={set("client_phone")} placeholder="Ex: +237 6XX XXX XXX" className="bg-gb-app border-gb-border" />
          </Field>
          <Field id="building_type" label="Type d'ouvrage">
            <Input id="building_type" value={form.building_type} onChange={set("building_type")} placeholder="Ex: Batiment public" className="bg-gb-app border-gb-border" />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field id="city" label="Ville">
            <Input id="city" value={form.city} onChange={set("city")} placeholder="Ex: Douala" className="bg-gb-app border-gb-border" />
          </Field>
          <Field id="country" label="Pays">
            <Input id="country" value={form.country} onChange={set("country")} placeholder="Ex: Cameroun" className="bg-gb-app border-gb-border" />
          </Field>
        </div>
      </div>
    ),

    3: (
      <div className="space-y-4">
        <div className="space-y-1 mb-2">
          <p className="text-base font-semibold text-gb-text">Finances &amp; reglementaire</p>
          <p className="text-xs text-gb-muted">
            {mode === "create"
              ? "Tous les champs sont optionnels. Modifiables apres creation."
              : "Vous pouvez ajuster ces metadonnees avant que le projet ne soit verrouille par les taches."}
          </p>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <Field id="budget_approved" label="Budget approuve">
            <Input id="budget_approved" type="number" min="0" step="1000" value={form.budget_approved} onChange={set("budget_approved")} className="bg-gb-app border-gb-border" />
          </Field>
          <Field id="budget_committed" label="Budget engage">
            <Input id="budget_committed" type="number" min="0" step="1000" value={form.budget_committed} onChange={set("budget_committed")} className="bg-gb-app border-gb-border" />
          </Field>
          <Field id="contingency_budget" label="Reserve">
            <Input id="contingency_budget" type="number" min="0" step="1000" value={form.contingency_budget} onChange={set("contingency_budget")} className="bg-gb-app border-gb-border" />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field id="permit_number" label="N permis">
            <Input id="permit_number" value={form.permit_number} onChange={set("permit_number")} className="bg-gb-app border-gb-border" />
          </Field>
          <Field id="permit_type" label="Type permis">
            <Input id="permit_type" value={form.permit_type} onChange={set("permit_type")} className="bg-gb-app border-gb-border" />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field id="risk_classification" label="Classe de risque">
            <Input id="risk_classification" value={form.risk_classification} onChange={set("risk_classification")} className="bg-gb-app border-gb-border" />
          </Field>
          <Field id="erp_project_id" label="Reference ERP">
            <Input id="erp_project_id" value={form.erp_project_id} onChange={set("erp_project_id")} className="bg-gb-app border-gb-border" />
          </Field>
        </div>

        {mode === "edit" && summaryCard}
      </div>
    ),

    4: (
      <div className="space-y-4">
        <div className="space-y-1 mb-2">
          <p className="text-base font-semibold text-gb-text">Document principal</p>
          <p className="text-xs text-gb-muted">Cree automatiquement avec le projet.</p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field id="doc_name" label="Nom du document" required>
            <Input id="doc_name" value={form.doc_name} onChange={set("doc_name")} placeholder="Ex: Dossier Technique Principal" className="bg-gb-app border-gb-border" />
          </Field>
          <Field label="Categorie">
            <Select value={form.doc_category} onValueChange={(value) => value && setForm((prev) => ({ ...prev, doc_category: value }))}>
              <SelectTrigger className="bg-gb-app border-gb-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-gb-surface-solid border-gb-border">
                {DOC_CATEGORY_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </div>

        <Field id="doc_description" label="Description (optionnel)">
          <Input id="doc_description" value={form.doc_description} onChange={set("doc_description")} placeholder="Description du document principal..." className="bg-gb-app border-gb-border" />
        </Field>

        {summaryCard}
      </div>
    ),
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="bg-gb-surface-solid border-gb-border w-[95vw] max-w-xl p-0 overflow-hidden" showCloseButton={false}>
        <DialogHeader className="px-6 pt-6 pb-0">
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2 text-lg font-semibold">
              {mode === "create" ? <FolderPlus className="w-5 h-5 text-gb-primary flex-shrink-0" /> : <PencilLine className="w-5 h-5 text-gb-primary flex-shrink-0" />}
              {mode === "create" ? "Nouveau Projet" : "Modifier le projet"}
            </DialogTitle>
            <Button variant="ghost" size="icon-sm" onClick={handleClose} disabled={submitting} className="text-gb-muted hover:text-gb-text">
              <X className="w-4 h-4" />
              <span className="sr-only">Fermer</span>
            </Button>
          </div>
        </DialogHeader>

        <div className="px-6 pt-5 pb-4">
          <StepBar current={step} steps={steps} />
          <div className="min-h-[260px]">{stepContent[step]}</div>

          {error && (
            <div className="flex items-start gap-2 mt-4 p-3 rounded-lg bg-gb-danger/10 border border-gb-danger/20 text-gb-danger text-sm">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>

        <div className="px-6 pb-6 pt-2 flex items-center justify-between border-t border-gb-border gap-3">
          <Button variant="outline" onClick={step === 1 ? handleClose : goPrev} disabled={submitting} className="gap-1.5">
            {step > 1 && <ChevronLeft className="w-4 h-4" />}
            {step === 1 ? "Annuler" : "Precedent"}
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
              <Button onClick={goNext} className="gap-1.5">
                Suivant
                <ChevronRight className="w-4 h-4" />
              </Button>
            ) : (
              <Button onClick={handleSubmit} disabled={submitting} className="gap-1.5">
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {mode === "create" ? "Creation..." : "Mise a jour..."}
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    {mode === "create" ? "Creer le projet" : "Enregistrer"}
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}