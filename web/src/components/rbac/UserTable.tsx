import React, { useState } from "react";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "../ui/table";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { UserPlus, Trash2, Shield, User as UserIcon, Plus, Pencil } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../ui/dialog";
import { Label } from "../ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Input } from "../ui/input";

const MATRICULE_REGEX = /^[A-Z]{2}[0-9]+$/;
const PHONE_REGEX = /^[0-9]+$/;

interface UserTableProps {
  users: any[];
  roles: any[];
  canAssign?: boolean;
  canCreate?: boolean;
  canUpdate?: boolean;
  canDelete?: boolean;
  onAssignRole: (userId: number, roleId: number) => Promise<void>;
  onRemoveRole: (userId: number, roleId: number) => Promise<void>;
  onCreateUser?: (payload: any) => Promise<void>;
  onUpdateUser?: (userId: number, payload: any) => Promise<void>;
  onDeleteUser?: (userId: number) => Promise<void>;
}

const defaultForm = {
  firstname: "",
  lastname: "",
  email: "",
  username: "",
  matricule: "",
  phone: "",
  status: "ACTIVE",
  password: "",
  confirmPassword: "",
  roleId: ""
};

export function UserTable({
  users,
  roles,
  canAssign = false,
  canCreate = false,
  canUpdate = false,
  canDelete = false,
  onAssignRole,
  onRemoveRole,
  onCreateUser,
  onUpdateUser,
  onDeleteUser
}: UserTableProps) {
  const formatRoleLabel = (role: any) => {
    const code = role?.code ? String(role.code).trim() : "";
    const name = role?.name ? String(role.name).trim() : "";
    if (code && name) return `${code} - ${name}`;
    if (name) return name;
    if (code) return code;
    return `Role #${role?.id ?? "?"}`;
  };

  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [roleToAssign, setRoleToAssign] = useState<string>("");
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [isUserDialogOpen, setIsUserDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [userForm, setUserForm] = useState<any>(defaultForm);
  const [formError, setFormError] = useState<string>("");

  const handleOpenAssign = (user: any) => {
    setSelectedUser(user);
    setRoleToAssign("");
    setIsAssignDialogOpen(true);
  };

  const handleConfirmAssign = async () => {
    if (selectedUser && roleToAssign) {
      await onAssignRole(selectedUser.id, parseInt(roleToAssign));
      setIsAssignDialogOpen(false);
      setSelectedUser(null);
    }
  };

  const openCreateUser = () => {
    setEditingUser(null);
    setUserForm(defaultForm);
    setFormError("");
    setIsUserDialogOpen(true);
  };

  const openEditUser = (user: any) => {
    setEditingUser(user);
    setUserForm({
      firstname: user.firstname ?? "",
      lastname: user.lastname ?? "",
      email: user.email ?? "",
      username: user.username ?? "",
      matricule: user.matricule ?? "",
      phone: user.phone ?? "",
      status: user.status ?? "ACTIVE",
      password: "",
      confirmPassword: "",
      roleId: user.userRoles?.[0]?.role_id ? String(user.userRoles[0].role_id) : ""
    });
    setFormError("");
    setIsUserDialogOpen(true);
  };

  const handleSaveUser = async () => {
    setFormError("");

    const normalizedMatricule = String(userForm.matricule ?? "").trim().toUpperCase();
    const normalizedPhone = String(userForm.phone ?? "").trim();
    const password = String(userForm.password ?? "");
    const confirmPassword = String(userForm.confirmPassword ?? "");
    const hasPasswordInput = password.trim() !== "" || confirmPassword.trim() !== "";

    if (!MATRICULE_REGEX.test(normalizedMatricule)) {
      setFormError("Le matricule doit respecter le format: 2 lettres majuscules suivies de chiffres (ex: DL1748).");
      return;
    }

    if (normalizedPhone && !PHONE_REGEX.test(normalizedPhone)) {
      setFormError("Le telephone doit contenir uniquement des chiffres.");
      return;
    }

    if (!editingUser && roles.length > 0 && !userForm.roleId) {
      setFormError("Le role initial est obligatoire.");
      return;
    }

    if (!editingUser || hasPasswordInput) {
      if (!password.trim() || !confirmPassword.trim()) {
        setFormError("Les champs mot de passe et confirmation sont obligatoires.");
        return;
      }
      if (password.length < 8) {
        setFormError("Le mot de passe doit contenir au moins 8 caracteres.");
        return;
      }
      if (password !== confirmPassword) {
        setFormError("Le mot de passe et la confirmation doivent etre identiques.");
        return;
      }
    }

    const payload: any = {
      firstname: userForm.firstname,
      lastname: userForm.lastname,
      email: userForm.email,
      username: userForm.username,
      matricule: normalizedMatricule,
      phone: normalizedPhone,
      status: userForm.status
    };

    if (password.trim()) {
      payload.password = password;
      payload.confirmPassword = confirmPassword;
    }

    if (!editingUser) {
      if (!onCreateUser) return;
      if (userForm.roleId) payload.roleId = Number(userForm.roleId);
      await onCreateUser(payload);
    } else {
      if (!onUpdateUser) return;
      await onUpdateUser(editingUser.id, payload);
      if (userForm.roleId) {
        const selectedRoleId = Number(userForm.roleId);
        const alreadyAssigned = Array.isArray(editingUser.userRoles)
          ? editingUser.userRoles.some((ur: any) => Number(ur.role_id) === selectedRoleId)
          : false;
        if (!alreadyAssigned) {
          await onAssignRole(editingUser.id, selectedRoleId);
        }
      }
    }

    setIsUserDialogOpen(false);
    setEditingUser(null);
    setUserForm(defaultForm);
  };

  const handleDeleteUser = async (user: any) => {
    if (!onDeleteUser) return;
    const confirmed = window.confirm(`Archiver l'utilisateur ${user.firstname} ${user.lastname} ?`);
    if (!confirmed) return;
    await onDeleteUser(user.id);
  };

  const canSubmitUser =
    !!userForm.firstname?.trim() &&
    !!userForm.lastname?.trim() &&
    !!userForm.email?.trim() &&
    !!userForm.username?.trim() &&
    !!userForm.matricule?.trim() &&
    (!userForm.phone?.trim() || PHONE_REGEX.test(userForm.phone.trim())) &&
    MATRICULE_REGEX.test(String(userForm.matricule ?? "").trim().toUpperCase()) &&
    (!!editingUser || (!!userForm.password?.trim() && !!userForm.confirmPassword?.trim())) &&
    (editingUser || userForm.password === userForm.confirmPassword) &&
    ((editingUser && !userForm.password?.trim() && !userForm.confirmPassword?.trim()) || !editingUser || userForm.password.length >= 8) &&
    (editingUser ? true : (roles.length === 0 || !!userForm.roleId));

  const roleOptions = (() => {
    const options = [...roles];
    if (editingUser && userForm.roleId) {
      const selectedRoleId = Number(userForm.roleId);
      const exists = options.some((r: any) => Number(r.id) === selectedRoleId);
      if (!exists) {
        const fallback = editingUser.userRoles?.find((ur: any) => Number(ur.role_id) === selectedRoleId)?.role;
        options.push({ id: selectedRoleId, code: fallback?.code, name: fallback?.name });
      }
    }
    return options;
  })();

  const selectedRoleLabel = (() => {
    if (!userForm.roleId) return "";
    const selected = roleOptions.find((r: any) => String(r.id) === String(userForm.roleId));
    if (!selected) return "";
    return formatRoleLabel(selected);
  })();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <UserIcon className="w-5 h-5 text-gb-primary" />
          Utilisateurs & Rôles
        </h3>
        {canCreate && (
          <Button size="sm" onClick={openCreateUser}>
            <Plus className="w-4 h-4 mr-2" />
            Nouvel utilisateur
          </Button>
        )}
      </div>

      <div className="rounded-md border border-gb-border bg-gb-surface-solid overflow-hidden overflow-x-auto no-scrollbar">
        <Table className="min-w-[600px] md:min-w-full">
          <TableHeader>
            <TableRow className="bg-gb-surface-hover/50 hover:bg-gb-surface-hover/50">
              <TableHead className="w-[300px]">Utilisateur</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead>Rôles</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-10 text-gb-muted">
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
                    <Badge
                      variant="secondary"
                      className={u.status === "ACTIVE" ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" : "bg-amber-500/10 text-amber-500 border-amber-500/20"}
                    >
                      {u.status || "INCONNU"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1.5">
                      {u.userRoles?.map((ur: any) => (
                        <Badge 
                          key={ur.id} 
                          variant="secondary" 
                          className="bg-gb-primary/10 text-gb-primary border-gb-primary/20 flex items-center gap-1 hover:bg-gb-primary/20 transition-colors"
                        >
                          <Shield className="w-3 h-3" />
                          {ur.role?.name || ur.role?.code}
                          {canAssign && (
                            <button 
                              onClick={() => onRemoveRole(u.id, ur.role_id)}
                              className="ml-1 hover:text-gb-danger transition-colors text-gb-muted"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          )}
                        </Badge>
                      ))}
                      {(!u.userRoles || u.userRoles.length === 0) && (
                        <span className="text-xs text-gb-muted italic">Aucun rôle</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      {canAssign && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="flex items-center gap-2"
                          onClick={() => handleOpenAssign(u)}
                        >
                          <UserPlus className="w-4 h-4" />
                          Assigner
                        </Button>
                      )}
                      {canUpdate && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="flex items-center gap-2"
                          onClick={() => openEditUser(u)}
                        >
                          <Pencil className="w-4 h-4" />
                          Modifier
                        </Button>
                      )}
                      {canDelete && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-gb-danger hover:text-gb-danger flex items-center gap-2"
                          onClick={() => handleDeleteUser(u)}
                        >
                          <Trash2 className="w-4 h-4" />
                          Supprimer
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
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
              <Select value={roleToAssign} onValueChange={(val) => val && setRoleToAssign(val)}>
                <SelectTrigger id="role" className="bg-gb-app border-gb-border">
                  <SelectValue placeholder="Choisir un rôle...">
                    {roleToAssign
                      ? (() => { const r = roles.find((r: any) => r.id.toString() === roleToAssign); return r ? `${r.code} - ${r.name}` : "Choisir un rôle..."; })()
                      : undefined}
                  </SelectValue>
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
            <Button variant="ghost" onClick={() => setIsAssignDialogOpen(false)}>Annuler</Button>
            <Button onClick={handleConfirmAssign} disabled={!roleToAssign}>Confirmer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isUserDialogOpen} onOpenChange={setIsUserDialogOpen}>
        <DialogContent className="sm:max-w-2xl bg-gb-surface-solid border-gb-border">
          <DialogHeader>
            <DialogTitle>{editingUser ? "Modifier un utilisateur" : "Creer un utilisateur"}</DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-2">
            <div className="space-y-2">
              <Label>Prenom <span className="text-gb-danger">*</span></Label>
              <Input
                value={userForm.firstname}
                onChange={(e) => setUserForm((prev: any) => ({ ...prev, firstname: e.target.value }))}
                className="bg-gb-app border-gb-border"
              />
            </div>
            <div className="space-y-2">
              <Label>Nom <span className="text-gb-danger">*</span></Label>
              <Input
                value={userForm.lastname}
                onChange={(e) => setUserForm((prev: any) => ({ ...prev, lastname: e.target.value }))}
                className="bg-gb-app border-gb-border"
              />
            </div>
            <div className="space-y-2">
              <Label>Email <span className="text-gb-danger">*</span></Label>
              <Input
                type="email"
                value={userForm.email}
                onChange={(e) => setUserForm((prev: any) => ({ ...prev, email: e.target.value }))}
                className="bg-gb-app border-gb-border"
              />
            </div>
            <div className="space-y-2">
              <Label>Nom d'utilisateur <span className="text-gb-danger">*</span></Label>
              <Input
                value={userForm.username}
                onChange={(e) => setUserForm((prev: any) => ({ ...prev, username: e.target.value }))}
                className="bg-gb-app border-gb-border"
              />
            </div>
            <div className="space-y-2">
              <Label>Matricule <span className="text-gb-danger">*</span></Label>
              <Input
                value={userForm.matricule}
                onChange={(e) => setUserForm((prev: any) => ({ ...prev, matricule: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "") }))}
                className="bg-gb-app border-gb-border"
                placeholder="Ex: DL1748"
              />
            </div>
            <div className="space-y-2">
              <Label>Telephone</Label>
              <Input
                value={userForm.phone}
                onChange={(e) => setUserForm((prev: any) => ({ ...prev, phone: e.target.value.replace(/\D/g, "") }))}
                className="bg-gb-app border-gb-border"
                inputMode="numeric"
                pattern="[0-9]*"
                placeholder="Ex: 0612345678"
              />
            </div>
            <div className="space-y-2">
              <Label>{editingUser ? "Nouveau mot de passe (optionnel)" : "Mot de passe"} <span className="text-gb-danger">*</span></Label>
              <Input
                type="password"
                value={userForm.password}
                onChange={(e) => setUserForm((prev: any) => ({ ...prev, password: e.target.value }))}
                className="bg-gb-app border-gb-border"
              />
            </div>
            <div className="space-y-2">
              <Label>Confirmation mot de passe <span className="text-gb-danger">*</span></Label>
              <Input
                type="password"
                value={userForm.confirmPassword}
                onChange={(e) => setUserForm((prev: any) => ({ ...prev, confirmPassword: e.target.value }))}
                className="bg-gb-app border-gb-border"
              />
            </div>
            <div className="space-y-2">
              <Label>Statut</Label>
              <Select value={userForm.status} onValueChange={(value) => setUserForm((prev: any) => ({ ...prev, status: value }))}>
                <SelectTrigger className="bg-gb-app border-gb-border">
                  <SelectValue placeholder="Selectionner un statut" />
                </SelectTrigger>
                <SelectContent className="bg-gb-surface-solid border-gb-border">
                  <SelectItem value="ACTIVE">ACTIVE</SelectItem>
                  <SelectItem value="INACTIVE">INACTIVE</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {editingUser && (
              <div className="space-y-2">
                <Label>Role</Label>
                <Select value={userForm.roleId} onValueChange={(value) => setUserForm((prev: any) => ({ ...prev, roleId: value }))}>
                  <SelectTrigger className="bg-gb-app border-gb-border w-full">
                    <SelectValue placeholder={roleOptions.length > 0 ? "Selectionner un role" : "Aucun role disponible"}>
                      {selectedRoleLabel}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent className="bg-gb-surface-solid border-gb-border">
                    {roleOptions.map((r) => (
                      <SelectItem key={r.id} value={r.id.toString()}>
                        {formatRoleLabel(r)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {!editingUser && (
              <div className="space-y-2">
                <Label>Role initial <span className="text-gb-danger">*</span></Label>
                <Select value={userForm.roleId} onValueChange={(value) => setUserForm((prev: any) => ({ ...prev, roleId: value }))}>
                  <SelectTrigger className="bg-gb-app border-gb-border w-full">
                    <SelectValue placeholder={roleOptions.length > 0 ? "Selectionner un role" : "Aucun role disponible"}>
                      {selectedRoleLabel}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent className="bg-gb-surface-solid border-gb-border">
                    {roleOptions.map((r) => (
                      <SelectItem key={r.id} value={r.id.toString()}>
                        {formatRoleLabel(r)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {formError && (
              <div className="md:col-span-2 text-sm text-gb-danger bg-gb-danger/10 border border-gb-danger/20 rounded-md px-3 py-2">
                {formError}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsUserDialogOpen(false)}>Annuler</Button>
            <Button onClick={handleSaveUser} disabled={!canSubmitUser}>
              {editingUser ? "Enregistrer" : "Creer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
