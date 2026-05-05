import React, { useState, useEffect, useCallback } from "react";
import { apiFetch, API_BASE } from "../../lib/api";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "../ui/dialog";
import {
  FileText, Building2, Banknote, Target, Loader2, CheckCircle2,
  Clock, XCircle, AlertTriangle, Calendar, Edit3, Award,
  BarChart2, Layers, Hash, Download, Trash2, ChevronDown,
} from "lucide-react";
import { Button } from "../ui/button";
import { motion, AnimatePresence } from "motion/react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface TenderBid {
  id: number;
  supplier_id: number;
  amount: number;
  status: string;
  technical_score?: number;
  financial_score?: number;
  total_score?: number;
  rank?: number;
  is_compliant: boolean;
  validity_period?: number;
  notes?: string;
  document_id?: number;
  submitted_at?: string;
  supplier: { id: number; name: string; email?: string; contact_name?: string };
}

interface TenderDocumentItem {
  id: number;
  name: string;
  file_url?: string;
  file_name?: string;
  file_size?: number;
  file_type?: string;
  category?: string;
}

interface Tender {
  id: number;
  reference?: string;
  title: string;
  type: string;
  category: string;
  status: string;
  currency: string;
  budget_estimate?: number;
  submission_deadline?: string;
  opening_date?: string;
  award_date?: string;
  description?: string;
  notes?: string;
  awarded_supplier_id?: number;
  project_id: number;
  lot_id?: number;
  project?: { id: number; code: string; title: string };
  lot?: { id: number; lot_number: string; name: string };
  awardedSupplier?: { id: number; name: string };
  bids: TenderBid[];
  documents?: TenderDocumentItem[];
  createdBy?: { firstname: string; lastname: string };
  created_at: string;
  updated_at: string;
}

const STATUS_LABELS: Record<string, { label: string; cls: string }> = {
  DRAFT:      { label: "Brouillon",   cls: "bg-gb-surface-hover text-gb-muted border-gb-border" },
  PUBLISHED:  { label: "Publié",      cls: "bg-blue-500/10 text-blue-500 border-blue-500/20" },
  OPEN:       { label: "Ouvert",      cls: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" },
  EVALUATION: { label: "Évaluation",  cls: "bg-amber-500/10 text-amber-600 border-amber-500/20" },
  AWARDED:    { label: "Attribué",    cls: "bg-gb-primary/10 text-gb-primary border-gb-primary/20" },
  CANCELLED:  { label: "Annulé",      cls: "bg-gb-danger/10 text-gb-danger border-gb-danger/20" },
  CLOSED:     { label: "Clôturé",     cls: "bg-gb-surface-hover text-gb-muted border-gb-border" },
};

const BID_STATUS: Record<string, { label: string; cls: string; icon: React.ElementType }> = {
  SUBMITTED:  { label: "Reçue",       cls: "text-blue-500",    icon: Clock },
  EVALUATED:  { label: "Évaluée",     cls: "text-amber-600",   icon: BarChart2 },
  ACCEPTED:   { label: "Retenue",     cls: "text-emerald-600", icon: CheckCircle2 },
  REJECTED:   { label: "Rejetée",     cls: "text-gb-danger",   icon: XCircle },
  WITHDRAWN:  { label: "Retirée",     cls: "text-gb-muted",    icon: XCircle },
};

const TYPE_LABELS: Record<string, string> = {
  OPEN: "Appel d'offres ouvert",
  RESTRICTED: "Appel d'offres restreint",
  NEGOTIATED: "Marché négocié",
};

const CAT_LABELS: Record<string, string> = {
  TRAVAUX: "Travaux", FOURNITURES: "Fournitures", SERVICES: "Services", MOE: "Maîtrise d'œuvre",
};

const fmt = (n: number, currency = "EUR") =>
  new Intl.NumberFormat("fr-FR", { style: "currency", currency, maximumFractionDigits: 0 }).format(n);

const fmtDate = (d?: string) => d ? format(new Date(d), "dd MMM yyyy", { locale: fr }) : "—";

function ScoreBar({ value, max = 100, color }: { value?: number; max?: number; color: string }) {
  if (value == null) return <span className="text-gb-muted text-xs">—</span>;
  const pct = Math.min(100, (value / max) * 100);
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-gb-border rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-bold text-gb-text w-8 text-right">{value}</span>
    </div>
  );
}

type Tab = "overview" | "bids" | "award";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  tenderId: number | null;
  onUpdated?: () => void;
  onEdit?: (t: Tender) => void;
}

export default function TenderDetailDrawer({ open, onOpenChange, tenderId, onUpdated, onEdit }: Props) {
  const [tender, setTender] = useState<Tender | null>(null);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<Tab>("overview");
  const [awarding, setAwarding] = useState(false);
  const [awardingBidId, setAwardingBidId] = useState<number | null>(null);
  const [evaluatingBid, setEvaluatingBid] = useState<number | null>(null);
  const [evalForm, setEvalForm] = useState<Record<number, { tech: string; fin: string; notes: string }>>({});

  const fetchTender = useCallback(async () => {
    if (!tenderId) return;
    setLoading(true);
    try {
      const res = await apiFetch(`${API_BASE}/procurement/tenders/${tenderId}`);
      const data = await res.json();
      setTender(data);
    } catch {
      setTender(null);
    } finally {
      setLoading(false);
    }
  }, [tenderId]);

  useEffect(() => {
    if (open && tenderId) { fetchTender(); setTab("overview"); }
  }, [open, tenderId, fetchTender]);

  const awardBid = async (bidId: number) => {
    if (!tender) return;
    setAwarding(true);
    setAwardingBidId(bidId);
    try {
      await apiFetch(`${API_BASE}/procurement/tenders/${tender.id}/award`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bid_id: bidId }),
      });
      await fetchTender();
      onUpdated?.();
    } finally {
      setAwarding(false);
      setAwardingBidId(null);
    }
  };

  const saveEval = async (bidId: number) => {
    const f = evalForm[bidId];
    if (!f) return;
    const tech = f.tech ? parseFloat(f.tech) : undefined;
    const fin  = f.fin  ? parseFloat(f.fin)  : undefined;
    const total = (tech != null && fin != null) ? (tech * 0.6 + fin * 0.4) : undefined;
    await apiFetch(`${API_BASE}/procurement/tenders/${tender!.id}/bids/${bidId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ technical_score: tech, financial_score: fin, total_score: total, notes: f.notes, status: "EVALUATED" }),
    });
    setEvaluatingBid(null);
    fetchTender();
  };

  const deleteBid = async (bidId: number) => {
    if (!confirm("Supprimer cette offre ?")) return;
    await apiFetch(`${API_BASE}/procurement/tenders/${tender!.id}/bids/${bidId}`, { method: "DELETE" });
    fetchTender();
  };

  if (!open) return null;

  const tabs: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: "overview", label: "Vue d'ensemble", icon: FileText },
    { id: "bids",     label: `Offres reçues (${tender?.bids?.length ?? 0})`, icon: Target },
    { id: "award",    label: "Attribution",    icon: Award },
  ];

  const status = tender ? (STATUS_LABELS[tender.status] ?? { label: tender.status, cls: "bg-gb-surface-hover text-gb-muted border-gb-border" }) : null;
  const sortedBids = tender ? [...tender.bids].sort((a, b) => (b.total_score ?? 0) - (a.total_score ?? 0)) : [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl w-full h-[90vh] flex flex-col p-0 gap-0 overflow-hidden rounded-2xl">
        {/* Header */}
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-gb-border shrink-0">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center shrink-0">
                <FileText size={18} className="text-blue-500" />
              </div>
              <div className="min-w-0">
                {loading || !tender ? (
                  <div className="h-6 w-56 bg-gb-border rounded animate-pulse" />
                ) : (
                  <>
                    <DialogTitle className="text-lg font-extrabold text-gb-text leading-tight truncate">
                      {tender.title}
                    </DialogTitle>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      {tender.reference && (
                        <span className="text-[10px] font-mono text-gb-muted">{tender.reference}</span>
                      )}
                      {status && (
                        <span className={`inline-flex items-center h-5 px-2 rounded-full text-[9px] font-black uppercase tracking-widest border ${status.cls}`}>
                          {status.label}
                        </span>
                      )}
                      {tender.category && (
                        <span className="text-[10px] font-bold text-gb-muted uppercase">{CAT_LABELS[tender.category] ?? tender.category}</span>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
            {tender && onEdit && (
              <Button variant="outline" size="sm" className="shrink-0 h-8 rounded-lg border-gb-border text-xs"
                onClick={() => onEdit(tender)}>
                <Edit3 size={12} className="mr-1" /> Modifier
              </Button>
            )}
          </div>
          {/* Tabs */}
          <div className="flex gap-1 mt-4">
            {tabs.map(t => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-bold transition-all ${
                  tab === t.id
                    ? "bg-gb-primary/10 text-gb-primary"
                    : "text-gb-muted hover:text-gb-text hover:bg-gb-surface-hover"
                }`}
              >
                <t.icon size={12} />
                {t.label}
              </button>
            ))}
          </div>
        </DialogHeader>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 text-gb-primary animate-spin" />
            </div>
          ) : !tender ? (
            <div className="text-center py-20 text-gb-muted">Impossible de charger l'AO.</div>
          ) : (
            <AnimatePresence mode="wait">
              <motion.div key={tab} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.18 }}>
                {/* ─── Overview ─── */}
                {tab === "overview" && (
                  <div className="space-y-6">
                    {/* Info grid */}
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {[
                        { icon: Layers,    label: "Type",           value: TYPE_LABELS[tender.type] ?? tender.type },
                        { icon: Layers,    label: "Catégorie",      value: CAT_LABELS[tender.category] ?? tender.category },
                        { icon: Building2, label: "Projet",         value: tender.project ? `${tender.project.code} — ${tender.project.title}` : "—" },
                        { icon: Layers,    label: "Lot",            value: tender.lot ? `Lot ${tender.lot.lot_number} — ${tender.lot.name}` : "—" },
                        { icon: Banknote,  label: "Budget estimé",  value: tender.budget_estimate ? fmt(tender.budget_estimate, tender.currency) : "—" },
                        { icon: Calendar,  label: "Délai dépôt",    value: fmtDate(tender.submission_deadline) },
                        { icon: Calendar,  label: "Date ouverture", value: fmtDate(tender.opening_date) },
                        { icon: Calendar,  label: "Date attribution",value: fmtDate(tender.award_date) },
                        { icon: Hash,      label: "Créé par",       value: tender.createdBy ? `${tender.createdBy.firstname} ${tender.createdBy.lastname}` : "—" },
                      ].map(({ icon: Icon, label, value }) => (
                        <div key={label} className="bg-gb-app border border-gb-border rounded-xl p-4">
                          <div className="flex items-center gap-2 mb-1">
                            <Icon size={12} className="text-gb-muted" />
                            <p className="text-[9px] font-black uppercase tracking-widest text-gb-muted">{label}</p>
                          </div>
                          <p className="text-sm font-bold text-gb-text">{value}</p>
                        </div>
                      ))}
                    </div>
                    {/* Description */}
                    {tender.description && (
                      <div className="bg-gb-app border border-gb-border rounded-xl p-4">
                        <p className="text-[9px] font-black uppercase tracking-widest text-gb-muted mb-2">Description</p>
                        <p className="text-sm text-gb-text whitespace-pre-wrap leading-relaxed">{tender.description}</p>
                      </div>
                    )}
                    {/* Notes */}
                    {tender.notes && (
                      <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-4 flex gap-3">
                        <AlertTriangle size={14} className="text-amber-600 shrink-0 mt-0.5" />
                        <p className="text-sm text-gb-text">{tender.notes}</p>
                      </div>
                    )}
                    {/* Documents */}
                    {(() => {
                      // New approach: tender.documents is Document[] (direct FK)
                      const docs: Array<{ url: string; filename: string }> =
                        tender.documents && tender.documents.length > 0
                        ? tender.documents.map(doc => ({
                            url: doc.file_url ?? "",
                            filename: doc.file_name ?? doc.name,
                          }))
                        : [];
                      if (docs.length === 0) return null;
                      return (
                        <div className="space-y-2">
                          {docs.map((doc, idx) => (
                            <a
                              key={`${doc.url}-${idx}`}
                              href={doc.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 text-sm text-gb-primary hover:underline font-medium"
                            >
                              <Download size={14} />
                              {doc.filename}
                            </a>
                          ))}
                        </div>
                      );
                    })()}
                  </div>
                )}

                {/* ─── Bids ─── */}
                {tab === "bids" && (
                  <div className="space-y-4">
                    {sortedBids.length === 0 ? (
                      <div className="text-center py-16 text-gb-muted">
                        <Target className="mx-auto mb-4 opacity-20" size={48} />
                        <p className="font-medium">Aucune offre reçue</p>
                      </div>
                    ) : (
                      <div className="bg-gb-app border border-gb-border rounded-xl overflow-hidden">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-gb-border bg-gb-surface-solid">
                              <th className="py-3 px-4 text-left text-[9px] font-black uppercase tracking-widest text-gb-muted">Fournisseur</th>
                              <th className="py-3 px-4 text-right text-[9px] font-black uppercase tracking-widest text-gb-muted">Montant</th>
                              <th className="py-3 px-4 text-[9px] font-black uppercase tracking-widest text-gb-muted hidden md:table-cell">Note tech. (60%)</th>
                              <th className="py-3 px-4 text-[9px] font-black uppercase tracking-widest text-gb-muted hidden md:table-cell">Note fin. (40%)</th>
                              <th className="py-3 px-4 text-right text-[9px] font-black uppercase tracking-widest text-gb-muted hidden md:table-cell">Score total</th>
                              <th className="py-3 px-4 text-center text-[9px] font-black uppercase tracking-widest text-gb-muted">Conforme</th>
                              <th className="py-3 px-4 text-left text-[9px] font-black uppercase tracking-widest text-gb-muted">Statut</th>
                              <th className="w-10" />
                            </tr>
                          </thead>
                          <tbody>
                            {sortedBids.map((bid, i) => {
                              const bst = BID_STATUS[bid.status] ?? BID_STATUS["SUBMITTED"];
                              const BIcon = bst.icon;
                              const isEval = evaluatingBid === bid.id;
                              const ef = evalForm[bid.id] ?? { tech: String(bid.technical_score ?? ""), fin: String(bid.financial_score ?? ""), notes: bid.notes ?? "" };
                              return (
                                <React.Fragment key={bid.id}>
                                  <tr className={`border-b border-gb-border/50 last:border-0 ${bid.status === "ACCEPTED" ? "bg-emerald-500/5" : ""}`}>
                                    <td className="px-4 py-3">
                                      <p className="font-bold text-gb-text">{bid.supplier.name}</p>
                                      {bid.supplier.contact_name && <p className="text-[10px] text-gb-muted">{bid.supplier.contact_name}</p>}
                                    </td>
                                    <td className="px-4 py-3 text-right font-bold text-gb-text whitespace-nowrap">
                                      {fmt(bid.amount, tender.currency)}
                                      {tender.budget_estimate && bid.amount > 0 && (
                                        <p className={`text-[9px] font-medium ${bid.amount <= tender.budget_estimate ? "text-emerald-600" : "text-gb-danger"}`}>
                                          {bid.amount <= tender.budget_estimate ? "Dans budget" : "Hors budget"}
                                        </p>
                                      )}
                                    </td>
                                    <td className="px-4 py-3 hidden md:table-cell">
                                      <ScoreBar value={bid.technical_score} color="bg-blue-500" />
                                    </td>
                                    <td className="px-4 py-3 hidden md:table-cell">
                                      <ScoreBar value={bid.financial_score} color="bg-emerald-500" />
                                    </td>
                                    <td className="px-4 py-3 text-right hidden md:table-cell">
                                      {bid.total_score != null ? (
                                        <span className="text-base font-extrabold text-gb-text">{bid.total_score.toFixed(1)}</span>
                                      ) : <span className="text-gb-muted">—</span>}
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                      {bid.is_compliant
                                        ? <CheckCircle2 size={14} className="text-emerald-600 mx-auto" />
                                        : <XCircle size={14} className="text-gb-danger mx-auto" />}
                                    </td>
                                    <td className="px-4 py-3">
                                      <span className={`flex items-center gap-1 text-xs font-bold ${bst.cls}`}>
                                        <BIcon size={11} /> {bst.label}
                                      </span>
                                    </td>
                                    <td className="px-2 py-3">
                                      <div className="flex gap-1">
                                        {bid.status !== "ACCEPTED" && bid.status !== "REJECTED" && (
                                          <button
                                            onClick={() => { setEvaluatingBid(isEval ? null : bid.id); setEvalForm(f => ({ ...f, [bid.id]: ef })); }}
                                            className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-600 hover:bg-amber-500/20 flex items-center justify-center transition-colors"
                                            title="Évaluer"
                                          >
                                            <BarChart2 size={12} />
                                          </button>
                                        )}
                                        <button
                                          onClick={() => deleteBid(bid.id)}
                                          className="w-7 h-7 rounded-lg bg-gb-danger/10 text-gb-danger hover:bg-gb-danger/20 flex items-center justify-center transition-colors"
                                          title="Supprimer"
                                        >
                                          <Trash2 size={12} />
                                        </button>
                                      </div>
                                    </td>
                                  </tr>
                                  {isEval && (
                                    <tr className="bg-amber-500/5 border-b border-gb-border/50">
                                      <td colSpan={8} className="px-4 py-3">
                                        <div className="flex flex-wrap gap-3 items-end">
                                          <div className="flex flex-col gap-1">
                                            <label className="text-[9px] font-black uppercase tracking-widest text-gb-muted">Note technique /100</label>
                                            <input type="number" min={0} max={100} value={ef.tech}
                                              onChange={e => setEvalForm(f => ({ ...f, [bid.id]: { ...ef, tech: e.target.value } }))}
                                              className="w-24 bg-gb-surface-solid border border-gb-border rounded-lg h-8 px-2 text-sm text-gb-text outline-none focus:ring-2 focus:ring-gb-primary" />
                                          </div>
                                          <div className="flex flex-col gap-1">
                                            <label className="text-[9px] font-black uppercase tracking-widest text-gb-muted">Note financière /100</label>
                                            <input type="number" min={0} max={100} value={ef.fin}
                                              onChange={e => setEvalForm(f => ({ ...f, [bid.id]: { ...ef, fin: e.target.value } }))}
                                              className="w-24 bg-gb-surface-solid border border-gb-border rounded-lg h-8 px-2 text-sm text-gb-text outline-none focus:ring-2 focus:ring-gb-primary" />
                                          </div>
                                          <div className="flex flex-col gap-1 flex-1 min-w-[150px]">
                                            <label className="text-[9px] font-black uppercase tracking-widest text-gb-muted">Commentaire</label>
                                            <input type="text" value={ef.notes} placeholder="Observations…"
                                              onChange={e => setEvalForm(f => ({ ...f, [bid.id]: { ...ef, notes: e.target.value } }))}
                                              className="bg-gb-surface-solid border border-gb-border rounded-lg h-8 px-2 text-sm text-gb-text outline-none focus:ring-2 focus:ring-gb-primary" />
                                          </div>
                                          <Button size="sm" className="h-8 rounded-lg text-xs" onClick={() => saveEval(bid.id)}>
                                            Enregistrer
                                          </Button>
                                          <button className="h-8 px-2 text-xs text-gb-muted hover:text-gb-text" onClick={() => setEvaluatingBid(null)}>
                                            Annuler
                                          </button>
                                        </div>
                                      </td>
                                    </tr>
                                  )}
                                </React.Fragment>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}

                {/* ─── Award ─── */}
                {tab === "award" && (
                  <div className="space-y-5">
                    {tender.status === "AWARDED" ? (
                      <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-2xl p-6 flex items-center gap-5">
                        <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0">
                          <Award size={24} className="text-emerald-600" />
                        </div>
                        <div>
                          <p className="text-[9px] font-black uppercase tracking-widest text-gb-muted mb-1">AO Attribué</p>
                          <p className="text-xl font-extrabold text-gb-text">{tender.awardedSupplier?.name}</p>
                          {tender.award_date && (
                            <p className="text-xs text-gb-muted mt-0.5">le {fmtDate(tender.award_date)}</p>
                          )}
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="bg-gb-app border border-gb-border rounded-xl p-4">
                          <p className="text-xs text-gb-muted leading-relaxed">
                            Sélectionnez l'offre à retenir. Toutes les autres offres seront automatiquement rejetées et le statut de l'AO passera à <strong>Attribué</strong>.
                          </p>
                        </div>
                        {sortedBids.filter(b => b.is_compliant && b.status !== "REJECTED" && b.status !== "WITHDRAWN").length === 0 ? (
                          <div className="text-center py-10 text-gb-muted">
                            <AlertTriangle className="mx-auto mb-3 opacity-40" size={32} />
                            <p className="text-sm">Aucune offre conforme disponible</p>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {sortedBids
                              .filter(b => b.is_compliant && b.status !== "REJECTED" && b.status !== "WITHDRAWN")
                              .map((bid, i) => (
                                <div key={bid.id}
                                  className={`flex items-center justify-between bg-gb-surface-solid border rounded-xl p-4 gap-4 ${i === 0 ? "border-emerald-500/40 bg-emerald-500/5" : "border-gb-border"}`}
                                >
                                  <div className="flex items-center gap-3">
                                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-black ${i === 0 ? "bg-emerald-500 text-white" : "bg-gb-border text-gb-muted"}`}>
                                      {i + 1}
                                    </div>
                                    <div>
                                      <p className="font-bold text-gb-text">{bid.supplier.name}</p>
                                      <p className="text-xs text-gb-muted">{fmt(bid.amount, tender.currency)}</p>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-4">
                                    {bid.total_score != null && (
                                      <div className="text-center">
                                        <p className="text-[9px] font-black uppercase tracking-widest text-gb-muted">Score</p>
                                        <p className="text-lg font-extrabold text-gb-text">{bid.total_score.toFixed(1)}</p>
                                      </div>
                                    )}
                                    <Button
                                      size="sm"
                                      className={`h-8 rounded-lg text-xs ${i === 0 ? "shadow-lg shadow-emerald-500/20 bg-emerald-600 hover:bg-emerald-700" : ""}`}
                                      onClick={() => awardBid(bid.id)}
                                      disabled={awarding}
                                    >
                                      {awarding && awardingBidId === bid.id ? <Loader2 size={12} className="animate-spin mr-1" /> : <Award size={12} className="mr-1" />}
                                      Attribuer
                                    </Button>
                                  </div>
                                </div>
                              ))}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          )}
        </div>

        {/* Footer */}
        {tender && (
          <div className="px-6 py-3 border-t border-gb-border bg-gb-app shrink-0 flex justify-between items-center">
            <span className="text-[10px] font-mono text-gb-muted">ID #{tender.id}</span>
            <span className="text-[10px] text-gb-muted">Mis à jour le {fmtDate(tender.updated_at)}</span>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
