import React, { useState, useEffect, useCallback } from "react";
import { FolderKanban, Plus, MapPin, Loader2, AlertCircle, Calendar, FileDown, PencilLine, Filter, X } from "lucide-react";
import { ProjectDetail } from "../components/projects/ProjectDetail";
import { CreateProjectDialog } from "../components/projects/CreateProjectDialog.tsx";
import { ProjectFilterPanel } from "../components/filters/ProjectFilterPanel";
import { motion } from "motion/react";
import { Badge } from "../components/ui/badge";
import { apiFetch, API_BASE } from "../lib/api";
import { usePermissions } from "../contexts/AuthContext";
import { QueryPayload } from "../components/filters/types";

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
  const { can, canAny } = usePermissions();
  const canEditProjectMetadata = can("project:metadata:update");

  const [projects,    setProjects]    = useState<any[]>([]);
  const [pagination,  setPagination]  = useState({
    page: 1,
    limit: 20,
    total: 0,
    pages: 1,
    hasNext: false,
    hasPrev: false,
    nextCursor: null as string | null,
    prevCursor: null as string | null,
  });
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState<string | null>(null);
  const [dialogOpen,  setDialogOpen]  = useState(false);
  const [editingProject, setEditingProject] = useState<any | null>(null);
  const [selectedId,  setSelectedId]  = useState<number | null>(null);
  
  // ─── Filter states ────────────────────────────────────────────────────────────
  const [filterOpen, setFilterOpen] = useState(false);
  const [appliedPayload, setAppliedPayload] = useState<QueryPayload | null>(null);

  const handleExportProjectsExcel = async () => {
    try {
      const res = await apiFetch(`${API_BASE}/projects/export/excel`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Impossible d'exporter la liste des projets.");
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `projets-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      setError(err.message || "Impossible d'exporter la liste des projets.");
    }
  };

  const handleExportProjectsPdf = async () => {
    try {
      const res = await apiFetch(`${API_BASE}/projects/export/pdf`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Impossible d'exporter le portefeuille projets en PDF.");
      }

      const buffer = await res.arrayBuffer();
      const blob = new Blob([buffer], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `projets-${new Date().toISOString().slice(0, 10)}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.setTimeout(() => window.URL.revokeObjectURL(url), 60_000);
    } catch (err: any) {
      setError(err.message || "Impossible d'exporter le portefeuille projets en PDF.");
    }
  };

  // ── Fetch ────────────────────────────────────────────────────────────────────

  const fetchProjects = useCallback(async (opts?: { after?: string; before?: string; direction?: "next" | "prev"; reset?: boolean }) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ limit: String(pagination.limit) });
      if (opts?.after) params.set("after", opts.after);
      if (opts?.before) params.set("before", opts.before);
      const res = await apiFetch(`${API_BASE}/projects?${params.toString()}`);
      if (!res.ok) throw new Error((await res.json()).error || "Erreur de récupération");
      const json = await res.json();
      setProjects(json.data ?? json);
      if (json.pagination) {
        if (json.pagination.mode === "cursor") {
          setPagination(prev => {
            const nextPage = opts?.reset
              ? 1
              : opts?.direction === "next"
                ? prev.page + 1
                : opts?.direction === "prev"
                  ? Math.max(1, prev.page - 1)
                  : 1;
            return {
              page: nextPage,
              limit: json.pagination.limit ?? prev.limit,
              total: json.pagination.total ?? prev.total,
              pages: json.pagination.pages ?? prev.pages,
              hasNext: Boolean(json.pagination.hasNext),
              hasPrev: Boolean(json.pagination.hasPrev),
              nextCursor: json.pagination.nextCursor ?? null,
              prevCursor: json.pagination.prevCursor ?? null,
            };
          });
        } else {
          setPagination(prev => ({
            ...prev,
            page: json.pagination.page ?? 1,
            limit: json.pagination.limit ?? prev.limit,
            total: json.pagination.total ?? 0,
            pages: json.pagination.pages ?? 1,
            hasNext: (json.pagination.page ?? 1) < (json.pagination.pages ?? 1),
            hasPrev: (json.pagination.page ?? 1) > 1,
            nextCursor: null,
            prevCursor: null,
          }));
        }
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [pagination.limit]);

  /**
   * Applique les filtres et récupère les résultats filtrés
   */
  const handleApplyFilters = useCallback(async (payload: QueryPayload, page = 1) => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch(`${API_BASE}/projects/query?page=${page}&limit=${pagination.limit}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Erreur lors du filtrage');
      }
      const json = await res.json();
      setProjects(json.data ?? []);
      setAppliedPayload(payload);
      setPagination({
        page: json.page ?? 1,
        limit: json.limit ?? pagination.limit,
        total: json.total ?? 0,
        pages: Math.ceil((json.total ?? 0) / (json.limit ?? 20)),
        hasNext: (json.page ?? 1) < Math.ceil((json.total ?? 0) / (json.limit ?? 20)),
        hasPrev: (json.page ?? 1) > 1,
        nextCursor: null,
        prevCursor: null,
      });
      setFilterOpen(false); // Fermer le panel après application
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [pagination.limit]);

  /**
   * Réinitialise les filtres
   */
  const handleResetFilters = useCallback(() => {
    setAppliedPayload(null);
    setPagination(prev => ({ ...prev, page: 1, total: 0, pages: 1, hasNext: false, hasPrev: false, nextCursor: null, prevCursor: null }));
    fetchProjects({ reset: true });
  }, [fetchProjects]);

  useEffect(() => { fetchProjects({ reset: true }); }, []);

  const handleNextPage = () => {
    if (appliedPayload) {
      handleApplyFilters(appliedPayload, pagination.page + 1);
      return;
    }
    if (!pagination.nextCursor) return;
    fetchProjects({ after: pagination.nextCursor, direction: "next" });
  };

  const handlePrevPage = () => {
    if (appliedPayload) {
      handleApplyFilters(appliedPayload, pagination.page - 1);
      return;
    }
    if (!pagination.prevCursor) return;
    fetchProjects({ before: pagination.prevCursor, direction: "prev" });
  };

  const openCreateDialog = () => {
    setEditingProject(null);
    setDialogOpen(true);
  };

  const openEditDialog = (event: React.MouseEvent, project: any) => {
    event.stopPropagation();
    setEditingProject(project);
    setDialogOpen(true);
  };

  // ── Render : Project Detail ──────────────────────────────────────────────────

  if (selectedId !== null) {
    return (
      <>
        <ProjectDetail
          projectId={selectedId}
          onBack={() => setSelectedId(null)}
          onEdit={(proj) => {
            setEditingProject(proj);
            setDialogOpen(true);
          }}
        />

        <CreateProjectDialog
          open={dialogOpen}
          project={editingProject}
          onClose={() => {
            setDialogOpen(false);
            setEditingProject(null);
          }}
          onSaved={() => {
            setDialogOpen(false);
            setEditingProject(null);
            if (appliedPayload) {
              handleApplyFilters(appliedPayload);
            } else {
              fetchProjects({ reset: true });
            }
          }}
        />
      </>
    );
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
        <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
          {/* Filter button */}
          <button
            onClick={() => setFilterOpen(true)}
            className={`flex items-center justify-center gap-2 px-5 py-3 rounded-full font-bold text-sm transition-all active:scale-95 border ${
              appliedPayload
                ? 'bg-blue-50 border-blue-300 text-blue-700 hover:bg-blue-100'
                : 'border-gb-border text-gb-text hover:bg-gb-surface-hover'
            }`}
          >
            <Filter size={16} />
            <span>Filtrer</span>
            {appliedPayload && appliedPayload.filters.length > 0 && (
              <Badge variant="default" className="ml-1 bg-blue-600 text-white">
                {appliedPayload.filters.length}
              </Badge>
            )}
          </button>

          <button
            onClick={handleExportProjectsPdf}
            className="flex items-center justify-center gap-2 border border-gb-border text-gb-text px-5 py-3 rounded-full font-bold hover:bg-gb-surface-hover transition-all text-sm active:scale-95"
          >
            <FileDown size={16} />
            <span>Exporter les projets (PDF)</span>
          </button>
          <button
            onClick={handleExportProjectsExcel}
            className="flex items-center justify-center gap-2 border border-gb-border text-gb-text px-5 py-3 rounded-full font-bold hover:bg-gb-surface-hover transition-all text-sm active:scale-95"
          >
            <FileDown size={16} />
            <span>Exporter la liste des projets (Excel/CSV)</span>
          </button>

          {can("project:create") && (
            <button
              onClick={openCreateDialog}
              className="flex items-center justify-center space-x-2 bg-gb-primary text-gb-inverse px-6 py-3 rounded-full font-bold hover:bg-gb-primary/90 transition-all shadow-lg shadow-gb-primary/20 text-sm active:scale-95"
            >
              <Plus size={18} />
              <span>Nouveau Projet</span>
            </button>
          )}
        </div>
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
                    <span className="font-semibold text-gb-text">{prj._count.wbs ?? 0}</span> SDT
                  </span>
                </div>
              )}

              {/* Budget */}
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-1 text-gb-text font-bold">
                  <span>{(prj.budget_initial ?? 0).toLocaleString("fr-FR")} {prj.currency}</span>
                </div>
                {prj.createdBy && (
                  <div className="w-7 h-7 rounded-full bg-gb-primary/20 border-2 border-gb-surface-solid flex items-center justify-center text-[10px] font-bold text-gb-primary">
                    {prj.createdBy.firstname?.[0]}{prj.createdBy.lastname?.[0]}
                  </div>
                )}
              </div>

              {canEditProjectMetadata && (
                <div className="flex items-center justify-between gap-3">
                  <p className="text-[11px] text-gb-muted">
                    {(prj._count?.tasks ?? 0) > 0
                      ? "Edition verrouillee: des taches existent deja sur ce projet."
                      : "Vous pouvez ajuster les informations du projet avant le lancement detaille."}
                  </p>
                  <button
                    type="button"
                    onClick={(event) => openEditDialog(event, prj)}
                    disabled={(prj._count?.tasks ?? 0) > 0}
                    title={(prj._count?.tasks ?? 0) > 0 ? "Modification indisponible: le projet contient deja des taches." : "Modifier le projet"}
                    className="inline-flex items-center gap-2 rounded-full border border-gb-border px-3 py-2 text-xs font-semibold text-gb-text transition-colors hover:bg-gb-surface-hover disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:bg-transparent"
                  >
                    <PencilLine size={14} />
                    Modifier
                  </button>
                </div>
              )}
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
                onClick={openCreateDialog}
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
              disabled={!pagination.hasPrev}
              onClick={handlePrevPage}
              className="px-4 py-2.5 min-h-[44px] rounded border border-gb-border disabled:opacity-40 hover:bg-gb-surface-hover transition-colors text-sm font-medium"
            >Précédent</button>
            <span className="px-3 text-xs">Page {pagination.page} / {pagination.pages}</span>
            <button
              disabled={!pagination.hasNext}
              onClick={handleNextPage}
              className="px-4 py-2.5 min-h-[44px] rounded border border-gb-border disabled:opacity-40 hover:bg-gb-surface-hover transition-colors text-sm font-medium"
            >Suivant</button>
          </div>
        </div>
      )}

      {/* Dialog */}
      <CreateProjectDialog
        open={dialogOpen}
        project={editingProject}
        onClose={() => {
          setDialogOpen(false);
          setEditingProject(null);
        }}
        onSaved={() => {
          setDialogOpen(false);
          setEditingProject(null);
          if (appliedPayload) {
            // Réappliquer les filtres si des filtres sont actifs
            handleApplyFilters(appliedPayload);
          } else {
            fetchProjects({ reset: true });
          }
        }}
      />

      {/* Filter Panel */}
      {filterOpen && (
        <ProjectFilterPanel
          onApply={handleApplyFilters}
          onClose={() => setFilterOpen(false)}
        />
      )}

      {/* Active filters display */}
      {appliedPayload && appliedPayload.filters.length > 0 && (
        <div className="flex items-center gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg flex-wrap">
          <span className="text-sm font-medium text-blue-900">
            {appliedPayload.filters.length} filtre{appliedPayload.filters.length > 1 ? 's' : ''} appliqué{appliedPayload.filters.length > 1 ? 's' : ''} ({appliedPayload.logic}) :
          </span>
          <div className="flex flex-wrap gap-2">
            {appliedPayload.filters.map((f, idx) => (
              <Badge key={idx} variant="secondary" className="text-xs">
                {f.field}
              </Badge>
            ))}
          </div>
          <button
            onClick={handleResetFilters}
            className="ml-auto flex items-center gap-1 px-3 py-1 text-sm text-blue-700 hover:bg-blue-100 rounded transition"
          >
            <X size={14} />
            Réinitialiser
          </button>
        </div>
      )}
    </motion.div>
  );
}

