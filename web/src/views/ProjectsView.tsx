import React, { useState, useEffect, useCallback } from "react";
import { FolderKanban, Plus, MapPin, Euro, Loader2, AlertCircle, Calendar } from "lucide-react";
import { ProjectDetail } from "../components/projects/ProjectDetail";
import { CreateProjectDialog } from "../components/projects/CreateProjectDialog";
import { motion } from "motion/react";
import { Badge } from "../components/ui/badge";
import { apiFetch, API_BASE } from "../lib/api";
import { usePermissions } from "../contexts/AuthContext";

// ─── Status helpers ────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<string, string> = {
  PLANNING:  "Planification",
  ACTIVE:    "En cours",
  ON_HOLD:   "En pause",
  COMPLETED: "Terminé",
};

const STATUS_VARIANT: Record<string, "default" | "secondary" | "outline"> = {
  ACTIVE:    "default",
  PLANNING:  "secondary",
  ON_HOLD:   "outline",
  COMPLETED: "secondary",
};

// ─── ProjectsView ──────────────────────────────────────────────────────────────

export default function ProjectsView() {
  const { can } = usePermissions();

  const [projects,    setProjects]    = useState<any[]>([]);
  const [pagination,  setPagination]  = useState({ page: 1, limit: 20, total: 0, pages: 1 });
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState<string | null>(null);
  const [dialogOpen,  setDialogOpen]  = useState(false);
  const [selectedId,  setSelectedId]  = useState<number | null>(null);

  // ── Fetch ────────────────────────────────────────────────────────────────────

  const fetchProjects = useCallback(async (page = 1) => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch(`${API_BASE}/projects?page=${page}&limit=${pagination.limit}`);
      if (!res.ok) throw new Error((await res.json()).error || "Erreur de récupération");
      const json = await res.json();
      setProjects(json.data ?? json);
      if (json.pagination) setPagination(json.pagination);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [pagination.limit]);

  useEffect(() => { fetchProjects(); }, []);

  // ── Render : Project Detail ──────────────────────────────────────────────────

  if (selectedId !== null) {
    return <ProjectDetail projectId={selectedId} onBack={() => setSelectedId(null)} />;
  }

  // ── Render : Loading ─────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-20 space-y-4">
        <Loader2 className="w-10 h-10 text-gb-primary animate-spin" />
        <p className="text-gb-muted font-medium">Chargement de vos chantiers...</p>
      </div>
    );
  }

  // ── Render : Main ─────────────────────────────────────────────────────────────

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight text-gb-text flex items-center gap-3">
            <FolderKanban className="text-gb-primary" size={32} />
            <span>Gestion des Projets</span>
          </h2>
          <p className="text-gb-muted mt-1">
            {pagination.total > 0
              ? `${pagination.total} projet${pagination.total > 1 ? "s" : ""} — Suivi et pilotage de vos opérations BTP.`
              : "Suivi et pilotage de l'ensemble de vos opérations BTP."}
          </p>
        </div>
        {can("project:create") && (
          <button
            onClick={() => setDialogOpen(true)}
            className="flex items-center justify-center space-x-2 bg-gb-primary text-gb-inverse px-6 py-3 rounded-full font-bold hover:bg-gb-primary/90 transition-all shadow-lg shadow-gb-primary/20 text-sm active:scale-95 shrink-0"
          >
            <Plus size={18} />
            <span>Nouveau Projet</span>
          </button>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="bg-gb-danger/10 border border-gb-danger/20 p-4 rounded-xl flex items-center gap-3 text-gb-danger">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <p className="text-sm font-medium flex-1">{error}</p>
          <button onClick={() => fetchProjects()} className="underline text-xs">Réessayer</button>
        </div>
      )}

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {projects.map((prj) => (
          <motion.div
            key={prj.id}
            whileHover={{ y: -4 }}
            className="group bg-gb-surface-solid border border-gb-border rounded-2xl p-6 shadow-sm hover:shadow-xl hover:border-gb-primary/50 transition-all cursor-pointer flex flex-col justify-between"
            onClick={() => setSelectedId(prj.id)}
          >
            <div>
              {/* Header card */}
              <div className="flex justify-between items-start mb-4">
                <span className="text-[10px] font-mono font-bold text-gb-primary bg-gb-primary/10 px-2 py-1 rounded ring-1 ring-gb-primary/10">
                  {prj.code}
                </span>
                <Badge variant={STATUS_VARIANT[prj.status] ?? "secondary"} className="text-[10px] py-0 px-2">
                  {STATUS_LABELS[prj.status] ?? prj.status}
                </Badge>
              </div>

              {/* Title */}
              <h3 className="font-extrabold text-xl text-gb-text leading-tight group-hover:text-gb-primary transition-colors mb-2 line-clamp-2">
                {prj.title}
              </h3>

              {/* Location */}
              <div className="flex items-center text-gb-muted text-xs gap-1.5 mb-2">
                <MapPin size={12} />
                <span>{prj.location}</span>
              </div>

              {/* Dates */}
              {(prj.start_date || prj.end_date) && (
                <div className="flex items-center text-gb-muted text-xs gap-1.5 mb-4">
                  <Calendar size={12} />
                  <span>
                    {prj.start_date ? new Date(prj.start_date).toLocaleDateString("fr-FR") : "—"}
                    {" → "}
                    {prj.end_date   ? new Date(prj.end_date).toLocaleDateString("fr-FR")   : "—"}
                  </span>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="space-y-4 pt-4 border-t border-gb-border/50">
              {/* Counts */}
              {prj._count && (
                <div className="flex items-center gap-3 text-xs text-gb-muted">
                  <span className="flex items-center gap-1">
                    <span className="font-semibold text-gb-text">{prj._count.tasks ?? 0}</span> tâches
                  </span>
                  <span>·</span>
                  <span className="flex items-center gap-1">
                    <span className="font-semibold text-gb-text">{prj._count.lots ?? 0}</span> lots
                  </span>
                  <span>·</span>
                  <span className="flex items-center gap-1">
                    <span className="font-semibold text-gb-text">{prj._count.wbs ?? 0}</span> WBS
                  </span>
                </div>
              )}

              {/* Budget */}
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-1 text-gb-text font-bold">
                  <Euro size={14} className="text-gb-primary" />
                  <span>{(prj.budget_initial ?? 0).toLocaleString("fr-FR")} {prj.currency}</span>
                </div>
                {prj.createdBy && (
                  <div className="w-7 h-7 rounded-full bg-gb-primary/20 border-2 border-gb-surface-solid flex items-center justify-center text-[10px] font-bold text-gb-primary">
                    {prj.createdBy.firstname?.[0]}{prj.createdBy.lastname?.[0]}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        ))}

        {/* Empty state */}
        {projects.length === 0 && !loading && (
          <div className="col-span-full py-20 text-center bg-gb-surface-solid border border-gb-border border-dashed rounded-2xl">
            <FolderKanban className="mx-auto text-gb-muted mb-4 opacity-20" size={48} />
            <p className="text-gb-muted font-medium">Aucun projet trouvé.</p>
            {can("project:create") && (
              <button
                onClick={() => setDialogOpen(true)}
                className="mt-4 text-gb-primary text-sm font-semibold underline underline-offset-4"
              >
                Créer votre premier projet →
              </button>
            )}
          </div>
        )}
      </div>

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-gb-muted">
          <span>{pagination.total} projet{pagination.total > 1 ? "s" : ""}</span>
          <div className="flex gap-2 items-center">
            <button
              disabled={pagination.page <= 1}
              onClick={() => fetchProjects(pagination.page - 1)}
              className="px-4 py-2.5 min-h-[44px] rounded border border-gb-border disabled:opacity-40 hover:bg-gb-surface-hover transition-colors text-sm font-medium"
            >Précédent</button>
            <span className="px-3 text-xs">Page {pagination.page} / {pagination.pages}</span>
            <button
              disabled={pagination.page >= pagination.pages}
              onClick={() => fetchProjects(pagination.page + 1)}
              className="px-4 py-2.5 min-h-[44px] rounded border border-gb-border disabled:opacity-40 hover:bg-gb-surface-hover transition-colors text-sm font-medium"
            >Suivant</button>
          </div>
        </div>
      )}

      {/* Dialog */}
      <CreateProjectDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onCreated={(project) => {
          setProjects(prev => [project, ...prev]);
          setPagination(prev => ({ ...prev, total: prev.total + 1 }));
        }}
      />
    </motion.div>
  );
}

