import React, { useState, useEffect } from "react";
import { 
  CreditCard, 
  Search, 
  Loader2, 
  ChevronRight,
  TrendingDown,
  CheckCircle2,
  Calendar,
  Wallet,
  ArrowDownCircle,
  Clock,
  ExternalLink,
  History
} from "lucide-react";
import { Badge } from "../ui/badge";
import { motion } from "motion/react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

export default function PaymentModule() {
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");

  useEffect(() => {
    fetchPayments();
  }, []);

  const fetchPayments = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("/api/contracts/invoices/all", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const invoices = await res.json();
        // Flatten payments from all invoices
        const allPayments = invoices.flatMap((inv: any) => 
          (inv.payments || []).map((p: any) => ({ 
            ...p, 
            invoiceNum: inv.number, 
            contractRef: inv.contract?.reference,
            projectTitle: inv.project?.title
          }))
        ).sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setPayments(allPayments);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getMethodIcon = (method: string) => {
    switch (method?.toUpperCase()) {
      case "WIRE": return <ArrowDownCircle size={14} className="text-blue-500" />;
      case "CHECK": return <History size={14} className="text-amber-500" />;
      default: return <Wallet size={14} className="text-gb-muted" />;
    }
  };

  const filteredPayments = payments.filter(p => 
    p.invoiceNum.toLowerCase().includes(filter.toLowerCase()) ||
    p.contractRef?.toLowerCase().includes(filter.toLowerCase()) ||
    p.method?.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-gb-surface-solid p-6 rounded-2xl border border-gb-border shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-500/10 text-purple-600 flex items-center justify-center">
            <CreditCard size={24} />
          </div>
          <div>
            <h3 className="text-xl font-black text-gb-text">Journal des Règlements</h3>
            <p className="text-xs text-gb-muted font-bold uppercase tracking-widest italic">Historique des flux de trésorerie</p>
          </div>
        </div>
        
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gb-muted" size={18} />
          <input 
            type="text"
            placeholder="Rechercher par facture, contrat..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="w-full pl-10 pr-4 h-11 bg-gb-app border border-gb-border rounded-xl text-sm outline-none focus:ring-2 focus:ring-purple-500 transition-all"
          />
        </div>
      </div>

      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center space-y-4">
          <Loader2 className="w-10 h-10 text-purple-600 animate-spin" />
          <p className="text-gb-muted font-medium italic">Synchronisation des transactions financières...</p>
        </div>
      ) : filteredPayments.length === 0 ? (
        <div className="p-20 text-center bg-gb-surface-solid border border-gb-border border-dashed rounded-3xl">
          <CreditCard className="mx-auto text-gb-muted/20 mb-6" size={64} />
          <h3 className="text-xl font-bold text-gb-text mb-2">Aucune transaction trouvée</h3>
          <p className="text-gb-muted">Les paiements enregistrés sur vos factures apparaîtront ici.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredPayments.map((p) => (
            <motion.div 
              key={p.id}
              whileHover={{ scale: 1.005 }}
              className="bg-gb-surface-solid border border-gb-border rounded-2xl p-5 hover:border-purple-500/30 transition-all flex flex-col md:flex-row items-center justify-between gap-6 overflow-hidden relative group"
            >
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-purple-500 opacity-0 group-hover:opacity-100 transition-opacity"></div>
              
              <div className="flex items-center gap-5 flex-1">
                <div className="w-12 h-12 rounded-2xl bg-gb-app border border-gb-border flex items-center justify-center text-emerald-500">
                  <CheckCircle2 size={24} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="font-black text-gb-text tracking-tight uppercase">Paiement Reçu</span>
                    <Badge variant="outline" className="text-[10px] font-bold border-purple-500/20 bg-purple-500/5 text-purple-600 px-2 py-0">
                      #{p.invoiceNum}
                    </Badge>
                  </div>
                  <p className="text-xs font-bold text-gb-muted uppercase tracking-tighter truncate max-w-md">
                    {p.contractRef} — {p.projectTitle}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-12 w-full md:w-auto justify-between md:justify-end border-t md:border-t-0 pt-4 md:pt-0 border-gb-border/10">
                <div className="flex items-center gap-8">
                   <div className="text-right">
                      <p className="text-[10px] font-black uppercase text-gb-muted tracking-widest mb-0.5">Montant</p>
                      <p className="text-lg font-black text-gb-text">
                        {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(p.amount)}
                      </p>
                   </div>
                   <div className="text-right hidden sm:block">
                      <p className="text-[10px] font-black uppercase text-gb-muted tracking-widest mb-0.5">Méthode</p>
                      <div className="flex items-center gap-1.5 justify-end text-xs font-bold text-gb-muted">
                        {getMethodIcon(p.method)}
                        <span>{p.method || "Standard"}</span>
                      </div>
                   </div>
                </div>

                <div className="flex items-center gap-4">
                   <div className="text-right">
                      <p className="text-[10px] font-black uppercase text-gb-muted tracking-widest mb-0.5">Date</p>
                      <p className="text-xs font-bold text-gb-text">
                        {format(new Date(p.date), 'dd MMM yyyy', { locale: fr })}
                      </p>
                   </div>
                   <button className="w-10 h-10 rounded-xl bg-gb-app group-hover:bg-purple-600 group-hover:text-white transition-all flex items-center justify-center border border-gb-border">
                      <ExternalLink size={18} />
                   </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
