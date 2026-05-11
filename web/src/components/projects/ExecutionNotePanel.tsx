import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  Plus, Loader2, Pin, PinOff, CheckCircle2, Trash2, X, AlertCircle,
  User, Calendar, MessageCircle, Eye, EyeOff, AlertTriangle, Search, ChevronDown
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { apiFetch, API_BASE } from "../../lib/api";
import { useAuth } from "../../contexts/AuthContext";
import { canActOnNote } from "../../lib/notePermissions";
import { ExecutionNote } from "../../types";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface ExecutionNotePanelProps {
  project_id: number;
  lot_id?: number | null;
  task_id?: number | null;
  incident_id?: number | null;
  lots?: any[]; // Array of project lots
  tasks?: any[]; // Array of project tasks (flattened from WBS)
}

const CATEGORY_META: Record<string, { label: string; color: string; dot: string }> = {
  INFO: { label: "Info", color: "text-blue-600", dot: "bg-blue-500" },
  QUESTION: { label: "Question", color: "text-cyan-600", dot: "bg-cyan-500" },
  ALERT: { label: "Alerte", color: "text-amber-600", dot: "bg-amber-500" },
  DELAY: { label: "Délai", color: "text-orange-600", dot: "bg-orange-500" },
  BLOCKER: { label: "Bloquant", color: "text-red-600", dot: "bg-red-500" },
  DECISION: { label: "Décision", color: "text-purple-600", dot: "bg-purple-500" },
  RISK: { label: "Risque", color: "text-rose-600", dot: "bg-rose-500" },
  HANDOFF: { label: "Passation", color: "text-emerald-600", dot: "bg-emerald-500" },
};

const VISIBILITY_LABELS: Record<string, string> = {
  INTERNAL: "Interne",
  MANAGEMENT: "Management",
  CLIENT_SHARED: "Partagé client",
};

type TargetOption = { id: number; label: string };

function SearchableMultiSelect({
  placeholder,
  searchPlaceholder,
  options,
  selectedIds,
  onChange,
}: {
  placeholder: string;
  searchPlaceholder: string;
  options: TargetOption[];
  selectedIds: number[];
  onChange: (ids: number[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((option) => option.label.toLowerCase().includes(q));
  }, [options, query]);

  const toggleOption = (id: number) => {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter((value) => value !== id));
      return;
    }
    onChange([...selectedIds, id]);
  };

  const selectedLabel = selectedIds.length === 0
    ? placeholder
    : `${selectedIds.length} sélection${selectedIds.length > 1 ? "s" : ""}`;

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="w-full h-[34px] bg-gb-app border border-gb-border rounded-lg px-3 text-xs text-gb-text flex items-center justify-between hover:bg-gb-surface-hover transition-colors"
      >
        <span className={`truncate ${selectedIds.length === 0 ? "text-gb-muted" : "text-gb-text"}`}>
          {selectedLabel}
        </span>
        <ChevronDown size={14} className={`text-gb-muted transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-lg border border-gb-border bg-gb-surface-solid shadow-lg p-2 space-y-2">
          <div className="relative">
            <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gb-muted" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={searchPlaceholder}
              className="w-full h-8 rounded-md border border-gb-border bg-gb-app pl-7 pr-2 text-xs text-gb-text focus:outline-none focus:ring-2 focus:ring-gb-primary/30"
            />
          </div>

          <div className="max-h-44 overflow-y-auto space-y-1 pr-1">
            {filtered.length === 0 ? (
              <p className="text-xs text-gb-muted px-2 py-1">Aucun résultat</p>
            ) : (
              filtered.map((option) => (
                <label
                  key={option.id}
                  className="flex items-center gap-2 rounded-md px-2 py-1.5 text-xs text-gb-text hover:bg-gb-surface-hover cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(option.id)}
                    onChange={() => toggleOption(option.id)}
                    className="rounded border-gb-border"
                  />
                  <span className="truncate">{option.label}</span>
                </label>
              ))
            )}
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setOpen(false);
              }}
              className="text-xs text-gb-muted hover:text-gb-text"
            >
              Fermer
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function ExecutionNotePanel({
  project_id,
  lot_id,
  task_id,
  incident_id,
  lots = [],
  tasks = [],
}: ExecutionNotePanelProps) {
  const { can, user } = useAuth();
  const [notes, setNotes] = useState<ExecutionNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newContent, setNewContent] = useState("");
  const [newCategory, setNewCategory] = useState("INFO");
  const [newVisibility, setNewVisibility] = useState("INTERNAL");
  const [selectedLotIds, setSelectedLotIds] = useState<number[]>(lot_id ? [lot_id] : []);
  const [selectedTaskIds, setSelectedTaskIds] = useState<number[]>(task_id ? [task_id] : []);
  const [error, setError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const isScopedContext = Boolean(lot_id || task_id || incident_id);
  const notesToCreateCount = isScopedContext
    ? 1
    : Math.max(1, selectedLotIds.length + selectedTaskIds.length);

  const getLotLabel = (lot: any) => {
    const lotNumber = lot?.lot_number ?? lot?.number ?? lot?.code;
    const lotName = lot?.name ?? lot?.title ?? lot?.label;
    if (lotNumber && lotName) return `Lot ${lotNumber} - ${lotName}`;
    if (lotName) return lotName;
    if (lotNumber) return `Lot ${lotNumber}`;
    return `Lot #${lot?.id ?? "?"}`;
  };

  const getTaskLabel = (task: any) => {
    const taskCode = task?.code ?? task?.task_code;
    const taskTitle = task?.title ?? task?.name ?? task?.label;
    if (taskCode && taskTitle) return `${taskCode} - ${taskTitle}`;
    if (taskTitle) return taskTitle;
    if (taskCode) return taskCode;
    return `Tâche #${task?.id ?? "?"}`;
  };

  const lotOptions = useMemo<TargetOption[]>(
    () => lots.map((lot: any) => ({ id: Number(lot.id), label: getLotLabel(lot) })),
    [lots],
  );

  const taskOptions = useMemo<TargetOption[]>(
    () => tasks.map((task: any) => ({ id: Number(task.id), label: getTaskLabel(task) })),
    [tasks],
  );

  const fetchNotes = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ project_id: String(project_id) });
      if (lot_id) params.append("lot_id", String(lot_id));
      if (task_id) params.append("task_id", String(task_id));
      if (incident_id) params.append("incident_id", String(incident_id));

      const res = await apiFetch(`${API_BASE}/execution-notes?${params}`);
      if (res.ok) {
        const data = await res.json();
        setNotes(data);
      }
    } catch (err) {
      console.error("[ExecutionNotePanel] fetch error", err);
    } finally {
      setLoading(false);
    }
  }, [project_id, lot_id, task_id, incident_id]);

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  const handleCreate = async () => {
    if (!newContent.trim()) {
      setError("Le contenu est obligatoire.");
      return;
    }

    if (!can("execution-note:create")) {
      setError("Vous n'avez pas la permission de créer une note.");
      return;
    }

    setCreating(true);
    setError(null);
    try {
      const payload: Record<string, any> = {
        project_id,
        content: newContent.trim(),
        category: newCategory,
        visibility: newVisibility,
      };
      if (isScopedContext) {
        if (lot_id) payload.lot_id = lot_id;
        if (task_id) payload.task_id = task_id;
        if (incident_id) payload.incident_id = incident_id;
      } else {
        if (selectedLotIds.length > 0) payload.lot_ids = selectedLotIds;
        if (selectedTaskIds.length > 0) payload.task_ids = selectedTaskIds;
      }

      const res = await apiFetch(`${API_BASE}/execution-notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Erreur serveur");
      }

      setNewContent("");
      setNewCategory("INFO");
      setNewVisibility("INTERNAL");
      setSelectedLotIds(lot_id ? [lot_id] : []);
      setSelectedTaskIds(task_id ? [task_id] : []);
      setShowCreateForm(false);
      await fetchNotes();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setCreating(false);
    }
  };

  const handleTogglePin = async (noteId: number) => {
    if (!can("execution-note:pin")) return;
    const target = notes.find(n => n.id === noteId);
    if (!target || !canActOnNote(user, target)) return;
    try {
      const res = await apiFetch(`${API_BASE}/execution-notes/${noteId}/pin`, {
        method: "POST",
      });
      if (res.ok) {
        await fetchNotes();
      }
    } catch (err) {
      console.error("[ExecutionNotePanel] pin error", err);
    }
  };

  const handleResolve = async (noteId: number) => {
    if (!can("execution-note:update")) return;
    const target = notes.find(n => n.id === noteId);
    if (!target || !canActOnNote(user, target)) return;
    try {
      const res = await apiFetch(`${API_BASE}/execution-notes/${noteId}/resolve`, {
        method: "POST",
      });
      if (res.ok) {
        await fetchNotes();
      }
    } catch (err) {
      console.error("[ExecutionNotePanel] resolve error", err);
    }
  };

  const handleDelete = async (noteId: number) => {
    if (!can("execution-note:delete")) return;
    const target = notes.find(n => n.id === noteId);
    if (!target || !canActOnNote(user, target)) return;
    if (!window.confirm("Archiver cette note ? Elle ne sera plus visible mais restera dans l'historique.")) return;

    try {
      const res = await apiFetch(`${API_BASE}/execution-notes/${noteId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        await fetchNotes();
      }
    } catch (err) {
      console.error("[ExecutionNotePanel] delete error", err);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header + Create Button */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-gb-text uppercase tracking-wider">
          Notes d'exécution
        </h3>
        {can("execution-note:create") && (
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gb-primary text-gb-inverse rounded-lg text-xs font-semibold hover:bg-gb-primary/90 transition-colors"
          >
            <Plus size={14} /> Nouvelle note
          </button>
        )}
      </div>

      {/* Create Form */}
      <AnimatePresence>
        {showCreateForm && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-gb-surface-solid border border-gb-border rounded-xl p-4 space-y-3"
          >
            <textarea
              value={newContent}
              onChange={e => setNewContent(e.target.value)}
              placeholder="Écrivez votre note d'exécution..."
              rows={3}
              className="w-full bg-gb-app border border-gb-border rounded-lg px-3 py-2 text-sm text-gb-text focus:outline-none focus:ring-2 focus:ring-gb-primary/30 resize-none"
            />

            <div className={`grid gap-2 ${isScopedContext ? "grid-cols-2" : "grid-cols-4"}`}>
              <div>
                <label className="block text-xs font-semibold text-gb-muted mb-1 uppercase">Catégorie</label>
                <select
                  value={newCategory}
                  onChange={e => setNewCategory(e.target.value)}
                  className="w-full bg-gb-app border border-gb-border rounded-lg px-3 py-2 text-xs text-gb-text focus:outline-none focus:ring-2 focus:ring-gb-primary/30"
                >
                  {Object.entries(CATEGORY_META).map(([k, v]) => (
                    <option key={k} value={k}>{v.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gb-muted mb-1 uppercase">Visibilité</label>
                <select
                  value={newVisibility}
                  onChange={e => setNewVisibility(e.target.value)}
                  className="w-full bg-gb-app border border-gb-border rounded-lg px-3 py-2 text-xs text-gb-text focus:outline-none focus:ring-2 focus:ring-gb-primary/30"
                >
                  <option value="INTERNAL">Interne</option>
                  <option value="MANAGEMENT">Management</option>
                  <option value="CLIENT_SHARED">Partagé client</option>
                </select>
              </div>
              {!isScopedContext && (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-gb-muted mb-1 uppercase">Lots (Multi-choix)</label>
                    <SearchableMultiSelect
                      placeholder="Aucun lot"
                      searchPlaceholder="Rechercher un lot..."
                      options={lotOptions}
                      selectedIds={selectedLotIds}
                      onChange={setSelectedLotIds}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gb-muted mb-1 uppercase">Tâches (Multi-choix)</label>
                    <SearchableMultiSelect
                      placeholder="Aucune tâche"
                      searchPlaceholder="Rechercher une tâche..."
                      options={taskOptions}
                      selectedIds={selectedTaskIds}
                      onChange={setSelectedTaskIds}
                    />
                  </div>
                </>
              )}
            </div>

            {error && (
              <div className="flex items-center gap-2 text-xs text-gb-danger bg-gb-danger/10 border border-gb-danger/20 rounded-lg px-3 py-2">
                <AlertCircle size={12} /> {error}
              </div>
            )}

            <div className="text-xs text-gb-muted bg-gb-app/60 border border-gb-border rounded-lg px-3 py-2">
              {notesToCreateCount} note{notesToCreateCount > 1 ? "s" : ""} seront créées.
            </div>

            <div className="flex items-center gap-2 justify-end">
              <button
                onClick={() => { setShowCreateForm(false); setError(null); }}
                className="px-3 py-1.5 text-xs font-medium text-gb-muted hover:text-gb-text border border-gb-border rounded-lg hover:bg-gb-surface-hover transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleCreate}
                disabled={creating || !newContent.trim()}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-gb-primary text-gb-inverse rounded-lg text-xs font-semibold hover:bg-gb-primary/90 transition-colors disabled:opacity-50"
              >
                {creating ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
                Créer
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Notes List */}
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 size={16} className="text-gb-primary animate-spin mr-2" />
          <span className="text-sm text-gb-muted">Chargement…</span>
        </div>
      ) : notes.length === 0 ? (
        <div className="text-center py-8 text-gb-muted text-sm">
          <MessageCircle size={24} className="mx-auto mb-2 opacity-40" />
          <p>Aucune note pour le moment</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notes.filter(n => !n.deleted_at).map(note => {
            const meta = CATEGORY_META[note.category] ?? CATEGORY_META["INFO"];
            return (
              <motion.div
                key={note.id}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className={`border rounded-lg p-3 space-y-2 transition-colors ${
                  note.resolved_at
                    ? "border-emerald-500/20 bg-emerald-500/5"
                    : note.requires_attention
                    ? "border-red-500/20 bg-red-500/5"
                    : "border-gb-border bg-gb-app/30"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2 min-w-0 flex-1">
                    <span className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${meta.dot}`} />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-gb-text break-words">{note.content}</p>
                      <div className="flex flex-wrap items-center gap-2 mt-1.5">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded border shrink-0 ${
                          meta.color.includes("blue") ? "border-blue-500/20 bg-blue-500/10 text-blue-600" :
                          meta.color.includes("cyan") ? "border-cyan-500/20 bg-cyan-500/10 text-cyan-600" :
                          meta.color.includes("amber") ? "border-amber-500/20 bg-amber-500/10 text-amber-600" :
                          meta.color.includes("orange") ? "border-orange-500/20 bg-orange-500/10 text-orange-600" :
                          meta.color.includes("red") ? "border-red-500/20 bg-red-500/10 text-red-600" :
                          meta.color.includes("purple") ? "border-purple-500/20 bg-purple-500/10 text-purple-600" :
                          meta.color.includes("rose") ? "border-rose-500/20 bg-rose-500/10 text-rose-600" :
                          "border-emerald-500/20 bg-emerald-500/10 text-emerald-600"
                        }`}>
                          {meta.label}
                        </span>
                        <span className="text-[10px] font-medium text-gb-muted px-2 py-0.5 bg-gb-surface-hover rounded border border-gb-border/50">
                          {VISIBILITY_LABELS[note.visibility]}
                        </span>
                        {note.requires_attention && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded border border-red-500/20 bg-red-500/10 text-red-600 flex items-center gap-1">
                            <AlertTriangle size={9} /> Attention requise
                          </span>
                        )}
                        {note.resolved_at && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded border border-emerald-500/20 bg-emerald-500/10 text-emerald-600 flex items-center gap-1">
                            <CheckCircle2 size={9} /> Résolu
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {can("execution-note:pin") && canActOnNote(user, note) && (
                      <button
                        onClick={() => handleTogglePin(note.id)}
                        className={`px-2 py-1 rounded-md transition-colors inline-flex items-center gap-1 text-[11px] font-medium ${
                          note.is_pinned
                            ? "bg-gb-primary/10 text-gb-primary hover:bg-gb-primary/20"
                            : "text-gb-muted hover:text-gb-text hover:bg-gb-surface-hover"
                        }`}
                        title={note.is_pinned ? "Dépingler cette note" : "Épingler cette note"}
                      >
                        {note.is_pinned ? <Pin size={13} /> : <PinOff size={13} />}
                        <span>{note.is_pinned ? "Dépingler" : "Épingler"}</span>
                      </button>
                    )}
                    {can("execution-note:update") && canActOnNote(user, note) && !note.resolved_at && (
                      <button
                        onClick={() => handleResolve(note.id)}
                        className="px-2 py-1 rounded-md text-gb-muted hover:text-emerald-500 hover:bg-emerald-500/10 transition-colors inline-flex items-center gap-1 text-[11px] font-medium"
                        title="Marquer cette note comme résolue"
                      >
                        <CheckCircle2 size={13} />
                        <span>Résolu</span>
                      </button>
                    )}
                    {can("execution-note:delete") && canActOnNote(user, note) && (
                      <button
                        onClick={() => handleDelete(note.id)}
                        className="px-2 py-1 rounded-md text-gb-muted hover:text-gb-danger hover:bg-gb-danger/10 transition-colors inline-flex items-center gap-1 text-[11px] font-medium"
                        title="Archiver cette note"
                      >
                        <Trash2 size={13} />
                        <span>Archiver</span>
                      </button>
                    )}
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-[10px] text-gb-muted">
                  {note.createdBy && (
                    <>
                      <span className="flex items-center gap-1">
                        <User size={9} /> {note.createdBy.firstname} {note.createdBy.lastname}
                      </span>
                      <span>·</span>
                    </>
                  )}
                  <span className="flex items-center gap-1">
                    <Calendar size={9} /> {format(new Date(note.created_at), "d MMM HH:mm", { locale: fr })}
                  </span>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
