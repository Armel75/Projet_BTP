import React, { useEffect, useState } from "react";
import { API_BASE, apiFetch } from "../../lib/api";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import { Building2, Loader2, Save } from "lucide-react";

type SupplierStatus = "ACTIVE" | "INACTIVE" | "BLACKLISTED";

export type SupplierRecord = {
  id: number;
  name: string;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  siret?: string | null;
  contact_name?: string | null;
  specialty?: string | null;
  status?: string | null;
};

interface SupplierFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  supplier: SupplierRecord | null;
  onSaved: () => Promise<void> | void;
}

const inputCls = "h-11 px-3 bg-gb-app border border-gb-border rounded-xl text-sm text-gb-text outline-none focus:ring-2 focus:ring-gb-primary transition-all w-full placeholder:text-gb-muted/50";
const textAreaCls = "min-h-[110px] bg-gb-app border-gb-border rounded-xl text-sm text-gb-text placeholder:text-gb-muted/50";

const defaultForm = {
  name: "",
  email: "",
  phone: "",
  address: "",
  siret: "",
  contact_name: "",
  specialty: "",
  status: "ACTIVE" as SupplierStatus,
};

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[10px] font-black uppercase tracking-widest text-gb-muted">
        {label}{required && <span className="text-gb-danger ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}

export default function SupplierFormDialog({ open, onOpenChange, supplier, onSaved }: SupplierFormDialogProps) {
  const isEdit = !!supplier;
  const [form, setForm] = useState(defaultForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;

    if (supplier) {
      setForm({
        name: supplier.name || "",
        email: supplier.email || "",
        phone: supplier.phone || "",
        address: supplier.address || "",
        siret: supplier.siret || "",
        contact_name: supplier.contact_name || "",
        specialty: supplier.specialty || "",
        status: (supplier.status as SupplierStatus) || "ACTIVE",
      });
    } else {
      setForm(defaultForm);
    }

    setError(null);
    setSaving(false);
  }, [open, supplier]);

  const set = (key: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      setForm((prev) => ({ ...prev, [key]: e.target.value }));
    };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      setError("Le nom du fournisseur est obligatoire.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const payload = {
        name: form.name.trim(),
        email: form.email.trim() || undefined,
        phone: form.phone.trim() || undefined,
        address: form.address.trim() || undefined,
        siret: form.siret.trim() || undefined,
        contact_name: form.contact_name.trim() || undefined,
        specialty: form.specialty.trim() || undefined,
        status: form.status,
      };

      const url = isEdit ? `${API_BASE}/procurement/suppliers/${supplier.id}` : `${API_BASE}/procurement/suppliers`;
      const res = await apiFetch(url, {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.message || body.error || `Erreur ${res.status}`);
        return;
      }

      await onSaved();
      onOpenChange(false);
    } catch (err: any) {
      setError(err?.message || "Erreur réseau.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92dvh] max-w-3xl border border-gb-border bg-gb-surface-solid p-0 text-gb-text sm:max-w-3xl flex flex-col overflow-hidden" showCloseButton={false}>
        <DialogHeader className="border-b border-gb-border px-6 py-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-gb-border bg-gb-app text-gb-primary">
                <Building2 size={22} />
              </div>
              <div className="space-y-1">
                <DialogTitle className="text-xl font-black tracking-tight text-gb-text">
                  {isEdit ? "Modifier le fournisseur" : "Nouveau fournisseur"}
                </DialogTitle>
                <DialogDescription className="text-sm text-gb-muted">
                  Renseignez uniquement des informations réellement persistées par l'API achats.
                </DialogDescription>
              </div>
            </div>
            <button type="button" onClick={() => onOpenChange(false)} disabled={saving} className="p-1.5 rounded-lg text-gb-muted hover:bg-gb-surface-hover transition-colors disabled:opacity-50">
              Fermer
            </button>
          </div>
        </DialogHeader>

        <form id="supplier-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto space-y-5 px-6 py-5">
          {error && (
            <div className="rounded-2xl border border-gb-danger/20 bg-gb-danger/5 px-4 py-3 text-sm font-medium text-gb-danger">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field label="Nom du fournisseur" required>
              <Input className={inputCls} value={form.name} onChange={set("name")} placeholder="Ex: Societe Generale des Materiaux" required />
            </Field>

            <Field label="Specialite">
              <Input className={inputCls} value={form.specialty} onChange={set("specialty")} placeholder="Gros oeuvre, electricite, menuiserie..." />
            </Field>

            <Field label="Contact principal">
              <Input className={inputCls} value={form.contact_name} onChange={set("contact_name")} placeholder="Nom du responsable" />
            </Field>

            <Field label="Statut">
              <select className={inputCls} value={form.status} onChange={set("status")}>
                <option value="ACTIVE">Actif</option>
                <option value="INACTIVE">Inactif</option>
                <option value="BLACKLISTED">Blacklisté</option>
              </select>
            </Field>

            <Field label="Email">
              <Input className={inputCls} type="email" value={form.email} onChange={set("email")} placeholder="contact@fournisseur.com" />
            </Field>

            <Field label="Telephone">
              <Input className={inputCls} value={form.phone} onChange={set("phone")} placeholder="+237 6 00 00 00 00" />
            </Field>

            <Field label="SIRET / RCCM / NIF">
              <Input className={inputCls} value={form.siret} onChange={set("siret")} placeholder="Identifiant legal" />
            </Field>
          </div>

          <Field label="Adresse">
            <Textarea className={textAreaCls} value={form.address} onChange={set("address")} placeholder="Adresse complete du fournisseur" />
          </Field>
        </form>

        <DialogFooter className="shrink-0 border-t border-gb-border bg-gb-app/40">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Annuler
          </Button>
          <Button type="submit" form="supplier-form" className="shadow-lg shadow-gb-primary/20" disabled={saving}>
            {saving ? <Loader2 className="mr-2 animate-spin" size={16} /> : <Save className="mr-2" size={16} />}
            {isEdit ? "Enregistrer" : "Creer le fournisseur"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}