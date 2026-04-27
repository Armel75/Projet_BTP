import React, { useState } from "react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Key, Plus, Trash2, Search, Filter } from "lucide-react";
import { Badge } from "../ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "../ui/card";
import { Label } from "../ui/label";

interface PermissionTableProps {
  permissions: any[];
  onCreatePermission: (perm: { code: string; label: string }) => Promise<void>;
  onDeletePermission: (id: number) => Promise<void>;
}

export function PermissionTable({ permissions, onCreatePermission, onDeletePermission }: PermissionTableProps) {
  const [newPerm, setNewPerm] = useState({ code: "", label: "" });
  const [search, setSearch] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  const handleCreate = async () => {
    if (newPerm.code && newPerm.label) {
      await onCreatePermission(newPerm);
      setNewPerm({ code: "", label: "" });
      setIsAdding(false);
    }
  };

  const filteredPermissions = permissions.filter(p => 
    p.code.toLowerCase().includes(search.toLowerCase()) || 
    p.label.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <h3 className="text-lg font-semibold flex items-center gap-2 shrink-0">
          <Key className="w-5 h-5 text-amber-500" />
          Répertoire des Permissions
        </h3>
        
        <div className="flex-1 max-w-sm relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gb-muted" />
          <Input 
            placeholder="Rechercher une permission..." 
            className="pl-9 bg-gb-surface-solid border-gb-border"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <Button size="sm" onClick={() => setIsAdding(!isAdding)}>
          {isAdding ? "Annuler" : <><Plus className="w-4 h-4 mr-2" /> Nouvelle</>}
        </Button>
      </div>

      {isAdding && (
        <Card className="bg-gb-surface-solid border-gb-border border-dashed border-2">
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4 items-end">
              <div className="flex-1 space-y-2">
                <Label>Code</Label>
                <Input 
                  placeholder="ex: PROJECTS_EDIT" 
                  value={newPerm.code}
                  onChange={(e) => setNewPerm({ ...newPerm, code: e.target.value.toUpperCase() })}
                  className="bg-gb-app border-gb-border"
                />
              </div>
              <div className="flex-1 space-y-2">
                <Label>Description</Label>
                <Input 
                  placeholder="ex: Modifier les détails du projet" 
                  value={newPerm.label}
                  onChange={(e) => setNewPerm({ ...newPerm, label: e.target.value })}
                  className="bg-gb-app border-gb-border"
                />
              </div>
              <Button onClick={handleCreate} disabled={!newPerm.code || !newPerm.label}>
                Ajouter
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {filteredPermissions.map((p) => (
          <div 
            key={p.id} 
            className="group p-3 rounded-lg border border-gb-border bg-gb-surface-solid hover:bg-gb-surface-hover/30 transition-all hover:shadow-sm flex flex-col justify-between"
          >
            <div className="flex items-start justify-between">
              <Badge variant="secondary" className="font-mono text-[10px] tracking-wider bg-gb-primary/5 text-gb-primary border-gb-primary/10">
                {p.code}
              </Badge>
              <button 
                onClick={() => onDeletePermission(p.id)}
                className="text-gb-muted opacity-0 group-hover:opacity-100 hover:text-gb-danger transition-all"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="mt-2 text-xs text-gb-muted leading-relaxed line-clamp-2" title={p.label}>
              {p.label}
            </div>
          </div>
        ))}
        {filteredPermissions.length === 0 && (
          <div className="col-span-full py-20 text-center text-gb-muted">
            Aucun résultat pour "{search}"
          </div>
        )}
      </div>
    </div>
  );
}
