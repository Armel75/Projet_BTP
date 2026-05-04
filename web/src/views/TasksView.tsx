import React, { useState, useEffect, useCallback } from "react";
import { CheckSquare, Filter, Plus, Loader2, X, AlertCircle, ChevronRight } from "lucide-react";
import { apiFetch, API_BASE } from "../lib/api";
import { usePermissions } from "../contexts/AuthContext";

// ─── Types ────────────────────────────────────────────────────────────────────

interface TaskProject { id: number; code: string; title: string; phase?: string | null; }
interface TaskLot { id: number; lot_number: string; name: string; trade_code?: string | null; }
interface Task {
  id: number;
  title: string;
  status: string;
  progress: number;
  priority: string;
  planned_start?: string | null;
  planned_end?: string | null;
  project?: TaskProject;
  lot?: TaskLot | null;
  wbs?: { id: number; code: string; name: string } | null;
  assignments?: { resource: { id: number; name: string } }[];
}

const TASK_WORKFLOW_GUARD = {
  allowedPhases: ["PREPARATION", "EXECUTION"],
  reason: "Les tâches sont modifiables uniquement pendant les phases Préparation et Exécution.",
} as const;

const PROJECT_PHASE_LABELS: Record<string, string> = {
  ETUDE: "Étude",
  PREPARATION: "Préparation",
  EXECUTION: "Exécution",
  RECEPTION: "Réception",
  CLOTURE: "Clôture",
};

function isTaskPhaseAllowed(phase?: string | null) {
  if (!phase) return true;
  return TASK_WORKFLOW_GUARD.allowedPhases.includes(phase as "PREPARATION" | "EXECUTION");
}

function getProjectPhaseLabel(phase?: string | null) {
  if (!phase) return "Non défini";
  return PROJECT_PHASE_LABELS[phase] ?? phase;
}

// ─── Kanban config ────────────────────────────────────────────────────────────

const COLUMNS: { status: string; label: string; accent: string }[] = [
  { status: "TODO",        label: "À faire",   accent: "border-gb-border" },
  { status: "IN_PROGRESS", label: "En cours",  accent: "border-blue-500" },
  { status: "ON_HOLD",     label: "En pause",  accent: "border-yellow-500" },
  { status: "DONE",        label: "Terminé",   accent: "border-green-500" },
  { status: "CANCELLED",   label: "Annulé",    accent: "border-red-400" },
];

const PRIORITY_DOT: Record<string, string> = {
  LOW:      "bg-gb-muted",
  MEDIUM:   "bg-yellow-400",
  HIGH:     "bg-orange-500",
  CRITICAL: "bg-red-500",
};

const NEXT_STATUS: Record<string, string | null> = {
  TODO:        "IN_PROGRESS",
  IN_PROGRESS: "DONE",
  ON_HOLD:     "IN_PROGRESS",
  DONE:        null,
  CANCELLED:   null,
};

const NEXT_LABEL: Record<string, string> = {
  TODO:        "Démarrer",
  IN_PROGRESS: "Terminer",
  ON_HOLD:     "Reprendre",
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function TasksView() {
  const { can } = usePermissions();

  const [tasks,    setTasks]    = useState<Task[]>([]);
  const [projects, setProjects] = useState<(TaskProject & { phase?: string | null })[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState<string | null>(null);
  const [workflowNotice, setWorkflowNotice] = useState<string | null>(null);
  const [projectLots, setProjectLots] = useState<Record<number, TaskLot[]>>({});

  // Filter
  const [filterProject, setFilterProject] = useState<number | "">("");
  const [filterPriority, setFilterPriority] = useState<string>("");
  const [showFilter, setShowFilter] = useState(false);

  // Create dialog
  const [showCreate, setShowCreate] = useState(false);
  const [saving, setSaving]         = useState(false);
  const EMPTY = { title: "", status: "TODO", priority: "MEDIUM", progress: "0", project_id: "", lot_id: "", planned_start: "", planned_end: "" };
  const [form, setForm] = useState(EMPTY);

  // ── Fetch ────────────────────────────────────────────────────────────────

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const [tRes, pRes] = await Promise.all([
        apiFetch(`${API_BASE}/projects/tasks`),
        apiFetch(`${API_BASE}/projects?limit=100`),
      ]);
      if (tRes.ok) setTasks(await tRes.json());
      else setError("Impossible de charger les tâches.");
      if (pRes.ok) {
        const data = await pRes.json();
        setProjects((data.data ?? data).map((p: any) => ({ id: p.id, code: p.code, title: p.title, phase: p.phase })));
      }
    } catch { setError("Erreur réseau."); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const loadLotsForProject = useCallback(async (projectId: number) => {
    if (!projectId || projectLots[projectId]) return;
    try {
      const res = await apiFetch(`${API_BASE}/projects/${projectId}/lots`);
      if (!res.ok) return;
      const data = await res.json();
      setProjectLots(prev => ({ ...prev, [projectId]: Array.isArray(data) ? data : [] }));
    } catch {}
  }, [projectLots]);

  useEffect(() => {
    if (!showCreate || !form.project_id) return;
    void loadLotsForProject(Number(form.project_id));
  }, [showCreate, form.project_id, loadLotsForProject]);

  // ── Quick status advance ─────────────────────────────────────────────────

  const advanceStatus = async (task: Task) => {
    if (!isTaskPhaseAllowed(task.project?.phase)) {
      setWorkflowNotice(TASK_WORKFLOW_GUARD.reason);
      return;
    }
    const next = NEXT_STATUS[task.status];
    if (!next) return;
    const payload: Record<string, any> = { status: next };
    if (next === "DONE") payload.progress = 100;
    const res = await apiFetch(`${API_BASE}/projects/tasks/${task.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      const updated = await res.json();
      setTasks(prev => prev.map(t => t.id === updated.id ? updated : t));
      setWorkflowNotice(null);
    } else {
      const err = await res.json().catch(() => ({}));
      setWorkflowNotice(err.error || "Action bloquée par le workflow projet.");
    }
  };

  // ── Create ───────────────────────────────────────────────────────────────

  const createTask = async () => {
    if (!form.title.trim() || !form.project_id || !form.lot_id) return;
    const selectedProject = projects.find((p) => p.id === Number(form.project_id));
    if (!isTaskPhaseAllowed(selectedProject?.phase)) {
      setWorkflowNotice(TASK_WORKFLOW_GUARD.reason);
      return;
    }
    setSaving(true);
    try {
      const payload: Record<string, any> = {
        title:      form.title.trim(),
        status:     form.status,
        priority:   form.priority,
        progress:   Number(form.progress),
        project_id: Number(form.project_id),
        lot_id:     Number(form.lot_id),
      };
      if (form.planned_start) payload.planned_start = form.planned_start;
      if (form.planned_end)   payload.planned_end   = form.planned_end;
      const res = await apiFetch(`${API_BASE}/projects/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const saved = await res.json();
        if (saved?.id) {
          // Reload to get project info included
          await load();
          setForm(EMPTY);
          setShowCreate(false);
          setWorkflowNotice(null);
        }
      } else {
        const err = await res.json().catch(() => ({}));
        console.error("[createTask]", err);
        setWorkflowNotice(err.error || "Action bloquée par le workflow projet.");
      }
    } finally { setSaving(false); }
  };

  // ── Filtered tasks ───────────────────────────────────────────────────────

  const filtered = tasks.filter(t => {
    if (filterProject && t.project?.id !== filterProject) return false;
    if (filterPriority && t.priority !== filterPriority) return false;
    return true;
  });

  const activeFilterCount = [filterProject, filterPriority].filter(Boolean).length;
  const selectedCreateProject = projects.find((p) => p.id === Number(form.project_id));
  const selectedProjectLots = form.project_id ? (projectLots[Number(form.project_id)] ?? []) : [];
  const canCreateForSelectedProject = !selectedCreateProject || isTaskPhaseAllowed(selectedCreateProject.phase);

  // ── Render ───────────────────────────────────────────────────────────────

  if (loading) return (
    <div className="flex items-center justify-center p-20">
      <Loader2 className="w-8 h-8 text-gb-primary animate-spin" />
    </div>
  );

  if (error) return (
    <div className="flex items-center gap-3 p-10 text-gb-danger">
      <AlertCircle className="w-5 h-5" /> {error}
    </div>
  );

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-xl md:text-2xl font-semibold flex items-center gap-2">
          <CheckSquare className="text-gb-primary" />
          Suivi Chantier
          <span className="text-sm font-normal text-gb-muted ml-1">({filtered.length} tâche{filtered.length !== 1 ? "s" : ""})</span>
        </h2>
        <div className="flex items-center gap-2">
          {/* Filtres */}
          <div className="relative">
            <button
              onClick={() => setShowFilter(v => !v)}
              className="flex items-center gap-2 bg-gb-surface-solid border border-gb-border px-3 py-2 rounded-lg text-sm text-gb-text hover:bg-gb-surface-hover min-h-[40px] transition-colors"
            >
              <Filter size={15} />
              <span className="hidden sm:inline">Filtrer</span>
              {activeFilterCount > 0 && (
                <span className="bg-gb-primary text-gb-inverse text-[10px] font-bold px-1.5 rounded-full">{activeFilterCount}</span>
              )}
            </button>
            {showFilter && (
              <div className="absolute right-0 top-full mt-2 z-30 bg-gb-surface-solid border border-gb-border rounded-xl shadow-xl p-4 space-y-3 w-64">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-gb-text">Filtres</span>
                  {activeFilterCount > 0 && (
                    <button onClick={() => { setFilterProject(""); setFilterPriority(""); }} className="text-[10px] text-gb-primary hover:underline">Réinitialiser</button>
                  )}
                </div>
                <div>
                  <label className="block text-xs text-gb-muted mb-1">Projet</label>
                  <select
                    value={filterProject}
                    onChange={e => setFilterProject(e.target.value === "" ? "" : Number(e.target.value))}
                    className="w-full bg-gb-app border border-gb-border rounded-lg px-2 py-1.5 text-sm"
                  >
                    <option value="">Tous les projets</option>
                    {projects.map(p => <option key={p.id} value={p.id}>{p.code} — {p.title}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gb-muted mb-1">Priorité</label>
                  <select
                    value={filterPriority}
                    onChange={e => setFilterPriority(e.target.value)}
                    className="w-full bg-gb-app border border-gb-border rounded-lg px-2 py-1.5 text-sm"
                  >
                    <option value="">Toutes</option>
                    <option value="LOW">Basse</option>
                    <option value="MEDIUM">Normale</option>
                    <option value="HIGH">Haute</option>
                    <option value="CRITICAL">Critique</option>
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* Nouvelle tâche */}
          {can("task:create") && (
            <button
              onClick={() => { setForm(EMPTY); setShowCreate(true); }}
              className="flex items-center gap-1.5 px-4 py-2 bg-gb-primary text-gb-inverse rounded-lg text-sm font-semibold hover:bg-gb-primary/90 transition-colors min-h-[40px]"
            >
              <Plus size={15} /> <span className="hidden sm:inline">Nouvelle tâche</span>
            </button>
          )}
        </div>
      </div>

      {workflowNotice && (
        <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-700">
          {workflowNotice}
        </div>
      )}

      {/* Kanban board */}
      <div className="flex gap-4 overflow-x-auto pb-4">
        {COLUMNS.map(col => {
          const colTasks = filtered.filter(t => t.status === col.status);
          return (
            <div key={col.status} className="flex-shrink-0 w-72">
              {/* Column header */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${col.accent.replace("border-", "bg-")}`} />
                  <span className="font-semibold text-sm text-gb-text">{col.label}</span>
                </div>
                <span className="bg-gb-surface-hover text-gb-muted px-2 py-0.5 rounded-full text-xs font-mono">{colTasks.length}</span>
              </div>

              {/* Cards */}
              <div className="space-y-2 min-h-[60px]">
                {colTasks.length === 0 && (
                  <div className="border border-dashed border-gb-border rounded-xl py-6 text-center text-xs text-gb-muted">
                    Aucune tâche
                  </div>
                )}
                {colTasks.map(task => {
                  const initials = task.assignments?.[0]?.resource?.name
                    ?.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase() ?? null;
                  const nextLabel = NEXT_LABEL[task.status];

                  return (
                    <div
                      key={task.id}
                      className={`bg-gb-surface-solid border border-gb-border rounded-xl p-4 group transition-all hover:border-gb-primary/40 hover:shadow-sm ${col.status === "IN_PROGRESS" ? "border-l-2 " + col.accent : ""}`}
                    >
                      {/* Priority dot + title */}
                      <div className="flex items-start gap-2 mb-2">
                        <div className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${PRIORITY_DOT[task.priority] ?? "bg-gb-muted"}`} />
                        <p className={`text-sm font-medium leading-snug ${col.status === "DONE" ? "line-through text-gb-muted" : "text-gb-text"}`}>
                          {task.title}
                        </p>
                      </div>

                      {/* Meta */}
                      <div className="flex items-center justify-between mt-2">
                        {task.project && (
                          <span className="text-[10px] font-mono text-gb-muted bg-gb-app border border-gb-border px-2 py-0.5 rounded">
                            {task.project.code}
                          </span>
                        )}
                        {col.status === "DONE" ? (
                          <CheckSquare size={14} className="text-green-500 ml-auto" />
                        ) : initials ? (
                          <span className="w-6 h-6 rounded-full bg-gb-primary/20 text-gb-primary flex items-center justify-center text-[10px] font-bold ml-auto shrink-0">
                            {initials}
                          </span>
                        ) : null}
                      </div>

                      {/* WBS */}
                      {task.wbs && (
                        <p className="text-[10px] text-gb-muted mt-1.5">
                          <span className="font-mono text-gb-primary">{task.wbs.code}</span> · {task.wbs.name}
                        </p>
                      )}

                      {task.lot && (
                        <p className="text-[10px] text-gb-muted mt-1">
                          Lot {task.lot.lot_number} · {task.lot.name}
                        </p>
                      )}

                      {/* Dates */}
                      {(task.planned_start || task.planned_end) && (
                        <p className="text-[10px] text-gb-muted mt-1">
                          {task.planned_start ? new Date(task.planned_start).toLocaleDateString("fr-FR") : "?"} → {task.planned_end ? new Date(task.planned_end).toLocaleDateString("fr-FR") : "?"}
                        </p>
                      )}

                      {/* Progress bar (IN_PROGRESS only) */}
                      {col.status === "IN_PROGRESS" && (
                        <div className="mt-3">
                          <div className="w-full bg-gb-surface-hover h-1.5 rounded-full overflow-hidden">
                            <div className="bg-blue-500 h-full rounded-full transition-all" style={{ width: `${task.progress ?? 0}%` }} />
                          </div>
                          <p className="text-[10px] text-right mt-0.5 text-gb-muted font-medium">{task.progress ?? 0}%</p>
                        </div>
                      )}

                      {/* Quick advance button */}
                      {can("task:update") && nextLabel && (
                        <button
                          onClick={() => advanceStatus(task)}
                          disabled={!isTaskPhaseAllowed(task.project?.phase)}
                          title={!isTaskPhaseAllowed(task.project?.phase) ? TASK_WORKFLOW_GUARD.reason : undefined}
                          className="mt-3 w-full flex items-center justify-center gap-1 text-[11px] font-semibold text-gb-muted hover:text-gb-primary border border-transparent hover:border-gb-primary/30 rounded-lg py-1 transition-all opacity-0 group-hover:opacity-100 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          {nextLabel} <ChevronRight size={11} />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Create Task Dialog */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowCreate(false)} />
          <div className="relative bg-gb-surface-solid border border-gb-border rounded-2xl shadow-2xl w-full max-w-lg">
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-gb-border">
              <div>
                <h4 className="text-base font-bold text-gb-text">Nouvelle tâche</h4>
                <p className="text-xs text-gb-muted mt-0.5">Renseignez les informations de la tâche</p>
              </div>
              <button onClick={() => setShowCreate(false)} className="p-1.5 rounded-lg hover:bg-gb-surface-hover text-gb-muted transition-colors">
                <X size={16} />
              </button>
            </div>

            {/* Body */}
            <div className="p-5 space-y-4">
              {/* Projet (requis) */}
              <div>
                <label className="block text-xs font-semibold text-gb-text mb-1.5">
                  Projet <span className="text-gb-danger">*</span>
                </label>
                <select
                  value={form.project_id}
                  onChange={e => {
                    setWorkflowNotice(null);
                    setForm(p => ({ ...p, project_id: e.target.value, lot_id: "" }));
                  }}
                  className="w-full bg-gb-app border border-gb-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gb-primary"
                >
                  <option value="">— Sélectionner un projet —</option>
                  {projects.map(p => (
                    <option key={p.id} value={p.id} disabled={!isTaskPhaseAllowed(p.phase)}>
                      {p.code} — {p.title} ({getProjectPhaseLabel(p.phase)})
                    </option>
                  ))}
                </select>
                {selectedCreateProject && !canCreateForSelectedProject && (
                  <p className="mt-1.5 text-xs text-amber-700">{TASK_WORKFLOW_GUARD.reason}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-gb-text mb-1.5">
                  Lot <span className="text-gb-danger">*</span>
                </label>
                <select
                  value={form.lot_id}
                  onChange={e => setForm(p => ({ ...p, lot_id: e.target.value }))}
                  disabled={!form.project_id || selectedProjectLots.length === 0}
                  className="w-full bg-gb-app border border-gb-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gb-primary disabled:opacity-50"
                >
                  <option value="">— Sélectionner un lot —</option>
                  {selectedProjectLots.map(lot => (
                    <option key={lot.id} value={lot.id}>Lot {lot.lot_number} — {lot.name}</option>
                  ))}
                </select>
                {form.project_id && selectedProjectLots.length === 0 && (
                  <p className="text-[10px] text-gb-muted mt-1">Aucun lot disponible sur ce projet.</p>
                )}
              </div>

              {/* Titre */}
              <div>
                <label className="block text-xs font-semibold text-gb-text mb-1.5">
                  Titre <span className="text-gb-danger">*</span>
                </label>
                <input
                  autoFocus
                  value={form.title}
                  onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                  placeholder="ex : Coulage fondations — Zone A"
                  className="w-full bg-gb-app border border-gb-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gb-primary"
                />
              </div>

              {/* Statut + Priorité */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gb-text mb-1.5">Statut</label>
                  <select value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))}
                    className="w-full bg-gb-app border border-gb-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gb-primary">
                    {COLUMNS.map(c => <option key={c.status} value={c.status}>{c.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gb-text mb-1.5">Priorité</label>
                  <select value={form.priority} onChange={e => setForm(p => ({ ...p, priority: e.target.value }))}
                    className="w-full bg-gb-app border border-gb-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gb-primary">
                    <option value="LOW">Basse</option>
                    <option value="MEDIUM">Normale</option>
                    <option value="HIGH">Haute</option>
                    <option value="CRITICAL">Critique</option>
                  </select>
                </div>
              </div>

              {/* Avancement */}
              <div>
                <label className="block text-xs font-semibold text-gb-text mb-1.5">
                  Avancement : <span className="text-gb-primary font-bold">{form.progress}%</span>
                </label>
                <input type="range" min="0" max="100" step="5"
                  value={form.progress} onChange={e => setForm(p => ({ ...p, progress: e.target.value }))}
                  className="w-full accent-gb-primary" />
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gb-text mb-1.5">Date de début</label>
                  <input type="date" value={form.planned_start}
                    onChange={e => setForm(p => ({ ...p, planned_start: e.target.value }))}
                    className="w-full bg-gb-app border border-gb-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gb-primary" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gb-text mb-1.5">Date de fin</label>
                  <input type="date" value={form.planned_end}
                    onChange={e => setForm(p => ({ ...p, planned_end: e.target.value }))}
                    className="w-full bg-gb-app border border-gb-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gb-primary" />
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-2 p-5 border-t border-gb-border">
              <button onClick={() => setShowCreate(false)}
                className="px-4 py-2 text-sm font-medium text-gb-muted border border-gb-border rounded-lg hover:bg-gb-surface-hover transition-colors">
                Annuler
              </button>
              <button
                onClick={createTask}
                disabled={saving || !form.title.trim() || !form.project_id || !form.lot_id || !canCreateForSelectedProject}
                className="flex items-center gap-1.5 px-4 py-2 bg-gb-primary text-gb-inverse rounded-lg text-sm font-semibold disabled:opacity-50 hover:bg-gb-primary/90 transition-colors"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus size={15} />}
                Créer la tâche
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

