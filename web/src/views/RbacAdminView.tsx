import React, { useEffect, useState } from "react";
import { apiFetch, API_BASE } from "../lib/api";
import { usePermissions, useAuth } from "../contexts/AuthContext";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../components/ui/tabs";
import { UserTable } from "../components/rbac/UserTable";
import { RoleTable } from "../components/rbac/RoleTable";
import { PermissionTable } from "../components/rbac/PermissionTable";
import { ShieldCheck, Users, Key, Loader2, AlertCircle } from "lucide-react";
import { motion } from "motion/react";

export default function RbacAdminView() {
  const { can } = usePermissions();
  const { loading: authLoading } = useAuth();
  const [users, setUsers] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [permissions, setPermissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const fetches: Promise<Response>[] = [];
      const keys: string[] = [];

      if (can("user:read"))       { fetches.push(apiFetch(`${API_BASE}/rbac/users`));       keys.push("users"); }
      if (can("role:read"))       { fetches.push(apiFetch(`${API_BASE}/rbac/roles`));       keys.push("roles"); }
      if (can("permission:read")) { fetches.push(apiFetch(`${API_BASE}/rbac/permissions`)); keys.push("permissions"); }

      const results = await Promise.all(fetches);
      for (let i = 0; i < results.length; i++) {
        if (!results[i].ok) throw new Error("Erreur lors de la récupération des données");
        const data = await results[i].json();
        if (keys[i] === "users")       setUsers(data);
        if (keys[i] === "roles")       setRoles(data);
        if (keys[i] === "permissions") setPermissions(data);
      }
    } catch (e: any) {
      setError(e.message);
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading) fetchData();
  }, [authLoading]);

  // API Wrapper — uses apiFetch for consistent auth/proxy handling
  const callApi = async (path: string, method: string, body?: any) => {
    try {
      const res = await apiFetch(`${API_BASE}${path}`, {
        method,
        headers: { "Content-Type": "application/json" },
        body: body ? JSON.stringify(body) : undefined
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Une erreur est survenue");
      }
      await fetchData();
    } catch (e: any) {
      alert(e.message);
    }
  };

  if (loading && users.length === 0 && roles.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full space-y-4">
        <Loader2 className="w-8 h-8 text-gb-primary animate-spin" />
        <p className="text-gb-muted text-sm font-medium">Chargement des paramètres de sécurité...</p>
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8 pb-12"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-gb-text">Gestion des Accès</h2>
          <p className="text-gb-muted mt-1">Configurez les rôles, les permissions et contrôlez les accès utilisateurs.</p>
        </div>
      </div>

      {error && (
        <div className="bg-gb-danger/10 border border-gb-danger/20 p-4 rounded-lg flex items-center gap-3 text-gb-danger">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <p className="text-sm font-medium">{error}</p>
          <button onClick={fetchData} className="ml-auto underline text-xs">Réessayer</button>
        </div>
      )}

      <Tabs defaultValue="users" className="space-y-6">
        <TabsList className="bg-gb-surface-solid border border-gb-border p-1 h-auto grid grid-cols-3 gap-1 inline-flex w-full sm:w-auto">
          <TabsTrigger value="users" className="data-[state=active]:bg-gb-app data-[state=active]:shadow-sm px-6 py-2 bg-transparent">
            <Users className="w-4 h-4 mr-2" />
            Utilisateurs
          </TabsTrigger>
          <TabsTrigger value="roles" className="data-[state=active]:bg-gb-app data-[state=active]:shadow-sm px-6 py-2 bg-transparent">
            <ShieldCheck className="w-4 h-4 mr-2" />
            Rôles
          </TabsTrigger>
          <TabsTrigger value="permissions" className="data-[state=active]:bg-gb-app data-[state=active]:shadow-sm px-6 py-2 bg-transparent">
            <Key className="w-4 h-4 mr-2" />
            Permissions
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="mt-0 focus-visible:outline-none">
          {can("user:read") ? (
            <UserTable 
              users={users}
              roles={roles}
              canAssign={can("user:assign-role")}
              canCreate={can("user:create")}
              canUpdate={can("user:update")}
              canDelete={can("user:delete")}
              onCreateUser={(payload) => callApi("/rbac/users", "POST", payload)}
              onUpdateUser={(uId, payload) => callApi(`/rbac/users/${uId}`, "PUT", payload)}
              onDeleteUser={(uId) => callApi(`/rbac/users/${uId}`, "DELETE")}
              onAssignRole={(uId, rId) => callApi(`/rbac/users/${uId}/roles`, "POST", { roleId: rId })}
              onRemoveRole={(uId, rId) => callApi(`/rbac/users/${uId}/roles/${rId}`, "DELETE")}
            />
          ) : (
            <div className="flex items-center gap-3 p-6 rounded-lg border border-gb-border bg-gb-surface-solid text-gb-muted">
              <AlertCircle className="w-5 h-5 shrink-0 text-gb-warning" />
              <span className="text-sm">Vous n'avez pas la permission <code className="bg-gb-app px-1 rounded text-xs">user:read</code> pour accéder à cette section.</span>
            </div>
          )}
        </TabsContent>

        <TabsContent value="roles" className="mt-0 focus-visible:outline-none">
          {can("role:read") ? (
            <RoleTable 
              roles={roles} 
              permissions={permissions}
              canWrite={can("role:create")}
              canAssignPermission={can("role:assign-permission")}
              onCreateRole={(r) => callApi("/rbac/roles", "POST", r)}
              onDeleteRole={(id) => callApi(`/rbac/roles/${id}`, "DELETE")}
              onAssignPermission={(rId, pId) => callApi(`/rbac/roles/${rId}/permissions`, "POST", { permissionId: pId })}
              onRemovePermission={(rId, pId) => callApi(`/rbac/roles/${rId}/permissions/${pId}`, "DELETE")}
            />
          ) : (
            <div className="flex items-center gap-3 p-6 rounded-lg border border-gb-border bg-gb-surface-solid text-gb-muted">
              <AlertCircle className="w-5 h-5 shrink-0 text-gb-warning" />
              <span className="text-sm">Vous n'avez pas la permission <code className="bg-gb-app px-1 rounded text-xs">role:read</code> pour accéder à cette section.</span>
            </div>
          )}
        </TabsContent>

        <TabsContent value="permissions" className="mt-0 focus-visible:outline-none">
          {can("permission:read") ? (
            <PermissionTable 
              permissions={permissions}
              canWrite={can("permission:create")}
              onCreatePermission={(p) => callApi("/rbac/permissions", "POST", p)}
              onDeletePermission={(id) => callApi(`/rbac/permissions/${id}`, "DELETE")}
            />
          ) : (
            <div className="flex items-center gap-3 p-6 rounded-lg border border-gb-border bg-gb-surface-solid text-gb-muted">
              <AlertCircle className="w-5 h-5 shrink-0 text-gb-warning" />
              <span className="text-sm">Vous n'avez pas la permission <code className="bg-gb-app px-1 rounded text-xs">permission:read</code> pour accéder à cette section.</span>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </motion.div>
  );
}
