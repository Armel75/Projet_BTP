import React, { useState } from "react";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "../ui/table";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { UserPlus, Trash2, Shield, User as UserIcon } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../ui/dialog";
import { Label } from "../ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";

interface UserTableProps {
  users: any[];
  roles: any[];
  onAssignRole: (userId: number, roleId: number) => Promise<void>;
  onRemoveRole: (userId: number, roleId: number) => Promise<void>;
}

export function UserTable({ users, roles, onAssignRole, onRemoveRole }: UserTableProps) {
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [roleToAssign, setRoleToAssign] = useState<string>("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const handleOpenAssign = (user: any) => {
    setSelectedUser(user);
    setRoleToAssign("");
    setIsDialogOpen(true);
  };

  const handleConfirmAssign = async () => {
    if (selectedUser && roleToAssign) {
      await onAssignRole(selectedUser.id, parseInt(roleToAssign));
      setIsDialogOpen(false);
      setSelectedUser(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <UserIcon className="w-5 h-5 text-gb-primary" />
          Utilisateurs & Rôles
        </h3>
      </div>

      <div className="rounded-md border border-gb-border bg-gb-surface-solid overflow-hidden overflow-x-auto no-scrollbar">
        <Table className="min-w-[600px] md:min-w-full">
          <TableHeader>
            <TableRow className="bg-gb-surface-hover/50 hover:bg-gb-surface-hover/50">
              <TableHead className="w-[300px]">Utilisateur</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Rôles</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-10 text-gb-muted">
                  Aucun utilisateur trouvé.
                </TableCell>
              </TableRow>
            ) : (
              users.map((u) => (
                <TableRow key={u.id} className="group transition-colors border-gb-border/50">
                  <TableCell>
                    <div className="font-medium">{u.firstname} {u.lastname}</div>
                  </TableCell>
                  <TableCell className="text-gb-muted font-mono text-xs">{u.email}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1.5">
                      {u.userRoles?.map((ur: any) => (
                        <Badge 
                          key={ur.id} 
                          variant="secondary" 
                          className="bg-gb-primary/10 text-gb-primary border-gb-primary/20 flex items-center gap-1 hover:bg-gb-primary/20 transition-colors"
                        >
                          <Shield className="w-3 h-3" />
                          {ur.role?.code}
                          <button 
                            onClick={() => onRemoveRole(u.id, ur.role_id)}
                            className="ml-1 hover:text-gb-danger transition-colors text-gb-muted"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </Badge>
                      ))}
                      {(!u.userRoles || u.userRoles.length === 0) && (
                        <span className="text-xs text-gb-muted italic">Aucun rôle</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="opacity-0 group-hover:opacity-100 flex items-center gap-2"
                      onClick={() => handleOpenAssign(u)}
                    >
                      <UserPlus className="w-4 h-4" />
                      Assigner
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md bg-gb-surface-solid border-gb-border">
          <DialogHeader>
            <DialogTitle>Assigner un rôle</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Utilisateur</Label>
              <div className="p-2 bg-gb-app/50 border border-gb-border rounded text-sm">
                {selectedUser?.firstname} {selectedUser?.lastname} ({selectedUser?.email})
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">Sélectionner un rôle</Label>
              <Select value={roleToAssign} onValueChange={setRoleToAssign}>
                <SelectTrigger id="role" className="bg-gb-app border-gb-border">
                  <SelectValue placeholder="Choisir un rôle..." />
                </SelectTrigger>
                <SelectContent className="bg-gb-surface-solid border-gb-border">
                  {roles.map((r) => (
                    <SelectItem key={r.id} value={r.id.toString()}>
                      {r.code} - {r.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsDialogOpen(false)}>Annuler</Button>
            <Button onClick={handleConfirmAssign} disabled={!roleToAssign}>Confirmer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
