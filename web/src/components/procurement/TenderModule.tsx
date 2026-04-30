import React, { useState, useEffect, useCallback } from "react";
import { apiFetch, API_BASE } from "../../lib/api";
import {
  FileText, Plus, Search, Loader2, Building2, Banknote,
  ChevronRight, AlertCircle, Filter, ClipboardList, Target,
  CheckCircle2, Calendar, TrendingUp,
} from "lucide-react";
import { Button } from "../ui/button";
import { motion, AnimatePresence } from "motion/react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import TenderDetailDrawer from "./TenderDetailDrawer";
import TenderFormDialog from "./TenderFormDialog";

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
  supplier: { id: number; name: string; email?: string };
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
  awarded_supplier_id?: number;
  document_url?: string;
  notes?: string;
  description?: string;
  project_id: number;
  lot_id?: number;
  project?: { id: number; code: string; title: string };
  lot?: { id: number; lot_number: string; name: string };
  awardedSupplier?: { id: number; name: string };
  bids: TenderBid[];
  createdBy?: { firstname: string; lastname: string };
  created_at: string;
}

const TYPE_CONFIG: Record<string, { label: string; bar: string }> = {
  OPEN:        { label: "Ouvert",    bar: "bg-blue-500" },
  RESTRICTED:  { label: "Restreint", bar: "bg-purple-500" },
  NEGOTIATED:  { label: "Negocie",   bar: "bg-amber-500" },
};

const CAT_CONFIG: Record<string, { label: string; color: string }> = {
  TRAVAUX:     { label: "Travaux",     color: "text-orange-500" },
  FOURNITURES: { label: "Fournitures", color: "text-cyan-500" },
  SERVICES:    { label: "Services",    color: "text-violet-500" },
  MOE:         { label: "MOE",         color: "text-pink-500" },
};

const STATUS_CONFIG: Record<string, { label: string; cls: string }> = {
  DRAFT:       { label: "Brouillon",   cls: "bg-gb-surface-hover text-gb-muted border-gb-border" },
  PUBLISHED:   { label: "Publie",      cls: "bg-blue-500/10 text-blue-500 border-blue-500/20" },
  OPEN:        { label: "Ouvert",      cls: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" },
  EVALUATION:  { label: "Evaluation",  cls: "bg-amber-500/10 text-amber-600 border-amber-500/20" },
  AWARDED:     { label: "Attribue",    cls: "bg-gb-primary/10 text-gb-primary border-gb-primary/20" },
  CANCELLED:   { label: "Annule",      cls: "bg-gb-danger/10 text-gb-danger border-gb-danger/20" },
  CLOSED:      { label: "Cloture",     cls: "bg-gb-surface-hover text-gb-muted border-gb-border" },
};

const fmt = (n: number, currency = "EUR") =>
  new Intl.NumberFormat("fr-FR", { style: "currency", currency, maximumFractionDigits: 0 }).format(n);

function KpiCard({ label, value, sub, icon: Icon, accent }: {
  label: string; value: string | number; sub?: string;
  icon: React.ElementType; accent: string;
}) {
  return (
    <div className="bg-gb-surface-solid border border-gb-border rounded-2xl p-5 flex items-start gap-4">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${accent}`}>
        <Icon size={18} />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-black uppercase tracking-widest text-gb-muted">{label}</p>
        <p className="text-2xl font-extrabold text-gb-text leading-tight mt-0.5">{value}</p>
        {sub && <p className="text-xs text-gb-muted mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? { label: status, cls: "bg-gb-surface-hover text-gb-muted border-gb-border" };
  return (
    <span className={`inline-flex items-center h-6 px-2.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${cfg.cls}`}>
      {cfg.label}
    </span>
  );
}

export default function TenderModule() {
  const [tenders, setTenders] = useState<Tender[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editTender, setEditTender] = useState<Tender | null>(null);

  const fetchTenders = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterType)     params.set("type", filterType);
      if (filterStatus)   params.set("status", filterStatus);
      if (filterCategory) params.set("category", filterCategory);
      const res = await apiFetch(`${API_BASE}/procurement/tenders?${params}`);
      const data = await res.json();
      setTenders(Array.isArray(data) ? data : []);
    } catch {
      setTenders([]);
    } finally {
      setLoading(false);
    }
  }, [filterType, filterStatus, filterCategory]);

  useEffect(() => { fetchTenders(); }, [fetchTenders]);

  const filtered = tenders.filter(t =>
    !search ||
    t.title.toLowerCase().includes(search.toLowerCase()) ||
    (t.reference ?? "").toLowerCase().includes(search.toLowerCase()) ||
    (t.project?.title ?? "").toLowerCase().includes(search.toLowerCase())
  );

  const total       = tenders.length;
  const totalBudget = tenders.reduce((s, t) => s + (t.budget_estimate ?? 0), 0);
  const inEval      = tenders.filter(t => t.status === "EVALUATION").length;
  const awarded     = tenders.filter(t => t.status === "AWARDED").length;

  const selectCls = "bg-gb-app border border-gb-border rounded-xl h-10 px-3 text-sm text-gb-text focus:ring-2 focus:ring-gb-primary outline-none transition-all";

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Total AOs" value={total} icon={ClipboardList} accent="bg-blue-500/10 text-blue-500" />
        <KpiCard label="Budget estime" value={fmt(totalBudget)} icon={Banknote} accent="bg-emerald-500/10 text-emerald-600" sub="cumul tous AOs" />
        <KpiCard label="En evaluation" value={inEval} icon={TrendingUp} accent="bg-amber-500/10 text-amber-600" />
        <KpiCard label="Attribues" value={awarded} icon={CheckCircle2} accent="bg-gb-primary/10 text-gb-primary" />
      </div>

      <div className="bg-gb-surface-solid border border-gb-border rounded-2xl p-4 flex flex-col md:flex-row gap-3 items-center">
        <div className="relative flex-1 min-w-0">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gb-muted pointer-events-none" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher un AO, reference, projet..."
            className="w-full bg-gb-app border border-gb-border rounded-xl h-10 pl-8 pr-4 text-sm text-gb-text placeholder:text-gb-muted focus:ring-2 focus:ring-gb-primary outline-none transition-all"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          <select value={filterType} onChange={e => setFilterType(e.target.value)} className={selectCls}>
            <option value="">Tous types</option>
            {Object.entries(TYPE_CONFIG).map(([v, c]) => <option key={v} value={v}>{c.label}</option>)}
          </select>
          <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)} className={selectCls}>
            <option value="">Toutes categories</option>
            {Object.entries(CAT_CONFIG).map(([v, c]) => <option key={v} value={v}>{c.label}</option>)}
          </select>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className={selectCls}>
            <option value="">Tous statuts</option>
            {Object.entries(STATUS_CONFIG).map(([v, c]) => <option key={v} value={v}>{c.label}</option>)}
          </select>
          <Button
            onClick={() => { setEditTender(null); setFormOpen(true); }}
            className="h-10 px-4 rounded-xl shadow-lg shadow-gb-primary/20 text-sm"
          >
            <Plus size={16} className="mr-1.5" /> Nouvel AO
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center p-20">
          <Loader2 className="w-8 h-8 text-gb-primary animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="p-20 text-center bg-gb-surface-solid border border-dashed border-gb-border rounded-3xl">
          <ClipboardList className="mx-auto text-gb-muted/20 mb-6" size={64} />
          <h3 className="text-xl font-bold text-gb-text mb-2">Aucun appel d offres</h3>
          <p className="text-gb-muted text-sm">Creez votre premier AO pour lancer le processus de consultation.</p>
        </div>
      ) : (
        <div className="bg-gb-surface-solid border border-gb-border rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gb-border">
                <th className="w-1" />
                <th className="py-3 px-4 text-left text-[10px] font-black uppercase tracking-widest text-gb-muted">Appel d offres</th>
                <th className="py-3 px-4 text-left text-[10px] font-black uppercase tracking-widest text-gb-muted hidden lg:table-cell">Categorie</th>
                <th className="py-3 px-4 text-right text-[10px] font-black uppercase tracking-widest text-gb-muted hidden md:table-cell">Budget estime</th>
                <th className="py-3 px-4 text-center text-[10px] font-black uppercase tracking-widest text-gb-muted hidden md:table-cell">Offres</th>
                <th className="py-3 px-4 text-left text-[10px] font-black uppercase tracking-widest text-gb-muted hidden xl:table-cell">Echeance</th>
                <th className="py-3 px-4 text-left text-[10px] font-black uppercase tracking-widest text-gb-muted">Statut</th>
                <th className="w-10" />
              </tr>
            </thead>
            <tbody>
              <AnimatePresence initial={false}>
                {filtered.map((t, i) => {
                  const typeCfg = TYPE_CONFIG[t.type] ?? { label: t.type, bar: "bg-gb-muted" };
                  const catCfg  = CAT_CONFIG[t.category] ?? { label: t.category, color: "text-gb-muted" };
                  const minBid  = t.bids.length ? Math.min(...t.bids.map(b => b.amount)) : null;
                  return (
                    <motion.tr
                      key={t.id}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.03 }}
                      onClick={() => { setSelectedId(t.id); setDrawerOpen(true); }}
                      className="border-b border-gb-border/50 last:border-0 hover:bg-gb-surface-hover cursor-pointer group transition-colors"
                    >
                      <td className="pl-3 pr-0 py-4">
                        <div className={`w-1 h-10 rounded-full ${typeCfg.bar}`} title={typeCfg.label} />
                      </td>
                      <td className="px-4 py-4">
                        <p className="font-bold text-gb-text">{t.title}</p>
                        <p className="text-[11px] text-gb-muted mt-0.5 flex items-center gap-1.5">
                          {t.reference && <span className="font-mono">{t.reference}</span>}
                          {t.reference && t.project && <span> - </span>}
                          {t.project && <span>{t.project.title}</span>}
                          {t.awardedSupplier && (
                            <span className="text-gb-primary font-semibold flex items-center gap-1">
                              - <CheckCircle2 size={10} /> {t.awardedSupplier.name}
                            </span>
                          )}
                        </p>
                      </td>
                      <td className="px-4 py-4 hidden lg:table-cell">
                        <span className={`text-xs font-bold ${catCfg.color}`}>{catCfg.label}</span>
                      </td>
                      <td className="px-4 py-4 text-right hidden md:table-cell">
                        {t.budget_estimate ? (
                          <div>
                            <p className="font-bold text-gb-text">{fmt(t.budget_estimate, t.currency)}</p>
                            {minBid && <p className="text-[10px] text-gb-muted">min offre : {fmt(minBid, t.currency)}</p>}
                          </div>
                        ) : (
                          <span className="text-gb-muted text-xs">-</span>
                        )}
                      </td>
                      <td className="px-4 py-4 text-center hidden md:table-cell">
                        <div className="flex items-center justify-center gap-1.5">
                          <span className="font-black text-gb-text text-base">{t.bids.length}</span>
                          <Target size={12} className="text-gb-muted" />
                        </div>
                      </td>
                      <td className="px-4 py-4 hidden xl:table-cell">
                        {t.submission_deadline ? (
                          <div className="flex items-center gap-1.5 text-xs text-gb-muted">
                            <Calendar size={12} />
                            {format(new Date(t.submission_deadline), "dd MMM yyyy", { locale: fr })}
                          </div>
                        ) : (
                          <span className="text-gb-muted text-xs">-</span>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        <StatusBadge status={t.status} />
                      </td>
                      <td className="pr-3">
                        <ChevronRight size={16} className="text-gb-muted group-hover:text-gb-primary transition-colors" />
                      </td>
                    </motion.tr>
                  );
                })}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
      )}

      <TenderDetailDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        tenderId={selectedId}
        onUpdated={fetchTenders}
        onEdit={(t) => { setEditTender(t as unknown as Tender); setFormOpen(true); }}
      />

      <TenderFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        tender={editTender}
        onSaved={() => { setFormOpen(false); fetchTenders(); }}
      />
    </div>
  );
}