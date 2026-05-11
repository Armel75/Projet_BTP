import React, { useState, useEffect } from "react";
import {
  StickyNote, Plus, Search, Filter, X, Loader2, AlertCircle,
  Pin, CheckCircle2, Calendar, User, Eye, AlertTriangle,
  ChevronDown, Trash2, Bell
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { apiFetch, API_BASE } from "../lib/api";
import { useAuth } from "../contexts/AuthContext";
import { canActOnNote } from "../lib/notePermissions";
import { ExecutionNote } from "../types";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

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

export default function ExecutionNotesView() {
  const { can, user } = useAuth();
  const [notes, setNotes] = useState<ExecutionNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("");
  const [filterVisibility, setFilterVisibility] = useState<string>("");
  const [filterShowResolved, setFilterShowResolved] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    const fetchNotes = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          exclude_deleted: 'true',
          top_level_only: 'true',
        });
        const res = await apiFetch(`${API_BASE}/execution-notes?${params}`);
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data)) {
            setNotes(data);
          } else if (data.data && Array.isArray(data.data)) {
            setNotes(data.data);
          }
        }
      } catch (err) {
        console.error('[ExecutionNotesView] fetch error', err);
      } finally {
        setLoading(false);
      }
    };

    fetchNotes();
  }, []);

  const handleTogglePin = async (noteId: number) => {
    if (!can("execution-note:pin")) return;
    const target = notes.find(n => n.id === noteId);
    if (!target || !canActOnNote(user, target)) return;
    try {
      const res = await apiFetch(`${API_BASE}/execution-notes/${noteId}/pin`, {
        method: "POST",
      });
      if (res.ok) {
        setNotes(notes.map(n => n.id === noteId ? { ...n, is_pinned: !n.is_pinned } : n));
      }
    } catch (err) {
      console.error("[ExecutionNotesView] pin error", err);
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
        setNotes(notes.map(n => n.id === noteId ? { ...n, resolved_at: new Date().toISOString() } : n));
      }
    } catch (err) {
      console.error("[ExecutionNotesView] resolve error", err);
    }
  };

  const handleDelete = async (noteId: number) => {
    if (!can("execution-note:delete")) return;
    const target = notes.find(n => n.id === noteId);
    if (!target || !canActOnNote(user, target)) return;
    if (!window.confirm("Archiver cette note ?")) return;

    try {
      const res = await apiFetch(`${API_BASE}/execution-notes/${noteId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setNotes(notes.filter(n => n.id !== noteId));
      }
    } catch (err) {
      console.error("[ExecutionNotesView] delete error", err);
    }
  };

  const filteredNotes = notes
    .filter(n => {
      if (!filterShowResolved && n.resolved_at) return false;
      if (filterCategory && n.category !== filterCategory) return false;
      if (filterVisibility && n.visibility !== filterVisibility) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matches = n.content.toLowerCase().includes(q);
        return matches || 
               (n.project?.code?.toLowerCase().includes(q)) ||
               (n.project?.title?.toLowerCase().includes(q));
      }
      return true;
    })
    .sort((a, b) => {
      // Pinned first
      if (a.is_pinned && !b.is_pinned) return -1;
      if (!a.is_pinned && b.is_pinned) return 1;
      // Then by date (newest first)
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

  const pinnedNotes = filteredNotes.filter(n => n.is_pinned);
  const regularNotes = filteredNotes.filter(n => !n.is_pinned);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 bg-gb-primary/10 rounded-lg flex items-center justify-center">
            <StickyNote size={20} className="text-gb-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gb-text">Notes d'exécution</h1>
            <p className="text-sm text-gb-muted">Suivi centralisé de tous les points d'exécution de vos projets</p>
          </div>
        </div>
      </div>

      {/* Filters + Search */}
      <div className="bg-gb-surface-solid border border-gb-border rounded-xl p-4 space-y-4">
        <div className="flex items-center gap-2">
          <div className="flex-1 relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gb-muted pointer-events-none" />
            <input
              type="text"
              placeholder="Rechercher dans les notes…"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-gb-app border border-gb-border rounded-lg pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gb-primary/30"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-1.5 px-3 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
              showFilters
                ? "bg-gb-primary/10 text-gb-primary border border-gb-primary/20"
                : "border border-gb-border text-gb-muted hover:text-gb-text hover:bg-gb-surface-hover"
            }`}
          >
            <Filter size={16} /> Filtres {(filterCategory || filterVisibility || filterShowResolved) && "(actifs)"}
          </button>
        </div>

        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-gb-border"
            >
              <div>
                <label className="block text-xs font-semibold text-gb-muted mb-1.5 uppercase">Catégorie</label>
                <select
                  value={filterCategory}
                  onChange={e => setFilterCategory(e.target.value)}
                  className="w-full bg-gb-app border border-gb-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gb-primary/30"
                >
                  <option value="">Toutes</option>
                  {Object.entries(CATEGORY_META).map(([k, v]) => (
                    <option key={k} value={k}>{v.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gb-muted mb-1.5 uppercase">Visibilité</label>
                <select
                  value={filterVisibility}
                  onChange={e => setFilterVisibility(e.target.value)}
                  className="w-full bg-gb-app border border-gb-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gb-primary/30"
                >
                  <option value="">Toutes</option>
                  <option value="INTERNAL">Interne</option>
                  <option value="MANAGEMENT">Management</option>
                  <option value="CLIENT_SHARED">Partagé client</option>
                </select>
              </div>
              <div className="flex items-end">
                <label className="flex items-center gap-2 px-3 py-2.5 rounded-lg border border-gb-border hover:bg-gb-surface-hover cursor-pointer transition-colors w-full">
                  <input
                    type="checkbox"
                    checked={filterShowResolved}
                    onChange={e => setFilterShowResolved(e.target.checked)}
                    className="rounded"
                  />
                  <span className="text-sm font-medium text-gb-text">Afficher les résolus</span>
                </label>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Notes Timeline */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={24} className="text-gb-primary animate-spin mr-2" />
          <span className="text-gb-muted">Chargement des notes…</span>
        </div>
      ) : filteredNotes.length === 0 ? (
        <div className="text-center py-20 text-gb-muted">
          <StickyNote size={48} className="mx-auto mb-3 opacity-30" />
          <p className="text-lg font-medium">Aucune note trouvée</p>
          <p className="text-sm mt-1">Les notes d'exécution apparaîtront ici</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Pinned Notes Section */}
          {pinnedNotes.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Pin size={16} className="text-gb-primary" />
                <h2 className="text-sm font-bold text-gb-text uppercase tracking-wider">Notes épinglées</h2>
                <span className="text-xs font-mono text-gb-muted">{pinnedNotes.length}</span>
              </div>
              <div className="space-y-2">
                {pinnedNotes.map(note => (
                  <NoteCard
                    key={note.id}
                    note={note}
                    onPin={() => handleTogglePin(note.id)}
                    onResolve={() => handleResolve(note.id)}
                    onDelete={() => handleDelete(note.id)}
                    canPin={can("execution-note:pin") && canActOnNote(user, note)}
                    canUpdate={can("execution-note:update") && canActOnNote(user, note)}
                    canDelete={can("execution-note:delete") && canActOnNote(user, note)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Regular Notes Section */}
          {regularNotes.length > 0 && (
            <div className="space-y-3">
              {pinnedNotes.length > 0 && (
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-bold text-gb-text uppercase tracking-wider">Autres notes</h2>
                  <span className="text-xs font-mono text-gb-muted">{regularNotes.length}</span>
                </div>
              )}
              <div className="space-y-2">
                {regularNotes.map(note => (
                  <NoteCard
                    key={note.id}
                    note={note}
                    onPin={() => handleTogglePin(note.id)}
                    onResolve={() => handleResolve(note.id)}
                    onDelete={() => handleDelete(note.id)}
                    canPin={can("execution-note:pin") && canActOnNote(user, note)}
                    canUpdate={can("execution-note:update") && canActOnNote(user, note)}
                    canDelete={can("execution-note:delete") && canActOnNote(user, note)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface NoteCardProps {
  note: ExecutionNote;
  onPin: () => void;
  onResolve: () => void;
  onDelete: () => void;
  canPin: boolean;
  canUpdate: boolean;
  canDelete: boolean;
}

function NoteCard({
  note,
  onPin,
  onResolve,
  onDelete,
  canPin,
  canUpdate,
  canDelete,
}: NoteCardProps) {
  const meta = CATEGORY_META[note.category] ?? CATEGORY_META["INFO"];

  return (
    <motion.div
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      className={`border rounded-xl p-4 space-y-3 transition-all ${
        note.resolved_at
          ? "border-emerald-500/20 bg-emerald-500/5"
          : note.requires_attention
          ? "border-red-500/20 bg-red-500/5"
          : note.is_pinned
          ? "border-gb-primary/30 bg-gb-primary/5"
          : "border-gb-border bg-gb-app/20"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-3 min-w-0 flex-1">
          <span className={`w-2.5 h-2.5 rounded-full mt-1.5 shrink-0 ${meta.dot}`} />
          <div className="min-w-0 flex-1">
            <p className="text-sm text-gb-text break-words mb-2">{note.content}</p>
            <div className="flex flex-wrap items-center gap-2">
              <span className={`text-xs font-bold px-2 py-1 rounded border shrink-0 ${
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
              <span className="text-xs font-medium text-gb-muted px-2 py-1 bg-gb-surface-solid rounded border border-gb-border/50">
                {VISIBILITY_LABELS[note.visibility]}
              </span>
              {note.project && (
                <span className="text-xs font-mono text-gb-primary px-2 py-1 bg-gb-primary/10 rounded border border-gb-primary/20">
                  {note.project.code}
                </span>
              )}
              {note.requires_attention && (
                <span className="text-xs font-bold px-2 py-1 rounded border border-red-500/20 bg-red-500/10 text-red-600 flex items-center gap-1">
                  <AlertTriangle size={11} /> Attention
                </span>
              )}
              {note.resolved_at && (
                <span className="text-xs font-bold px-2 py-1 rounded border border-emerald-500/20 bg-emerald-500/10 text-emerald-600 flex items-center gap-1">
                  <CheckCircle2 size={11} /> Résolu
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {canPin && (
            <button
              onClick={onPin}
              className={`px-3 py-1.5 rounded-md transition-colors inline-flex items-center gap-1.5 text-xs font-medium ${
                note.is_pinned
                  ? "bg-gb-primary/10 text-gb-primary hover:bg-gb-primary/20"
                  : "text-gb-muted hover:text-gb-text hover:bg-gb-surface-hover"
              }`}
              title={note.is_pinned ? "Dépingler cette note" : "Épingler cette note"}
            >
              <Pin size={14} />
              <span>{note.is_pinned ? "Dépingler" : "Épingler"}</span>
            </button>
          )}
          {canUpdate && !note.resolved_at && (
            <button
              onClick={onResolve}
              className="px-3 py-1.5 rounded-md text-gb-muted hover:text-emerald-500 hover:bg-emerald-500/10 transition-colors inline-flex items-center gap-1.5 text-xs font-medium"
              title="Marquer cette note comme résolue"
            >
              <CheckCircle2 size={14} />
              <span>Résolu</span>
            </button>
          )}
          {canDelete && (
            <button
              onClick={onDelete}
              className="px-3 py-1.5 rounded-md text-gb-muted hover:text-gb-danger hover:bg-gb-danger/10 transition-colors inline-flex items-center gap-1.5 text-xs font-medium"
              title="Archiver cette note"
            >
              <Trash2 size={14} />
              <span>Archiver</span>
            </button>
          )}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2 text-xs text-gb-muted pt-2 border-t border-gb-border/20">
        {note.createdBy && (
          <>
            <span className="flex items-center gap-1">
              <User size={11} /> {note.createdBy.firstname} {note.createdBy.lastname}
            </span>
            <span>·</span>
          </>
        )}
        <span className="flex items-center gap-1">
          <Calendar size={11} /> {format(new Date(note.created_at), "d MMM yyyy HH:mm", { locale: fr })}
        </span>
      </div>
    </motion.div>
  );
}
