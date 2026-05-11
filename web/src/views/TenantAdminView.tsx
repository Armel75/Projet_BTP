import React, { useEffect, useState } from "react";
import { apiFetch, API_BASE } from "../lib/api";
import { usePermissions } from "../contexts/AuthContext";
import { motion } from "motion/react";
import { Building2, Plus, Pencil, Trash2, Loader2, AlertCircle, CheckCircle2, X } from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Badge } from "../components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from "../components/ui/dialog";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Tenant {
  id:         number;
  name:       string;
  created_at: string;
  updated_at: string;
  _count?:    { users: number; projects: number };
}

interface Pagination {
  page:  number;
  limit: number;
  total: number;
  pages: number;
}

// ─── TenantAdminView ──────────────────────────────────────────────────────────

export default function TenantAdminView() {
  const { can } = usePermissions();

  const [tenants,    setTenants]    = useState<Tenant[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 20, total: 0, pages: 1 });
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState<string | null>(null);
  const [success,    setSuccess]    = useState<string | null>(null);

  // Dialog state
  const [dialogOpen,    setDialogOpen]    = useState(false);
  const [dialogMode,    setDialogMode]    = useState<"create" | "edit">("create");
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const [nameInput,     setNameInput]     = useState("");
  const [submitting,    setSubmitting]    = useState(false);
  const [dialogError,   setDialogError]   = useState<string | null>(null);

  // ── Fetch ────────────────────────────────────────────────────────────────────

  const fetchTenants = async (page = 1) => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch(`${API_BASE}/tenants?page=${page}&limit=${pagination.limit}`);
      if (!res.ok) throw new Error("Erreur lors de la récupération des tenants.");
      const json = await res.json();
      setTenants(json.data);
      setPagination(json.pagination);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchTenants(); }, []);

  // ── Dialog helpers ───────────────────────────────────────────────────────────

  const openCreate = () => {
    setDialogMode("create");
    setSelectedTenant(null);
    setNameInput("");
    setDialogError(null);
    setDialogOpen(true);
  };

  const openEdit = (tenant: Tenant) => {
    setDialogMode("edit");
    setSelectedTenant(tenant);
    setNameInput(tenant.name);
    setDialogError(null);
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setDialogError(null);
  };

  // ── Submit (create / update) ─────────────────────────────────────────────────

  const handleSubmit = async () => {
    const name = nameInput.trim();
    if (name.length < 2 || name.length > 100) {
      setDialogError("Le nom doit contenir entre 2 et 100 caractères.");
      return;
    }
    setSubmitting(true);
    setDialogError(null);
    try {
      let res: Response;
      if (dialogMode === "create") {
        res = await apiFetch(`${API_BASE}/tenants`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name }),
        });
      } else {
        res = await apiFetch(`${API_BASE}/tenants/${selectedTenant!.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name }),
        });
      }
      const data = await res.json();
      if (!res.ok) { setDialogError(data.error ?? "Une erreur est survenue."); return; }

      setSuccess(dialogMode === "create" ? `Tenant "${name}" créé.` : `Tenant "${name}" mis à jour.`);
      closeDialog();
      fetchTenants(pagination.page);
      setTimeout(() => setSuccess(null), 4000);
    } catch (e: any) {
      setDialogError(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  // ── Delete ───────────────────────────────────────────────────────────────────

  const handleDelete = async (tenant: Tenant) => {
    if (!window.confirm(`Supprimer le tenant "${tenant.name}" ? Cette action est irréversible.`)) return;
    try {
      const res = await apiFetch(`${API_BASE}/tenants/${tenant.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Erreur lors de la suppression."); return; }
      setSuccess(`Tenant "${tenant.name}" supprimé.`);
      fetchTenants(pagination.page);
      setTimeout(() => setSuccess(null), 4000);
    } catch (e: any) {
      setError(e.message);
    }
  };

  // ── Render ───────────────────────────────────────────────────────────────────

  if (!can("tenant:read")) {
    return (
      <div className="flex items-center gap-3 p-6 rounded-lg border border-gb-border bg-gb-surface-solid text-gb-muted">
        <AlertCircle className="w-5 h-5 shrink-0 text-gb-warning" />
        <span className="text-sm">Vous n'avez pas la permission <code className="bg-gb-app px-1 rounded text-xs">tenant:read</code> pour accéder à cette section.</span>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 pb-12">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-gb-text flex items-center gap-3">
            <Building2 className="w-8 h-8 text-gb-primary" />
            Gestion des Entreprises
          </h2>
          <p className="text-gb-muted mt-1">Administrez les organisations (tenants) de la plateforme.</p>
        </div>
        {can("tenant:create") && (
          <Button onClick={openCreate} className="shrink-0">
            <Plus className="w-4 h-4 mr-2" /> Nouvelle entreprise
          </Button>
        )}
      </div>

      {/* Feedback banners */}
      {error && (
        <div className="flex items-center gap-3 p-4 rounded-lg border border-gb-danger/20 bg-gb-danger/10 text-gb-danger">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <p className="text-sm font-medium flex-1">{error}</p>
          <button onClick={() => setError(null)}><X className="w-4 h-4" /></button>
        </div>
      )}
      {success && (
        <div className="flex items-center gap-3 p-4 rounded-lg border border-green-500/20 bg-green-500/10 text-green-600">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <p className="text-sm font-medium">{success}</p>
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-gb-primary" />
        </div>
      ) : tenants.length === 0 ? (
        <div className="text-center py-16 text-gb-muted text-sm">Aucun tenant trouvé.</div>
      ) : (
        <div className="rounded-lg border border-gb-border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gb-surface-solid border-b border-gb-border">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-gb-text">ID</th>
                <th className="text-left px-4 py-3 font-semibold text-gb-text">Nom</th>
                <th className="text-left px-4 py-3 font-semibold text-gb-text">Utilisateurs</th>
                <th className="text-left px-4 py-3 font-semibold text-gb-text">Projets</th>
                <th className="text-left px-4 py-3 font-semibold text-gb-text">Créé le</th>
                <th className="px-4 py-3 text-right font-semibold text-gb-text">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gb-border">
              {tenants.map(t => (
                <tr key={t.id} className="hover:bg-gb-surface-solid/50 transition-colors">
                  <td className="px-4 py-3 text-gb-muted font-mono text-xs">{t.id}</td>
                  <td className="px-4 py-3 font-medium text-gb-text">{t.name}</td>
                  <td className="px-4 py-3">
                    <Badge variant="secondary">{t._count?.users ?? "—"}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant="secondary">{t._count?.projects ?? "—"}</Badge>
                  </td>
                  <td className="px-4 py-3 text-gb-muted">
                    {new Date(t.created_at).toLocaleDateString("fr-FR")}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      {can("tenant:update") && (
                        <button
                          onClick={() => openEdit(t)}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded hover:bg-gb-app text-gb-muted hover:text-gb-text transition-colors"
                          title="Modifier"
                        >
                          <Pencil className="w-4 h-4" />
                          <span className="text-xs font-medium">Modifier</span>
                        </button>
                      )}
                      {can("tenant:delete") && (
                        <button
                          onClick={() => handleDelete(t)}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded hover:bg-gb-danger/10 text-gb-muted hover:text-gb-danger transition-colors"
                          title="Supprimer"
                        >
                          <Trash2 className="w-4 h-4" />
                          <span className="text-xs font-medium">Supprimer</span>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div className="flex items-center justify-between text-sm text-gb-muted">
          <span>{pagination.total} tenant{pagination.total > 1 ? "s" : ""} au total</span>
          <div className="flex gap-2">
            <Button
              variant="outline" size="sm"
              disabled={pagination.page <= 1}
              onClick={() => fetchTenants(pagination.page - 1)}
            >Précédent</Button>
            <span className="flex items-center px-3">
              Page {pagination.page} / {pagination.pages}
            </span>
            <Button
              variant="outline" size="sm"
              disabled={pagination.page >= pagination.pages}
              onClick={() => fetchTenants(pagination.page + 1)}
            >Suivant</Button>
          </div>
        </div>
      )}

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={closeDialog}>
        <DialogContent className="bg-gb-surface-solid border-gb-border">
          <DialogHeader>
            <DialogTitle>
              {dialogMode === "create" ? "Nouvelle entreprise" : `Modifier "${selectedTenant?.name}"`}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="tenant-name">Nom de l'entreprise</Label>
              <Input
                id="tenant-name"
                value={nameInput}
                onChange={e => setNameInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleSubmit()}
                placeholder="Ex: BTP Grand Sud"
                className="bg-gb-app border-gb-border"
                autoFocus
              />
            </div>
            {dialogError && (
              <p className="text-sm text-gb-danger flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" /> {dialogError}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog} disabled={submitting}>Annuler</Button>
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {dialogMode === "create" ? "Créer" : "Enregistrer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </motion.div>
  );
}
