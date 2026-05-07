import React, { useEffect, useState } from "react";
import { apiFetch, API_BASE } from "../../lib/api";
import {
  Users,
  Plus,
  Search,
  Loader2,
  Building2,
  Mail,
  Phone,
  ShieldCheck,
  Pencil,
  Trash2,
  MapPin,
  FileBadge2,
} from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Badge } from "../ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { motion } from "motion/react";
import SupplierFormDialog, { SupplierRecord } from "./SupplierFormDialog";

export default function SupplierModule() {
  const [suppliers, setSuppliers] = useState<SupplierRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [supplierToEdit, setSupplierToEdit] = useState<SupplierRecord | null>(null);
  const [supplierToDelete, setSupplierToDelete] = useState<SupplierRecord | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const fetchSuppliers = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch(`${API_BASE}/procurement/suppliers`);
      if (res.ok) {
        setSuppliers(await res.json());
      } else {
        throw new Error("Erreur lors du chargement des fournisseurs");
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const filteredSuppliers = suppliers.filter((supplier) => {
    const q = searchTerm.toLowerCase();
    return [
      supplier.name,
      supplier.contact_name || "",
      supplier.email || "",
      supplier.phone || "",
      supplier.specialty || "",
      supplier.siret || "",
    ].some((value) => value.toLowerCase().includes(q));
  });

  const openCreateDialog = () => {
    setSupplierToEdit(null);
    setActionError(null);
    setDialogOpen(true);
  };

  const openEditDialog = (supplier: SupplierRecord) => {
    setSupplierToEdit(supplier);
    setActionError(null);
    setDialogOpen(true);
  };

  const handleDeleteSupplier = async () => {
    if (!supplierToDelete) return;

    setDeletingId(supplierToDelete.id);
    setActionError(null);
    try {
      const res = await apiFetch(`${API_BASE}/procurement/suppliers/${supplierToDelete.id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message || body.error || `Erreur ${res.status}`);
      }

      setSupplierToDelete(null);
      await fetchSuppliers();
    } catch (err: any) {
      setActionError(err?.message || "Suppression impossible.");
    } finally {
      setDeletingId(null);
    }
  };

  const getStatusTone = (status?: string | null) => {
    switch (status) {
      case "BLACKLISTED":
        return "bg-gb-danger/10 text-gb-danger border-gb-danger/20";
      case "INACTIVE":
        return "bg-amber-500/10 text-amber-600 border-amber-500/20";
      default:
        return "bg-emerald-500/10 text-emerald-600 border-emerald-500/20";
    }
  };

  const getStatusLabel = (status?: string | null) => {
    switch (status) {
      case "BLACKLISTED":
        return "Blacklisté";
      case "INACTIVE":
        return "Inactif";
      default:
        return "Actif";
    }
  };

  const renderValue = (value?: string | null, fallback = "Non renseigné") => value?.trim() || fallback;

  const totalActiveSuppliers = suppliers.filter((supplier) => supplier.status !== "INACTIVE" && supplier.status !== "BLACKLISTED").length;
  const totalWithContacts = suppliers.filter((supplier) => Boolean(supplier.email || supplier.phone || supplier.contact_name)).length;
  const totalQualified = suppliers.filter((supplier) => Boolean(supplier.specialty)).length;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-gb-border bg-gb-surface-solid p-5">
          <p className="text-[10px] font-black uppercase tracking-widest text-gb-muted">Fournisseurs actifs</p>
          <p className="mt-3 text-3xl font-black text-gb-text">{totalActiveSuppliers}</p>
        </div>
        <div className="rounded-2xl border border-gb-border bg-gb-surface-solid p-5">
          <p className="text-[10px] font-black uppercase tracking-widest text-gb-muted">Contacts renseignés</p>
          <p className="mt-3 text-3xl font-black text-gb-text">{totalWithContacts}</p>
        </div>
        <div className="rounded-2xl border border-gb-border bg-gb-surface-solid p-5">
          <p className="text-[10px] font-black uppercase tracking-widest text-gb-muted">Spécialités qualifiées</p>
          <p className="mt-3 text-3xl font-black text-gb-text">{totalQualified}</p>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gb-muted" size={18} />
          <Input
            placeholder="Rechercher un fournisseur..."
            className="pl-10 h-12 bg-gb-surface-solid border-gb-border rounded-xl"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Button className="h-12 px-8 rounded-xl shadow-lg shadow-gb-primary/20 w-full md:w-auto" onClick={openCreateDialog}>
          <Plus size={18} className="mr-2" />
          Nouveau Fournisseur
        </Button>
      </div>

      {actionError && (
        <div className="rounded-2xl border border-gb-danger/20 bg-gb-danger/5 px-4 py-3 text-sm font-medium text-gb-danger">
          {actionError}
        </div>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center p-20 space-y-4">
          <Loader2 className="w-10 h-10 text-gb-primary animate-spin" />
          <p className="text-gb-muted font-medium">Chargement du répertoire...</p>
        </div>
      ) : error ? (
        <div className="p-8 text-center bg-gb-danger/5 border border-gb-danger/10 rounded-2xl text-gb-danger font-medium">
          {error}
        </div>
      ) : filteredSuppliers.length === 0 ? (
        <div className="p-20 text-center bg-gb-surface-solid border border-gb-border border-dashed rounded-3xl">
          <Users className="mx-auto text-gb-muted/20 mb-6" size={64} />
          <h3 className="text-xl font-bold text-gb-text mb-2">Aucun fournisseur</h3>
          <p className="text-gb-muted">Commencez par ajouter des fournisseurs à votre annuaire.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredSuppliers.map((supplier) => (
            <motion.div
              key={supplier.id}
              whileHover={{ y: -4, scale: 1.01 }}
              className="bg-gb-surface-solid border border-gb-border rounded-2xl p-6 shadow-sm hover:shadow-xl hover:border-gb-primary/30 transition-all flex flex-col justify-between group"
            >
              <div>
                <div className="flex justify-between items-start mb-6 gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-gb-app border border-gb-border flex items-center justify-center text-gb-primary group-hover:bg-gb-primary group-hover:text-gb-inverse transition-colors overflow-hidden shrink-0">
                    <Building2 size={24} />
                  </div>
                  <Badge className={`${getStatusTone(supplier.status)} py-1 flex items-center gap-1`}>
                    <ShieldCheck size={10} /> {getStatusLabel(supplier.status)}
                  </Badge>
                </div>

                <h4 className="text-xl font-black text-gb-text mb-1 leading-tight">{supplier.name}</h4>
                <p className="text-xs text-gb-muted font-bold uppercase tracking-widest mb-6">{renderValue(supplier.specialty, "Fournisseur BTP")}</p>

                <div className="space-y-3 mb-8">
                  <div className="flex items-center gap-3 text-sm text-gb-muted">
                    <Users size={14} />
                    <span>{renderValue(supplier.contact_name, "Contact non renseigné")}</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-gb-muted">
                    <Mail size={14} />
                    <span>{renderValue(supplier.email, "Email non renseigné")}</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-gb-muted">
                    <Phone size={14} />
                    <span>{renderValue(supplier.phone, "Téléphone non renseigné")}</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-gb-muted">
                    <MapPin size={14} />
                    <span className="line-clamp-2">{renderValue(supplier.address, "Adresse non renseignée")}</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-gb-muted">
                    <FileBadge2 size={14} />
                    <span>{renderValue(supplier.siret, "Identifiant légal non renseigné")}</span>
                  </div>
                </div>
              </div>

              <div className="pt-6 border-t border-gb-border/50 flex items-center justify-end gap-2">
                <Button type="button" variant="outline" className="rounded-xl" onClick={() => openEditDialog(supplier)}>
                  <Pencil size={16} className="mr-2" /> Modifier
                </Button>
                <Button type="button" variant="destructive" className="rounded-xl" onClick={() => setSupplierToDelete(supplier)}>
                  <Trash2 size={16} className="mr-2" /> Supprimer
                </Button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <SupplierFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        supplier={supplierToEdit}
        onSaved={async () => {
          await fetchSuppliers();
          setSupplierToEdit(null);
        }}
      />

      <Dialog open={!!supplierToDelete} onOpenChange={(open) => !open && setSupplierToDelete(null)}>
        <DialogContent className="max-w-lg border border-gb-border bg-gb-surface-solid text-gb-text" showCloseButton={deletingId == null}>
          <DialogHeader>
            <DialogTitle className="text-xl font-black tracking-tight">Supprimer le fournisseur</DialogTitle>
            <DialogDescription className="text-sm text-gb-muted">
              Cette action supprimera {supplierToDelete?.name || "ce fournisseur"}. Si le fournisseur est déjà relié à des contrats, commandes ou livraisons, l'API bloquera la suppression.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="border-t border-gb-border bg-gb-app/40">
            <Button type="button" variant="outline" onClick={() => setSupplierToDelete(null)} disabled={deletingId != null}>
              Annuler
            </Button>
            <Button type="button" variant="destructive" onClick={handleDeleteSupplier} disabled={deletingId != null}>
              {deletingId != null ? <Loader2 className="mr-2 animate-spin" size={16} /> : <Trash2 className="mr-2" size={16} />}
              Confirmer la suppression
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
