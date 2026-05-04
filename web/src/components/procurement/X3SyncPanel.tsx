import React, { useState, useEffect } from "react";
import { apiFetch, API_BASE } from "../../lib/api";
import {
  Database,
  Play,
  RefreshCcw,
  CheckCircle2,
  XCircle,
  Loader2,
  AlertCircle,
  Clock,
  Users,
  Package,
  ShoppingCart,
} from "lucide-react";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { motion, AnimatePresence } from "motion/react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface SyncJob {
  id: number;
  entity_name: string;
  status: string;
  started_at: string;
  ended_at: string | null;
  rows_read: number;
  rows_upserted: number;
  rows_failed: number;
  message: string | null;
}

const ENTITIES: { key: string; label: string; icon: React.ElementType; endpoint: string; color: string }[] = [
  { key: "SUPPLIERS", label: "Fournisseurs", icon: Users, endpoint: "x3/sync/suppliers", color: "text-amber-600" },
  { key: "ITEMS", label: "Articles / Inventaire", icon: Package, endpoint: "x3/sync/items", color: "text-teal-600" },
  { key: "PURCHASE_ORDERS", label: "Bons de commande", icon: ShoppingCart, endpoint: "x3/sync/purchase-orders", color: "text-emerald-600" },
];

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case "SUCCESS":
      return <Badge className="bg-emerald-500/10 text-emerald-700 border-emerald-500/20 gap-1"><CheckCircle2 size={12} />Succès</Badge>;
    case "FAILED":
      return <Badge className="bg-gb-danger/10 text-gb-danger border-gb-danger/20 gap-1"><XCircle size={12} />Échec</Badge>;
    case "RUNNING":
      return <Badge className="bg-blue-500/10 text-blue-700 border-blue-500/20 gap-1"><Loader2 size={12} className="animate-spin" />En cours</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

export default function X3SyncPanel() {
  const [jobs, setJobs] = useState<SyncJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const authHeaders = () => ({
    Authorization: `Bearer ${localStorage.getItem("token")}`,
    "Content-Type": "application/json",
  });

  const fetchJobs = async () => {
    setLoading(true);
    try {
      const res = await apiFetch(`${API_BASE}/procurement/x3/sync/jobs?limit=30`, {
        headers: authHeaders(),
      });
      if (res.ok) setJobs(await res.json());
    } catch {
      /* silent */
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
  }, []);

  const handleSync = async (entity: typeof ENTITIES[0]) => {
    setSyncing(entity.key);
    setError(null);
    try {
      const res = await apiFetch(`${API_BASE}/procurement/${entity.endpoint}`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ batchSize: 1000, maxBatches: 20 }),
      });
      if (!res.ok) {
        const err = await res.json();
        setError(err.error || "Erreur de synchronisation");
      }
      await fetchJobs();
    } catch (e: any) {
      setError(e.message || "Erreur réseau");
    } finally {
      setSyncing(null);
    }
  };

  const lastJobByEntity = (entityKey: string) =>
    jobs.find((j) => j.entity_name === entityKey);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gb-surface-solid border border-gb-border rounded-2xl p-6 shadow-sm">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-xl font-extrabold text-gb-text flex items-center gap-3">
              <Database className="text-violet-500" />
              Synchronisation SAGE X3
            </h3>
            <p className="text-xs text-gb-muted mt-1 font-medium">
              Import incrémental depuis les vues SQL Server de l'ERP pilote
            </p>
          </div>
          <Button variant="outline" className="rounded-xl h-10 font-bold border-gb-border" onClick={fetchJobs}>
            <RefreshCcw size={16} className="mr-2" />
            Actualiser
          </Button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-3 p-4 bg-gb-danger/5 border border-gb-danger/20 rounded-xl text-gb-danger font-medium text-sm">
          <AlertCircle size={18} className="shrink-0" />
          {error}
        </div>
      )}

      {/* Entity cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {ENTITIES.map((entity) => {
          const lastJob = lastJobByEntity(entity.key);
          const isSyncing = syncing === entity.key;
          const Icon = entity.icon;
          return (
            <div
              key={entity.key}
              className="bg-gb-surface-solid border border-gb-border rounded-2xl p-5 flex flex-col gap-4"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center">
                    <Icon size={20} className={entity.color} />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-sm text-gb-text">{entity.label}</h4>
                    <p className="text-[10px] text-gb-muted font-bold uppercase tracking-wider">SAGE X3</p>
                  </div>
                </div>
                {lastJob && <StatusBadge status={lastJob.status} />}
              </div>

              {lastJob && (
                <div className="grid grid-cols-3 gap-2">
                  <div className="p-2 bg-gb-app/50 border border-gb-border rounded-lg text-center">
                    <p className="text-[9px] font-black text-gb-muted uppercase">Lus</p>
                    <p className="font-black text-sm text-gb-text">{lastJob.rows_read}</p>
                  </div>
                  <div className="p-2 bg-emerald-500/5 border border-emerald-500/20 rounded-lg text-center">
                    <p className="text-[9px] font-black text-emerald-600 uppercase">Importés</p>
                    <p className="font-black text-sm text-emerald-700">{lastJob.rows_upserted}</p>
                  </div>
                  <div className="p-2 bg-gb-danger/5 border border-gb-danger/20 rounded-lg text-center">
                    <p className="text-[9px] font-black text-gb-danger uppercase">Erreurs</p>
                    <p className="font-black text-sm text-gb-danger">{lastJob.rows_failed}</p>
                  </div>
                </div>
              )}

              {lastJob?.message && lastJob.status === "FAILED" && (
                <p className="text-[10px] text-gb-danger bg-gb-danger/5 border border-gb-danger/20 rounded-lg p-2 font-mono break-all">
                  {lastJob.message}
                </p>
              )}

              {lastJob?.started_at && (
                <div className="flex items-center gap-1.5 text-[10px] text-gb-muted font-bold">
                  <Clock size={11} />
                  {format(new Date(lastJob.started_at), "dd MMM yyyy, HH:mm", { locale: fr })}
                  {lastJob.ended_at && ` → ${format(new Date(lastJob.ended_at), "HH:mm:ss", { locale: fr })}`}
                </div>
              )}

              <Button
                onClick={() => handleSync(entity)}
                disabled={isSyncing || syncing !== null}
                className="w-full h-10 rounded-xl font-bold bg-violet-600 hover:bg-violet-700 shadow-lg shadow-violet-600/20"
              >
                {isSyncing ? (
                  <>
                    <Loader2 size={16} className="animate-spin mr-2" />
                    Synchronisation...
                  </>
                ) : (
                  <>
                    <Play size={16} className="mr-2" />
                    Synchroniser
                  </>
                )}
              </Button>
            </div>
          );
        })}
      </div>

      {/* Job history */}
      <div className="bg-gb-surface-solid border border-gb-border rounded-2xl p-6">
        <h4 className="font-extrabold text-sm text-gb-text uppercase tracking-wider mb-4 flex items-center gap-2">
          <Clock size={14} className="text-violet-500" />
          Historique des synchronisations
        </h4>

        {loading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="animate-spin text-violet-500" size={24} />
          </div>
        ) : jobs.length === 0 ? (
          <p className="text-center text-gb-muted font-medium py-8">Aucune synchronisation lancée</p>
        ) : (
          <div className="space-y-2">
            <AnimatePresence>
              {jobs.slice(0, 15).map((job) => (
                <motion.div
                  key={job.id}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center justify-between p-3 bg-gb-app/50 border border-gb-border rounded-xl gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <StatusBadge status={job.status} />
                    <span className="text-sm font-bold text-gb-text truncate">{job.entity_name}</span>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-gb-muted font-bold shrink-0">
                    <span>{job.rows_upserted} importés</span>
                    {job.rows_failed > 0 && <span className="text-gb-danger">{job.rows_failed} erreurs</span>}
                    <span className="hidden md:inline">{format(new Date(job.started_at), "dd/MM HH:mm", { locale: fr })}</span>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}
