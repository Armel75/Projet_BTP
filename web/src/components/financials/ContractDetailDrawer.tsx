import React, { useState, useEffect, useCallback } from "react";
import { apiFetch } from "../../lib/api";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "../ui/dialog";
import {
  FileSignature, Building2, Calendar, Banknote, Receipt, FileEdit,
  CreditCard, Loader2, TrendingUp, Download, ShieldCheck, CheckCircle2,
  Clock, XCircle, Plus, Trash2, Edit3, ExternalLink, Hash,
  Layers, AlertTriangle, BarChart2, FileText,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

const API_BASE = import.meta.env.VITE_API_URL;

interface ContractDetailDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contractId: number;
  onContractUpdated?: () => void;
}

const STATUS_LABELS: Record<string, { label: string; cls: string }> = {
  DRAFT:             { label: "Brouillon",        cls: "bg-gb-app text-gb-muted border-gb-border" },
  PENDING_SIGNATURE: { label: "En attente sign.", cls: "bg-amber-500/10 text-amber-600 border-amber-500/20" },
  APPROVED:          { label: "ApprouvÃ©",         cls: "bg-blue-500/10 text-blue-600 border-blue-500/20" },
  EXECUTED:          { label: "ExÃ©cutÃ©",          cls: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" },
  SUSPENDED:         { label: "Suspendu",         cls: "bg-orange-500/10 text-orange-600 border-orange-500/20" },
  TERMINATED:        { label: "RÃ©siliÃ©",          cls: "bg-red-500/10 text-red-600 border-red-500/20" },
  CLOSED:            { label: "ClÃ´turÃ©",          cls: "bg-gb-muted/10 text-gb-muted border-gb-muted/20" },
};

const TYPE_LABELS: Record<string, { label: string; color: string }> = {
  OWNER:       { label: "Contrat Client",     color: "text-blue-600" },
  SUBCONTRACT: { label: "Sous-traitance",     color: "text-purple-600" },
  SUPPLY:      { label: "Fournitures",        color: "text-amber-600" },
  CONSULTING:  { label: "Conseil / MOE",      color: "text-emerald-600" },
};

const CO_STATUS: Record<string, { label: string; cls: string }> = {
  PENDING_APPROVAL: { label: "En attente", cls: "bg-amber-500/10 text-amber-600 border-amber-500/20" },
  APPROVED:         { label: "ApprouvÃ©",   cls: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" },
  REJECTED:         { label: "RejetÃ©",     cls: "bg-red-500/10 text-red-600 border-red-500/20" },
};

const INV_STATUS: Record<string, { label: string; cls: string }> = {
  DRAFT:     { label: "Brouillon", cls: "bg-gb-app text-gb-muted border-gb-border" },
  SUBMITTED: { label: "EnvoyÃ©e",   cls: "bg-amber-500/10 text-amber-600 border-amber-500/20" },
  APPROVED:  { label: "ApprouvÃ©e", cls: "bg-blue-500/10 text-blue-600 border-blue-500/20" },
  PAID:      { label: "PayÃ©e",     cls: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" },
  CANCELLED: { label: "AnnulÃ©e",  cls: "bg-red-500/10 text-red-600 border-red-500/20" },
};

const fmt = (n: number, cur = "EUR") =>
  new Intl.NumberFormat("fr-FR", { style: "currency", currency: cur, maximumFractionDigits: 0 }).format(n);

function Badge({ status, map }: { status: string; map: Record<string, { label: string; cls: string }> }) {
  const cfg = map[status] || { label: status, cls: "bg-gb-app text-gb-muted border-gb-border" };
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black border ${cfg.cls}`}>{cfg.label}</span>;
}

type Tab = "overview" | "items" | "changeorders" | "invoices";

export default function ContractDetailDrawer({
  open, onOpenChange, contractId, onContractUpdated,
}: ContractDetailDrawerProps) {
  const [contract, setContract] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("overview");
  const [approvingCO, setApprovingCO] = useState<number | null>(null);

  const fetchContract = useCallback(async () => {
    if (!contractId) return;
    setLoading(true);
    try {
      const res = await apiFetch(`${API_BASE}/contracts/${contractId}`);
      if (res.ok) setContract(await res.json());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [contractId]);

  useEffect(() => {
    if (open && contractId) { setTab("overview"); fetchContract(); }
  }, [open, contractId, fetchContract]);

  const approveCO = async (coId: number, action: "approve" | "reject") => {
    setApprovingCO(coId);
    try {
      await apiFetch(`${API_BASE}/contracts/change-orders/${coId}/${action}`, { method: "PATCH" });
      await fetchContract();
      onContractUpdated?.();
    } finally {
      setApprovingCO(null);
    }
  };

  const deleteItem = async (itemId: number) => {
    if (!confirm("Supprimer cette ligne ?")) return;
    await apiFetch(`${API_BASE}/contracts/${contractId}/line-items/${itemId}`, { method: "DELETE" });
    fetchContract();
  };

  if (!open) return null;

  const TABS: { id: Tab; label: string; count?: number }[] = [
    { id: "overview",      label: "Vue d'ensemble" },
    { id: "items",         label: "DÃ©compte", count: contract?.line_items?.length },
    { id: "changeorders",  label: "Avenants",  count: contract?.change_orders?.length },
    { id: "invoices",      label: "Factures",  count: contract?.invoices?.length },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[960px] p-0 bg-gb-surface-solid border-gb-border overflow-hidden flex flex-col max-h-[92vh]">
        {loading ? (
          <div className="p-32 flex flex-col items-center justify-center gap-4">
            <Loader2 className="w-10 h-10 text-gb-primary animate-spin" />
            <p className="text-gb-muted italic text-sm">Chargement du dossier contractuelâ€¦</p>
          </div>
        ) : contract ? (
          <>
            {/* â”€â”€â”€ Header â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
            <DialogHeader className="p-6 border-b border-gb-border bg-gb-app/20 shrink-0">
              <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                <div className="flex gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-gb-surface-solid border border-gb-border shadow flex items-center justify-center text-gb-primary shrink-0">
                    <FileSignature size={28} />
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <DialogTitle className="text-2xl font-black tracking-tighter text-gb-text">
                        {contract.reference || "â€”"}
                      </DialogTitle>
                      <Badge status={contract.status} map={STATUS_LABELS} />
                      <span className={`text-xs font-bold ${TYPE_LABELS[contract.type]?.color || "text-gb-muted"}`}>
                        {TYPE_LABELS[contract.type]?.label || contract.type}
                      </span>
                    </div>
                    <p className="text-sm text-gb-muted font-medium">{contract.title}</p>
                    <div className="flex items-center gap-3 mt-1.5">
                      <span className="text-xs text-gb-muted flex items-center gap-1">
                        <Building2 size={11} /> {contract.project?.title}
                      </span>
                      <span className="text-xs text-gb-muted flex items-center gap-1">
                        <Hash size={11} /> {contract.supplier?.name}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
                  {contract.document?.file_url && (
                    <a href={contract.document.file_url} target="_blank" rel="noreferrer"
                       className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gb-app border border-gb-border text-xs font-bold hover:bg-gb-border transition-colors">
                      <Download size={13} /> {contract.document.file_name || "Document"}
                    </a>
                  )}
                </div>
              </div>
            </DialogHeader>

            {/* â”€â”€â”€ Tabs â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
            <div className="flex gap-1 px-6 pt-4 border-b border-gb-border shrink-0 bg-gb-surface-solid">
              {TABS.map(t => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`relative flex items-center gap-1.5 px-3 pb-3 text-xs font-bold transition-colors ${
                    tab === t.id ? "text-gb-primary" : "text-gb-muted hover:text-gb-text"
                  }`}
                >
                  {t.label}
                  {t.count !== undefined && t.count > 0 && (
                    <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-black ${
                      tab === t.id ? "bg-gb-primary text-gb-inverse" : "bg-gb-app text-gb-muted"
                    }`}>{t.count}</span>
                  )}
                  {tab === t.id && (
                    <motion.div layoutId="tabUnderline" className="absolute bottom-0 left-0 right-0 h-0.5 bg-gb-primary rounded-full" />
                  )}
                </button>
              ))}
            </div>

            {/* â”€â”€â”€ Body â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
            <div className="flex-1 overflow-y-auto">
              <AnimatePresence mode="wait">
                <motion.div
                  key={tab}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.2 }}
                  className="p-6"
                >
                  {/* â•â• TAB: Overview â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
                  {tab === "overview" && (
                    <div className="space-y-8">
                      {/* Financial recap */}
                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="lg:col-span-1 p-5 rounded-2xl bg-gb-app border border-gb-border space-y-3">
                          <h4 className="text-[10px] font-black uppercase text-gb-muted tracking-widest flex items-center gap-2">
                            <TrendingUp size={13} /> SynthÃ¨se financiÃ¨re
                          </h4>
                          <div className="space-y-2.5">
                            {[
                              { label: "Montant initial",         val: fmt(contract.base_amount || 0, contract.currency), cls: "text-gb-text" },
                              { label: "Avenants approuvÃ©s",      val: `+${fmt(contract.approved_change_amount || 0, contract.currency)}`, cls: "text-emerald-500" },
                            ].map(row => (
                              <div key={row.label} className="flex justify-between items-center border-b border-gb-border/40 pb-2">
                                <span className="text-xs text-gb-muted">{row.label}</span>
                                <span className={`text-sm font-black ${row.cls}`}>{row.val}</span>
                              </div>
                            ))}
                            <div className="flex justify-between items-center pt-1">
                              <span className="text-xs font-black text-gb-text uppercase">Total rÃ©visÃ©</span>
                              <span className="text-xl font-black text-gb-primary">{fmt(contract.revised_total_amount || 0, contract.currency)}</span>
                            </div>
                          </div>
                          {/* Billing progress */}
                          <div className="pt-3 border-t border-gb-border/40 space-y-2">
                            <div className="flex justify-between text-xs">
                              <span className="text-gb-muted font-medium">Facturation</span>
                              <span className="font-black text-gb-text">{Math.round(contract.billing_progress_pct || 0)}%</span>
                            </div>
                            <div className="h-2 bg-gb-surface-solid rounded-full overflow-hidden">
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${contract.billing_progress_pct || 0}%` }}
                                transition={{ delay: 0.3, duration: 0.6 }}
                                className="h-full bg-gb-primary rounded-full"
                              />
                            </div>
                            <div className="flex justify-between text-[10px] text-gb-muted">
                              <span>FacturÃ©: {fmt(contract.total_invoiced || 0, contract.currency)}</span>
                              <span>Restant: {fmt(contract.remaining_to_invoice || 0, contract.currency)}</span>
                            </div>
                          </div>
                        </div>

                        {/* Key info grid */}
                        <div className="lg:col-span-2 grid grid-cols-2 sm:grid-cols-3 gap-4">
                          {[
                            { icon: Building2, label: "Fournisseur / Tiers", val: contract.supplier?.name },
                            { icon: ShieldCheck, label: "Projet", val: contract.project?.title },
                            { icon: CreditCard, label: "Retenue de garantie", val: contract.retention_pct ? `${contract.retention_pct}%` : "â€”" },
                            { icon: Calendar, label: "Date signature", val: contract.signed_at ? format(new Date(contract.signed_at), "d MMM yyyy", { locale: fr }) : "â€”" },
                            { icon: Calendar, label: "PÃ©riode", val: contract.start_date ? `${format(new Date(contract.start_date), "dd/MM/yy")} â†’ ${contract.end_date ? format(new Date(contract.end_date), "dd/MM/yy") : "â€¦"}` : "â€”" },
                            { icon: Banknote, label: "Avance forfaitaire", val: contract.advance_payment_pct ? `${contract.advance_payment_pct}%${contract.advance_payment_amount ? ` (${fmt(contract.advance_payment_amount, contract.currency)})` : ""}` : "â€”" },
                            { icon: Clock, label: "DÃ©lai paiement", val: contract.payment_terms ? `${contract.payment_terms} jours` : "â€”" },
                            { icon: BarChart2, label: "Indice rÃ©vision", val: contract.price_revision_index || "â€”" },
                            { icon: Layers, label: "CatÃ©gorie", val: contract.category || "â€”" },
                          ].map(item => (
                            <div key={item.label} className="p-3 rounded-xl border border-gb-border bg-gb-app/30">
                              <div className="flex items-center gap-1.5 mb-1">
                                <item.icon size={11} className="text-gb-primary" />
                                <p className="text-[9px] font-black uppercase text-gb-muted tracking-wider">{item.label}</p>
                              </div>
                              <p className="text-xs font-bold text-gb-text truncate">{item.val || "â€”"}</p>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Description */}
                      {contract.description && (
                        <div className="p-4 rounded-xl border border-gb-border bg-gb-app/20">
                          <p className="text-[10px] font-black uppercase text-gb-muted tracking-widest mb-2 flex items-center gap-1.5">
                            <FileText size={11} /> Objet du marchÃ©
                          </p>
                          <p className="text-sm text-gb-text leading-relaxed">{contract.description}</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* â•â• TAB: Line Items â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
                  {tab === "items" && (
                    <div className="space-y-4">
                      {contract.line_items?.length === 0 ? (
                        <div className="p-16 text-center border border-dashed border-gb-border rounded-2xl">
                          <FileText className="mx-auto text-gb-muted/20 mb-4" size={40} />
                          <p className="text-sm text-gb-muted italic">Aucune ligne de dÃ©compte enregistrÃ©e.</p>
                        </div>
                      ) : (
                        <div className="rounded-xl border border-gb-border overflow-hidden">
                          <div className="grid grid-cols-[2fr_1fr_80px_100px_100px_120px_80px_44px] gap-0 px-4 py-2.5 bg-gb-app/40 border-b border-gb-border">
                            {["Description", "Lot / Cat.", "QtÃ© / U.", "P.U.", "Total", "Avancement", "Statut", ""].map(h => (
                              <p key={h} className="text-[9px] font-black uppercase tracking-widest text-gb-muted">{h}</p>
                            ))}
                          </div>
                          {contract.line_items?.map((item: any, idx: number) => (
                            <div key={item.id} className={`grid grid-cols-[2fr_1fr_80px_100px_100px_120px_80px_44px] gap-0 px-4 py-3 ${idx < contract.line_items.length - 1 ? "border-b border-gb-border/40" : ""} hover:bg-gb-surface-hover`}>
                              <div>
                                <p className="text-xs font-medium text-gb-text line-clamp-2">{item.description}</p>
                              </div>
                              <div>
                                <p className="text-xs text-gb-text">{item.lot?.lot_number ? `Lot ${item.lot.lot_number}` : "â€”"}</p>
                                {item.category && <p className="text-[9px] text-gb-muted">{item.category}</p>}
                              </div>
                              <div>
                                <p className="text-xs font-bold text-gb-text">{Number(item.quantity).toLocaleString("fr-FR")}</p>
                                <p className="text-[9px] text-gb-muted">{item.unit}</p>
                              </div>
                              <p className="text-xs font-bold text-gb-text">{fmt(Number(item.unit_price), contract.currency)}</p>
                              <p className="text-xs font-black text-gb-text">{fmt(Number(item.total_price), contract.currency)}</p>
                              <div className="pr-3">
                                <div className="flex justify-between text-[9px] mb-1">
                                  <span className="text-gb-muted">Avancement</span>
                                  <span className="font-black text-gb-text">{Math.round(item.progress_pct || 0)}%</span>
                                </div>
                                <div className="h-1 bg-gb-app rounded-full overflow-hidden">
                                  <div className="h-full bg-gb-primary rounded-full" style={{ width: `${item.progress_pct || 0}%` }} />
                                </div>
                                {Number(item.billed_amount) > 0 && (
                                  <p className="text-[8px] text-emerald-600 mt-0.5">FacturÃ©: {fmt(Number(item.billed_amount), contract.currency)}</p>
                                )}
                              </div>
                              <div>
                                <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-black border ${
                                  item.status === "APPROVED" ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" :
                                  item.status === "REJECTED" ? "bg-red-500/10 text-red-600 border-red-500/20" :
                                  "bg-amber-500/10 text-amber-600 border-amber-500/20"
                                }`}>
                                  {item.status === "APPROVED" ? "OK" : item.status === "REJECTED" ? "Rej." : "Att."}
                                </span>
                              </div>
                              <button onClick={() => deleteItem(item.id)} className="flex items-center justify-center w-8 h-8 rounded-lg text-gb-muted hover:text-gb-danger hover:bg-gb-danger/10 transition-colors">
                                <Trash2 size={13} />
                              </button>
                            </div>
                          ))}
                          {/* Total row */}
                          <div className="grid grid-cols-[2fr_1fr_80px_100px_100px_120px_80px_44px] gap-0 px-4 py-3 bg-gb-app/40 border-t border-gb-border">
                            <p className="text-xs font-black text-gb-text col-span-4 uppercase tracking-wide">Total dÃ©compte</p>
                            <p className="text-sm font-black text-gb-primary">
                              {fmt(contract.line_items_total || 0, contract.currency)}
                            </p>
                            <div />
                            <div />
                            <div />
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* â•â• TAB: Change Orders â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
                  {tab === "changeorders" && (
                    <div className="space-y-3">
                      {contract.change_orders?.length === 0 ? (
                        <div className="p-16 text-center border border-dashed border-gb-border rounded-2xl">
                          <FileEdit className="mx-auto text-gb-muted/20 mb-4" size={40} />
                          <p className="text-sm text-gb-muted italic">Aucun avenant enregistrÃ©.</p>
                        </div>
                      ) : contract.change_orders?.map((co: any) => (
                        <div key={co.id} className="flex items-start justify-between p-4 rounded-xl border border-gb-border bg-gb-app/20 hover:bg-gb-app/40 transition-colors">
                          <div className="flex items-start gap-3">
                            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0">
                              <FileEdit size={15} />
                            </div>
                            <div>
                              <div className="flex items-center gap-2 mb-0.5">
                                <p className="text-sm font-black text-gb-text">#{co.number}</p>
                                <Badge status={co.status} map={CO_STATUS} />
                              </div>
                              <p className="text-xs font-medium text-gb-text">{co.title}</p>
                              {co.description && <p className="text-xs text-gb-muted italic mt-0.5 line-clamp-1">{co.description}</p>}
                              {co.reason && <p className="text-[10px] text-gb-muted mt-0.5">Motif : {co.reason}</p>}
                              {co.impact_days && <p className="text-[10px] text-orange-500 mt-0.5">Impact planning : +{co.impact_days} jours</p>}
                              <p className="text-[10px] text-gb-muted mt-1">{format(new Date(co.created_at), "d MMM yyyy", { locale: fr })}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 shrink-0">
                            <span className="text-base font-black text-emerald-500">+{fmt(Number(co.amount), contract.currency)}</span>
                            {co.status === "PENDING_APPROVAL" && (
                              <div className="flex gap-1.5">
                                <button
                                  onClick={() => approveCO(co.id, "approve")}
                                  disabled={approvingCO === co.id}
                                  className="px-2.5 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 text-[10px] font-black border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors disabled:opacity-50"
                                >
                                  {approvingCO === co.id ? "â€¦" : "Approuver"}
                                </button>
                                <button
                                  onClick={() => approveCO(co.id, "reject")}
                                  disabled={approvingCO === co.id}
                                  className="px-2.5 py-1.5 rounded-lg bg-red-500/10 text-red-600 text-[10px] font-black border border-red-500/20 hover:bg-red-500/20 transition-colors disabled:opacity-50"
                                >
                                  Refuser
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* â•â• TAB: Invoices â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
                  {tab === "invoices" && (
                    <div className="space-y-3">
                      {contract.invoices?.length === 0 ? (
                        <div className="p-16 text-center border border-dashed border-gb-border rounded-2xl">
                          <Receipt className="mx-auto text-gb-muted/20 mb-4" size={40} />
                          <p className="text-sm text-gb-muted italic">Aucune facture enregistrÃ©e.</p>
                        </div>
                      ) : contract.invoices?.map((inv: any) => {
                        const paid = (inv.payments || []).reduce((s: number, p: any) => s + Number(p.amount), 0);
                        const pct = Number(inv.amount) > 0 ? Math.min(100, (paid / Number(inv.amount)) * 100) : 0;
                        return (
                          <div key={inv.id} className="flex items-center justify-between p-4 rounded-xl border border-gb-border bg-gb-app/20 hover:bg-gb-app/40 transition-colors">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
                                <Receipt size={15} />
                              </div>
                              <div>
                                <div className="flex items-center gap-2 mb-0.5">
                                  <p className="text-sm font-black text-gb-text">{inv.number}</p>
                                  <Badge status={inv.status} map={INV_STATUS} />
                                </div>
                                <p className="text-[10px] text-gb-muted">
                                  Ã‰mise le {format(new Date(inv.invoice_date), "d MMM yyyy", { locale: fr })}
                                  {inv.due_date && ` Â· Ã‰chÃ©ance ${format(new Date(inv.due_date), "d MMM yyyy", { locale: fr })}`}
                                </p>
                                {inv.payments?.length > 0 && (
                                  <div className="flex items-center gap-2 mt-1.5">
                                    <div className="w-24 h-1 bg-gb-app rounded-full overflow-hidden">
                                      <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${pct}%` }} />
                                    </div>
                                    <span className="text-[9px] text-emerald-600 font-bold">{Math.round(pct)}% payÃ©</span>
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-base font-black text-gb-text">{fmt(Number(inv.amount), contract.currency)}</p>
                              {inv.retention && <p className="text-[10px] text-gb-muted">RG: {inv.retention}%</p>}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>

            {/* â”€â”€â”€ Footer â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
            <div className="p-4 border-t border-gb-border bg-gb-app/10 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2 text-[10px] text-gb-muted font-medium">
                <Clock size={11} />
                DerniÃ¨re modification : {format(new Date(contract.updated_at), "d MMM yyyy 'Ã ' HH:mm", { locale: fr })}
                {contract.createdBy && ` Â· CrÃ©Ã© par ${contract.createdBy.firstname} ${contract.createdBy.lastname}`}
              </div>
              <span className="text-[10px] font-black text-gb-muted uppercase">ID #{contract.id}</span>
            </div>
          </>
        ) : (
          <div className="p-20 text-center">
            <AlertTriangle className="mx-auto text-gb-muted/20 mb-4" size={40} />
            <p className="text-gb-muted">Impossible de charger ce contrat.</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
