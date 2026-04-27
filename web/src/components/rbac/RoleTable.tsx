import React, { useState } from "react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Badge } from "../ui/badge";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "../ui/card";
import { Shield, Plus, Trash2, Key, ChevronRight } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Label } from "../ui/label";

interface RoleTableProps {
  roles: any[];
  permissions: any[];
  onCreateRole: (role: { code: string; name: string }) => Promise<void>;
  onDeleteRole: (id: number) => Promise<void>;
  onAssignPermission: (roleId: number, permissionId: number) => Promise<void>;
  onRemovePermission: (roleId: number, permissionId: number) => Promise<void>;
}

export function RoleTable({ 
  roles, 
  permissions, 
  onCreateRole, 
  onDeleteRole, 
  onAssignPermission, 
  onRemovePermission 
}: RoleTableProps) {
  const [newRole, setNewRole] = useState({ code: "", name: "" });
  const [isAdding, setIsAdding] = useState(false);

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
        <Button size="sm" onClick={() => setIsAdding(!isAdding)} variant={isAdding ? "ghost" : "default"}>
          {isAdding ? "Annuler" : <><Plus className="w-4 h-4 mr-2" /> Nouveau Rôle</>}
        </Button>
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
        {roles.map((role) => (
          <Card key={role.id} className="bg-gb-surface-solid border-gb-border group overflow-hidden">
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
              <Button 
                variant="ghost" 
                size="icon" 
                className="text-gb-danger opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => onDeleteRole(role.id)}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </CardHeader>
            <CardContent>
              <div className="mt-2 space-y-3">
                <div className="flex items-center gap-2 text-xs font-semibold text-gb-muted uppercase tracking-wider">
                  <Key className="w-3 h-3" />
                  Permissions associées
                </div>
                <div className="flex flex-wrap gap-2">
                  {role.rolePermissions?.map((rp: any) => (
                    <Badge 
                      key={rp.permission_id} 
                      variant="outline" 
                      className="bg-emerald-500/5 text-emerald-600 border-emerald-500/20 hover:bg-emerald-500/10 transition-colors flex items-center gap-1 py-1"
                    >
                      {rp.permission?.code}
                      <button 
                        onClick={() => onRemovePermission(role.id, rp.permission_id)}
                        className="ml-1 hover:text-gb-danger"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                  <div className="flex items-center gap-2 ml-auto">
                    <Select onValueChange={(val) => onAssignPermission(role.id, parseInt(val))} value="">
                      <SelectTrigger className="h-8 w-[140px] text-xs bg-gb-app border-gb-border">
                        <SelectValue placeholder="+ Ajouter" />
                      </SelectTrigger>
                      <SelectContent className="bg-gb-surface-solid border-gb-border">
                        {permissions.map((p) => (
                          <SelectItem key={p.id} value={p.id.toString()}>{p.code}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
