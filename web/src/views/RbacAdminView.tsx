import React, { useEffect, useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../components/ui/tabs";
import { UserTable } from "../components/rbac/UserTable";
import { RoleTable } from "../components/rbac/RoleTable";
import { PermissionTable } from "../components/rbac/PermissionTable";
import { ShieldCheck, Users, Key, Loader2, AlertCircle } from "lucide-react";
import { motion } from "motion/react";

export default function RbacAdminView() {
  const [users, setUsers] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [permissions, setPermissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    const token = localStorage.getItem("token");
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const [uRes, rRes, pRes] = await Promise.all([
        fetch("/api/rbac/users", { headers: { Authorization: `Bearer ${token}` } }),
        fetch("/api/rbac/roles", { headers: { Authorization: `Bearer ${token}` } }),
        fetch("/api/rbac/permissions", { headers: { Authorization: `Bearer ${token}` } })
      ]);

      if (!uRes.ok || !rRes.ok || !pRes.ok) throw new Error("Erreur lors de la récupération des données");

      setUsers(await uRes.json());
      setRoles(await rRes.json());
      setPermissions(await pRes.json());
    } catch (e: any) {
      setError(e.message);
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // API Wrapper
  const callApi = async (url: string, method: string, body?: any) => {
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(url, {
        method,
        headers: { 
          "Content-Type": "application/json", 
          Authorization: `Bearer ${token}` 
        },
        body: body ? JSON.stringify(body) : undefined
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Une erreur est survenue");
      }
      await fetchData();
    } catch (e: any) {
      alert(e.message);
    }
  };

  if (loading && users.length === 0) {
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
          <UserTable 
            users={users} 
            roles={roles} 
            onAssignRole={(uId, rId) => callApi(`/api/rbac/users/${uId}/roles`, "POST", { roleId: rId })}
            onRemoveRole={(uId, rId) => callApi(`/api/rbac/users/${uId}/roles/${rId}`, "DELETE")}
          />
        </TabsContent>

        <TabsContent value="roles" className="mt-0 focus-visible:outline-none">
          <RoleTable 
            roles={roles} 
            permissions={permissions}
            onCreateRole={(r) => callApi("/api/rbac/roles", "POST", r)}
            onDeleteRole={(id) => callApi(`/api/rbac/roles/${id}`, "DELETE")}
            onAssignPermission={(rId, pId) => callApi(`/api/rbac/roles/${rId}/permissions`, "POST", { permissionId: pId })}
            onRemovePermission={(rId, pId) => callApi(`/api/rbac/roles/${rId}/permissions/${pId}`, "DELETE")}
          />
        </TabsContent>

        <TabsContent value="permissions" className="mt-0 focus-visible:outline-none">
          <PermissionTable 
            permissions={permissions}
            onCreatePermission={(p) => callApi("/api/rbac/permissions", "POST", p)}
            onDeletePermission={(id) => callApi(`/api/rbac/permissions/${id}`, "DELETE")}
          />
        </TabsContent>
      </Tabs>
    </motion.div>
  );
}
