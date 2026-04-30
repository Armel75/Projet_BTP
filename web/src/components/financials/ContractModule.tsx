import React, { useState, useEffect, useCallback } from "react";
import { apiFetch } from "../../lib/api";
import {
  FileSignature, Plus, Search, Loader2,
  Building2, Banknote, ChevronRight, TrendingUp, AlertCircle, X,
  FileText, Calendar, Filter,
} from "lucide-react";
import { Button } from "../ui/button";
import { motion, AnimatePresence } from "motion/react";
import { format } from "date-fns";
import ContractDetailDrawer from "./ContractDetailDrawer";
import ContractFormDialog from "./ContractFormDialog";

const API_BASE = import.meta.env.VITE_API_URL;

interface Contract {
  id: number;
  reference: string;
  title: string;
  type: string;
  category?: string;
  status: string;
  currency: string;
  amount: number;
  base_amount: number;
  approved_change_amount: number;
  revised_total_amount: number;
  total_invoiced: number;
  billing_progress_pct: number;
  signed_at?: string;
  start_date?: string;
  end_date?: string;
  supplier?: { id: number; name: string };
  project?: { id: number; code: string; title: string };
  change_orders?: any[];
  line_items?: any[];
  invoices?: any[];
}

const TYPE_CONFIG: Record<string, { label: string; color: string; bar: string }> = {
  OWNER:       { label: "Client",         color: "text-blue-600",    bar: "bg-blue-500" },
  SUBCONTRACT: { label: "Sous-traitance", color: "text-purple-600",  bar: "bg-purple-500" },
  SUPPLY:      { label: "Fournitures",    color: "text-amber-600",   bar: "bg-amber-500" },
  CONSULTING:  { label: "Conseil/MOE",    color: "text-emerald-600", bar: "bg-emerald-500" },
};

const STATUS_CONFIG: Record<string, { label: string; cls: string }> = {
  DRAFT:             { label: "Brouillon",        cls: "bg-gb-app text-gb-muted border-gb-border" },
  PENDING_SIGNATURE: { label: "En attente sign.", cls: "bg-amber-500/10 text-amber-600 border-amber-500/20" },
  APPROVED:          { label: "Approuve",         cls: "bg-blue-500/10 text-blue-600 border-blue-500/20" },
  EXECUTED:          { label: "Execute",          cls: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" },
  SUSPENDED:         { label: "Suspendu",         cls: "bg-orange-500/10 text-orange-600 border-orange-500/20" },
  TERMINATED:        { label: "Resilie",          cls: "bg-red-500/10 text-red-600 border-red-500/20" },
  CLOSED:            { label: "Cloture",          cls: "bg-gb-muted/10 text-gb-muted border-gb-muted/20" },
};

const fmt = (n: number, currency = "EUR") =>
  new Intl.NumberFormat("fr-FR", { style: "currency", currency, maximumFractionDigits: 0 }).format(n);

function KpiCard({ label, value, sub, color, icon: Icon }: {
  label: string; value: string; sub?: string; color: string; icon: React.ElementType;
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl border bg-gb-surface-solid border-gb-border p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-gb-muted mb-2">{label}</p>
          <p className={`text-2xl font-black tracking-tighter ${color}`}>{value}</p>
          {sub && <p className="text-xs text-gb-muted mt-1 font-medium">{sub}</p>}
        </div>
      </div>
      <Icon size={48} className={`absolute -bottom-3 -right-3 opacity-[0.04] ${color}`} />
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] || { label: status, cls: "bg-gb-app text-gb-muted border-gb-border" };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black border ${cfg.cls}`}>
      {cfg.label}
    </span>
  );
}

export default function ContractModule() {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [filterType, setFilterType] = useState("ALL");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editContract, setEditContract] = useState<Contract | null>(null);

  const fetchContracts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterStatus !== "ALL") params.set("status", filterStatus);
      if (filterType !== "ALL") params.set("type", filterType);
      const res = await apiFetch(`${API_BASE}/contracts?${params}`);
      if (res.ok) setContracts(await res.json());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [filterStatus, filterType]);

  useEffect(() => { fetchContracts(); }, [fetchContracts]);

  const openDetail = (id: number) => { setSelectedId(id); setDrawerOpen(true); };
  const openCreate = () => { setEditContract(null); setFormOpen(true); };
  const onSaved = () => { setFormOpen(false); fetchContracts(); };

  const filtered = contracts.filter(c => {
    const q = search.toLowerCase();
    return !q ||
      c.reference?.toLowerCase().includes(q) ||
      c.title?.toLowerCase().includes(q) ||
      c.supplier?.name?.toLowerCase().includes(q) ||
      c.project?.title?.toLowerCase().includes(q);
  });

  const active = contracts.filter(c => ["APPROVED", "EXECUTED", "PENDING_SIGNATURE"].includes(c.status));
  const totalEngaged = contracts.reduce((s, c) => s + (c.revised_total_amount || 0), 0);
  const pendingCOs = contracts.reduce((s, c) => s + (c.change_orders?.filter((co: any) => co.status === "PENDING_APPROVAL").length || 0), 0);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Total contrats"      value={String(contracts.length)} sub={`${active.length} actifs`} color="text-gb-primary"  icon={FileSignature} />
        <KpiCard label="Montant engage"      value={fmt(totalEngaged)}        sub="montant revise total"     color="text-emerald-600" icon={Banknote} />
        <KpiCard label="Marches actifs"      value={String(active.length)}   sub="en cours"                 color="text-blue-600"    icon={TrendingUp} />
        <KpiCard label="Avenants en attente" value={String(pendingCOs)}      sub="a approuver"              color={pendingCOs > 0 ? "text-amber-600" : "text-gb-muted"} icon={AlertCircle} />
      </div>

      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center bg-gb-surface-solid p-3 rounded-2xl border border-gb-border">
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gb-muted" size={16} />
          <input
            type="text"
            placeholder="Rechercher un contrat, projet ou fournisseur..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 h-10 bg-gb-app border border-gb-border rounded-xl text-sm focus:ring-2 focus:ring-gb-primary outline-none transition-all"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gb-muted hover:text-gb-text">
              <X size={14} />
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Filter size={14} className="text-gb-muted hidden md:block" />
          <select
            value={filterType}
            onChange={e => setFilterType(e.target.value)}
            className="h-10 px-3 bg-gb-app border border-gb-border rounded-xl text-sm text-gb-text outline-none focus:ring-2 focus:ring-gb-primary"
          >
            <option value="ALL">Tous types</option>
            <option value="OWNER">Client</option>
            <option value="SUBCONTRACT">Sous-traitance</option>
            <option value="SUPPLY">Fournitures</option>
            <option value="CONSULTING">Conseil/MOE</option>
          </select>
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            className="h-10 px-3 bg-gb-app border border-gb-border rounded-xl text-sm text-gb-text outline-none focus:ring-2 focus:ring-gb-primary"
          >
            <option value="ALL">Tous statuts</option>
            {Object.entries(STATUS_CONFIG).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
        </div>
        <Button onClick={openCreate} className="rounded-xl h-10 px-5 shadow-md shadow-gb-primary/20 font-bold shrink-0">
          <Plus size={16} className="mr-1.5" /> Nouveau Contrat
        </Button>
      </div>

      {loading ? (
        <div className="py-24 flex flex-col items-center gap-4">
          <Loader2 className="w-9 h-9 text-gb-primary animate-spin" />
          <p className="text-gb-muted text-sm italic">Chargement du registre contractuel...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="p-20 text-center bg-gb-surface-solid border border-dashed border-gb-border rounded-3xl">
          <FileSignature className="mx-auto text-gb-muted/20 mb-5" size={56} />
          <h3 className="text-lg font-bold text-gb-text mb-1">Aucun contrat trouve</h3>
          <p className="text-gb-muted text-sm italic">Commencez par enregistrer un contrat client ou sous-traitant.</p>
        </div>
      ) : (
        <div className="bg-gb-surface-solid border border-gb-border rounded-2xl overflow-hidden">
          <div className="grid grid-cols-[4px_2fr_1.4fr_1.2fr_1.3fr_1fr_90px_40px] gap-0 px-4 py-3 border-b border-gb-border/60 bg-gb-app/30">
            <div />
            <p className="text-[10px] font-black uppercase tracking-widest text-gb-muted pl-3">Contrat</p>
            <p className="text-[10px] font-black uppercase tracking-widest text-gb-muted">Tiers / Fournisseur</p>
            <p className="text-[10px] font-black uppercase tracking-widest text-gb-muted">Montant revise</p>
            <p className="text-[10px] font-black uppercase tracking-widest text-gb-muted">Facturation</p>
            <p className="text-[10px] font-black uppercase tracking-widest text-gb-muted">Statut</p>
            <p className="text-[10px] font-black uppercase tracking-widest text-gb-muted text-center">Dates</p>
            <div />
          </div>

          <AnimatePresence>
            {filtered.map((c, idx) => {
              const typeCfg = TYPE_CONFIG[c.type] || { label: c.type, color: "text-gb-muted", bar: "bg-gb-muted" };
              const pct = c.billing_progress_pct || 0;
              const hasPendingCO = (c.change_orders || []).some((co: any) => co.status === "PENDING_APPROVAL");
              return (
                <motion.div
                  key={c.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.03 }}
                  onClick={() => openDetail(c.id)}
                  className="grid grid-cols-[4px_2fr_1.4fr_1.2fr_1.3fr_1fr_90px_40px] gap-0 px-4 py-4 border-b border-gb-border/40 hover:bg-gb-surface-hover cursor-pointer group transition-colors last:border-0"
                >
                  <div className={`self-stretch w-1 rounded-full ${typeCfg.bar} opacity-80`} />
                  <div className="pl-3 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-black text-gb-text group-hover:text-gb-primary transition-colors truncate">{c.reference || "..."}</span>
                      {hasPendingCO && (
                        <span className="shrink-0 px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-600 text-[9px] font-black border border-amber-500/20">AV</span>
                      )}
                    </div>
                    <p className="text-xs text-gb-muted truncate mt-0.5">{c.title}</p>
                    <p className={`text-[9px] font-black uppercase tracking-wide mt-1 ${typeCfg.color}`}>{typeCfg.label}</p>
                  </div>
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-7 h-7 rounded-lg bg-gb-app border border-gb-border flex items-center justify-center text-gb-muted shrink-0">
                      <Building2 size={13} />
                    </div>
                    <span className="text-sm text-gb-text truncate font-medium">{c.supplier?.name || "..."}</span>
                  </div>
                  <div>
                    <p className="text-sm font-black text-gb-text">{fmt(c.revised_total_amount || 0, c.currency)}</p>
                    {c.approved_change_amount > 0 && (
                      <p className="text-[10px] text-emerald-600 font-bold mt-0.5">+{fmt(c.approved_change_amount, c.currency)}</p>
                    )}
                  </div>
                  <div className="pr-4">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[10px] font-bold text-gb-muted">{Math.round(pct)}%</span>
                      <span className="text-[10px] text-gb-muted">{fmt(c.total_invoiced || 0, c.currency)}</span>
                    </div>
                    <div className="h-1.5 bg-gb-app rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${pct >= 90 ? "bg-emerald-500" : pct >= 50 ? "bg-gb-primary" : "bg-gb-muted/40"}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                  <div className="flex items-center">
                    <StatusBadge status={c.status} />
                  </div>
                  <div className="text-center">
                    {c.signed_at ? (
                      <div>
                        <p className="text-[9px] text-gb-muted font-bold uppercase">Signe</p>
                        <p className="text-xs font-bold text-gb-text">{format(new Date(c.signed_at), "dd/MM/yy")}</p>
                      </div>
                    ) : c.start_date ? (
                      <div>
                        <p className="text-[9px] text-gb-muted font-bold uppercase">Debut</p>
                        <p className="text-xs font-bold text-gb-text">{format(new Date(c.start_date), "dd/MM/yy")}</p>
                      </div>
                    ) : (
                      <span className="text-gb-muted text-xs">...</span>
                    )}
                  </div>
                  <div className="flex items-center justify-center">
                    <ChevronRight size={16} className="text-gb-muted/40 group-hover:text-gb-primary transition-colors" />
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {!loading && filtered.length > 0 && (
        <p className="text-xs text-gb-muted text-center font-medium">
          {filtered.length} contrat{filtered.length > 1 ? "s" : ""} affiche{filtered.length > 1 ? "s" : ""}
        </p>
      )}

      {selectedId && (
        <ContractDetailDrawer
          open={drawerOpen}
          onOpenChange={setDrawerOpen}
          contractId={selectedId}
          onContractUpdated={fetchContracts}
        />
      )}

      <ContractFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        contract={editContract}
        onSaved={onSaved}
      />
    </div>
  );
}
