import React, { useState, useEffect } from "react";
import { 
  FileEdit, 
  Plus, 
  Search, 
  Loader2, 
  ChevronRight,
  ClipboardCheck,
  Calendar,
  AlertTriangle,
  History,
  TrendingUp,
  FileText
} from "lucide-react";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { motion } from "motion/react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

export default function ChangeOrderModule() {
  const [changeOrders, setChangeOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");

  useEffect(() => {
    fetchChangeOrders();
  }, []);

  const fetchChangeOrders = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("/api/contracts", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const contracts = await res.json();
        // Flatten change orders from all contracts
        const allCOs = contracts.flatMap((c: any) => 
          (c.change_orders || []).map((co: any) => ({ ...co, contractRef: c.reference, contractName: c.project?.title }))
        );
        setChangeOrders(allCOs);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
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
    co.number.toLowerCase().includes(filter.toLowerCase()) ||
    co.description.toLowerCase().includes(filter.toLowerCase()) ||
    co.contractRef.toLowerCase().includes(filter.toLowerCase())
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
          <Button className="h-11 px-6 rounded-xl bg-amber-500 hover:bg-amber-600 shadow-lg shadow-amber-500/20 text-white font-bold">
            <Plus size={18} className="mr-2" />
            Créer
          </Button>
        </div>
      </div>

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
                      {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(co.amount)}
                    </span>
                  </div>
                </div>

                <div className="text-right hidden sm:block">
                  <p className="text-[10px] font-black uppercase text-gb-muted tracking-widest">Date</p>
                  <p className="text-xs font-bold text-gb-text">
                    {format(new Date(co.created_at), 'dd/MM/yyyy')}
                  </p>
                </div>

                <button className="p-2 hover:bg-gb-app rounded-full transition-colors text-gb-muted hover:text-amber-600">
                  <ChevronRight size={20} />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
