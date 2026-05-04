import React, { useState, useEffect, useCallback } from "react";
import { apiFetch, API_BASE } from "../../lib/api";
import {
  Package,
  Warehouse,
  MapPin,
  Search,
  Loader2,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  RefreshCcw,
  Filter,
} from "lucide-react";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Input } from "../ui/input";
import { motion } from "motion/react";

interface InventoryBalance {
  id: number;
  qty_on_hand: number;
  qty_available: number;
  qty_reserved: number;
  qty_in_transit: number;
  last_unit_cost: number;
  average_unit_cost: number;
  total_stock_value: number;
  item: { id: number; code: string | null; name: string; unit: string; costing_method: string };
  project: { id: number; code: string; title: string };
  warehouse: { id: number; code: string; name: string };
  location: { id: number; code: string; name: string };
}

interface Warehouse {
  id: number;
  code: string;
  name: string;
  locations: { id: number; code: string; name: string }[];
}

function formatMoney(val: number): string {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", minimumFractionDigits: 2 }).format(val);
}

function formatQty(val: number, unit: string): string {
  return `${new Intl.NumberFormat("fr-FR", { minimumFractionDigits: 0, maximumFractionDigits: 3 }).format(val)} ${unit}`;
}

export default function InventoryModule() {
  const [balances, setBalances] = useState<InventoryBalance[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filterProject, setFilterProject] = useState("");
  const [filterWarehouse, setFilterWarehouse] = useState("");
  const [showNewWarehouse, setShowNewWarehouse] = useState(false);
  const [newWarehouseCode, setNewWarehouseCode] = useState("");
  const [newWarehouseName, setNewWarehouseName] = useState("");
  const [newWarehouseProject, setNewWarehouseProject] = useState("");
  const [saving, setSaving] = useState(false);

  const authHeaders = () => ({
    Authorization: `Bearer ${localStorage.getItem("token")}`,
    "Content-Type": "application/json",
  });

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [balRes, whRes, projRes] = await Promise.all([
        apiFetch(`${API_BASE}/procurement/inventory/balances${filterProject ? `?projectId=${filterProject}` : ""}${filterWarehouse ? `${filterProject ? "&" : "?"}warehouseId=${filterWarehouse}` : ""}`, {
          headers: authHeaders(),
        }),
        apiFetch(`${API_BASE}/procurement/warehouses`, { headers: authHeaders() }),
        apiFetch(`${API_BASE}/project-management/projects`, { headers: authHeaders() }),
      ]);
      if (balRes.ok) setBalances(await balRes.json());
      if (whRes.ok) setWarehouses(await whRes.json());
      if (projRes.ok) setProjects(await projRes.json());
    } catch (e: any) {
      setError(e.message || "Erreur de chargement");
    } finally {
      setLoading(false);
    }
  }, [filterProject, filterWarehouse]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const handleCreateWarehouse = async () => {
    if (!newWarehouseCode.trim() || !newWarehouseName.trim()) return;
    setSaving(true);
    try {
      const res = await apiFetch(`${API_BASE}/procurement/warehouses`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          code: newWarehouseCode.trim(),
          name: newWarehouseName.trim(),
          project_id: newWarehouseProject ? Number(newWarehouseProject) : undefined,
        }),
      });
      if (res.ok) {
        setShowNewWarehouse(false);
        setNewWarehouseCode("");
        setNewWarehouseName("");
        setNewWarehouseProject("");
        fetchAll();
      }
    } catch {
      /* handled silently */
    } finally {
      setSaving(false);
    }
  };

  const filtered = balances.filter((b) => {
    const q = search.toLowerCase();
    return (
      !q ||
      b.item.name.toLowerCase().includes(q) ||
      (b.item.code || "").toLowerCase().includes(q) ||
      b.warehouse.code.toLowerCase().includes(q) ||
      b.location.code.toLowerCase().includes(q)
    );
  });

  const totalStockValue = filtered.reduce((s, b) => s + b.total_stock_value, 0);
  const totalSkus = new Set(filtered.map((b) => b.item.id)).size;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gb-surface-solid border border-gb-border rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h3 className="text-xl font-extrabold text-gb-text flex items-center gap-3">
              <Package className="text-teal-500" />
              Stocks & Inventaire
            </h3>
            <p className="text-xs text-gb-muted mt-1 font-medium">
              Valorisation CMUP / FIFO par magasin et emplacement
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="rounded-xl h-10 font-bold border-gb-border"
              onClick={() => setShowNewWarehouse(!showNewWarehouse)}
            >
              <Warehouse size={16} className="mr-2" />
              Nouveau magasin
            </Button>
            <Button
              variant="outline"
              className="rounded-xl h-10 font-bold border-gb-border"
              onClick={fetchAll}
            >
              <RefreshCcw size={16} />
            </Button>
          </div>
        </div>

        {/* New Warehouse Form */}
        {showNewWarehouse && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className="mt-4 pt-4 border-t border-gb-border grid grid-cols-2 md:grid-cols-4 gap-3"
          >
            <div className="space-y-1">
              <label className="text-[10px] font-black text-gb-muted uppercase tracking-widest">Code</label>
              <Input
                placeholder="MG-001"
                value={newWarehouseCode}
                onChange={(e) => setNewWarehouseCode(e.target.value)}
                className="h-10 rounded-xl"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-gb-muted uppercase tracking-widest">Nom</label>
              <Input
                placeholder="Magasin principal"
                value={newWarehouseName}
                onChange={(e) => setNewWarehouseName(e.target.value)}
                className="h-10 rounded-xl"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-gb-muted uppercase tracking-widest">Chantier</label>
              <select
                value={newWarehouseProject}
                onChange={(e) => setNewWarehouseProject(e.target.value)}
                className="w-full h-10 bg-gb-app border border-gb-border rounded-xl px-3 text-sm font-medium outline-none"
              >
                <option value="">Tous les chantiers</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>{p.code} — {p.title}</option>
                ))}
              </select>
            </div>
            <div className="flex items-end">
              <Button
                onClick={handleCreateWarehouse}
                disabled={saving}
                className="h-10 w-full rounded-xl bg-teal-600 hover:bg-teal-700 font-bold"
              >
                {saving ? <Loader2 size={16} className="animate-spin" /> : "Créer"}
              </Button>
            </div>
          </motion.div>
        )}
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-gb-surface-solid border border-gb-border rounded-2xl p-4">
          <p className="text-[10px] font-black text-gb-muted uppercase tracking-widest mb-2">Valeur stock</p>
          <p className="text-2xl font-black text-teal-600">{formatMoney(totalStockValue)}</p>
        </div>
        <div className="bg-gb-surface-solid border border-gb-border rounded-2xl p-4">
          <p className="text-[10px] font-black text-gb-muted uppercase tracking-widest mb-2">Références</p>
          <p className="text-2xl font-black text-gb-text">{totalSkus}</p>
        </div>
        <div className="bg-gb-surface-solid border border-gb-border rounded-2xl p-4">
          <p className="text-[10px] font-black text-gb-muted uppercase tracking-widest mb-2">Magasins</p>
          <p className="text-2xl font-black text-gb-text">{warehouses.length}</p>
        </div>
        <div className="bg-gb-surface-solid border border-gb-border rounded-2xl p-4">
          <p className="text-[10px] font-black text-gb-muted uppercase tracking-widest mb-2">Emplacements</p>
          <p className="text-2xl font-black text-gb-text">
            {warehouses.reduce((s, w) => s + w.locations.length, 0)}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gb-muted" />
          <Input
            placeholder="Rechercher un article, code, magasin..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-11 rounded-xl"
          />
        </div>
        <select
          value={filterProject}
          onChange={(e) => setFilterProject(e.target.value)}
          className="h-11 bg-gb-app border border-gb-border rounded-xl px-4 text-sm font-medium outline-none min-w-[180px]"
        >
          <option value="">Tous les chantiers</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>{p.code}</option>
          ))}
        </select>
        <select
          value={filterWarehouse}
          onChange={(e) => setFilterWarehouse(e.target.value)}
          className="h-11 bg-gb-app border border-gb-border rounded-xl px-4 text-sm font-medium outline-none min-w-[160px]"
        >
          <option value="">Tous les magasins</option>
          {warehouses.map((w) => (
            <option key={w.id} value={w.id}>{w.code} — {w.name}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-20 gap-3">
          <Loader2 className="animate-spin text-teal-500" size={28} />
          <span className="text-gb-muted font-medium italic">Chargement des stocks...</span>
        </div>
      ) : error ? (
        <div className="p-8 text-center bg-gb-danger/5 border border-gb-danger/10 rounded-2xl text-gb-danger font-medium flex items-center justify-center gap-2">
          <AlertCircle size={20} />
          {error}
        </div>
      ) : filtered.length === 0 ? (
        <div className="p-20 text-center bg-gb-surface-solid border border-dashed border-gb-border rounded-3xl">
          <Package className="mx-auto text-gb-muted/20 mb-6" size={64} />
          <h3 className="text-xl font-bold text-gb-text mb-2">Aucun stock enregistré</h3>
          <p className="text-gb-muted">Réceptionnez des marchandises pour alimenter l'inventaire.</p>
        </div>
      ) : (
        <div className="bg-gb-surface-solid border border-gb-border rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gb-surface-hover/40 border-b border-gb-border">
                <tr>
                  {["Article", "Code", "Chantier", "Magasin", "Emplacement", "Qté dispo", "Coût moy.", "Valeur stock", "Méthode"].map((h) => (
                    <th key={h} className="px-4 py-3 text-[10px] font-black text-gb-muted uppercase tracking-widest whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gb-border/50">
                {filtered.map((b) => {
                  const isLow = b.qty_available < 0;
                  return (
                    <motion.tr
                      key={b.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className={`group hover:bg-gb-surface-hover/30 transition-colors ${isLow ? "bg-gb-danger/3" : ""}`}
                    >
                      <td className="px-4 py-3">
                        <span className="font-bold text-sm text-gb-text">{b.item.name}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-mono text-xs text-gb-muted">{b.item.code || "—"}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs font-bold text-gb-text">{b.project.code}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <Warehouse size={13} className="text-teal-500 shrink-0" />
                          <span className="text-xs font-bold">{b.warehouse.code}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <MapPin size={12} className="text-gb-muted shrink-0" />
                          <span className="text-xs text-gb-muted">{b.location.code}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          {isLow
                            ? <TrendingDown size={14} className="text-gb-danger" />
                            : <TrendingUp size={14} className="text-teal-500" />}
                          <span className={`font-bold text-sm ${isLow ? "text-gb-danger" : "text-gb-text"}`}>
                            {formatQty(b.qty_available, b.item.unit)}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-mono text-sm text-gb-text">{formatMoney(b.average_unit_cost)}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-black text-sm text-teal-700">{formatMoney(b.total_stock_value)}</span>
                      </td>
                      <td className="px-4 py-3">
                        <Badge className={`text-[10px] font-black ${b.item.costing_method === "FIFO" ? "bg-purple-500/10 text-purple-700 border-purple-500/20" : "bg-teal-500/10 text-teal-700 border-teal-500/20"}`}>
                          {b.item.costing_method}
                        </Badge>
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
