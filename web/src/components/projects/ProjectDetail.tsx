import React, { useState, useEffect } from "react";
import { ArrowLeft, LayoutGrid, Layers, GitBranch, Search, Filter, DollarSign, Plus, Trash2, Loader2, AlertCircle, X, Pencil } from "lucide-react";
import { WBSTree } from "./WBSTree";
import { TaskDetail } from "./TaskDetail";
import { Badge } from "../ui/badge";
import { motion, AnimatePresence } from "motion/react";
import { apiFetch, API_BASE } from "../../lib/api";
import { usePermissions } from "../../contexts/AuthContext";

interface ProjectDetailProps {
  projectId: number;
  onBack: () => void;
}

const STATUS_LABELS: Record<string, string> = {
  PLANNING: "Planification", ACTIVE: "En cours", ON_HOLD: "En pause", COMPLETED: "Terminé",
};

export function ProjectDetail({ projectId, onBack }: ProjectDetailProps) {
  const { can } = usePermissions();

  const [project,      setProject]      = useState<any>(null);
  const [wbs,          setWbs]          = useState<any[]>([]);
  const [lots,         setLots]         = useState<any[]>([]);
  const [tasks,        setTasks]        = useState<any[]>([]);
  const [budgetLines,  setBudgetLines]  = useState<any[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [activeTab,    setActiveTab]    = useState<"wbs" | "lots" | "tasks" | "budget">("wbs");

  // ── Lot form state ─────────────────────────────────────────────────────────
  const [showLotDialog, setShowLotDialog] = useState(false);  const [editingLot,    setEditingLot]    = useState<any | null>(null);  const [lotAdding,     setLotAdding]     = useState(false);
  const [tradeCategories, setTradeCategories] = useState<{ code: string; label: string }[]>([]);
  const EMPTY_LOT = { lot_number: "", name: "", trade_code: "", description: "", status: "CONCEPTION", budget_allocated: "", start_date: "", end_date: "" };
  const [lotForm, setLotForm] = useState(EMPTY_LOT);

  // ── Task form state ────────────────────────────────────────────────────────
  const TASK_STATUS_LABELS: Record<string, string> = {
    TODO: "À faire", IN_PROGRESS: "En cours", ON_HOLD: "En pause", DONE: "Terminée", CANCELLED: "Annulée",
  };
  const EMPTY_TASK = { title: "", status: "TODO", progress: "0", planned_start: "", planned_end: "" };
  const [showTaskDialog, setShowTaskDialog] = useState(false);
  const [editingTask,    setEditingTask]    = useState<any | null>(null);
  const [taskSaving,     setTaskSaving]     = useState(false);
  const [taskForm,       setTaskForm]       = useState(EMPTY_TASK);

  // ── Fetch ──────────────────────────────────────────────────────────────────

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [prjRes, wbsRes, lotsRes, tasksRes, budgetRes, tradeRes] = await Promise.all([
          apiFetch(`${API_BASE}/projects/${projectId}`),
          apiFetch(`${API_BASE}/projects/${projectId}/wbs`),
          apiFetch(`${API_BASE}/projects/${projectId}/lots`),
          apiFetch(`${API_BASE}/projects/${projectId}/tasks`),
          apiFetch(`${API_BASE}/projects/${projectId}/budget-lines`),
          apiFetch(`${API_BASE}/projects/helpers/trade-categories`),
        ]);
        if (prjRes.ok)    setProject(await prjRes.json());
        if (wbsRes.ok)    setWbs(await wbsRes.json());
        if (lotsRes.ok)   setLots(await lotsRes.json());
        if (tasksRes.ok)  setTasks(await tasksRes.json());
        if (budgetRes.ok) setBudgetLines(await budgetRes.json());
        if (tradeRes.ok)  setTradeCategories(await tradeRes.json());
      } catch (err) {
        console.error("[ProjectDetail] load error", err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [projectId]);

  // ── Add Lot ────────────────────────────────────────────────────────────────

  const addLot = async () => {
    if (!lotForm.lot_number.trim() || !lotForm.name.trim() || !lotForm.trade_code) return;
    setLotAdding(true);
    try {
      const payload: Record<string, any> = {
        project_id:  projectId,
        lot_number:  lotForm.lot_number.trim(),
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
          setLots(prev => [...prev, newLot]);
          setLotForm(EMPTY_LOT);
          setShowLotDialog(false);
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
    if (!editingLot || !lotForm.lot_number.trim() || !lotForm.name.trim() || !lotForm.trade_code) return;
    setLotAdding(true);
    try {
      const payload: Record<string, any> = {
        lot_number:  lotForm.lot_number.trim(),
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
          setLots(prev => prev.map(l => l.id === updated.id ? updated : l));
          setLotForm(EMPTY_LOT);
          setEditingLot(null);
          setShowLotDialog(false);
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
    if (!window.confirm("Supprimer ce lot ?")) return;
    const res = await apiFetch(`${API_BASE}/projects/lots/${id}`, { method: "DELETE" });
    if (res.ok) setLots(prev => prev.filter(l => l.id !== id));
  };

  // ── Task CRUD ──────────────────────────────────────────────────────────────

  const saveTask = async () => {
    if (!taskForm.title.trim()) return;
    setTaskSaving(true);
    try {
      const payload: Record<string, any> = {
        title:    taskForm.title.trim(),
        status:   taskForm.status,
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
          if (editingTask) {
            setTasks(prev => prev.map(t => t.id === saved.id ? saved : t));
          } else {
            setTasks(prev => [...prev, saved]);
          }
          setTaskForm(EMPTY_TASK);
          setEditingTask(null);
          setShowTaskDialog(false);
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
    if (!window.confirm("Supprimer cette tâche ?")) return;
    const res = await apiFetch(`${API_BASE}/projects/tasks/${id}`, { method: "DELETE" });
    if (res.ok) setTasks(prev => prev.filter(t => t.id !== id));
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

  const tabs = [
    { id: "wbs",    icon: GitBranch,  label: "WBS",          count: wbs.length },
    { id: "tasks",  icon: Filter,     label: "Tâches",       count: tasks.length },
    { id: "lots",   icon: Layers,     label: "Lots",         count: lots.length },
    { id: "budget", icon: DollarSign, label: "Budget",       count: budgetLines.length },
  ];

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
          </div>
          <h2 className="text-3xl font-extrabold text-gb-text tracking-tight">{project.title}</h2>
          <p className="text-gb-muted text-sm flex items-center gap-2 mt-2">
            <span className="font-medium text-gb-text/70">{project.location}</span>
            {project.start_date && (<><span>·</span><span>{new Date(project.start_date).toLocaleDateString("fr-FR")} — {project.end_date ? new Date(project.end_date).toLocaleDateString("fr-FR") : "?"}</span></>)}
          </p>
          <p className="text-sm font-bold text-gb-primary mt-1">
            Budget : {(project.budget_initial ?? 0).toLocaleString("fr-FR")} {project.currency}
          </p>
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
              <h3 className="text-lg font-bold text-gb-text flex items-center gap-2">
                <GitBranch className="text-gb-primary" /> Work Breakdown Structure
              </h3>
              {wbs.length === 0 ? (
                <p className="text-gb-muted text-sm py-8 text-center border border-gb-border border-dashed rounded-xl">Aucun nœud WBS défini.</p>
              ) : (
                <div className="overflow-x-auto">
                  <WBSTree nodes={wbs} onTaskSelect={setSelectedTask} />
                </div>
              )}
            </motion.div>
          )}

          {/* Tasks */}
          {activeTab === "tasks" && (
            <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-gb-text flex items-center gap-2">
                  <Filter className="text-gb-primary" /> Tâches
                </h3>
                {can("task:create") && (
                  <button
                    onClick={() => { setEditingTask(null); setTaskForm(EMPTY_TASK); setShowTaskDialog(true); }}
                    className="flex items-center gap-1.5 px-4 py-2 bg-gb-primary text-gb-inverse rounded-lg text-sm font-semibold hover:bg-gb-primary/90 transition-colors min-h-[40px]"
                  >
                    <Plus size={15} /> Nouvelle tâche
                  </button>
                )}
              </div>

              {/* Dialog création / édition de tâche */}
              {showTaskDialog && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                  <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => { setShowTaskDialog(false); setEditingTask(null); }} />
                  <div className="relative bg-gb-surface-solid border border-gb-border rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
                    {/* Header */}
                    <div className="flex items-center justify-between p-5 border-b border-gb-border">
                      <div>
                        <h4 className="text-base font-bold text-gb-text">{editingTask ? "Modifier la tâche" : "Nouvelle tâche"}</h4>
                        <p className="text-xs text-gb-muted mt-0.5">{editingTask ? `"${editingTask.title}"` : "Renseignez les informations de la tâche"}</p>
                      </div>
                      <button onClick={() => { setShowTaskDialog(false); setEditingTask(null); }} className="p-1.5 rounded-lg hover:bg-gb-surface-hover text-gb-muted hover:text-gb-text transition-colors">
                        <X size={16} />
                      </button>
                    </div>

                    {/* Body */}
                    <div className="p-5 space-y-4">
                      {/* Titre */}
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

                      {/* Statut + Avancement */}
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

                      {/* Dates */}
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

                    {/* Footer */}
                    <div className="flex items-center justify-end gap-2 p-5 border-t border-gb-border">
                      <button
                        onClick={() => { setShowTaskDialog(false); setEditingTask(null); }}
                        className="px-4 py-2 text-sm font-medium text-gb-muted hover:text-gb-text border border-gb-border rounded-lg hover:bg-gb-surface-hover transition-colors"
                      >
                        Annuler
                      </button>
                      <button
                        onClick={saveTask}
                        disabled={taskSaving || !taskForm.title.trim()}
                        className="flex items-center gap-1.5 px-4 py-2 bg-gb-primary text-gb-inverse rounded-lg text-sm font-semibold disabled:opacity-50 hover:bg-gb-primary/90 transition-colors"
                      >
                        {taskSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus size={15} />}
                        {editingTask ? "Enregistrer" : "Créer la tâche"}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Liste des tâches */}
              {tasks.length === 0 ? (
                <div className="py-12 text-center border border-gb-border border-dashed rounded-xl">
                  <div className="w-12 h-12 bg-gb-app rounded-full flex items-center justify-center mx-auto mb-3 border border-gb-border">
                    <Filter size={20} className="text-gb-muted" />
                  </div>
                  <p className="text-gb-text font-semibold text-sm">Aucune tâche créée</p>
                  <p className="text-gb-muted text-xs mt-1">Cliquez sur "Nouvelle tâche" pour commencer.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {tasks.map((task: any) => (
                    <div
                      key={task.id}
                      className="bg-gb-surface-solid border border-gb-border rounded-xl p-4 group hover:border-gb-primary/50 transition-all"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setSelectedTask(task)}>
                          <p className="font-semibold text-gb-text text-sm truncate group-hover:text-gb-primary transition-colors">{task.title}</p>
                          {task.wbs && (
                            <p className="text-xs text-gb-muted mt-0.5">
                              <span className="font-mono text-gb-primary">{task.wbs.code}</span> · {task.wbs.name}
                            </p>
                          )}
                          {(task.planned_start || task.planned_end) && (
                            <p className="text-xs text-gb-muted mt-0.5">
                              {task.planned_start ? new Date(task.planned_start).toLocaleDateString("fr-FR") : "?"} → {task.planned_end ? new Date(task.planned_end).toLocaleDateString("fr-FR") : "?"}
                            </p>
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
                      {/* Actions */}
                      <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-gb-border opacity-0 group-hover:opacity-100 transition-all">
                        {can("task:update") && (
                          <button
                            onClick={() => {
                              setEditingTask(task);
                              setTaskForm({
                                title:         task.title ?? "",
                                status:        task.status ?? "TODO",
                                progress:      String(task.progress ?? 0),
                                planned_start: task.planned_start ? String(task.planned_start).split('T')[0] : "",
                                planned_end:   task.planned_end   ? String(task.planned_end).split('T')[0]   : "",
                              });
                              setShowTaskDialog(true);
                            }}
                            className="flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-md border border-gb-border hover:border-gb-primary hover:text-gb-primary transition-colors"
                          >
                            <Pencil size={12} /> Modifier
                          </button>
                        )}
                        {can("task:delete") && (
                          <button
                            onClick={() => deleteTask(task.id)}
                            className="flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-md border border-gb-border hover:border-gb-danger hover:text-gb-danger transition-colors"
                          >
                            <Trash2 size={12} /> Supprimer
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {/* Lots */}
          {activeTab === "lots" && (
            <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-gb-text flex items-center gap-2">
                  <Layers className="text-gb-primary" /> Lots de travaux
                </h3>
                {can("project-lot:create") && (
                  <button
                    onClick={() => { setEditingLot(null); setLotForm(EMPTY_LOT); setShowLotDialog(true); }}
                    className="flex items-center gap-1.5 px-4 py-2 bg-gb-primary text-gb-inverse rounded-lg text-sm font-semibold hover:bg-gb-primary/90 transition-colors min-h-[40px]"
                  >
                    <Plus size={15} /> Nouveau lot
                  </button>
                )}
              </div>

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
                      {/* Ligne 1 : N° lot + Corps d'état */}
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-semibold text-gb-text mb-1.5">
                            N° de lot <span className="text-gb-danger">*</span>
                          </label>
                          <input
                            value={lotForm.lot_number}
                            onChange={e => setLotForm(p => ({ ...p, lot_number: e.target.value }))}
                            placeholder="01, 02, A…"
                            className="w-full bg-gb-app border border-gb-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gb-primary"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-gb-text mb-1.5">
                            Corps d'état <span className="text-gb-danger">*</span>
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
                          {tradeCategories.length === 0 && (
                            <p className="text-[10px] text-gb-muted mt-1">Aucun corps d'état — lancez le seed.</p>
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
                        disabled={lotAdding || !lotForm.lot_number.trim() || !lotForm.name.trim() || !lotForm.trade_code}
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {lots.filter((lot: any) => lot != null).map((lot: any) => {
                  const trade = tradeCategories.find(t => t.code === lot.trade_code);
                  return (
                    <div key={lot.id} className="bg-gb-surface-solid border border-gb-border rounded-xl p-5 group hover:border-gb-primary/50 transition-colors">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-xs font-mono font-bold text-gb-primary bg-gb-primary/10 px-2 py-0.5 rounded shrink-0">
                            {lot.lot_number ?? "—"}
                          </span>
                          <h4 className="font-bold text-sm truncate group-hover:text-gb-primary transition-colors">{lot.name}</h4>
                        </div>
                        <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-all ml-2 shrink-0">
                          {can("project-lot:update") && (
                            <button
                              onClick={() => {
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
                              className="flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-md border border-gb-border hover:border-gb-primary hover:text-gb-primary transition-colors"
                            >
                              <Pencil size={12} /> Modifier
                            </button>
                          )}
                          {can("project-lot:delete") && (
                            <button onClick={() => deleteLot(lot.id)} className="flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-md border border-gb-border hover:border-gb-danger hover:text-gb-danger transition-colors">
                              <Trash2 size={12} /> Supprimer
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-1.5 mb-2">
                        {trade && (
                          <span className="text-[10px] font-semibold bg-gb-app border border-gb-border px-2 py-0.5 rounded-full text-gb-muted">
                            {trade.label}
                          </span>
                        )}
                        <span className="text-[10px] font-semibold bg-gb-app border border-gb-border px-2 py-0.5 rounded-full text-gb-muted">
                          {lot.status ?? "CONCEPTION"}
                        </span>
                      </div>

                      {lot.description && <p className="text-xs text-gb-muted line-clamp-2 mb-2">{lot.description}</p>}

                      {(lot.budget_allocated > 0) && (
                        <p className="text-xs font-semibold text-gb-text">
                          Budget : {(lot.budget_allocated).toLocaleString("fr-FR")} {project?.currency}
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
                    </div>
                  );
                })}
                {lots.length === 0 && (
                  <p className="col-span-2 text-gb-muted text-sm py-8 text-center border border-gb-border border-dashed rounded-xl">Aucun lot créé.</p>
                )}
              </div>
            </motion.div>
          )}

          {/* Budget */}
          {activeTab === "budget" && (
            <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
              <h3 className="text-lg font-bold text-gb-text flex items-center gap-2">
                <DollarSign className="text-gb-primary" /> Lignes budgétaires
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
        </div>

        {/* Task detail sidebar */}
        <div className="lg:col-span-4 lg:sticky lg:top-6">
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
        </div>
      </div>
    </div>
  );
}
