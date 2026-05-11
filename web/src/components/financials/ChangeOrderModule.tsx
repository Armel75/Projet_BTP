import React, { useState, useEffect } from "react";
import { apiFetch } from "../../lib/api";
const API_BASE = import.meta.env.VITE_API_URL;
import { 
  FileEdit, 
  Plus, 
  Loader2, 
  Pencil,
  Trash2,
  History,
  TrendingUp,
  FileText,
  Save,
  X,
} from "lucide-react";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { motion } from "motion/react";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";

type ContractSummary = {
  id: number;
  reference?: string;
  currency?: string;
  project?: { title?: string };
};

type ChangeOrderRow = {
  id: number;
  contract_id: number;
  number: string;
  title: string;
  description: string;
  amount: number;
  reason?: string | null;
  impact_days?: number | null;
  status: string;
  created_at: string;
  contractRef: string;
  contractName: string;
  currency: string;
};

type ChangeOrderForm = {
  contract_id: string;
  number: string;
  title: string;
  description: string;
  amount: string;
  reason: string;
  impact_days: string;
};

const inputCls = "w-full h-11 px-3 rounded-xl bg-gb-app border border-gb-border text-sm outline-none focus:ring-2 focus:ring-amber-500";
const textareaCls = "w-full min-h-[90px] px-3 py-2.5 rounded-xl bg-gb-app border border-gb-border text-sm outline-none focus:ring-2 focus:ring-amber-500 resize-none";

const initialForm: ChangeOrderForm = {
  contract_id: "",
  number: "",
  title: "",
  description: "",
  amount: "",
  reason: "",
  impact_days: "",
};

export default function ChangeOrderModule() {
  const [contracts, setContracts] = useState<ContractSummary[]>([]);
  const [changeOrders, setChangeOrders] = useState<ChangeOrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [filter, setFilter] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ChangeOrderRow | null>(null);
  const [form, setForm] = useState<ChangeOrderForm>(initialForm);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchChangeOrders();
  }, []);

  const fetchChangeOrders = async () => {
    setLoading(true);
    try {
      const res = await apiFetch(`${API_BASE}/contracts`);
      if (res.ok) {
        const contractsData = await res.json();
        setContracts(contractsData);

        // Flatten change orders from all contracts
        const allCOs = contractsData.flatMap((c: any) =>
          (c.change_orders || []).map((co: any) => ({
            ...co,
            contractRef: c.reference,
            contractName: c.project?.title || "Projet non renseigné",
            currency: c.currency || "EUR",
          }))
        );
        setChangeOrders(allCOs);
      } else {
        let message = "Impossible de charger les avenants.";
        try {
          const data = await res.json();
          if (data?.error) message = String(data.error);
        } catch {
          // ignore json parsing issue
        }
        setError(message);
      }
    } catch (err) {
      console.error(err);
      setError("Erreur reseau lors du chargement des avenants.");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = (contractId = "") => {
    setForm({ ...initialForm, contract_id: contractId });
    setEditing(null);
    setError(null);
  };

  const openCreateModal = () => {
    resetForm(contracts.length > 0 ? String(contracts[0].id) : "");
    setFormOpen(true);
  };

  const openEditModal = (co: ChangeOrderRow) => {
    setEditing(co);
    setForm({
      contract_id: String(co.contract_id),
      number: co.number || "",
      title: co.title || "",
      description: co.description || "",
      amount: String(co.amount ?? ""),
      reason: co.reason || "",
      impact_days: co.impact_days !== null && co.impact_days !== undefined ? String(co.impact_days) : "",
    });
    setError(null);
    setFormOpen(true);
  };

  const updateForm = (field: keyof ChangeOrderForm, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const submitForm = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    if (!editing && !form.contract_id) {
      setError("Sélectionnez un contrat.");
      return;
    }
    if (!form.title.trim()) {
      setError("Le titre de l'avenant est requis.");
      return;
    }

    const parsedAmount = Number(form.amount || 0);
    if (!Number.isFinite(parsedAmount)) {
      setError("Le montant est invalide.");
      return;
    }

    const payload = {
      number: form.number.trim() || undefined,
      title: form.title.trim(),
      description: form.description.trim(),
      amount: parsedAmount,
      reason: form.reason.trim() || null,
      impact_days: form.impact_days.trim() ? Number(form.impact_days) : null,
    };

    setSubmitting(true);
    try {
      const endpoint = editing
        ? `${API_BASE}/contracts/change-orders/${editing.id}`
        : `${API_BASE}/contracts/${form.contract_id}/change-orders`;
      const method = editing ? "PUT" : "POST";

      const res = await apiFetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        let message = editing ? "Impossible de modifier cet avenant." : "Impossible de créer cet avenant.";
        try {
          const data = await res.json();
          if (data?.error) message = String(data.error);
        } catch {
          // ignore json parsing issue
        }
        setError(message);
        return;
      }

      setFormOpen(false);
      resetForm();
      await fetchChangeOrders();
    } catch (err) {
      console.error(err);
      setError("Erreur reseau pendant l'enregistrement.");
    } finally {
      setSubmitting(false);
    }
  };

  const deleteChangeOrder = async (co: ChangeOrderRow) => {
    if (co.status !== "PENDING_APPROVAL") return;
    if (!confirm(`Supprimer l'avenant #${co.number} ?`)) return;

    setError(null);
    try {
      const res = await apiFetch(`${API_BASE}/contracts/change-orders/${co.id}`, { method: "DELETE" });
      if (!res.ok) {
        let message = "Impossible de supprimer cet avenant.";
        try {
          const data = await res.json();
          if (data?.error) message = String(data.error);
        } catch {
          // ignore json parsing issue
        }
        setError(message);
        return;
      }

      await fetchChangeOrders();
    } catch (err) {
      console.error(err);
      setError("Erreur reseau pendant la suppression.");
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "APPROVED": return <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">Approuvé</Badge>;
      case "REJECTED": return <Badge className="bg-gb-danger/10 text-gb-danger border-gb-danger/20">Rejeté</Badge>;
      case "PENDING_APPROVAL": return <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20">En attente</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  const filteredCOs = changeOrders.filter(co =>
    String(co.number || "").toLowerCase().includes(filter.toLowerCase()) ||
    String(co.title || "").toLowerCase().includes(filter.toLowerCase()) ||
    String(co.description || "").toLowerCase().includes(filter.toLowerCase()) ||
    String(co.contractRef || "").toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-gb-surface-solid p-6 rounded-2xl border border-gb-border shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
            <History size={24} />
          </div>
          <div>
            <h3 className="text-xl font-black text-gb-text">Registre des Avenants</h3>
            <p className="text-xs text-gb-muted font-bold uppercase tracking-widest italic">Suivi des modifications contractuelles</p>
          </div>
        </div>
        
        <div className="flex gap-3 w-full md:w-auto">
          <input 
            type="text"
            placeholder="N° Avenant, Contrat..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="flex-1 md:w-64 px-4 h-11 bg-gb-app border border-gb-border rounded-xl text-sm outline-none focus:ring-2 focus:ring-amber-500 transition-all"
          />
          <Button
            className="h-11 px-6 rounded-xl bg-amber-500 hover:bg-amber-600 shadow-lg shadow-amber-500/20 text-white font-bold"
            onClick={openCreateModal}
          >
            <Plus size={18} className="mr-2" />
            Créer
          </Button>
        </div>
      </div>

      {error && (
        <div className="px-4 py-3 rounded-xl bg-gb-danger/10 border border-gb-danger/20 text-gb-danger text-sm font-medium">
          {error}
        </div>
      )}

      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center space-y-4">
          <Loader2 className="w-10 h-10 text-amber-500 animate-spin" />
          <p className="text-gb-muted font-medium italic">Audit de l'historique contractuel...</p>
        </div>
      ) : filteredCOs.length === 0 ? (
        <div className="p-20 text-center bg-gb-surface-solid border border-gb-border border-dashed rounded-3xl">
          <FileEdit className="mx-auto text-gb-muted/20 mb-6" size={64} />
          <h3 className="text-xl font-bold text-gb-text mb-2">Aucun avenant enregistré</h3>
          <p className="text-gb-muted italic">Les ordres de changement approuvés apparaîtront ici.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredCOs.map((co) => (
            <motion.div 
              key={co.id}
              whileHover={{ x: 4 }}
              className="bg-gb-surface-solid border border-gb-border rounded-2xl p-6 transition-all hover:border-amber-500/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-6"
            >
              <div className="flex items-start gap-4 flex-1">
                <div className="p-3 rounded-xl bg-gb-app border border-gb-border text-amber-600">
                  <FileText size={20} />
                </div>
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <span className="text-sm font-black text-gb-text">AVENANT #{co.number}</span>
                    {getStatusBadge(co.status)}
                  </div>
                  <p className="text-xs font-bold text-gb-muted uppercase tracking-tighter mb-2">
                    SUR CONTRAT {co.contractRef} — {co.contractName}
                  </p>
                  <p className="text-sm text-gb-muted line-clamp-1 italic max-w-xl">
                    "{co.description}"
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-10 min-w-fit w-full md:w-auto justify-between md:justify-end border-t md:border-t-0 pt-4 md:pt-0 border-gb-border/50">
                <div className="text-right">
                  <p className="text-[10px] font-black uppercase text-gb-muted tracking-widest">Impact Financier</p>
                  <div className="flex items-center gap-2 justify-end">
                    <TrendingUp size={14} className={co.amount >= 0 ? "text-emerald-500" : "text-gb-danger"} />
                    <span className={`text-lg font-black ${co.amount >= 0 ? "text-gb-text" : "text-gb-danger"}`}>
                      {new Intl.NumberFormat("fr-FR", { style: "currency", currency: co.currency || "EUR" }).format(co.amount)}
                    </span>
                  </div>
                </div>

                <div className="text-right hidden sm:block">
                  <p className="text-[10px] font-black uppercase text-gb-muted tracking-widest">Date</p>
                  <p className="text-xs font-bold text-gb-text">
                    {format(new Date(co.created_at), 'dd/MM/yyyy')}
                  </p>
                </div>

                {co.status === "PENDING_APPROVAL" && (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => openEditModal(co)}
                      className="inline-flex items-center gap-1.5 px-3 h-8 rounded-xl text-xs font-semibold text-gb-muted hover:text-amber-600 hover:bg-amber-600/10 transition-colors"
                      title="Modifier"
                    >
                      <Pencil size={13} /><span>Modifier</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => void deleteChangeOrder(co)}
                      className="inline-flex items-center gap-1.5 px-3 h-8 rounded-xl text-xs font-semibold text-gb-muted hover:text-gb-danger hover:bg-gb-danger/10 transition-colors"
                      title="Supprimer"
                    >
                      <Trash2 size={13} /><span>Supprimer</span>
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <Dialog open={formOpen} onOpenChange={(open) => {
        setFormOpen(open);
        if (!open) resetForm();
      }}>
        <DialogContent className="sm:max-w-[680px] p-0 bg-gb-surface-solid border-gb-border overflow-hidden flex flex-col max-h-[92dvh]">
          <DialogHeader className="p-5 border-b border-gb-border bg-gb-app/20">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
                <FileEdit size={18} />
              </div>
              <div>
                <DialogTitle className="text-lg font-black text-gb-text">
                  {editing ? "Modifier un avenant" : "Créer un avenant"}
                </DialogTitle>
                <p className="text-xs text-gb-muted mt-0.5">
                  {editing ? `Avenant #${editing.number}` : "Création d'un nouvel ordre de changement"}
                </p>
              </div>
            </div>
          </DialogHeader>

          <form onSubmit={submitForm} className="min-h-0 flex-1 overflow-y-auto p-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5 col-span-2">
                <label className="text-[11px] font-black uppercase tracking-widest text-gb-muted">Contrat</label>
                <select
                  className={inputCls}
                  value={form.contract_id}
                  onChange={(e) => updateForm("contract_id", e.target.value)}
                  required
                  disabled={Boolean(editing)}
                >
                  <option value="">— Sélectionner un contrat —</option>
                  {contracts.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.reference} · {c.project?.title || "Projet"}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-black uppercase tracking-widest text-gb-muted">Numéro</label>
                <input
                  className={inputCls}
                  value={form.number}
                  onChange={(e) => updateForm("number", e.target.value)}
                  placeholder="AV-2026-001"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-black uppercase tracking-widest text-gb-muted">Montant</label>
                <input
                  className={inputCls}
                  type="number"
                  step="0.01"
                  value={form.amount}
                  onChange={(e) => updateForm("amount", e.target.value)}
                  placeholder="0"
                  required
                />
              </div>

              <div className="space-y-1.5 col-span-2">
                <label className="text-[11px] font-black uppercase tracking-widest text-gb-muted">Titre</label>
                <input
                  className={inputCls}
                  value={form.title}
                  onChange={(e) => updateForm("title", e.target.value)}
                  placeholder="Objet de l'avenant"
                  required
                />
              </div>

              <div className="space-y-1.5 col-span-2">
                <label className="text-[11px] font-black uppercase tracking-widest text-gb-muted">Description</label>
                <textarea
                  className={textareaCls}
                  value={form.description}
                  onChange={(e) => updateForm("description", e.target.value)}
                  placeholder="Détail des modifications contractuelles"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-black uppercase tracking-widest text-gb-muted">Impact délai (jours)</label>
                <input
                  className={inputCls}
                  type="number"
                  step="1"
                  value={form.impact_days}
                  onChange={(e) => updateForm("impact_days", e.target.value)}
                  placeholder="0"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-black uppercase tracking-widest text-gb-muted">Motif</label>
                <input
                  className={inputCls}
                  value={form.reason}
                  onChange={(e) => updateForm("reason", e.target.value)}
                  placeholder="Cause / justification"
                />
              </div>
            </div>

            {error && (
              <div className="px-4 py-3 rounded-xl bg-gb-danger/10 border border-gb-danger/20 text-gb-danger text-sm font-medium">
                {error}
              </div>
            )}

            <div className="pt-4 border-t border-gb-border flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setFormOpen(false)}
                disabled={submitting}
                className="rounded-xl"
              >
                <X size={14} className="mr-1.5" /> Annuler
              </Button>
              <Button
                type="submit"
                disabled={submitting}
                className="rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold"
              >
                {submitting ? <Loader2 size={14} className="mr-1.5 animate-spin" /> : <Save size={14} className="mr-1.5" />}
                {editing ? "Mettre à jour" : "Créer l'avenant"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
