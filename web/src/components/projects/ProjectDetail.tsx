import React, { useState, useEffect, useCallback } from "react";
import { ArrowLeft, LayoutGrid, Layers, GitBranch, Search, Filter, Coins, Plus, Trash2, Loader2, AlertCircle, X, Pencil, History, ChevronsRight, CheckCircle2, ClipboardSignature } from "lucide-react";
import { WBSTree } from "./WBSTree";
import { TaskDetail } from "./TaskDetail";
import { Badge } from "../ui/badge";
import { motion, AnimatePresence } from "motion/react";
import { apiFetch, API_BASE } from "../../lib/api";
import { usePermissions } from "../../contexts/AuthContext";
import ProjectReceptionsTab from "./ProjectReceptionsTab";

interface ProjectDetailProps {
  projectId: number;
  onBack: () => void;
}

interface ProjectPhaseTransition {
  id: number;
  from_phase: string;
  to_phase: string;
  reason?: string | null;
  changed_at: string;
  changedBy?: {
    id: number;
    firstname?: string | null;
    lastname?: string | null;
    email?: string | null;
  } | null;
}

interface ProjectWorkflowSummary {
  currentPhase: string;
  nextPhase: string | null;
  canAdvance: boolean;
  phaseSequence: string[];
  progress: {
    completed: number;
    total: number;
  };
  requirements: Array<{
    code: string;
    label: string;
    satisfied: boolean;
  }>;
  blockingRequirements: string[];
  metrics: {
    lots: number;
    wbs: number;
    tasks: number;
    completedTasks: number;
    budgetLines: number;
    workAcceptances: number;
  };
}

const STATUS_LABELS: Record<string, string> = {
  PLANNING: "Planification", ACTIVE: "En cours", ON_HOLD: "En pause", COMPLETED: "Terminé",
};

const PROJECT_PHASE_META: Record<string, { label: string; badge: string; dot: string }> = {
  ETUDE: {
    label: "Étude",
    badge: "border-violet-500/20 bg-violet-500/10 text-violet-600",
    dot: "bg-violet-500",
  },
  PREPARATION: {
    label: "Préparation",
    badge: "border-cyan-500/20 bg-cyan-500/10 text-cyan-600",
    dot: "bg-cyan-500",
  },
  EXECUTION: {
    label: "Exécution",
    badge: "border-emerald-500/20 bg-emerald-500/10 text-emerald-600",
    dot: "bg-emerald-500",
  },
  RECEPTION: {
    label: "Réception",
    badge: "border-amber-500/20 bg-amber-500/10 text-amber-600",
    dot: "bg-amber-500",
  },
  CLOTURE: {
    label: "Clôture",
    badge: "border-slate-500/20 bg-slate-500/10 text-slate-500",
    dot: "bg-slate-500",
  },
};

const PROJECT_ACTION_GUARDS = {
  wbs: {
    allowedPhases: ["ETUDE", "PREPARATION"],
    reason: "Le WBS est modifiable uniquement pendant les phases Étude et Préparation.",
  },
  lots: {
    allowedPhases: ["ETUDE", "PREPARATION"],
    reason: "Les lots sont modifiables uniquement pendant les phases Étude et Préparation.",
  },
  tasks: {
    allowedPhases: ["PREPARATION", "EXECUTION"],
    reason: "Les tâches sont modifiables uniquement pendant les phases Préparation et Exécution.",
  },
} as const;

function getProjectPhaseMeta(phase?: string) {
  return PROJECT_PHASE_META[phase ?? ""] ?? {
    label: phase ?? "Non défini",
    badge: "border-gb-border bg-gb-app text-gb-muted",
    dot: "bg-gb-muted",
  };
}

function formatTransitionDate(value?: string) {
  if (!value) return "Date inconnue";
  return new Date(value).toLocaleString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function isActionAllowed(currentPhase: string | undefined, allowedPhases: readonly string[]) {
  if (!currentPhase) return true;
  return allowedPhases.includes(currentPhase);
}

function formatLotDate(value?: string | null) {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toLocaleDateString("fr-FR");
}

function formatTaskDate(value?: string | null) {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toLocaleDateString("fr-FR");
}

export function ProjectDetail({ projectId, onBack }: ProjectDetailProps) {
  const { can } = usePermissions();

  const [project,      setProject]      = useState<any>(null);
  const [wbs,          setWbs]          = useState<any[]>([]);
  const [lots,         setLots]         = useState<any[]>([]);
  const [tasks,        setTasks]        = useState<any[]>([]);
  const [budgetLines,  setBudgetLines]  = useState<any[]>([]);
  const [phaseTransitions, setPhaseTransitions] = useState<ProjectPhaseTransition[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [workflowAdvancing, setWorkflowAdvancing] = useState(false);
  const [workflowFeedback, setWorkflowFeedback] = useState<string | null>(null);
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [activeTab,    setActiveTab]    = useState<"wbs" | "lots" | "budget" | "receptions">("wbs");
  const [lotActionError, setLotActionError] = useState<string | null>(null);

  // ── WBS form state ─────────────────────────────────────────────────────────
  const [showWbsDialog, setShowWbsDialog] = useState(false);
  const [editingWbs, setEditingWbs] = useState<any | null>(null);
  const [wbsSaving, setWbsSaving] = useState(false);
  const [wbsError, setWbsError] = useState<string | null>(null);
  const EMPTY_WBS = { code: "", name: "", parent_id: "" };
  const [wbsForm, setWbsForm] = useState(EMPTY_WBS);

  // ── Lot form state ─────────────────────────────────────────────────────────
  const [showLotDialog, setShowLotDialog] = useState(false);  const [editingLot,    setEditingLot]    = useState<any | null>(null);  const [lotAdding,     setLotAdding]     = useState(false);
  const [tradeCategories, setTradeCategories] = useState<{ code: string; label: string }[]>([]);
  const EMPTY_LOT = { lot_number: "", name: "", trade_code: "", description: "", status: "CONCEPTION", budget_allocated: "", start_date: "", end_date: "" };
  const [lotForm, setLotForm] = useState(EMPTY_LOT);

  // ── Task form state ────────────────────────────────────────────────────────
  const TASK_STATUS_LABELS: Record<string, string> = {
    TODO: "À faire", IN_PROGRESS: "En cours", ON_HOLD: "En pause", DONE: "Terminée", CANCELLED: "Annulée",
  };
  const LOT_STATUS_LABELS: Record<string, string> = {
    CONCEPTION: "Conception",
    APPEL_OFFRES: "Appel d'offres",
    ATTRIBUTION: "Attribution",
    EN_COURS: "En cours",
    RECEPTION_PROVISOIRE: "Réception provisoire",
    RECEPTION_DEFINITIVE: "Réception définitive",
    CLOS: "Clos",
  };
  const EMPTY_TASK = { lot_id: "", title: "", description: "", status: "TODO", priority: "MEDIUM", progress: "0", planned_start: "", planned_end: "" };
  const [showTaskDialog, setShowTaskDialog] = useState(false);
  const [editingTask,    setEditingTask]    = useState<any | null>(null);
  const [taskSaving,     setTaskSaving]     = useState(false);
  const [taskForm,       setTaskForm]       = useState(EMPTY_TASK);

  // ── Fetch ──────────────────────────────────────────────────────────────────

  const loadProjectDetail = useCallback(async () => {
    setLoading(true);
    try {
      const [prjRes, wbsRes, lotsRes, tasksRes, budgetRes, tradeRes, transitionsRes] = await Promise.all([
        apiFetch(`${API_BASE}/projects/${projectId}`),
        apiFetch(`${API_BASE}/projects/${projectId}/wbs`),
        apiFetch(`${API_BASE}/projects/${projectId}/lots`),
        apiFetch(`${API_BASE}/projects/${projectId}/tasks`),
        apiFetch(`${API_BASE}/projects/${projectId}/budget-lines`),
        apiFetch(`${API_BASE}/projects/helpers/trade-categories`),
        apiFetch(`${API_BASE}/projects/${projectId}/phase-transitions`),
      ]);
      if (prjRes.ok)    setProject(await prjRes.json());
      if (wbsRes.ok)    setWbs(await wbsRes.json());
      if (lotsRes.ok)   setLots(await lotsRes.json());
      if (tasksRes.ok)  setTasks(await tasksRes.json());
      if (budgetRes.ok) setBudgetLines(await budgetRes.json());
      if (tradeRes.ok)  setTradeCategories(await tradeRes.json());
      if (transitionsRes.ok) setPhaseTransitions(await transitionsRes.json());
    } catch (err) {
      console.error("[ProjectDetail] load error", err);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    loadProjectDetail();
  }, [loadProjectDetail]);

  const advanceProjectPhase = async () => {
    const workflow = project?.workflow as ProjectWorkflowSummary | undefined;
    if (!workflow?.nextPhase || !workflow.canAdvance) return;

    setWorkflowAdvancing(true);
    setWorkflowFeedback(null);
    try {
      const res = await apiFetch(`${API_BASE}/projects/${projectId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phase: workflow.nextPhase }),
      });

      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        setWorkflowFeedback(error.error || "Impossible de faire avancer la phase du projet.");
        return;
      }

      await loadProjectDetail();
      const nextMeta = getProjectPhaseMeta(workflow.nextPhase);
      setWorkflowFeedback(`Projet avancé vers la phase ${nextMeta.label}.`);
    } catch (error) {
      console.error("[ProjectDetail] advanceProjectPhase error", error);
      setWorkflowFeedback("Impossible de faire avancer la phase du projet.");
    } finally {
      setWorkflowAdvancing(false);
    }
  };

  // ── Add Lot ────────────────────────────────────────────────────────────────

  const addLot = async () => {
    if (!isActionAllowed(project?.phase, PROJECT_ACTION_GUARDS.lots.allowedPhases)) return;
    if (!lotForm.name.trim() || !lotForm.trade_code) return;
    setLotAdding(true);
    try {
      const payload: Record<string, any> = {
        project_id:  projectId,
        name:        lotForm.name.trim(),
        trade_code:  lotForm.trade_code,
        description: lotForm.description.trim() || null,
        status:      lotForm.status,
      };
      if (lotForm.budget_allocated !== "") payload.budget_allocated = Number(lotForm.budget_allocated);
      if (lotForm.start_date) payload.start_date = lotForm.start_date;
      if (lotForm.end_date)   payload.end_date   = lotForm.end_date;

      const res = await apiFetch(`${API_BASE}/projects/lots`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(payload),
      });
      if (res.ok) {
        const newLot = await res.json();
        if (newLot?.id) {
          setLotForm(EMPTY_LOT);
          setShowLotDialog(false);
          await loadProjectDetail();
        } else {
          console.error('[addLot] Réponse invalide du serveur :', newLot);
        }
      } else {
        const err = await res.json().catch(() => ({}));
        console.error('[addLot] Erreur serveur :', res.status, err);
      }
    } finally {
      setLotAdding(false);
    }
  };

  const editLot = async () => {
    if (!isActionAllowed(project?.phase, PROJECT_ACTION_GUARDS.lots.allowedPhases)) return;
    if (!editingLot || !lotForm.name.trim() || !lotForm.trade_code) return;
    setLotAdding(true);
    try {
      const payload: Record<string, any> = {
        name:        lotForm.name.trim(),
        trade_code:  lotForm.trade_code,
        description: lotForm.description.trim() || null,
        status:      lotForm.status,
      };
      if (lotForm.budget_allocated !== "") payload.budget_allocated = Number(lotForm.budget_allocated);
      if (lotForm.start_date) payload.start_date = lotForm.start_date;
      if (lotForm.end_date)   payload.end_date   = lotForm.end_date;

      const res = await apiFetch(`${API_BASE}/projects/lots/${editingLot.id}`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(payload),
      });
      if (res.ok) {
        const updated = await res.json();
        if (updated?.id) {
          setLotForm(EMPTY_LOT);
          setEditingLot(null);
          setShowLotDialog(false);
          await loadProjectDetail();
        } else {
          console.error('[editLot] Réponse invalide du serveur :', updated);
        }
      } else {
        const err = await res.json().catch(() => ({}));
        console.error('[editLot] Erreur serveur :', res.status, err);
      }
    } finally {
      setLotAdding(false);
    }
  };

  const deleteLot = async (id: number) => {
    if (!isActionAllowed(project?.phase, PROJECT_ACTION_GUARDS.lots.allowedPhases)) return;
    if (!window.confirm("Supprimer ce lot ?")) return;
    setLotActionError(null);
    const res = await apiFetch(`${API_BASE}/projects/lots/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      setLotActionError(err.error || "Impossible de supprimer ce lot. Vérifiez qu'il n'a pas de données liées.");
      return;
    }
    await loadProjectDetail();
  };

  // ── Task CRUD ──────────────────────────────────────────────────────────────

  const saveTask = async () => {
    if (!isActionAllowed(project?.phase, PROJECT_ACTION_GUARDS.tasks.allowedPhases)) return;
    if (!taskForm.title.trim() || !taskForm.lot_id) return;
    setTaskSaving(true);
    try {
      const payload: Record<string, any> = {
        lot_id:   Number(taskForm.lot_id),
        title:    taskForm.title.trim(),
        description: taskForm.description.trim() || null,
        status:   taskForm.status,
        priority: taskForm.priority,
        progress: Number(taskForm.progress),
      };
      if (taskForm.planned_start) payload.planned_start = taskForm.planned_start;
      if (taskForm.planned_end)   payload.planned_end   = taskForm.planned_end;

      let res: Response;
      if (editingTask) {
        res = await apiFetch(`${API_BASE}/projects/tasks/${editingTask.id}`, {
          method:  "PATCH",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify(payload),
        });
      } else {
        payload.project_id = projectId;
        res = await apiFetch(`${API_BASE}/projects/tasks`, {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify(payload),
        });
      }

      if (res.ok) {
        const saved = await res.json();
        if (saved?.id) {
          setTaskForm(EMPTY_TASK);
          setEditingTask(null);
          setShowTaskDialog(false);
          await loadProjectDetail();
        } else {
          console.error('[saveTask] Réponse invalide du serveur :', saved);
        }
      } else {
        const err = await res.json().catch(() => ({}));
        console.error('[saveTask] Erreur serveur :', res.status, err);
      }
    } finally {
      setTaskSaving(false);
    }
  };

  const deleteTask = async (id: number) => {
    if (!isActionAllowed(project?.phase, PROJECT_ACTION_GUARDS.tasks.allowedPhases)) return;
    if (!window.confirm("Supprimer cette tâche ?")) return;
    const res = await apiFetch(`${API_BASE}/projects/tasks/${id}`, { method: "DELETE" });
    if (res.ok) await loadProjectDetail();
  };

  // ── WBS HELPERS ────────────────────────────────────────────────────────────

  const findWbsNodeById = (nodes: any[], id: number): any | null => {
    for (const node of nodes) {
      if (node.id === id) return node;
      if (node.children) {
        const found = findWbsNodeById(node.children, id);
        if (found) return found;
      }
    }
    return null;
  };

  const generateWbsCode = async (parentId: string | null | undefined): Promise<string> => {
    try {
      if (!parentId) {
        // Génération pour racine: trouver le plus grand numéro racine
        const rootCodes = flattenWbsNodes(wbs)
          .filter(n => !n.code.includes('.'))
          .map(n => Number(n.code))
          .filter(n => !isNaN(n));
        const maxNum = Math.max(...rootCodes, 0);
        return String(maxNum + 1);
      } else {
        // Génération pour enfant: trouver le parent et générer le code enfant
        const parent = findWbsNodeById(wbs, Number(parentId));
        if (!parent) return "1";
        
        // Trouver tous les enfants du parent pour déterminer le prochain numéro
        const allNodes = flattenWbsNodes(wbs);
        const children = allNodes.filter(n => {
          const fullNode = findWbsNodeById(wbs, n.id);
          return fullNode?.parent_id === Number(parentId);
        });
        
        // Extraire le dernier numéro du code des enfants
        const childNumbers = children.map(c => {
          const parts = c.code.split('.');
          return Number(parts[parts.length - 1]) || 0;
        });
        const maxNum = Math.max(...childNumbers, 0);
        
        return `${parent.code}.${maxNum + 1}`;
      }
    } catch (err) {
      console.error('[generateWbsCode] error', err);
      return "1";
    }
  };

  // ── WBS CRUD ───────────────────────────────────────────────────────────────

  const flattenWbsNodes = (nodes: any[]): any[] => {
    return nodes.flatMap((node) => [
      { id: node.id, code: node.code, name: node.name, level: node.level ?? 0 },
      ...(node.children ? flattenWbsNodes(node.children) : []),
    ]);
  };

  const flatWbsNodes = flattenWbsNodes(wbs);

  const saveWbsNode = async () => {
    if (!isActionAllowed(project?.phase, PROJECT_ACTION_GUARDS.wbs.allowedPhases)) return;
    if (!wbsForm.name.trim()) {
      setWbsError("Nom requis.");
      return;
    }

    setWbsSaving(true);
    setWbsError(null);
    try {
      let res: Response;
      if (editingWbs) {
        res = await apiFetch(`${API_BASE}/projects/wbs/${editingWbs.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code: wbsForm.code.trim(), name: wbsForm.name.trim() }),
        });
      } else {
        res = await apiFetch(`${API_BASE}/projects/wbs`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            project_id: projectId,
            parent_id: wbsForm.parent_id ? Number(wbsForm.parent_id) : null,
            code: wbsForm.code.trim(),
            name: wbsForm.name.trim(),
          }),
        });
      }

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setWbsError(err.error || "Erreur lors de l'enregistrement du nœud WBS.");
        return;
      }

      await loadProjectDetail();
      setShowWbsDialog(false);
      setEditingWbs(null);
      setWbsForm(EMPTY_WBS);
    } finally {
      setWbsSaving(false);
    }
  };

  const deleteWbsNode = async (id: number) => {
    if (!isActionAllowed(project?.phase, PROJECT_ACTION_GUARDS.wbs.allowedPhases)) return;
    if (!window.confirm("Supprimer ce nœud WBS ?")) return;
    const res = await apiFetch(`${API_BASE}/projects/wbs/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      setWbsError(err.error || "Impossible de supprimer ce nœud WBS.");
      return;
    }
    await loadProjectDetail();
  };

  // ── Render guards ──────────────────────────────────────────────────────────

  if (loading) return (
    <div className="flex items-center justify-center p-20">
      <Loader2 className="w-8 h-8 text-gb-primary animate-spin" />
    </div>
  );
  if (!project) return (
    <div className="flex items-center gap-3 p-10 text-gb-danger">
      <AlertCircle className="w-5 h-5" /> Projet introuvable.
    </div>
  );

  const RECEPTION_PHASES = ["RECEPTION", "CLOTURE"];
  const tabs = [
    { id: "wbs",        icon: GitBranch,         label: "SDT",        count: wbs.length },
    { id: "lots",       icon: Layers,            label: "Lots & Tâches", count: lots.length },
    { id: "budget",     icon: Coins,             label: "Budget",     count: budgetLines.length },
    ...(RECEPTION_PHASES.includes(project.phase)
      ? [{ id: "receptions", icon: ClipboardSignature, label: "Réceptions", count: 0 }]
      : []),
  ];
  const currentPhase = getProjectPhaseMeta(project.phase);
  const workflow = project.workflow as ProjectWorkflowSummary | undefined;
  const nextPhase = workflow?.nextPhase ? getProjectPhaseMeta(workflow.nextPhase) : null;
  const canManageWbs = isActionAllowed(project.phase, PROJECT_ACTION_GUARDS.wbs.allowedPhases);
  const canManageLots = isActionAllowed(project.phase, PROJECT_ACTION_GUARDS.lots.allowedPhases);
  const canManageTasks = isActionAllowed(project.phase, PROJECT_ACTION_GUARDS.tasks.allowedPhases);

  const budgetPlannedTotal = budgetLines.reduce((sum: number, line: any) => sum + (line.planned ?? 0), 0);
  const budgetActualTotal = budgetLines.reduce((sum: number, line: any) => sum + (line.actual ?? 0), 0);
  const tasksByLot = lots.reduce((acc: Record<number, any[]>, lot: any) => {
    acc[lot.id] = tasks.filter((task: any) => (task.lot_id ?? task.lot?.id) === lot.id);
    return acc;
  }, {});
  const tasksWithDates = tasks.filter((task: any) => task.planned_start || task.planned_end).length;
  const completedTasks = tasks.filter((task: any) => ["DONE", "COMPLETED"].includes(task.status)).length;

  const premiumChecklist = [
    {
      key: "identity",
      label: "Identité projet opérationnelle",
      detail: "Code, titre, localisation, dates, devise et budget initial.",
      status: (project.code && project.title && project.location && project.start_date && project.end_date && project.currency && project.budget_initial > 0)
        ? "ok"
        : "warning",
    },
    {
      key: "client-regulatory",
      label: "Cadre client et réglementaire",
      detail: "Client, contact et éléments réglementaires (permis / type ouvrage / ERP).",
      status: (project.client_name && (project.client_contact_name || project.client_phone) && (project.permit_number || project.building_type || project.erp_project_id))
        ? "ok"
        : "warning",
    },
    {
      key: "structuring",
      label: "Structuration chantier",
      detail: `${lots.length} lot(s) et ${wbs.length} nœud(s) WBS définis.`,
      status: lots.length > 0 && wbs.length > 0 ? "ok" : "warning",
    },
    {
      key: "execution-plan",
      label: "Planification exécution",
      detail: `${tasks.length} tâche(s), dont ${tasksWithDates} avec jalons de dates.`,
      status: tasks.length > 0 && tasksWithDates > 0 ? "ok" : tasks.length > 0 ? "info" : "warning",
    },
    {
      key: "budget-control",
      label: "Pilotage budgétaire",
      detail: `${budgetLines.length} ligne(s), planifié ${budgetPlannedTotal.toLocaleString("fr-FR")}, réel ${budgetActualTotal.toLocaleString("fr-FR")}.`,
      status: budgetLines.length > 0 ? "ok" : "warning",
    },
    {
      key: "workflow",
      label: "Conformité étape en cours",
      detail: workflow
        ? `${workflow.progress.completed}/${workflow.progress.total} prérequis validés pour la phase ${currentPhase.label}.`
        : "Workflow non disponible.",
      status: workflow
        ? (workflow.progress.total === 0 || workflow.canAdvance ? "ok" : workflow.progress.completed > 0 ? "info" : "warning")
        : "warning",
    },
  ] as const;

  const checklistStatusMeta = {
    ok: {
      badge: "border-emerald-500/20 bg-emerald-500/10 text-emerald-600",
      dot: "bg-emerald-500",
      label: "Conforme",
    },
    info: {
      badge: "border-cyan-500/20 bg-cyan-500/10 text-cyan-600",
      dot: "bg-cyan-500",
      label: "Partiel",
    },
    warning: {
      badge: "border-amber-500/20 bg-amber-500/10 text-amber-700",
      dot: "bg-amber-500",
      label: "À compléter",
    },
  } as const;

  return (
    <div className="space-y-6">
      {/* Back button */}
      <button onClick={onBack} className="flex items-center gap-2 text-gb-muted hover:text-gb-primary transition-colors text-sm font-medium w-fit min-h-[44px] px-1">
        <ArrowLeft size={16} /> Retour aux projets
      </button>

      {/* Project header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <span className="text-xs font-mono font-bold text-gb-primary bg-gb-primary/10 px-2 py-1 rounded ring-1 ring-gb-primary/20">
              {project.code}
            </span>
            <Badge variant="outline" className="border-gb-border text-gb-muted">
              {STATUS_LABELS[project.status] ?? project.status}
            </Badge>
            <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-bold ${currentPhase.badge}`}>
              <span className={`h-2 w-2 rounded-full ${currentPhase.dot}`} />
              {currentPhase.label}
            </span>
          </div>
          <h2 className="text-3xl font-extrabold text-gb-text tracking-tight">{project.title}</h2>
          <p className="text-gb-muted text-sm flex items-center gap-2 mt-2">
            <span className="font-medium text-gb-text/70">{project.location}</span>
            {project.start_date && (<><span>·</span><span>{new Date(project.start_date).toLocaleDateString("fr-FR")} — {project.end_date ? new Date(project.end_date).toLocaleDateString("fr-FR") : "?"}</span></>)}
          </p>
          <p className="text-sm font-bold text-gb-primary mt-1">
            Budget : {(project.budget_initial ?? 0).toLocaleString("fr-FR")} {project.currency}
          </p>
          <p className="mt-2 text-xs text-gb-muted">
            Phase active : <span className="font-bold text-gb-text">{currentPhase.label}</span>
          </p>
          {(project.client_name || project.building_type || project.permit_number || project.erp_project_id) && (
            <p className="text-xs text-gb-muted mt-2">
              {project.client_name ? `Client: ${project.client_name}` : ""}
              {project.building_type ? `${project.client_name ? " · " : ""}Type: ${project.building_type}` : ""}
              {project.permit_number ? `${(project.client_name || project.building_type) ? " · " : ""}Permis: ${project.permit_number}` : ""}
              {project.erp_project_id ? `${(project.client_name || project.building_type || project.permit_number) ? " · " : ""}ERP: ${project.erp_project_id}` : ""}
            </p>
          )}
        </div>

        {/* Tabs */}
        <div className="bg-gb-surface-solid border border-gb-border p-1 rounded-lg flex gap-1 flex-wrap">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-3 py-2.5 min-h-[44px] sm:min-h-0 sm:py-2 rounded-md text-sm font-bold transition-all ${
                activeTab === tab.id
                  ? "bg-gb-primary text-gb-inverse shadow-lg shadow-gb-primary/20"
                  : "text-gb-muted hover:bg-gb-surface-hover hover:text-gb-text"
              }`}
            >
              <tab.icon size={15} />
              <span className="hidden sm:inline">{tab.label}</span>
              <span className={`text-[10px] px-1.5 rounded-full font-mono ${activeTab === tab.id ? "bg-white/20" : "bg-gb-app"}`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-8 space-y-6">

          {/* WBS */}
          {activeTab === "wbs" && (
            <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-gb-text flex items-center gap-2">
                  <GitBranch className="text-gb-primary" /> Structure de découpage du travail (SDT)
                </h3>
                {can("wbs:create") && (
                  <button
                    onClick={async () => {
                      if (!canManageWbs) return;
                      setEditingWbs(null);
                      setWbsError(null);
                      const generatedCode = await generateWbsCode(null);
                      setWbsForm({ ...EMPTY_WBS, code: generatedCode });
                      setShowWbsDialog(true);
                    }}
                    disabled={!canManageWbs}
                    title={!canManageWbs ? PROJECT_ACTION_GUARDS.wbs.reason : undefined}
                    className="flex items-center gap-1.5 px-4 py-2 bg-gb-primary text-gb-inverse rounded-lg text-sm font-semibold hover:bg-gb-primary/90 transition-colors min-h-[40px] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Plus size={15} /> Nouveau nœud
                  </button>
                )}
              </div>
              {!canManageWbs && (
                <p className="text-xs text-amber-600 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2">
                  {PROJECT_ACTION_GUARDS.wbs.reason}
                </p>
              )}
              {wbsError && (
                <p className="text-xs text-gb-danger bg-gb-danger/10 border border-gb-danger/20 rounded-lg px-3 py-2">
                  {wbsError}
                </p>
              )}
              {wbs.length === 0 ? (
                <p className="text-gb-muted text-sm py-8 text-center border border-gb-border border-dashed rounded-xl">Aucun nœud WBS défini.</p>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <WBSTree nodes={wbs} onTaskSelect={setSelectedTask} />
                  </div>

                  <div className="rounded-xl border border-gb-border overflow-hidden">
                    <div className="px-4 py-3 bg-gb-surface-solid border-b border-gb-border">
                      <p className="text-xs font-bold text-gb-muted uppercase tracking-widest">Gestion des nœuds</p>
                    </div>
                    <div className="divide-y divide-gb-border">
                      {flatWbsNodes.map((node) => (
                        <div key={node.id} className="flex items-center justify-between gap-3 px-4 py-3">
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-gb-text truncate">
                              <span className="font-mono text-gb-primary">{node.code}</span> · {node.name}
                            </p>
                            <p className="text-xs text-gb-muted">Niveau {node.level}</p>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            {can("wbs:update") && (
                              <button
                                onClick={() => {
                                  if (!canManageWbs) return;
                                  setEditingWbs(node);
                                  setWbsError(null);
                                  setWbsForm({ code: node.code ?? "", name: node.name ?? "", parent_id: "" });
                                  setShowWbsDialog(true);
                                }}
                                disabled={!canManageWbs}
                                title={!canManageWbs ? PROJECT_ACTION_GUARDS.wbs.reason : undefined}
                                className="flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-md border border-gb-border hover:border-gb-primary hover:text-gb-primary transition-colors disabled:cursor-not-allowed disabled:opacity-40"
                              >
                                <Pencil size={12} /> Modifier
                              </button>
                            )}
                            {can("wbs:delete") && (
                              <button
                                onClick={() => deleteWbsNode(node.id)}
                                disabled={!canManageWbs}
                                title={!canManageWbs ? PROJECT_ACTION_GUARDS.wbs.reason : undefined}
                                className="flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-md border border-gb-border hover:border-gb-danger hover:text-gb-danger transition-colors disabled:cursor-not-allowed disabled:opacity-40"
                              >
                                <Trash2 size={12} /> Supprimer
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {showWbsDialog && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                  <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => { setShowWbsDialog(false); setEditingWbs(null); }} />
                  <div className="relative bg-gb-surface-solid border border-gb-border rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
                    <div className="flex items-center justify-between p-5 border-b border-gb-border">
                      <div>
                        <h4 className="text-base font-bold text-gb-text">{editingWbs ? "Modifier le nœud WBS" : "Nouveau nœud WBS"}</h4>
                        <p className="text-xs text-gb-muted mt-0.5">{editingWbs ? `#${editingWbs.id}` : "Structuration du projet"}</p>
                      </div>
                      <button onClick={() => { setShowWbsDialog(false); setEditingWbs(null); }} className="p-1.5 rounded-lg hover:bg-gb-surface-hover text-gb-muted hover:text-gb-text transition-colors">
                        <X size={16} />
                      </button>
                    </div>

                    <div className="p-5 space-y-4">
                      {!editingWbs && (
                        <div>
                          <label className="block text-xs font-semibold text-gb-text mb-1.5">Parent (optionnel)</label>
                          <select
                            value={wbsForm.parent_id}
                            onChange={async (e) => {
                              const newParentId = e.target.value;
                              const generatedCode = await generateWbsCode(newParentId || null);
                              setWbsForm((p) => ({ ...p, parent_id: newParentId, code: generatedCode }));
                            }}
                            className="w-full bg-gb-app border border-gb-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gb-primary"
                          >
                            <option value="">Aucun (nœud racine)</option>
                            {flatWbsNodes.map((node) => (
                              <option key={node.id} value={node.id}>{node.code} · {node.name}</option>
                            ))}
                          </select>
                        </div>
                      )}
                      <div>
                        <label className="block text-xs font-semibold text-gb-text mb-1.5">Nom <span className="text-gb-danger">*</span></label>
                        <input
                          autoFocus
                          value={wbsForm.name}
                          onChange={e => setWbsForm((p) => ({ ...p, name: e.target.value }))}
                          placeholder="Ex: Gros œuvre"
                          className="w-full bg-gb-app border border-gb-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gb-primary"
                        />
                      </div>

                      {wbsError && (
                        <p className="text-xs text-gb-danger bg-gb-danger/10 border border-gb-danger/20 rounded-lg px-3 py-2">
                          {wbsError}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center justify-end gap-2 p-5 border-t border-gb-border">
                      <button
                        onClick={() => { setShowWbsDialog(false); setEditingWbs(null); }}
                        className="px-4 py-2 text-sm font-medium text-gb-muted hover:text-gb-text border border-gb-border rounded-lg hover:bg-gb-surface-hover transition-colors"
                      >
                        Annuler
                      </button>
                      <button
                        onClick={saveWbsNode}
                        disabled={wbsSaving || !wbsForm.name.trim() || !canManageWbs}
                        title={!canManageWbs ? PROJECT_ACTION_GUARDS.wbs.reason : undefined}
                        className="flex items-center gap-1.5 px-4 py-2 bg-gb-primary text-gb-inverse rounded-lg text-sm font-semibold disabled:opacity-50 hover:bg-gb-primary/90 transition-colors"
                      >
                        {wbsSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus size={15} />}
                        {editingWbs ? "Enregistrer" : "Créer le nœud"}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* Lots */}
          {activeTab === "lots" && (
            <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <h3 className="text-lg font-bold text-gb-text flex items-center gap-2">
                  <Layers className="text-gb-primary" /> Lots & tâches
                </h3>
                <div className="flex flex-wrap items-center gap-2">
                  {can("task:create") && (
                    <button
                      onClick={() => {
                        if (!canManageTasks || lots.length === 0) return;
                        setEditingTask(null);
                        setTaskForm({ ...EMPTY_TASK, lot_id: String(lots[0].id) });
                        setShowTaskDialog(true);
                      }}
                      disabled={!canManageTasks || lots.length === 0}
                      title={
                        !canManageTasks
                          ? PROJECT_ACTION_GUARDS.tasks.reason
                          : lots.length === 0
                          ? "Créez d'abord un lot avant d'ajouter une tâche."
                          : undefined
                      }
                      className="flex items-center gap-1.5 px-4 py-2 bg-gb-app border border-gb-border text-gb-text rounded-lg text-sm font-semibold hover:border-gb-primary hover:text-gb-primary transition-colors min-h-[40px] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <Plus size={15} /> Nouvelle tâche
                    </button>
                  )}
                  {can("project-lot:create") && (
                    <button
                      onClick={() => {
                        if (!canManageLots) return;
                        setEditingLot(null); setLotForm(EMPTY_LOT); setShowLotDialog(true);
                      }}
                      disabled={!canManageLots}
                      title={!canManageLots ? PROJECT_ACTION_GUARDS.lots.reason : undefined}
                      className="flex items-center gap-1.5 px-4 py-2 bg-gb-primary text-gb-inverse rounded-lg text-sm font-semibold hover:bg-gb-primary/90 transition-colors min-h-[40px] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <Plus size={15} /> Nouveau lot
                    </button>
                  )}
                </div>
              </div>
              {(!canManageLots || !canManageTasks) && (
                <div className="space-y-2">
                  {!canManageLots && (
                    <p className="text-xs text-amber-600 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2">
                      {PROJECT_ACTION_GUARDS.lots.reason}
                    </p>
                  )}
                  {!canManageTasks && (
                    <p className="text-xs text-amber-600 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2">
                      {PROJECT_ACTION_GUARDS.tasks.reason}
                    </p>
                  )}
                </div>
              )}
              {lotActionError && (
                <p className="text-xs text-gb-danger bg-gb-danger/10 border border-gb-danger/20 rounded-lg px-3 py-2">
                  {lotActionError}
                </p>
              )}

              {showTaskDialog && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                  <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => { setShowTaskDialog(false); setEditingTask(null); }} />
                  <div className="relative bg-gb-surface-solid border border-gb-border rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
                    <div className="flex items-center justify-between p-5 border-b border-gb-border">
                      <div>
                        <h4 className="text-base font-bold text-gb-text">{editingTask ? "Modifier la tâche" : "Nouvelle tâche"}</h4>
                        <p className="text-xs text-gb-muted mt-0.5">{editingTask ? `"${editingTask.title}"` : "Rattachez la tâche à un lot puis renseignez ses informations."}</p>
                      </div>
                      <button onClick={() => { setShowTaskDialog(false); setEditingTask(null); }} className="p-1.5 rounded-lg hover:bg-gb-surface-hover text-gb-muted hover:text-gb-text transition-colors">
                        <X size={16} />
                      </button>
                    </div>

                    <div className="p-5 space-y-4">
                      <div>
                        <label className="block text-xs font-semibold text-gb-text mb-1.5">
                          Lot <span className="text-gb-danger">*</span>
                        </label>
                        <select
                          value={taskForm.lot_id}
                          onChange={e => setTaskForm(p => ({ ...p, lot_id: e.target.value }))}
                          className="w-full bg-gb-app border border-gb-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gb-primary"
                        >
                          <option value="">— Sélectionner un lot —</option>
                          {lots.map((lot: any) => (
                            <option key={lot.id} value={lot.id}>Lot {lot.lot_number} — {lot.name}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-gb-text mb-1.5">
                          Titre <span className="text-gb-danger">*</span>
                        </label>
                        <input
                          autoFocus
                          value={taskForm.title}
                          onChange={e => setTaskForm(p => ({ ...p, title: e.target.value }))}
                          placeholder="ex : Fondations — coulage béton"
                          className="w-full bg-gb-app border border-gb-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gb-primary"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-gb-text mb-1.5">Description</label>
                        <textarea
                          value={taskForm.description}
                          onChange={e => setTaskForm(p => ({ ...p, description: e.target.value }))}
                          rows={3}
                          placeholder="Décrivez le contexte, le périmètre ou les contraintes de cette tâche..."
                          className="w-full bg-gb-app border border-gb-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gb-primary resize-none"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-semibold text-gb-text mb-1.5">Statut</label>
                          <select
                            value={taskForm.status}
                            onChange={e => setTaskForm(p => ({ ...p, status: e.target.value }))}
                            className="w-full bg-gb-app border border-gb-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gb-primary"
                          >
                            {Object.entries(TASK_STATUS_LABELS).map(([k, v]) => (
                              <option key={k} value={k}>{v}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-gb-text mb-1.5">Priorité</label>
                          <select
                            value={taskForm.priority}
                            onChange={e => setTaskForm(p => ({ ...p, priority: e.target.value }))}
                            className="w-full bg-gb-app border border-gb-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gb-primary"
                          >
                            <option value="LOW">Basse</option>
                            <option value="MEDIUM">Normale</option>
                            <option value="HIGH">Haute</option>
                            <option value="CRITICAL">Critique</option>
                          </select>
                        </div>
                      </div>

                      <div>
                        <div>
                          <label className="block text-xs font-semibold text-gb-text mb-1.5">
                            Avancement : <span className="text-gb-primary font-bold">{taskForm.progress}%</span>
                          </label>
                          <input
                            type="range"
                            min="0" max="100" step="5"
                            value={taskForm.progress}
                            onChange={e => setTaskForm(p => ({ ...p, progress: e.target.value }))}
                            className="w-full accent-gb-primary"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-semibold text-gb-text mb-1.5">Date de début</label>
                          <input
                            type="date"
                            value={taskForm.planned_start}
                            onChange={e => setTaskForm(p => ({ ...p, planned_start: e.target.value }))}
                            className="w-full bg-gb-app border border-gb-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gb-primary"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-gb-text mb-1.5">Date de fin</label>
                          <input
                            type="date"
                            value={taskForm.planned_end}
                            onChange={e => setTaskForm(p => ({ ...p, planned_end: e.target.value }))}
                            className="w-full bg-gb-app border border-gb-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gb-primary"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-2 p-5 border-t border-gb-border">
                      <button
                        onClick={() => { setShowTaskDialog(false); setEditingTask(null); }}
                        className="px-4 py-2 text-sm font-medium text-gb-muted hover:text-gb-text border border-gb-border rounded-lg hover:bg-gb-surface-hover transition-colors"
                      >
                        Annuler
                      </button>
                      <button
                        onClick={saveTask}
                        disabled={taskSaving || !taskForm.title.trim() || !taskForm.lot_id || !canManageTasks}
                        title={!canManageTasks ? PROJECT_ACTION_GUARDS.tasks.reason : undefined}
                        className="flex items-center gap-1.5 px-4 py-2 bg-gb-primary text-gb-inverse rounded-lg text-sm font-semibold disabled:opacity-50 hover:bg-gb-primary/90 transition-colors"
                      >
                        {taskSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus size={15} />}
                        {editingTask ? "Enregistrer" : "Créer la tâche"}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Dialog création de lot */}
              {showLotDialog && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                  <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => { setShowLotDialog(false); setEditingLot(null); }} />
                  <div className="relative bg-gb-surface-solid border border-gb-border rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
                    {/* Header */}
                    <div className="flex items-center justify-between p-5 border-b border-gb-border">
                      <div>
                        <h4 className="text-base font-bold text-gb-text">{editingLot ? "Modifier le lot" : "Nouveau lot de travaux"}</h4>
                        <p className="text-xs text-gb-muted mt-0.5">{editingLot ? `Lot n° ${editingLot.lot_number}` : "Renseignez les informations du lot"}</p>
                      </div>
                      <button onClick={() => { setShowLotDialog(false); setEditingLot(null); }} className="p-1.5 rounded-lg hover:bg-gb-surface-hover text-gb-muted hover:text-gb-text transition-colors">
                        <X size={16} />
                      </button>
                    </div>

                    {/* Body */}
                    <div className="p-5 space-y-4">
                      {/* Ligne 1 : N° lot + Catégorie */}
                      <div className={`grid gap-3 ${editingLot ? "grid-cols-2" : "grid-cols-1"}`}>
                        {editingLot && (
                          <div>
                            <label className="block text-xs font-semibold text-gb-text mb-1.5">
                              N° de lot <span className="text-gb-danger">*</span>
                            </label>
                            <input
                              value={lotForm.lot_number}
                              readOnly
                              className="w-full bg-gb-app/60 border border-gb-border rounded-lg px-3 py-2 text-sm text-gb-muted cursor-not-allowed"
                            />
                            <p className="text-[10px] text-gb-muted mt-1">Numéro attribué automatiquement, non modifiable.</p>
                          </div>
                        )}
                        <div>
                          <label className="block text-xs font-semibold text-gb-text mb-1.5">
                            Catégorie du lot (corps d'état) <span className="text-gb-danger">*</span>
                          </label>
                          <select
                            value={lotForm.trade_code}
                            onChange={e => setLotForm(p => ({ ...p, trade_code: e.target.value }))}
                            className="w-full bg-gb-app border border-gb-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gb-primary"
                          >
                            <option value="">— Sélectionner —</option>
                            {tradeCategories.map(t => (
                              <option key={t.code} value={t.code}>{t.label}</option>
                            ))}
                          </select>
                          <p className="text-[10px] text-gb-muted mt-1">
                            Un lot appartient à un corps d'état (ex: Gros œuvre, Électricité, CVC).
                          </p>
                          {tradeCategories.length === 0 && (
                            <p className="text-[10px] text-gb-muted mt-1">Aucun corps d'état — lancez le seed.</p>
                          )}
                          {!editingLot && (
                            <p className="text-[10px] text-gb-muted mt-1">
                              Le numéro de lot est attribué automatiquement à la création.
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Nom */}
                      <div>
                        <label className="block text-xs font-semibold text-gb-text mb-1.5">
                          Intitulé du lot <span className="text-gb-danger">*</span>
                        </label>
                        <input
                          value={lotForm.name}
                          onChange={e => setLotForm(p => ({ ...p, name: e.target.value }))}
                          placeholder="ex : Gros Œuvre — Fondations"
                          className="w-full bg-gb-app border border-gb-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gb-primary"
                        />
                      </div>

                      {/* Description */}
                      <div>
                        <label className="block text-xs font-semibold text-gb-text mb-1.5">Description</label>
                        <textarea
                          value={lotForm.description}
                          onChange={e => setLotForm(p => ({ ...p, description: e.target.value }))}
                          placeholder="Détails, périmètre, notes…"
                          rows={2}
                          className="w-full bg-gb-app border border-gb-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gb-primary resize-none"
                        />
                      </div>

                      {/* Ligne 3 : Statut + Budget */}
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-semibold text-gb-text mb-1.5">Statut</label>
                          <select
                            value={lotForm.status}
                            onChange={e => setLotForm(p => ({ ...p, status: e.target.value }))}
                            className="w-full bg-gb-app border border-gb-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gb-primary"
                          >
                            <option value="CONCEPTION">Conception</option>
                            <option value="APPEL_OFFRES">Appel d'offres</option>
                            <option value="ATTRIBUTION">Attribution</option>
                            <option value="EN_COURS">En cours</option>
                            <option value="RECEPTION_PROVISOIRE">Réception provisoire</option>
                            <option value="RECEPTION_DEFINITIVE">Réception définitive</option>
                            <option value="CLOS">Clos</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-gb-text mb-1.5">Budget alloué ({project?.currency})</label>
                          <input
                            type="number"
                            min="0"
                            value={lotForm.budget_allocated}
                            onChange={e => setLotForm(p => ({ ...p, budget_allocated: e.target.value }))}
                            placeholder="0"
                            className="w-full bg-gb-app border border-gb-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gb-primary"
                          />
                        </div>
                      </div>

                      {/* Ligne 4 : Dates */}
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-semibold text-gb-text mb-1.5">Date de début</label>
                          <input
                            type="date"
                            value={lotForm.start_date}
                            onChange={e => setLotForm(p => ({ ...p, start_date: e.target.value }))}
                            className="w-full bg-gb-app border border-gb-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gb-primary"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-gb-text mb-1.5">Date de fin</label>
                          <input
                            type="date"
                            value={lotForm.end_date}
                            onChange={e => setLotForm(p => ({ ...p, end_date: e.target.value }))}
                            className="w-full bg-gb-app border border-gb-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gb-primary"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-end gap-2 p-5 border-t border-gb-border">
                      <button
                        onClick={() => { setShowLotDialog(false); setEditingLot(null); }}
                        className="px-4 py-2 text-sm font-medium text-gb-muted hover:text-gb-text border border-gb-border rounded-lg hover:bg-gb-surface-hover transition-colors"
                      >
                        Annuler
                      </button>
                      <button
                        onClick={editingLot ? editLot : addLot}
                        disabled={lotAdding || !lotForm.name.trim() || !lotForm.trade_code || !canManageLots}
                        title={!canManageLots ? PROJECT_ACTION_GUARDS.lots.reason : undefined}
                        className="flex items-center gap-1.5 px-4 py-2 bg-gb-primary text-gb-inverse rounded-lg text-sm font-semibold disabled:opacity-50 hover:bg-gb-primary/90 transition-colors"
                      >
                        {lotAdding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus size={15} />}
                        {editingLot ? "Enregistrer" : "Créer le lot"}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Liste des lots */}
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                {lots.filter((lot: any) => lot != null).map((lot: any) => {
                  const trade = tradeCategories.find(t => t.code === lot.trade_code);
                  const lotTasks = tasksByLot[lot.id] ?? [];
                  const lotStartDate = formatLotDate(lot.start_date);
                  const lotEndDate = formatLotDate(lot.end_date);
                  const hasLotDeletePermission = can("project-lot:delete");
                  const canDeleteLot = hasLotDeletePermission && canManageLots && lotTasks.length === 0;
                  const deleteLotReason = !hasLotDeletePermission
                    ? "Vous n'avez pas la permission de supprimer un lot."
                    : !canManageLots
                    ? PROJECT_ACTION_GUARDS.lots.reason
                    : lotTasks.length > 0
                    ? "Impossible de supprimer un lot contenant des tâches."
                    : undefined;
                  return (
                    <div key={lot.id} className="bg-gb-surface-solid border border-gb-border rounded-xl p-5 group hover:border-gb-primary/50 transition-colors space-y-4">
                      <div className="flex flex-col gap-2 sm:flex-row sm:justify-between sm:items-start mb-2">
                        <div className="flex flex-wrap items-center gap-2 min-w-0">
                          <span className="text-xs font-mono font-bold text-gb-primary bg-gb-primary/10 px-2 py-0.5 rounded shrink-0">
                            {lot.lot_number ?? "—"}
                          </span>
                          <h4 className="font-bold text-sm group-hover:text-gb-primary transition-colors break-words">{lot.name}</h4>
                          <span className="text-[10px] font-mono bg-gb-app border border-gb-border px-2 py-0.5 rounded-full text-gb-muted shrink-0">
                            {lotTasks.length} tâche{lotTasks.length > 1 ? "s" : ""}
                          </span>
                        </div>
                        <div className="sm:ml-2 sm:shrink-0 w-full sm:w-auto">
                          <div className="flex flex-wrap items-center gap-1.5 justify-start sm:justify-end">
                            {can("task:create") && (
                              <button
                                onClick={() => {
                                  if (!canManageTasks) return;
                                  setEditingTask(null);
                                  setTaskForm({ ...EMPTY_TASK, lot_id: String(lot.id) });
                                  setShowTaskDialog(true);
                                }}
                                disabled={!canManageTasks}
                                title={!canManageTasks ? PROJECT_ACTION_GUARDS.tasks.reason : undefined}
                                className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-md border border-gb-primary/40 text-gb-primary hover:bg-gb-primary/10 transition-colors disabled:cursor-not-allowed disabled:opacity-40"
                              >
                                <Plus size={12} /> Tâche
                              </button>
                            )}
                            {can("project-lot:update") && (
                              <button
                                onClick={() => {
                                  if (!canManageLots) return;
                                  setEditingLot(lot);
                                  setLotForm({
                                    lot_number:       lot.lot_number ?? "",
                                    name:             lot.name ?? "",
                                    trade_code:       lot.trade_code ?? "",
                                    description:      lot.description ?? "",
                                    status:           lot.status ?? "CONCEPTION",
                                    budget_allocated: lot.budget_allocated > 0 ? String(lot.budget_allocated) : "",
                                    start_date:       lot.start_date ? String(lot.start_date).split('T')[0] : "",
                                    end_date:         lot.end_date   ? String(lot.end_date).split('T')[0]   : "",
                                  });
                                  setShowLotDialog(true);
                                }}
                                disabled={!canManageLots}
                                title={!canManageLots ? PROJECT_ACTION_GUARDS.lots.reason : undefined}
                                className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-md border border-gb-border hover:border-gb-primary hover:text-gb-primary transition-colors disabled:cursor-not-allowed disabled:opacity-40"
                              >
                                <Pencil size={12} /> Modifier
                              </button>
                            )}
                            <button
                              onClick={() => deleteLot(lot.id)}
                              disabled={!canDeleteLot}
                              title={deleteLotReason}
                              className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-md border border-gb-border hover:border-gb-danger hover:text-gb-danger transition-colors disabled:cursor-not-allowed disabled:opacity-40"
                            >
                              <Trash2 size={12} /> Supprimer
                            </button>
                          </div>
                          {deleteLotReason && (
                            <p className="mt-1 text-[10px] text-left sm:text-right text-amber-600 max-w-full sm:max-w-[220px] leading-tight">
                              {deleteLotReason}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-1.5 mb-2">
                        {trade && (
                          <span className="text-[10px] font-semibold bg-gb-app border border-gb-border px-2 py-0.5 rounded-full text-gb-muted">
                            {trade.label}
                          </span>
                        )}
                        {!trade && lot.trade_code && (
                          <span className="text-[10px] font-semibold bg-gb-app border border-gb-border px-2 py-0.5 rounded-full text-gb-muted">
                            {lot.trade_code}
                          </span>
                        )}
                        <span className="text-[10px] font-semibold bg-gb-app border border-gb-border px-2 py-0.5 rounded-full text-gb-muted">
                          {LOT_STATUS_LABELS[lot.status] ?? lot.status ?? "Conception"}
                        </span>
                      </div>

                      {lot.description && <p className="text-xs text-gb-muted line-clamp-2 mb-2">{lot.description}</p>}

                      {(lot.budget_allocated > 0) && (
                        <p className="text-xs font-semibold text-gb-text">
                          Budget : {(lot.budget_allocated).toLocaleString("fr-FR")} {project?.currency}
                        </p>
                      )}

                      {(lotStartDate || lotEndDate) && (
                        <p className="text-xs text-gb-muted">
                          Période : {lotStartDate ?? "?"} → {lotEndDate ?? "?"}
                        </p>
                      )}

                      {(lot.progress > 0) && (
                        <div className="mt-2">
                          <div className="flex justify-between text-[10px] text-gb-muted mb-1">
                            <span>Avancement</span><span>{lot.progress}%</span>
                          </div>
                          <div className="w-full bg-gb-surface-hover h-1.5 rounded-full">
                            <div className="bg-gb-primary h-full rounded-full transition-all" style={{ width: `${lot.progress}%` }} />
                          </div>
                        </div>
                      )}

                      <div className="pt-4 border-t border-gb-border">
                        <div className="flex items-center justify-between gap-3 mb-3">
                          <h5 className="text-sm font-bold text-gb-text flex items-center gap-2">
                            <Filter size={14} className="text-gb-primary" /> Tâches du lot
                          </h5>
                          <span className="text-[10px] uppercase tracking-widest text-gb-muted font-black">
                            Lot {lot.lot_number}
                          </span>
                        </div>

                        {lotTasks.length === 0 ? (
                          <div className="border border-dashed border-gb-border rounded-xl px-4 py-5 text-center">
                            <p className="text-sm font-semibold text-gb-text">Aucune tâche rattachée</p>
                            <p className="text-xs text-gb-muted mt-1">Les tâches de ce projet doivent être créées dans un lot.</p>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {lotTasks.map((task: any) => (
                              <div key={task.id} className="rounded-xl border border-gb-border bg-gb-app/30 px-4 py-3 hover:border-gb-primary/40 transition-colors">
                                <div className="flex items-start justify-between gap-3">
                                  <div className="min-w-0 flex-1 cursor-pointer" onClick={() => setSelectedTask(task)}>
                                    <p className="font-semibold text-gb-text text-sm truncate hover:text-gb-primary transition-colors">{task.title}</p>
                                    {task.description && (
                                      <p className="text-xs text-gb-muted mt-1 line-clamp-2 whitespace-pre-wrap">
                                        {task.description}
                                      </p>
                                    )}
                                    {task.wbs && (
                                      <p className="text-xs text-gb-muted mt-0.5">
                                        <span className="font-mono text-gb-primary">{task.wbs.code}</span> · {task.wbs.name}
                                      </p>
                                    )}
                                    {(task.planned_start || task.planned_end) && (
                                      <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-gb-muted">
                                        <span>Début: {formatTaskDate(task.planned_start) ?? "Non défini"}</span>
                                        <span>Échéance: {formatTaskDate(task.planned_end) ?? "Non définie"}</span>
                                      </div>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2 shrink-0">
                                    <span className="text-xs font-bold text-gb-text">{task.progress ?? 0}%</span>
                                    <Badge variant={task.status === "DONE" ? "default" : "secondary"} className="text-[10px]">
                                      {TASK_STATUS_LABELS[task.status] ?? task.status}
                                    </Badge>
                                  </div>
                                </div>
                                {(task.progress ?? 0) > 0 && (
                                  <div className="mt-2 w-full bg-gb-surface-hover h-1.5 rounded-full">
                                    <div className="bg-gb-primary h-full rounded-full transition-all" style={{ width: `${task.progress}%` }} />
                                  </div>
                                )}
                                <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-gb-border">
                                  {can("task:update") && (
                                    <button
                                      onClick={() => {
                                        if (!canManageTasks) return;
                                        setEditingTask(task);
                                        setTaskForm({
                                          lot_id:        String(task.lot_id ?? task.lot?.id ?? lot.id),
                                          title:         task.title ?? "",
                                          description:   task.description ?? "",
                                          status:        task.status ?? "TODO",
                                          priority:      task.priority ?? "MEDIUM",
                                          progress:      String(task.progress ?? 0),
                                          planned_start: task.planned_start ? String(task.planned_start).split('T')[0] : "",
                                          planned_end:   task.planned_end   ? String(task.planned_end).split('T')[0]   : "",
                                        });
                                        setShowTaskDialog(true);
                                      }}
                                      disabled={!canManageTasks}
                                      title={!canManageTasks ? PROJECT_ACTION_GUARDS.tasks.reason : undefined}
                                      className="flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-md border border-gb-border hover:border-gb-primary hover:text-gb-primary transition-colors disabled:cursor-not-allowed disabled:opacity-40"
                                    >
                                      <Pencil size={12} /> Modifier
                                    </button>
                                  )}
                                  {can("task:delete") && (
                                    <button
                                      onClick={() => deleteTask(task.id)}
                                      disabled={!canManageTasks}
                                      title={!canManageTasks ? PROJECT_ACTION_GUARDS.tasks.reason : undefined}
                                      className="flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-md border border-gb-border hover:border-gb-danger hover:text-gb-danger transition-colors disabled:cursor-not-allowed disabled:opacity-40"
                                    >
                                      <Trash2 size={12} /> Supprimer
                                    </button>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
                {lots.length === 0 && (
                  <div className="col-span-2 text-center border border-gb-border border-dashed rounded-xl px-6 py-10">
                    <p className="text-gb-text font-semibold text-sm">Aucun lot créé</p>
                    <p className="text-gb-muted text-xs mt-1">Créez d'abord les lots du projet. Les tâches seront ensuite rattachées à chaque lot.</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* Budget */}
          {activeTab === "budget" && (
            <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
              <h3 className="text-lg font-bold text-gb-text flex items-center gap-2">
                <Coins className="text-gb-primary" /> Lignes budgétaires
              </h3>

              {budgetLines.length === 0 ? (
                <p className="text-gb-muted text-sm py-8 text-center border border-gb-border border-dashed rounded-xl">Aucune ligne budgétaire définie.</p>
              ) : (
                <div className="rounded-lg border border-gb-border overflow-x-auto">
                  <table className="w-full min-w-[540px] text-sm">
                    <thead className="bg-gb-surface-solid border-b border-gb-border">
                      <tr>
                        <th className="text-left px-4 py-3 font-semibold text-gb-text">Catégorie</th>
                        <th className="text-left px-4 py-3 font-semibold text-gb-text">WBS</th>
                        <th className="text-right px-4 py-3 font-semibold text-gb-text">Planifié</th>
                        <th className="text-right px-4 py-3 font-semibold text-gb-text">Réalisé</th>
                        <th className="text-right px-4 py-3 font-semibold text-gb-text">Écart</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gb-border">
                      {budgetLines.map((line: any) => {
                        const ecart = (line.actual ?? 0) - (line.planned ?? 0);
                        return (
                          <tr key={line.id} className="hover:bg-gb-surface-solid/50">
                            <td className="px-4 py-3 font-medium text-gb-text">{line.category}</td>
                            <td className="px-4 py-3 text-gb-muted text-xs font-mono">{line.wbs?.code ?? "—"}</td>
                            <td className="px-4 py-3 text-right text-gb-text">{(line.planned ?? 0).toLocaleString("fr-FR")} {line.currency}</td>
                            <td className="px-4 py-3 text-right text-gb-text">{(line.actual ?? 0).toLocaleString("fr-FR")} {line.currency}</td>
                            <td className={`px-4 py-3 text-right font-semibold ${ecart > 0 ? "text-gb-danger" : ecart < 0 ? "text-green-500" : "text-gb-muted"}`}>
                              {ecart > 0 ? "+" : ""}{ecart.toLocaleString("fr-FR")}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot className="bg-gb-surface-solid border-t-2 border-gb-border">
                      <tr>
                        <td colSpan={2} className="px-4 py-3 font-bold text-gb-text">TOTAL</td>
                        <td className="px-4 py-3 text-right font-bold text-gb-text">
                          {budgetLines.reduce((s: number, l: any) => s + (l.planned ?? 0), 0).toLocaleString("fr-FR")}
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-gb-text">
                          {budgetLines.reduce((s: number, l: any) => s + (l.actual ?? 0), 0).toLocaleString("fr-FR")}
                        </td>
                        <td className="px-4 py-3" />
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </motion.div>
          )}

          {/* Réceptions */}
          {activeTab === "receptions" && (
            <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}>
              <ProjectReceptionsTab
                projectId={projectId}
                lots={lots.map((l: any) => ({ id: l.id, lot_number: l.lot_number, name: l.name }))}
                onRefresh={loadProjectDetail}
              />
            </motion.div>
          )}
        </div>

        {/* Task detail sidebar */}
        <div className="lg:col-span-4 lg:sticky lg:top-6 space-y-6">
          <AnimatePresence mode="wait">
            {selectedTask ? (
              <motion.div key="task-detail" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
                className="fixed inset-x-4 bottom-20 z-40 lg:relative lg:inset-auto lg:z-auto lg:bottom-auto">
                <TaskDetail task={selectedTask} onClose={() => setSelectedTask(null)} />
              </motion.div>
            ) : (
              <motion.div key="placeholder" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="hidden lg:block bg-gb-surface-solid border border-gb-border border-dashed rounded-xl p-8 text-center">
                <div className="w-16 h-16 bg-gb-app rounded-full flex items-center justify-center mx-auto mb-4 border border-gb-border">
                  <Filter size={24} className="text-gb-muted" />
                </div>
                <h4 className="font-bold text-gb-text">Détails de la tâche</h4>
                <p className="text-gb-muted text-sm mt-2">Sélectionnez une tâche dans l'arborescence WBS pour visualiser ses détails.</p>
              </motion.div>
            )}
          </AnimatePresence>

          <motion.aside
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gb-surface-solid border border-gb-border rounded-2xl p-5 shadow-sm"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-gb-muted">Checklist premium</p>
                <h3 className="mt-1 text-base font-black text-gb-text flex items-center gap-2">
                  <LayoutGrid size={16} className="text-gb-primary" />
                  Matrice de complétude
                </h3>
              </div>
              <span className="inline-flex items-center gap-2 rounded-full border border-gb-border bg-gb-app px-2.5 py-1 text-[10px] font-black uppercase text-gb-muted">
                {completedTasks}/{tasks.length || 0}
              </span>
            </div>

            <div className="mt-4 space-y-2.5">
              {premiumChecklist.map((item) => {
                const meta = checklistStatusMeta[item.status];
                return (
                  <div key={item.key} className="rounded-xl border border-gb-border bg-gb-app/30 px-4 py-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gb-text">{item.label}</p>
                        <p className="mt-1 text-xs text-gb-muted leading-relaxed">{item.detail}</p>
                      </div>
                      <span className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-1 text-[10px] font-black uppercase shrink-0 ${meta.badge}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
                        {meta.label}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.aside>

          <motion.aside
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gb-surface-solid border border-gb-border rounded-2xl p-5 shadow-sm"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-gb-muted">Pilotage workflow</p>
                <h3 className="mt-1 text-base font-black text-gb-text">Progression du projet</h3>
              </div>
              <span className={`inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-[10px] font-black uppercase ${currentPhase.badge}`}>
                <span className={`h-2 w-2 rounded-full ${currentPhase.dot}`} />
                {currentPhase.label}
              </span>
            </div>

            {workflow && (
              <>
                <div className="mt-4 rounded-xl border border-gb-border bg-gb-app/50 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold text-gb-muted uppercase tracking-wide">Étape suivante</p>
                      <p className="mt-1 text-sm font-bold text-gb-text">{nextPhase ? nextPhase.label : "Clôture atteinte"}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gb-muted">Prérequis</p>
                      <p className="text-sm font-black text-gb-text">{workflow.progress.completed}/{workflow.progress.total}</p>
                    </div>
                  </div>
                  {workflow.progress.total > 0 && (
                    <div className="mt-3 h-2 rounded-full bg-gb-surface-hover overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gb-primary transition-all"
                        style={{ width: `${(workflow.progress.completed / workflow.progress.total) * 100}%` }}
                      />
                    </div>
                  )}
                </div>

                <div className="mt-4 space-y-2">
                  {workflow.requirements.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-gb-border bg-gb-app/30 px-4 py-3 text-sm text-gb-muted">
                      Aucun prérequis supplémentaire à contrôler sur cette phase.
                    </div>
                  ) : (
                    workflow.requirements.map((requirement) => (
                      <div key={requirement.code} className="flex items-start gap-3 rounded-xl border border-gb-border bg-gb-app/30 px-4 py-3">
                        <CheckCircle2 size={16} className={requirement.satisfied ? "mt-0.5 text-emerald-500" : "mt-0.5 text-gb-muted"} />
                        <div>
                          <p className={`text-sm font-semibold ${requirement.satisfied ? "text-gb-text" : "text-gb-muted"}`}>{requirement.label}</p>
                          <p className="mt-0.5 text-[11px] uppercase tracking-wide text-gb-muted">
                            {requirement.satisfied ? "Validé" : "En attente"}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {workflowFeedback && (
                  <div className={`mt-4 rounded-xl border px-4 py-3 text-sm ${workflow.canAdvance ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-600" : "border-amber-500/20 bg-amber-500/10 text-amber-700"}`}>
                    {workflowFeedback}
                  </div>
                )}

                {workflow.blockingRequirements.length > 0 && (
                  <div className="mt-4 rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-xs text-amber-700">
                    Blocages actuels : {workflow.blockingRequirements.join(" · ")}
                  </div>
                )}

                {can("project:update") && nextPhase && (
                  <button
                    onClick={advanceProjectPhase}
                    disabled={!workflow.canAdvance || workflowAdvancing}
                    className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-gb-primary px-4 py-3 text-sm font-black text-gb-inverse transition-colors hover:bg-gb-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {workflowAdvancing ? <Loader2 size={16} className="animate-spin" /> : <ChevronsRight size={16} />}
                    Passer en {nextPhase.label}
                  </button>
                )}
              </>
            )}
          </motion.aside>

          <motion.aside
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gb-surface-solid border border-gb-border rounded-2xl p-5 shadow-sm"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-gb-muted">Historique de phase</p>
                <h3 className="mt-1 text-base font-black text-gb-text flex items-center gap-2">
                  <History size={16} className="text-gb-primary" />
                  Timeline projet
                </h3>
              </div>
              <span className={`inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-[10px] font-black uppercase ${currentPhase.badge}`}>
                <span className={`h-2 w-2 rounded-full ${currentPhase.dot}`} />
                {currentPhase.label}
              </span>
            </div>

            {phaseTransitions.length === 0 ? (
              <div className="mt-4 rounded-xl border border-dashed border-gb-border bg-gb-app/40 px-4 py-5 text-sm text-gb-muted">
                Aucune transition de phase enregistrée pour ce projet.
              </div>
            ) : (
              <div className="mt-5 space-y-4">
                {phaseTransitions.map((transition, index) => {
                  const fromPhase = getProjectPhaseMeta(transition.from_phase);
                  const toPhase = getProjectPhaseMeta(transition.to_phase);
                  const actorName = transition.changedBy
                    ? `${transition.changedBy.firstname ?? ""} ${transition.changedBy.lastname ?? ""}`.trim() || transition.changedBy.email || "Utilisateur"
                    : "Système";

                  return (
                    <div key={transition.id} className="relative pl-6">
                      {index < phaseTransitions.length - 1 && (
                        <span className="absolute left-[8px] top-7 h-[calc(100%+0.5rem)] w-px bg-gb-border" />
                      )}
                      <span className={`absolute left-0 top-1.5 h-4 w-4 rounded-full border-4 border-gb-surface-solid ${toPhase.dot}`} />
                      <div className="rounded-xl border border-gb-border bg-gb-app/50 p-4">
                        <div className="flex flex-wrap items-center gap-2 text-xs font-bold">
                          <span className={`inline-flex items-center rounded-full border px-2 py-1 ${fromPhase.badge}`}>
                            {fromPhase.label}
                          </span>
                          <ChevronsRight size={14} className="text-gb-muted" />
                          <span className={`inline-flex items-center rounded-full border px-2 py-1 ${toPhase.badge}`}>
                            {toPhase.label}
                          </span>
                        </div>
                        <p className="mt-3 text-sm font-semibold text-gb-text">{actorName}</p>
                        <p className="mt-1 text-xs text-gb-muted">{formatTransitionDate(transition.changed_at)}</p>
                        {transition.reason && (
                          <p className="mt-3 text-xs leading-relaxed text-gb-muted">{transition.reason}</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </motion.aside>
        </div>
      </div>
    </div>
  );
}
