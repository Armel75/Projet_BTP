import React, { useEffect, useRef, useState } from "react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Badge } from "../ui/badge";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "../ui/card";
import { Shield, Plus, Trash2, Key, ChevronDown, ChevronUp, Check, Loader2 } from "lucide-react";
import { Label } from "../ui/label";

interface RoleTableProps {
  roles: any[];
  permissions: any[];
  canWrite?: boolean;
  canAssignPermission?: boolean;
  onCreateRole: (role: { code: string; name: string }) => Promise<void>;
  onDeleteRole: (id: number) => Promise<void>;
  onAssignPermission: (roleId: number, permissionId: number) => Promise<void>;
  onRemovePermission: (roleId: number, permissionId: number) => Promise<void>;
}

// ── Groupe les permissions par resource (ex: "incident", "project") ──────────
function groupPermissions(permissions: any[]): Record<string, any[]> {
  const groups: Record<string, any[]> = {};
  for (const p of permissions) {
    const resource = p.code.includes(":") ? p.code.split(":")[0] : p.code;
    if (!groups[resource]) groups[resource] = [];
    groups[resource].push(p);
  }
  return groups;
}

// ── Panneau permissions d'un rôle ────────────────────────────────────────────
function RolePermissionsPanel({
  role,
  permissions,
  onAssignPermission,
  onRemovePermission,
}: {
  role: any;
  permissions: any[];
  onAssignPermission: (roleId: number, permissionId: number) => Promise<void>;
  onRemovePermission: (roleId: number, permissionId: number) => Promise<void>;
}) {
  const REQUEST_TIMEOUT_MS = 15000;
  const assignedFromProps = (role.rolePermissions ?? []).map((rp: any) => rp.permission_id);
  const [optimisticAssignedIds, setOptimisticAssignedIds] = useState<number[]>(assignedFromProps);
  const [loadingIds, setLoadingIds] = useState<Set<number>>(new Set());
  const [search, setSearch] = useState("");
  const [lastError, setLastError] = useState<string | null>(null);
  const inFlightIdsRef = useRef<Set<number>>(new Set());

  const withTimeout = async <T,>(promise: Promise<T>, ms: number): Promise<T> => {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        setTimeout(() => reject(new Error("Timeout: la requete API a depasse le delai.")), ms);
      }),
    ]);
  };

  useEffect(() => {
    setOptimisticAssignedIds(assignedFromProps);
  }, [role.rolePermissions]);

  const assignedIds = new Set<number>(optimisticAssignedIds);

  const filtered = search.trim()
    ? permissions.filter((p) => p.code.toLowerCase().includes(search.trim().toLowerCase()))
    : permissions;

  const groups = groupPermissions(filtered);

  const handleToggle = async (e: React.MouseEvent, permissionId: number, isAssigned: boolean) => {
    e.preventDefault();
    e.stopPropagation();
    if (inFlightIdsRef.current.has(permissionId)) return;
    setLastError(null);
    inFlightIdsRef.current.add(permissionId);
    setLoadingIds((prev) => new Set(prev).add(permissionId));
    setOptimisticAssignedIds((prev) =>
      isAssigned ? prev.filter((id) => id !== permissionId) : [...prev, permissionId]
    );
    try {
      if (isAssigned) {
        await withTimeout(onRemovePermission(role.id, permissionId), REQUEST_TIMEOUT_MS);
      } else {
        await withTimeout(onAssignPermission(role.id, permissionId), REQUEST_TIMEOUT_MS);
      }
    } catch (err) {
      console.error("[RolePermissionsPanel] toggle error", err);
      setLastError(err instanceof Error ? err.message : "Echec lors de l'assignation/revocation.");
      setOptimisticAssignedIds((prev) =>
        isAssigned ? [...prev, permissionId] : prev.filter((id) => id !== permissionId)
      );
    } finally {
      inFlightIdsRef.current.delete(permissionId);
      setLoadingIds((prev) => {
        const next = new Set(prev);
        next.delete(permissionId);
        return next;
      });
    }
  };

  return (
    <div className="mt-4 space-y-3 border-t border-gb-border pt-4">
      {/* Barre de recherche */}
      <input
        type="search"
        placeholder="Rechercher une permission…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full max-w-xs px-3 py-1.5 text-xs bg-gb-app border border-gb-border rounded-lg text-gb-text placeholder:text-gb-muted focus:outline-none focus:ring-1 focus:ring-gb-primary"
      />

      {/* Grille par resource */}
      <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
        {Object.entries(groups).map(([resource, perms]) => {
          const allAssigned = perms.every((p) => assignedIds.has(p.id));
          const someAssigned = perms.some((p) => assignedIds.has(p.id));
          return (
            <div key={resource} className="border border-gb-border rounded-xl overflow-hidden">
              {/* En-tête resource */}
              <div className="flex items-center justify-between px-3 py-2 bg-gb-surface-hover">
                <span className="text-xs font-bold text-gb-text uppercase tracking-wider">{resource}</span>
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                  allAssigned
                    ? "bg-emerald-500/15 text-emerald-600"
                    : someAssigned
                    ? "bg-amber-500/15 text-amber-500"
                    : "bg-gb-surface-solid text-gb-muted"
                }`}>
                  {perms.filter((p) => assignedIds.has(p.id)).length}/{perms.length}
                </span>
              </div>
              {/* Cases à cocher */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-1 p-2 bg-gb-surface-solid">
                {perms.map((p) => {
                  const isAssigned = assignedIds.has(p.id);
                  const isLoading = loadingIds.has(p.id);
                  const action = p.code.includes(":") ? p.code.split(":").slice(1).join(":") : p.code;
                  return (
                    <button
                      type="button"
                      key={p.id}
                      onClick={(e) => handleToggle(e, p.id, isAssigned)}
                      disabled={isLoading}
                      className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg select-none transition-colors text-xs font-medium text-left ${
                        isAssigned
                          ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/25 hover:bg-emerald-500/20"
                          : "bg-gb-app text-gb-muted border border-gb-border hover:bg-gb-surface-hover hover:text-gb-text"
                      } ${isLoading ? "opacity-60 cursor-wait" : ""}`}
                    >
                      {isLoading ? (
                        <Loader2 className="w-3.5 h-3.5 shrink-0 animate-spin" />
                      ) : (
                        <span className={`w-3.5 h-3.5 shrink-0 rounded border flex items-center justify-center ${
                          isAssigned ? "bg-emerald-500 border-emerald-500" : "border-gb-muted bg-gb-app"
                        }`}>
                          {isAssigned && <Check className="w-2.5 h-2.5 text-white" />}
                        </span>
                      )}
                      <span className="truncate">{action}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
        {Object.keys(groups).length === 0 && (
          <p className="text-xs text-gb-muted text-center py-4">Aucune permission trouvée.</p>
        )}
      </div>
      {lastError && (
        <p className="text-xs text-gb-danger bg-gb-danger/10 border border-gb-danger/30 rounded-md px-2 py-1">
          {lastError}
        </p>
      )}
    </div>
  );
}

// ── Composant principal ───────────────────────────────────────────────────────
export function RoleTable({
  roles,
  permissions,
  canWrite = false,
  canAssignPermission = false,
  onCreateRole,
  onDeleteRole,
  onAssignPermission,
  onRemovePermission,
}: RoleTableProps) {
  const [newRole, setNewRole] = useState({ code: "", name: "" });
  const [isAdding, setIsAdding] = useState(false);
  const [expandedRoleId, setExpandedRoleId] = useState<number | null>(null);

  const handleCreate = async () => {
    if (newRole.code && newRole.name) {
      await onCreateRole(newRole);
      setNewRole({ code: "", name: "" });
      setIsAdding(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Shield className="w-5 h-5 text-emerald-500" />
          Définition des Rôles
        </h3>
        {canWrite && (
          <Button size="sm" onClick={() => setIsAdding(!isAdding)} variant={isAdding ? "ghost" : "default"}>
            {isAdding ? "Annuler" : <><Plus className="w-4 h-4 mr-2" /> Nouveau Rôle</>}
          </Button>
        )}
      </div>

      {isAdding && (
        <Card className="bg-gb-surface-solid border-gb-border border-dashed border-2">
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Code du rôle</Label>
                <Input
                  placeholder="ex: PROJECT_MANAGER"
                  value={newRole.code}
                  onChange={(e) => setNewRole({ ...newRole, code: e.target.value.toUpperCase() })}
                  className="bg-gb-app border-gb-border"
                />
              </div>
              <div className="space-y-2">
                <Label>Nom descriptif</Label>
                <Input
                  placeholder="ex: Responsable de projet"
                  value={newRole.name}
                  onChange={(e) => setNewRole({ ...newRole, name: e.target.value })}
                  className="bg-gb-app border-gb-border"
                />
              </div>
            </div>
            <div className="mt-4 flex justify-end">
              <Button onClick={handleCreate} disabled={!newRole.code || !newRole.name}>
                Enregistrer le rôle
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-4">
        {roles.map((role) => {
          const isExpanded = expandedRoleId === role.id;
          const assignedCount = role.rolePermissions?.length ?? 0;

          return (
            <Card key={role.id} className="bg-gb-surface-solid border-gb-border overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gb-primary/10 rounded-lg">
                    <Shield className="w-5 h-5 text-gb-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-base font-bold tracking-tight">{role.code}</CardTitle>
                    <CardDescription>{role.name}</CardDescription>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {/* Badge compteur permissions */}
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-gb-primary/10 text-gb-primary border border-gb-primary/20">
                    {assignedCount} permission{assignedCount > 1 ? "s" : ""}
                  </span>

                  {/* Bouton gérer permissions */}
                  {canAssignPermission && (
                    <Button
                      size="sm"
                      variant={isExpanded ? "default" : "outline"}
                      className="text-xs h-8 gap-1.5"
                      onClick={() => setExpandedRoleId(isExpanded ? null : role.id)}
                    >
                      <Key className="w-3.5 h-3.5" />
                      {isExpanded ? "Fermer" : "Gérer"}
                      {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    </Button>
                  )}

                  {/* Supprimer rôle */}
                  {canWrite && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-gb-danger h-8 w-8"
                      onClick={() => onDeleteRole(role.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </CardHeader>

              <CardContent>
                {/* Badges permissions assignées */}
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {role.rolePermissions?.map((rp: any) => (
                    <Badge
                      key={rp.permission_id}
                      variant="outline"
                      className="bg-emerald-500/5 text-emerald-600 border-emerald-500/20 text-[11px] py-0.5"
                    >
                      <Check className="w-2.5 h-2.5 mr-1 shrink-0" />
                      {rp.permission?.code}
                    </Badge>
                  ))}
                  {assignedCount === 0 && (
                    <span className="text-xs text-gb-muted italic">Aucune permission assignée</span>
                  )}
                </div>

                {/* Panneau cases à cocher (accordéon) */}
                {isExpanded && canAssignPermission && (
                  <RolePermissionsPanel
                    role={role}
                    permissions={permissions}
                    onAssignPermission={onAssignPermission}
                    onRemovePermission={onRemovePermission}
                  />
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
