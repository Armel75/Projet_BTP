import React, { useEffect, useState } from "react";
import { apiFetch, API_BASE } from "../lib/api";
import { usePermissions } from "../contexts/AuthContext";
import { motion } from "motion/react";
import { AlertCircle, CheckCircle2, Loader2, Plus, Tags, Trash2 } from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";

interface ResourceTypeItem {
  id: number;
  code: string;
  _count?: {
    resources: number;
  };
}

export default function ResourceTypesAdminView() {
  const { can } = usePermissions();
  const [items, setItems] = useState<ResourceTypeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [newCode, setNewCode] = useState("");

  const fetchTypes = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch(`${API_BASE}/resources/types`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Erreur lors du chargement des types.");
      }
      const data = await res.json();
      setItems(Array.isArray(data) ? data : []);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTypes();
  }, []);

  const handleCreate = async () => {
    const code = newCode.trim().toUpperCase();
    if (!code) {
      setError("Le code du type est requis.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const res = await apiFetch(`${API_BASE}/resources/types`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Impossible de créer le type.");
      }

      setNewCode("");
      setSuccess(`Type ${code} créé.`);
      await fetchTypes();
      setTimeout(() => setSuccess(null), 3000);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (item: ResourceTypeItem) => {
    if (!window.confirm(`Supprimer le type ${item.code} ?`)) return;

    setError(null);
    try {
      const res = await apiFetch(`${API_BASE}/resources/types/${item.id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Impossible de supprimer le type.");
      }

      setSuccess(`Type ${item.code} supprimé.`);
      await fetchTypes();
      setTimeout(() => setSuccess(null), 3000);
    } catch (e: any) {
      setError(e.message);
    }
  };

  if (!can("resource:read")) {
    return (
      <div className="flex items-center gap-3 p-6 rounded-lg border border-gb-border bg-gb-surface-solid text-gb-muted">
        <AlertCircle className="w-5 h-5 shrink-0 text-gb-warning" />
        <span className="text-sm">Vous n'avez pas la permission resource:read pour accéder à cette section.</span>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 pb-12">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-gb-text flex items-center gap-3">
          <Tags className="w-8 h-8 text-gb-primary" />
          Paramétrage des Types de Ressources
        </h2>
        <p className="text-gb-muted mt-1">Référentiel des types utilisés lors de la création des ressources.</p>
      </div>

      {error && (
        <div className="flex items-center gap-3 p-4 rounded-lg border border-gb-danger/20 bg-gb-danger/10 text-gb-danger">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <p className="text-sm font-medium">{error}</p>
        </div>
      )}

      {success && (
        <div className="flex items-center gap-3 p-4 rounded-lg border border-green-500/20 bg-green-500/10 text-green-600">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <p className="text-sm font-medium">{success}</p>
        </div>
      )}

      <div className="rounded-xl border border-gb-border bg-gb-surface-solid p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <Input
            value={newCode}
            onChange={(e) => setNewCode(e.target.value)}
            placeholder="Ex: LABOR"
            className="sm:max-w-sm"
            disabled={!can("resource:create") || saving}
          />
          <Button onClick={handleCreate} disabled={!can("resource:create") || saving}>
            {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
            Ajouter
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-gb-primary" />
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-16 text-gb-muted text-sm">Aucun type de ressource configuré.</div>
      ) : (
        <div className="rounded-lg border border-gb-border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gb-surface-solid border-b border-gb-border">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-gb-text">Code</th>
                <th className="text-left px-4 py-3 font-semibold text-gb-text">Ressources liées</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gb-border">
              {items.map((item) => (
                <tr key={item.id} className="hover:bg-gb-surface-solid/40 transition-colors">
                  <td className="px-4 py-3 font-semibold text-gb-text">{item.code}</td>
                  <td className="px-4 py-3 text-gb-muted">{item._count?.resources ?? 0}</td>
                  <td className="px-4 py-3 text-right">
                    <Button
                      variant="ghost"
                      onClick={() => handleDelete(item)}
                      disabled={!can("resource:delete")}
                      className="text-gb-danger hover:text-gb-danger hover:bg-gb-danger/10"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </motion.div>
  );
}
