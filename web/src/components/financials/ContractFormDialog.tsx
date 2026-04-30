import React, { useState, useEffect } from "react";
import { apiFetch } from "../../lib/api";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "../ui/dialog";
import { Button } from "../ui/button";
import { Loader2, FileSignature, Building2, Calendar, Banknote, Save, X } from "lucide-react";
import { motion } from "motion/react";

const API_BASE = import.meta.env.VITE_API_URL;

interface ContractFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contract: any | null;
  onSaved: () => void;
}

const TYPES = [
  { value: "OWNER",       label: "Contrat Client" },
  { value: "SUBCONTRACT", label: "Sous-traitance" },
  { value: "SUPPLY",      label: "Fournitures" },
  { value: "CONSULTING",  label: "Conseil / MOE" },
];

const CATEGORIES = [
  { value: "TRAVAUX",      label: "Travaux" },
  { value: "FOURNITURES",  label: "Fournitures" },
  { value: "SERVICES",     label: "Services" },
  { value: "MOE",          label: "Maîtrise d'œuvre" },
  { value: "ETUDES",       label: "Études" },
];

const STATUSES = [
  { value: "DRAFT",             label: "Brouillon" },
  { value: "PENDING_SIGNATURE", label: "En attente de signature" },
  { value: "APPROVED",          label: "Approuvé" },
  { value: "EXECUTED",          label: "Exécuté" },
  { value: "SUSPENDED",         label: "Suspendu" },
  { value: "TERMINATED",        label: "Résilié" },
  { value: "CLOSED",            label: "Clôturé" },
];

const CURRENCIES = ["EUR", "USD", "XAF", "MAD", "DZD"];

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

const inputCls = "h-10 px-3 bg-gb-app border border-gb-border rounded-xl text-sm text-gb-text outline-none focus:ring-2 focus:ring-gb-primary transition-all w-full placeholder:text-gb-muted/50";
const selectCls = `${inputCls} appearance-none`;

export default function ContractFormDialog({
  open, onOpenChange, contract, onSaved,
}: ContractFormDialogProps) {
  const isEdit = !!contract;

  const [projects, setProjects] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    reference: "",
    title: "",
    type: "SUBCONTRACT",
    category: "",
    status: "DRAFT",
    currency: "EUR",
    project_id: "",
    supplier_id: "",
    amount: "",
    retention_pct: "",
    advance_payment_pct: "",
    payment_terms: "",
    price_revision_index: "",
    document_url: "",
    signed_at: "",
    start_date: "",
    end_date: "",
    description: "",
  });

  // Load reference data
  useEffect(() => {
    if (!open) return;
    setLoading(true);
    Promise.all([
      apiFetch(`${API_BASE}/projects?limit=100`).then(r => r.ok ? r.json() : []),
      apiFetch(`${API_BASE}/procurement/suppliers`).then(r => r.ok ? r.json() : []),
    ]).then(([p, s]) => {
      setProjects(Array.isArray(p) ? p : p.data || []);
      setSuppliers(Array.isArray(s) ? s : s.data || []);
    }).finally(() => setLoading(false));
  }, [open]);

  // Populate form on edit
  useEffect(() => {
    if (contract) {
      const toDate = (v: any) => v ? new Date(v).toISOString().slice(0, 10) : "";
      setForm({
        reference:           contract.reference || "",
        title:               contract.title || "",
        type:                contract.type || "SUBCONTRACT",
        category:            contract.category || "",
        status:              contract.status || "DRAFT",
        currency:            contract.currency || "EUR",
        project_id:          String(contract.project_id || ""),
        supplier_id:         String(contract.supplier_id || ""),
        amount:              String(contract.amount || ""),
        retention_pct:       contract.retention_pct != null ? String(contract.retention_pct) : "",
        advance_payment_pct: contract.advance_payment_pct != null ? String(contract.advance_payment_pct) : "",
        payment_terms:       contract.payment_terms != null ? String(contract.payment_terms) : "",
        price_revision_index: contract.price_revision_index || "",
        document_url:        contract.document_url || "",
        signed_at:           toDate(contract.signed_at),
        start_date:          toDate(contract.start_date),
        end_date:            toDate(contract.end_date),
        description:         contract.description || "",
      });
    } else {
      setForm({
        reference: "", title: "", type: "SUBCONTRACT", category: "",
        status: "DRAFT", currency: "EUR", project_id: "", supplier_id: "",
        amount: "", retention_pct: "", advance_payment_pct: "", payment_terms: "",
        price_revision_index: "", document_url: "", signed_at: "", start_date: "",
        end_date: "", description: "",
      });
    }
    setError(null);
  }, [contract, open]);

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(prev => ({ ...prev, [key]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) { setError("Le titre est obligatoire."); return; }
    if (!form.project_id) { setError("Le projet est obligatoire."); return; }
    if (!form.supplier_id) { setError("Le fournisseur est obligatoire."); return; }

    setSaving(true);
    setError(null);
    try {
      const payload: any = {
        reference:    form.reference || undefined,
        title:        form.title,
        type:         form.type,
        category:     form.category || undefined,
        status:       form.status,
        currency:     form.currency,
        project_id:   Number(form.project_id),
        supplier_id:  Number(form.supplier_id),
        amount:       form.amount ? Number(form.amount) : 0,
        retention_pct:       form.retention_pct ? Number(form.retention_pct) : undefined,
        advance_payment_pct: form.advance_payment_pct ? Number(form.advance_payment_pct) : undefined,
        payment_terms:       form.payment_terms ? Number(form.payment_terms) : undefined,
        price_revision_index: form.price_revision_index || undefined,
        document_url: form.document_url || undefined,
        signed_at:    form.signed_at || undefined,
        start_date:   form.start_date || undefined,
        end_date:     form.end_date || undefined,
        description:  form.description || undefined,
      };

      const url = isEdit ? `${API_BASE}/contracts/${contract.id}` : `${API_BASE}/contracts`;
      const method = isEdit ? "PUT" : "POST";
      const res = await apiFetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.message || body.error || `Erreur ${res.status}`);
        return;
      }
      onSaved();
    } catch (err: any) {
      setError(err.message || "Erreur réseau.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[760px] p-0 bg-gb-surface-solid border-gb-border overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <DialogHeader className="p-5 border-b border-gb-border bg-gb-app/20 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gb-surface-solid border border-gb-border flex items-center justify-center text-gb-primary">
              <FileSignature size={20} />
            </div>
            <div>
              <DialogTitle className="text-lg font-black text-gb-text">
                {isEdit ? "Modifier le contrat" : "Nouveau contrat"}
              </DialogTitle>
              <p className="text-xs text-gb-muted mt-0.5">
                {isEdit ? `Référence ${contract.reference}` : "Enregistrez un nouveau marché dans le registre"}
              </p>
            </div>
          </div>
        </DialogHeader>

        {/* Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-20 flex items-center justify-center gap-3">
              <Loader2 className="text-gb-primary animate-spin w-8 h-8" />
              <p className="text-gb-muted italic text-sm">Chargement des référentiels…</p>
            </div>
          ) : (
            <div className="p-6 space-y-6">
              {/* Section: Identification */}
              <SectionTitle icon={FileSignature} label="Identification" />
              <div className="grid grid-cols-2 gap-4">
                <Field label="Référence">
                  <input type="text" placeholder="C-2024-001" className={inputCls} value={form.reference} onChange={set("reference")} />
                </Field>
                <Field label="Titre" required>
                  <input type="text" placeholder="Lot 3 — Gros œuvre" className={inputCls} value={form.title} onChange={set("title")} required />
                </Field>
                <Field label="Type de contrat" required>
                  <select className={selectCls} value={form.type} onChange={set("type")}>
                    {TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </Field>
                <Field label="Catégorie">
                  <select className={selectCls} value={form.category} onChange={set("category")}>
                    <option value="">— Sélectionner —</option>
                    {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </select>
                </Field>
                <Field label="Statut" required>
                  <select className={selectCls} value={form.status} onChange={set("status")}>
                    {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                </Field>
                <Field label="Devise" required>
                  <select className={selectCls} value={form.currency} onChange={set("currency")}>
                    {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </Field>
              </div>

              {/* Section: Parties */}
              <SectionTitle icon={Building2} label="Parties" />
              <div className="grid grid-cols-2 gap-4">
                <Field label="Projet" required>
                  <select className={selectCls} value={form.project_id} onChange={set("project_id")} required>
                    <option value="">— Sélectionner un projet —</option>
                    {projects.map((p: any) => (
                      <option key={p.id} value={p.id}>{p.code ? `[${p.code}] ` : ""}{p.title}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Fournisseur / Sous-traitant" required>
                  <select className={selectCls} value={form.supplier_id} onChange={set("supplier_id")} required>
                    <option value="">— Sélectionner un fournisseur —</option>
                    {suppliers.map((s: any) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </Field>
              </div>

              {/* Section: Financier */}
              <SectionTitle icon={Banknote} label="Conditions financières" />
              <div className="grid grid-cols-2 gap-4">
                <Field label="Montant initial (HT)">
                  <input type="number" min="0" step="0.01" placeholder="0" className={inputCls} value={form.amount} onChange={set("amount")} />
                </Field>
                <Field label="Retenue de garantie (%)">
                  <input type="number" min="0" max="100" step="0.1" placeholder="ex: 5" className={inputCls} value={form.retention_pct} onChange={set("retention_pct")} />
                </Field>
                <Field label="Avance forfaitaire (%)">
                  <input type="number" min="0" max="100" step="0.1" placeholder="ex: 20" className={inputCls} value={form.advance_payment_pct} onChange={set("advance_payment_pct")} />
                </Field>
                <Field label="Délai de paiement (jours)">
                  <input type="number" min="0" step="1" placeholder="ex: 30" className={inputCls} value={form.payment_terms} onChange={set("payment_terms")} />
                </Field>
                <Field label="Indice de révision de prix">
                  <input type="text" placeholder="ex: BT01, TP09…" className={inputCls} value={form.price_revision_index} onChange={set("price_revision_index")} />
                </Field>
                <Field label="URL document (PDF)">
                  <input type="url" placeholder="https://…" className={inputCls} value={form.document_url} onChange={set("document_url")} />
                </Field>
              </div>

              {/* Section: Dates */}
              <SectionTitle icon={Calendar} label="Calendrier" />
              <div className="grid grid-cols-3 gap-4">
                <Field label="Date de signature">
                  <input type="date" className={inputCls} value={form.signed_at} onChange={set("signed_at")} />
                </Field>
                <Field label="Date de début">
                  <input type="date" className={inputCls} value={form.start_date} onChange={set("start_date")} />
                </Field>
                <Field label="Date de fin">
                  <input type="date" className={inputCls} value={form.end_date} onChange={set("end_date")} />
                </Field>
              </div>

              {/* Section: Description */}
              <Field label="Objet du marché / Description">
                <textarea
                  rows={3}
                  placeholder="Décrire l'objet du marché, les prestations couvertes…"
                  className={`${inputCls} h-auto py-2.5 resize-none`}
                  value={form.description}
                  onChange={set("description")}
                />
              </Field>

              {/* Error */}
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-start gap-2 p-3 rounded-xl bg-gb-danger/10 border border-gb-danger/20 text-gb-danger text-xs font-medium"
                >
                  <X size={14} className="mt-0.5 shrink-0" />
                  {error}
                </motion.div>
              )}
            </div>
          )}

          {/* Footer */}
          <div className="sticky bottom-0 px-6 py-4 border-t border-gb-border bg-gb-surface-solid/90 backdrop-blur-sm flex justify-end gap-3 shrink-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="rounded-xl px-4"
              disabled={saving}
            >
              Annuler
            </Button>
            <Button
              type="submit"
              disabled={saving || loading}
              className="rounded-xl px-6 shadow-md shadow-gb-primary/20 font-bold"
            >
              {saving ? (
                <><Loader2 size={15} className="animate-spin mr-2" /> Enregistrement…</>
              ) : (
                <><Save size={15} className="mr-2" /> {isEdit ? "Enregistrer les modifications" : "Créer le contrat"}</>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function SectionTitle({ icon: Icon, label }: { icon: React.ElementType; label: string }) {
  return (
    <div className="flex items-center gap-2 pt-2">
      <Icon size={13} className="text-gb-primary" />
      <h3 className="text-[10px] font-black uppercase tracking-widest text-gb-muted">{label}</h3>
      <div className="flex-1 h-px bg-gb-border/60 ml-2" />
    </div>
  );
}
