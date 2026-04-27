import React, { useState, useEffect } from "react";
import { 
  ShoppingCart, 
  Search, 
  Loader2, 
  AlertCircle, 
  Clock, 
  FileCheck, 
  ExternalLink,
  ChevronRight,
  TrendingDown,
  Building2,
  CalendarDays
} from "lucide-react";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { motion } from "motion/react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

export default function PurchaseOrderModule() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOrders = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("/api/procurement/purchase-orders", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setOrders(await res.json());
      } else {
        throw new Error("Erreur lors du chargement des bons de commande");
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "DRAFT": return <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20">Brouillon</Badge>;
      case "APPROVED": return <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">Approuvé</Badge>;
      case "SENT": return <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20">Envoyé</Badge>;
      case "RECEIVED": return <Badge className="bg-purple-500/10 text-purple-600 border-purple-500/20">Reçu</Badge>;
      case "CLOSED": return <Badge className="bg-gb-surface-hover text-gb-muted">Clôturé</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-gb-surface-solid border border-gb-border p-6 rounded-2xl shadow-sm">
        <h3 className="text-xl font-extrabold text-gb-text flex items-center gap-3">
          <FileCheck className="text-emerald-500" />
          Suivi des Commandes
        </h3>
        <Badge variant="secondary" className="px-4 py-1 rounded-full font-bold">{orders.length} Bons de commande</Badge>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center p-20 space-y-4">
          <Loader2 className="w-10 h-10 text-emerald-500 animate-spin" />
          <p className="text-gb-muted font-medium italic">Synchronisation ERP en cours...</p>
        </div>
      ) : error ? (
        <div className="p-8 text-center bg-gb-danger/5 border border-gb-danger/10 rounded-2xl text-gb-danger font-medium">
          {error}
        </div>
      ) : orders.length === 0 ? (
        <div className="p-20 text-center bg-gb-surface-solid border border-gb-border border-dashed rounded-3xl">
          <ShoppingCart className="mx-auto text-gb-muted/20 mb-6" size={64} />
          <h3 className="text-xl font-bold text-gb-text mb-2">Aucune commande</h3>
          <p className="text-gb-muted">Attribuez des appels d'offres pour générer des bons de commande automatiquement.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <motion.div 
              key={order.id}
              whileHover={{ scale: 1.002, x: 4 }}
              className="group bg-gb-surface-solid border border-gb-border rounded-2xl p-6 hover:border-emerald-500/30 transition-all shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6 overflow-hidden relative"
            >
              <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity"></div>
              
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 rounded-2xl bg-emerald-500/5 border border-emerald-500/10 flex flex-col items-center justify-center text-emerald-600 shrink-0">
                  <span className="text-[10px] font-black uppercase tracking-tighter leading-none opacity-50">BC</span>
                  <span className="text-lg font-black leading-tight">#{order.id}</span>
                </div>
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <h4 className="font-extrabold text-lg text-gb-text group-hover:text-emerald-600 transition-colors">{order.supplier?.name}</h4>
                    {getStatusBadge(order.status)}
                  </div>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[10px] font-bold text-gb-muted uppercase tracking-widest mt-2">
                    <div className="flex items-center gap-1.5">
                       <CalendarDays size={12} className="text-gb-primary" />
                       {format(new Date(order.created_at), 'dd MMMM yyyy', { locale: fr })}
                    </div>
                    <div className="flex items-center gap-1.5">
                       <Building2 size={12} className="text-gb-primary" />
                       Projet: {order.project?.code}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-8 justify-between md:justify-end">
                  <div className="text-right">
                     <p className="text-[10px] font-black uppercase text-gb-muted tracking-widest mb-1">Total HT</p>
                     <p className="text-xl font-black text-gb-text tracking-tight">12 450,00 <span className="text-sm">€</span></p>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button variant="outline" className="h-10 rounded-xl px-4 font-bold border-gb-border hover:bg-gb-surface-hover">
                       PDF
                    </Button>
                    <Button className="h-10 w-10 p-0 rounded-xl bg-gb-app text-gb-text hover:bg-gb-border shadow-none border border-gb-border">
                       <ExternalLink size={16} />
                    </Button>
                  </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
