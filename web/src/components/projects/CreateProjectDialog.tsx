import React, { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import { Label } from "../ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Loader2, AlertCircle, FolderPlus, Users, BarChart3, FileText, Check, ChevronRight, ChevronLeft, X, PencilLine, UserCheck, UserPlus, Trash2 } from "lucide-react";
import { apiFetch, API_BASE } from "../../lib/api";
import { usePermissions } from "../../contexts/AuthContext";

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

const PERMIT_TYPE_OPTIONS = [
  { value: "PERMIS_CONSTRUIRE", label: "Permis de construire" },
  { value: "PERMIS_AMENAGER", label: "Permis d'amenager" },
  { value: "PERMIS_DEMOLIR", label: "Permis de demolir" },
  { value: "DECLARATION_PREALABLE", label: "Declaration prealable" },
  { value: "AUTORISATION_TRAVAUX_ERP", label: "Autorisation de travaux ERP" },
  { value: "PERMIS_MODIFICATIF", label: "Permis modificatif" },
  { value: "TRANSFERT_PERMIS", label: "Transfert de permis" },
  { value: "PROROGATION", label: "Prorogation / prolongation" },
  { value: "REGULARISATION", label: "Regularisation" },
  { value: "AUTRE", label: "Autre" },
];

const RISK_CLASSIFICATION_OPTIONS = [
  { value: "PETIT", label: "Petit chantier" },
  { value: "MOYEN", label: "Moyen chantier" },
  { value: "GROS_CHANTIER_AEIOU", label: "Gros chantier (AEIOU)" },
  { value: "AUTRE", label: "Autre" },
];

const INITIAL_FORM = {
  title: "",
  status: "PLANNING",
  location: "",
  currency: "FCFA",
  budget_initial: "",
  moe_firm_name: "",
  control_bureau: "",
  client_name: "",
  client_contact_name: "",
  client_phone: "",
  street_address: "",
  postal_code: "",
  city: "",
  country: "",
  latitude: "",
  longitude: "",
  hse_responsible_id: "",
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
  { id: 5, label: "Equipe", icon: UserCheck },
];

const EDIT_STEPS: StepConfig[] = [
  { id: 1, label: "Essentiels", icon: PencilLine },
  { id: 2, label: "Client", icon: Users },
  { id: 3, label: "Avance", icon: BarChart3 },
  { id: 4, label: "Document", icon: FileText },
  { id: 5, label: "Equipe", icon: UserCheck },
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
    moe_firm_name: project.moe_firm_name ?? "",
    control_bureau: project.control_bureau ?? "",
    client_name: project.client_name ?? "",
    client_contact_name: project.client_contact_name ?? "",
    client_phone: project.client_phone ?? "",
    street_address: project.street_address ?? "",
    postal_code: project.postal_code ?? "",
    city: project.city ?? "",
    country: project.country ?? "",
    latitude: project.latitude !== null && project.latitude !== undefined ? String(project.latitude) : "",
    longitude: project.longitude !== null && project.longitude !== undefined ? String(project.longitude) : "",
    hse_responsible_id: project.hse_responsible_id !== null && project.hse_responsible_id !== undefined ? String(project.hse_responsible_id) : "",
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
    moe_firm_name: form.moe_firm_name || null,
    control_bureau: form.control_bureau || null,
    budget_approved: form.budget_approved ? Number(form.budget_approved) : null,
    budget_committed: form.budget_committed ? Number(form.budget_committed) : null,
    contingency_budget: form.contingency_budget ? Number(form.contingency_budget) : null,
    start_date: form.start_date || null,
    end_date: form.end_date || null,
    client_name: form.client_name || null,
    client_contact_name: form.client_contact_name || null,
    client_phone: form.client_phone || null,
    street_address: form.street_address || null,
    postal_code: form.postal_code || null,
    city: form.city || null,
    country: form.country || null,
    latitude: form.latitude ? Number(form.latitude) : null,
    longitude: form.longitude ? Number(form.longitude) : null,
    hse_responsible_id: form.hse_responsible_id ? Number(form.hse_responsible_id) : null,
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
  const { canAny } = usePermissions();
  const canManageTeam = canAny("project:team:update");
  const mode: ProjectDialogMode = project ? "edit" : "create";
  const steps = mode === "create" ? CREATE_STEPS : EDIT_STEPS;

  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ ...INITIAL_FORM });

  // ── Team assignment state ────────────────────────────────────────────────
  const [teamUsers, setTeamUsers] = useState<any[]>([]);
  const [teamRoles, setTeamRoles] = useState<any[]>([]);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [teamManagerId, setTeamManagerId] = useState<string>("");
  const [teamManagerAppliedId, setTeamManagerAppliedId] = useState<string>("");
  const [teamMemberUserId, setTeamMemberUserId] = useState<string>("");
  const [teamMemberRoleId, setTeamMemberRoleId] = useState<string>("");
  const [teamSaving, setTeamSaving] = useState(false);
  const [teamError, setTeamError] = useState<string | null>(null);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [hseUsers, setHseUsers] = useState<any[]>([]);

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const digitsOnly = value.replace(/[^0-9]/g, "");
    
    if (value.length > 0 && digitsOnly.length < value.length) {
      setPhoneError("Le numéro de téléphone ne doit contenir que des chiffres (0-9).");
    } else {
      setPhoneError(null);
    }
    
    setForm((prev) => ({ ...prev, client_phone: digitsOnly }));
  };

  useEffect(() => {
    if (!open) return;
    setError(null);
    setStep(1);
    setForm(buildFormState(project));
    // Reset team state
    setTeamUsers([]);
    setTeamRoles([]);
    setTeamMembers([]);
    setTeamManagerId(project?.projectManager?.id ? String(project.projectManager.id) : "");
    setTeamManagerAppliedId(project?.projectManager?.id ? String(project.projectManager.id) : "");
    setTeamMemberUserId("");
    setTeamMemberRoleId("");
    setTeamError(null);
  }, [open, project]);

  useEffect(() => {
    if (!open) return;

    const loadHseUsers = async () => {
      try {
        const usersRes = await apiFetch(`${API_BASE}/projects/helpers/users`);
        setHseUsers(usersRes.ok ? await usersRes.json() : []);
      } catch {
        setHseUsers([]);
      }
    };

    void loadHseUsers();
  }, [open]);

  const set =
    (key: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((prev) => ({ ...prev, [key]: e.target.value }));

  // ── Team helpers ─────────────────────────────────────────────────────────
  const loadEditTeamData = async (projectId: string) => {
    try {
      const [usersRes, rolesRes, membersRes, projectRes] = await Promise.all([
        apiFetch(`${API_BASE}/projects/helpers/users`),
        apiFetch(`${API_BASE}/projects/helpers/roles`),
        apiFetch(`${API_BASE}/projects/${projectId}/members`),
        apiFetch(`${API_BASE}/projects/${projectId}`),
      ]);
      setTeamUsers(usersRes.ok ? await usersRes.json() : []);
      setTeamRoles(rolesRes.ok ? await rolesRes.json() : []);
      setTeamMembers(membersRes.ok ? await membersRes.json() : []);
      if (projectRes.ok) {
        const projectData = await projectRes.json();
        const managerId =
          projectData?.projectManager?.id ??
          projectData?.project_manager_id ??
          null;
        const managerValue = managerId ? String(managerId) : "";
        setTeamManagerId(managerValue);
        setTeamManagerAppliedId(managerValue);
      }
    } catch { /* silently ignore */ }
  };

  const loadCreateTeamData = async () => {
    try {
      const [usersRes, rolesRes] = await Promise.all([
        apiFetch(`${API_BASE}/projects/helpers/users`),
        apiFetch(`${API_BASE}/projects/helpers/roles`),
      ]);
      setTeamUsers(usersRes.ok ? await usersRes.json() : []);
      setTeamRoles(rolesRes.ok ? await rolesRes.json() : []);
    } catch { /* silently ignore */ }
  };

  // Load team data when entering the team step
  useEffect(() => {
    if (mode === "edit" && step === 5 && project?.id) {
      void loadEditTeamData(String(project.id));
    } else if (mode === "create" && step === 5) {
      void loadCreateTeamData();
    }
  }, [step]); // eslint-disable-line react-hooks/exhaustive-deps

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

  // ── Team operation handlers ───────────────────────────────────────────────

  // EDIT: assigne immédiatement via API.
  // CREATE: valide localement le chef sélectionné pour affichage + persist au submit final.
  const handleAssignManager = async () => {
    if (!canManageTeam) {
      setTeamError("Vous n'avez pas la permission de gérer les affectations d'équipe.");
      return;
    }
    if (!teamManagerId) return;

    if (mode === "create") {
      setTeamManagerAppliedId(teamManagerId);
      setTeamError(null);
      return;
    }

    if (!project?.id) return;
    setTeamSaving(true);
    setTeamError(null);
    try {
      const res = await apiFetch(`${API_BASE}/projects/${project.id}/manager`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ manager_id: teamManagerId }),
      });
      if (!res.ok) {
        const d = await res.json();
        setTeamError(d.error ?? "Erreur lors de l'assignation.");
      } else {
        setTeamManagerAppliedId(teamManagerId);
      }
    } catch (e: any) {
      setTeamError(e.message ?? "Erreur reseau.");
    } finally {
      setTeamSaving(false);
    }
  };

  // CREATE: staging local — EDIT: API call immédiat
  const handleAddTeamMember = async () => {
    if (!canManageTeam) {
      setTeamError("Vous n'avez pas la permission de gérer les affectations d'équipe.");
      return;
    }
    if (!teamMemberUserId || !teamMemberRoleId) return;

    if (mode === "create") {
      const user = teamUsers.find((u: any) => String(u.id) === teamMemberUserId);
      const role = teamRoles.find((r: any) => String(r.id) === teamMemberRoleId);
      setTeamMembers((prev) => [
        ...prev,
        { id: `staged-${Date.now()}`, user_id: teamMemberUserId, role_id: teamMemberRoleId, user, role },
      ]);
      setTeamMemberUserId("");
      setTeamMemberRoleId("");
      return;
    }

    // EDIT mode
    setTeamSaving(true);
    setTeamError(null);
    try {
      const res = await apiFetch(`${API_BASE}/projects/${project.id}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: teamMemberUserId, role_id: teamMemberRoleId }),
      });
      const d = await res.json();
      if (!res.ok) { setTeamError(d.error ?? "Erreur lors de l'ajout."); return; }
      setTeamMembers((prev) => [...prev, d]);
      setTeamMemberUserId("");
      setTeamMemberRoleId("");
    } catch (e: any) {
      setTeamError(e.message ?? "Erreur reseau.");
    } finally {
      setTeamSaving(false);
    }
  };

  // CREATE: retrait local — EDIT: API call immédiat
  const handleRemoveTeamMember = async (membershipId: string) => {
    if (!canManageTeam) {
      setTeamError("Vous n'avez pas la permission de gérer les affectations d'équipe.");
      return;
    }
    if (mode === "create") {
      setTeamMembers((prev) => prev.filter((m: any) => String(m.id) !== membershipId));
      return;
    }

    setTeamSaving(true);
    setTeamError(null);
    try {
      const res = await apiFetch(`${API_BASE}/projects/${project.id}/members/${membershipId}`, { method: "DELETE" });
      if (!res.ok) { const d = await res.json(); setTeamError(d.error ?? "Erreur lors du retrait."); return; }
      setTeamMembers((prev) => prev.filter((m: any) => String(m.id) !== membershipId));
    } catch (e: any) {
      setTeamError(e.message ?? "Erreur reseau.");
    } finally {
      setTeamSaving(false);
    }
  };

  // CREATE step 5: crée le projet puis applique manager + membres stagés
  const handleCreateWithTeam = async () => {
    setSubmitting(true);
    setError(null);
    try {
      // 1. Créer le projet
      const payload = buildProjectPayload(form);
      const body = {
        ...payload,
        doc_name: form.doc_name,
        doc_category: form.doc_category,
        doc_description: form.doc_description || null,
      };
      const res = await apiFetch(`${API_BASE}/projects`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Erreur lors de la creation."); return; }

      const pid = String(data.id);

      // 2. Assigner le chef de projet validé via bouton "Assigner"
      if (teamManagerAppliedId) {
        await apiFetch(`${API_BASE}/projects/${pid}/manager`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ manager_id: teamManagerAppliedId }),
        });
      }

      // 3. Ajouter les membres stagés
      for (const member of teamMembers) {
        await apiFetch(`${API_BASE}/projects/${pid}/members`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ user_id: member.user_id, role_id: member.role_id }),
        });
      }

      onSaved(data);
      handleClose();
    } catch (e: any) {
      setError(e.message ?? "Erreur reseau.");
    } finally {
      setSubmitting(false);
    }
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
      const body = {
        ...payload,
        doc_name: form.doc_name,
        doc_category: form.doc_category,
        doc_description: form.doc_description || null,
      };

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

  const selectedStatusOption = STATUS_OPTIONS.find((option) => option.value === form.status);
  const selectedHseUser = hseUsers.find((u: any) => String(u.id) === form.hse_responsible_id);
  const hasValue = (value: string | null | undefined) => value !== null && value !== undefined && value.trim() !== "";
  const formatAmount = (value: string) => `${Number(value).toLocaleString("fr-FR")} ${form.currency}`;
  const selectedDocCategory = DOC_CATEGORY_OPTIONS.find((option) => option.value === form.doc_category)?.label ?? form.doc_category;
  const selectedPermitType = PERMIT_TYPE_OPTIONS.find((option) => option.value === form.permit_type)?.label ?? form.permit_type;
  const selectedRiskClassification = RISK_CLASSIFICATION_OPTIONS.find((option) => option.value === form.risk_classification)?.label ?? form.risk_classification;

  const summaryRows: Array<{ label: string; value: string; always?: boolean }> = [
    { label: "Projet", value: form.title || "Non renseigne", always: true },
    { label: "Statut", value: selectedStatusOption?.label ?? form.status, always: true },
    { label: "Localisation", value: form.location || "Non renseignee", always: true },
    {
      label: "Budget initial",
      value: form.budget_initial ? formatAmount(form.budget_initial) : "Non renseigne",
      always: true,
    },
    ...(hasValue(form.start_date) ? [{ label: "Date debut", value: form.start_date }] : []),
    ...(hasValue(form.end_date) ? [{ label: "Date fin", value: form.end_date }] : []),
    ...(hasValue(form.moe_firm_name) ? [{ label: "Maitre d'oeuvre", value: form.moe_firm_name }] : []),
    ...(hasValue(form.control_bureau) ? [{ label: "Bureau de controle", value: form.control_bureau }] : []),
    ...(hasValue(form.client_name) ? [{ label: "Client", value: form.client_name }] : []),
    ...(hasValue(form.client_contact_name) ? [{ label: "Contact client", value: form.client_contact_name }] : []),
    ...(hasValue(form.client_phone) ? [{ label: "Telephone client", value: form.client_phone }] : []),
    ...(hasValue(form.building_type) ? [{ label: "Type d'ouvrage", value: form.building_type }] : []),
    ...(hasValue(form.street_address) ? [{ label: "Adresse", value: form.street_address }] : []),
    ...(hasValue(form.postal_code) ? [{ label: "Code postal", value: form.postal_code }] : []),
    ...(hasValue(form.city) ? [{ label: "Ville", value: form.city }] : []),
    ...(hasValue(form.country) ? [{ label: "Pays", value: form.country }] : []),
    ...(hasValue(form.latitude) ? [{ label: "Latitude", value: form.latitude }] : []),
    ...(hasValue(form.longitude) ? [{ label: "Longitude", value: form.longitude }] : []),
    ...(selectedHseUser ? [{ label: "Responsable HSE", value: `${selectedHseUser.firstname} ${selectedHseUser.lastname}` }] : []),
    ...(hasValue(form.budget_approved) ? [{ label: "Budget approuve", value: formatAmount(form.budget_approved) }] : []),
    ...(hasValue(form.budget_committed) ? [{ label: "Budget engage", value: formatAmount(form.budget_committed) }] : []),
    ...(hasValue(form.contingency_budget) ? [{ label: "Reserve", value: formatAmount(form.contingency_budget) }] : []),
    ...(hasValue(form.permit_number) ? [{ label: "N permis", value: form.permit_number }] : []),
    ...(hasValue(form.permit_type) ? [{ label: "Type permis", value: selectedPermitType }] : []),
    ...(hasValue(form.risk_classification) ? [{ label: "Classe de risque", value: selectedRiskClassification }] : []),
    ...(hasValue(form.erp_project_id) ? [{ label: "Reference ERP", value: form.erp_project_id }] : []),
    ...(hasValue(form.doc_name) ? [{ label: "Document principal", value: form.doc_name }] : []),
    ...(hasValue(form.doc_category) ? [{ label: "Categorie document", value: selectedDocCategory }] : []),
    ...(hasValue(form.doc_description) ? [{ label: "Description document", value: form.doc_description }] : []),
  ];

  const summaryCard = (
    <div className="mt-2 p-3 rounded-lg bg-gb-app border border-gb-border space-y-1.5">
      <p className="text-[10px] font-semibold text-gb-muted uppercase tracking-wider">Recapitulatif</p>
      <div className="space-y-1.5 text-xs">
        {summaryRows
          .filter((row) => row.always || hasValue(row.value))
          .map((row) => (
            <div key={row.label} className="grid grid-cols-2 gap-x-4">
              <span className="text-gb-muted">{row.label}</span>
              <span className="text-gb-text break-words">{row.value}</span>
            </div>
          ))}
      </div>
    </div>
  );

  // ── Équipe step: used as step 4 (EDIT) or step 5 (CREATE) ────────────────
  const availableTeamUsers = teamUsers.filter(
    (u: any) => !teamMembers.some((m: any) => String(m.user_id) === String(u.id))
  );

  // Libellés calculés pour les SelectValue (évite l'affichage brut des IDs)
  const selectedManagerUser   = teamUsers.find((u: any) => String(u.id) === teamManagerId);
  const appliedManagerUser    = teamUsers.find((u: any) => String(u.id) === teamManagerAppliedId);
  const selectedMemberUser    = teamUsers.find((u: any) => String(u.id) === teamMemberUserId);
  const selectedMemberRole    = teamRoles.find((r: any) => String(r.id) === teamMemberRoleId);

  const teamStepContent = (
    <div className="space-y-5">
      <div className="space-y-1 mb-2">
        <p className="text-base font-semibold text-gb-text">Equipe du projet</p>
        <p className="text-xs text-gb-muted">
          {mode === "create"
            ? "Definissez l'equipe avant de creer le projet (optionnel)."
            : "Modifiez les affectations de l'equipe. Les changements sont appliques immediatement."}
        </p>
      </div>

      {/* Chef de projet */}
      <div className="space-y-2">
        <p className="text-[10px] font-bold text-gb-muted uppercase tracking-wider">Chef de projet</p>
        <div className="flex gap-2">
          <Select
            disabled={!canManageTeam}
            value={teamManagerId}
            onValueChange={(v) => {
              const nextValue = v ?? "";
              setTeamManagerId(nextValue);
              if (mode === "create" && nextValue !== teamManagerAppliedId) {
                setTeamManagerAppliedId("");
              }
            }}
          >
            <SelectTrigger className="bg-gb-app border-gb-border flex-1 text-sm">
              <SelectValue placeholder="Selectionner un chef de projet...">
                {selectedManagerUser
                  ? `${selectedManagerUser.firstname} ${selectedManagerUser.lastname}`
                  : null}
              </SelectValue>
            </SelectTrigger>
            <SelectContent className="bg-gb-surface-solid border-gb-border">
              {teamUsers.map((u: any) => (
                <SelectItem key={u.id} value={String(u.id)}>
                  {u.firstname} {u.lastname}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="sm"
            disabled={!canManageTeam || teamSaving || !teamManagerId}
            onClick={handleAssignManager}
            className="gap-1.5 shrink-0"
          >
            {teamSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserCheck className="w-4 h-4" />}
            Assigner
          </Button>
        </div>
      </div>

      {appliedManagerUser && (
        <div className="rounded-lg border border-gb-border bg-gb-app px-3 py-2">
          <p className="text-[10px] uppercase font-bold tracking-wider text-gb-muted">Chef assigne</p>
          <p className="text-sm font-semibold text-gb-text">{appliedManagerUser.firstname} {appliedManagerUser.lastname}</p>
        </div>
      )}

      {/* Membres */}
      <div className="space-y-2">
        <p className="text-[10px] font-bold text-gb-muted uppercase tracking-wider">Membres</p>
        <div className="flex gap-2">
          <Select disabled={!canManageTeam} value={teamMemberUserId} onValueChange={(v) => setTeamMemberUserId(v ?? "")}>
            <SelectTrigger className="bg-gb-app border-gb-border flex-1 text-sm">
              <SelectValue placeholder="Utilisateur...">
                {selectedMemberUser
                  ? `${selectedMemberUser.firstname} ${selectedMemberUser.lastname}`
                  : null}
              </SelectValue>
            </SelectTrigger>
            <SelectContent className="bg-gb-surface-solid border-gb-border">
              {availableTeamUsers.length === 0 ? (
                <div className="px-2 py-1.5 text-xs text-gb-muted italic">Tous les utilisateurs sont deja membres</div>
              ) : (
                availableTeamUsers.map((u: any) => (
                  <SelectItem key={u.id} value={String(u.id)}>
                    {u.firstname} {u.lastname}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
          <Select disabled={!canManageTeam} value={teamMemberRoleId} onValueChange={(v) => setTeamMemberRoleId(v ?? "")}>
            <SelectTrigger className="bg-gb-app border-gb-border w-36 text-sm">
              <SelectValue placeholder="Role...">
                {selectedMemberRole ? selectedMemberRole.name : null}
              </SelectValue>
            </SelectTrigger>
            <SelectContent className="bg-gb-surface-solid border-gb-border">
              {teamRoles.map((r: any) => (
                <SelectItem key={r.id} value={String(r.id)}>
                  {r.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="sm"
            disabled={!canManageTeam || teamSaving || !teamMemberUserId || !teamMemberRoleId}
            onClick={handleAddTeamMember}
            title="Ajouter le membre"
          >
            <UserPlus className="w-4 h-4" />
          </Button>
        </div>

        {teamMembers.length === 0 ? (
          <p className="text-xs text-gb-muted italic py-1">Aucun membre ajoute pour l'instant.</p>
        ) : (
          <div className="space-y-1.5 max-h-36 overflow-y-auto pr-0.5">
            {teamMembers.map((m: any) => (
              <div key={m.id} className="flex items-center justify-between px-3 py-2 rounded-lg bg-gb-app border border-gb-border">
                <div>
                  <p className="text-xs font-semibold text-gb-text">{m.user?.firstname} {m.user?.lastname}</p>
                  <p className="text-[10px] text-gb-muted">{m.role?.name ?? m.role?.code}</p>
                </div>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="text-gb-muted hover:text-gb-danger"
                  onClick={() => handleRemoveTeamMember(String(m.id))}
                  disabled={!canManageTeam || teamSaving}
                  title="Retirer du projet"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      {teamError && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-gb-danger/10 border border-gb-danger/20 text-gb-danger text-xs">
          <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
          {teamError}
        </div>
      )}

      {summaryCard}
    </div>
  );

  const stepContent: Record<number, React.ReactNode> = {
    1: (
      <div className="space-y-4">
        <div className="space-y-1 mb-2">
          <p className="text-base font-semibold text-gb-text">
            {mode === "create" ? "Informations essentielles" : "Edition des informations essentielles"}
          </p>
          {mode === "edit" && (
            <p className="text-xs text-gb-muted">
              Les informations structurelles restent modifiables tant qu'aucune tache n'est rattachee au projet.
            </p>
          )}
        </div>

        <Field label="Statut initial">
          <Select value={form.status} onValueChange={(value) => value && setForm((prev) => ({ ...prev, status: value }))}>
            <SelectTrigger className="bg-gb-app border-gb-border">
              <SelectValue>
                {selectedStatusOption ? selectedStatusOption.label : null}
              </SelectValue>
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
          <Field id="moe_firm_name" label="Maitre d'oeuvre (MOE)">
            <Input id="moe_firm_name" value={form.moe_firm_name} onChange={set("moe_firm_name")} placeholder="Ex: BET Structure ABC" className="bg-gb-app border-gb-border" />
          </Field>
          <Field id="control_bureau" label="Bureau de controle">
            <Input id="control_bureau" value={form.control_bureau} onChange={set("control_bureau")} placeholder="Ex: Veritas Cameroun" className="bg-gb-app border-gb-border" />
          </Field>
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
          <div>
            <Field id="client_phone" label="Telephone client">
              <Input id="client_phone" value={form.client_phone} onChange={handlePhoneChange} placeholder="Ex: 237600000000" className={`bg-gb-app border-gb-border ${ phoneError ? "border-gb-danger" : ""}`} />
              {phoneError && <p className="text-xs text-gb-danger mt-1.5 flex items-center gap-1"><AlertCircle size={12} />{phoneError}</p>}
            </Field>
          </div>
          <Field id="building_type" label="Type d'ouvrage">
            <Input id="building_type" value={form.building_type} onChange={set("building_type")} placeholder="Ex: Batiment public" className="bg-gb-app border-gb-border" />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field id="street_address" label="Adresse">
            <Input id="street_address" value={form.street_address} onChange={set("street_address")} placeholder="Ex: Avenue de la Republique" className="bg-gb-app border-gb-border" />
          </Field>
          <Field id="postal_code" label="Code postal">
            <Input id="postal_code" value={form.postal_code} onChange={set("postal_code")} placeholder="Ex: 1200" className="bg-gb-app border-gb-border" />
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

        <div className="grid grid-cols-2 gap-4">
          <Field id="latitude" label="Latitude">
            <Input id="latitude" type="number" step="any" value={form.latitude} onChange={set("latitude")} placeholder="Ex: 4.0511" className="bg-gb-app border-gb-border" />
          </Field>
          <Field id="longitude" label="Longitude">
            <Input id="longitude" type="number" step="any" value={form.longitude} onChange={set("longitude")} placeholder="Ex: 9.7679" className="bg-gb-app border-gb-border" />
          </Field>
        </div>

        <Field label="Responsable HSE">
          <Select
            value={form.hse_responsible_id}
            onValueChange={(value) => setForm((prev) => ({ ...prev, hse_responsible_id: value ?? "" }))}
          >
            <SelectTrigger className="bg-gb-app border-gb-border">
              <SelectValue placeholder="Selectionner un responsable HSE...">
                {selectedHseUser ? `${selectedHseUser.firstname} ${selectedHseUser.lastname}` : null}
              </SelectValue>
            </SelectTrigger>
            <SelectContent className="bg-gb-surface-solid border-gb-border">
              {hseUsers.map((u: any) => (
                <SelectItem key={u.id} value={String(u.id)}>
                  {u.firstname} {u.lastname}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
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
          <Field label="Type permis">
            <Select
              value={form.permit_type}
              onValueChange={(value) => {
                const nextValue = value && value !== "__NONE__" ? value : "";
                setForm((prev) => ({ ...prev, permit_type: nextValue }));
              }}
            >
              <SelectTrigger id="permit_type" className="bg-gb-app border-gb-border">
                <SelectValue placeholder="Selectionner un type de permis">
                  {selectedPermitType || null}
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="bg-gb-surface-solid border-gb-border">
                <SelectItem value="__NONE__">Aucun (non renseigne)</SelectItem>
                {PERMIT_TYPE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Classe de risque">
            <Select
              value={form.risk_classification}
              onValueChange={(value) => {
                const nextValue = value && value !== "__NONE__" ? value : "";
                setForm((prev) => ({ ...prev, risk_classification: nextValue }));
              }}
            >
              <SelectTrigger id="risk_classification" className="bg-gb-app border-gb-border">
                <SelectValue placeholder="Selectionner une classe de risque">
                  {selectedRiskClassification || null}
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="bg-gb-surface-solid border-gb-border">
                <SelectItem value="__NONE__">Aucune (non renseignee)</SelectItem>
                {RISK_CLASSIFICATION_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          {/* TODO: Reference ERP - masquée temporairement, seulement pour powerusers/intégrations */}
          {/* <Field id="erp_project_id" label="Reference ERP">
            <Input id="erp_project_id" value={form.erp_project_id} onChange={set("erp_project_id")} className="bg-gb-app border-gb-border" />
          </Field> */}
        </div>
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
                <SelectValue>
                  {DOC_CATEGORY_OPTIONS.find(o => o.value === form.doc_category)?.label || form.doc_category}
                </SelectValue>
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
          <Textarea
            id="doc_description"
            value={form.doc_description}
            onChange={set("doc_description")}
            placeholder="Description du document principal..."
            className="bg-gb-app border-gb-border min-h-24 resize-y"
          />
        </Field>
      </div>
    ),
  };

  // Step 5 in CREATE mode and step 5 in EDIT mode both render the team content
  const activeStepContent =
    (mode === "create" && step === 5) || (mode === "edit" && step === 5)
      ? teamStepContent
      : stepContent[step];

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="bg-gb-surface-solid border-gb-border w-[95vw] max-w-xl p-0 overflow-hidden flex flex-col max-h-[90vh]" showCloseButton={false}>
        <DialogHeader className="px-6 pt-6 pb-0 flex-shrink-0">
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

        <div className="px-6 pt-5 pb-4 overflow-y-auto flex-1 min-h-0">
          <StepBar current={step} steps={steps} />
          <div>{activeStepContent}</div>

          {error && (
            <div className="flex items-start gap-2 mt-4 p-3 rounded-lg bg-gb-danger/10 border border-gb-danger/20 text-gb-danger text-sm">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>

        <div className="px-6 pb-6 pt-2 flex items-center justify-between border-t border-gb-border gap-3 flex-shrink-0">
          <Button
            variant="outline"
            onClick={step === 1 ? handleClose : goPrev}
            disabled={submitting}
            className="gap-1.5"
          >
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

            {mode === "create" && step === 5 ? (
              // CREATE step 5 (Equipe) : crée le projet + équipe d'un coup
              <Button onClick={handleCreateWithTeam} disabled={submitting} className="gap-1.5">
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Creation...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    Creer le projet
                  </>
                )}
              </Button>
            ) : step < steps.length ? (
              // Étapes intermédiaires
              <Button onClick={goNext} className="gap-1.5">
                Suivant
                <ChevronRight className="w-4 h-4" />
              </Button>
            ) : (
              // EDIT dernière étape (step 4 = Equipe) : sauvegarde + ferme
              <Button onClick={handleSubmit} disabled={submitting} className="gap-1.5">
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Mise a jour...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    Enregistrer
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