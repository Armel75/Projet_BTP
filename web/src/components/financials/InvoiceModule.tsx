import React, { useState, useEffect } from "react";
import { 
  Receipt, 
  Plus, 
  Search, 
  Loader2, 
  ChevronRight,
  Filter,
  Calendar,
  Banknote,
  FileCheck2,
  Clock,
  ArrowUpRight
} from "lucide-react";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { motion } from "motion/react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

export default function InvoiceModule() {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");

  useEffect(() => {
    fetchInvoices();
  }, []);

  const fetchInvoices = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("/api/contracts/invoices/all", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setInvoices(await res.json());
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PAID": return <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">Payée</Badge>;
      case "APPROVED": return <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20">Approuvée</Badge>;
      case "SUBMITTED": return <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20">Envoyée</Badge>;
      case "DRAFT": return <Badge className="bg-gb-app text-gb-muted border-gb-border">Brouillon</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  const filteredInvoices = invoices.filter(inv => 
    inv.number.toLowerCase().includes(filter.toLowerCase()) ||
    inv.contract?.reference?.toLowerCase().includes(filter.toLowerCase()) ||
    inv.project?.title?.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
         <div className="bg-emerald-500/5 border border-emerald-500/10 p-6 rounded-3xl">
            <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600 mb-1">Total Facturé</p>
            <div className="flex items-center justify-between">
               <h4 className="text-3xl font-black text-gb-text tracking-tighter">
                  {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(
                    invoices.reduce((sum, inv) => sum + inv.amount, 0)
                  )}
               </h4>
               <div className="p-2 bg-white dark:bg-gb-surface-solid rounded-xl shadow-sm border border-emerald-500/10 text-emerald-600">
                  <ArrowUpRight size={20} />
               </div>
            </div>
         </div>
         {/* More summary cards could go here */}
      </div>

      <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-gb-surface-solid p-4 rounded-2xl border border-gb-border">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gb-muted" size={18} />
          <input 
            type="text"
            placeholder="N° Facture, Contrat, Chantier..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="w-full pl-10 pr-4 h-11 bg-gb-app border border-gb-border rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
          />
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <Button variant="outline" className="h-11 px-4 rounded-xl border-gb-border">
            <Filter size={18} className="mr-2" /> Filtenir
          </Button>
          <Button className="h-11 px-6 rounded-xl bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-600/20 text-white font-bold">
            <Plus size={18} className="mr-2" /> Nouvelle Facture
          </Button>
        </div>
      </div>

      <div className="bg-gb-surface-solid border border-gb-border rounded-3xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="bg-gb-app/50 border-b border-gb-border">
                <th className="p-5 text-[10px] font-black uppercase text-gb-muted tracking-widest">Facture</th>
                <th className="p-5 text-[10px] font-black uppercase text-gb-muted tracking-widest">Contrat / Projet</th>
                <th className="p-5 text-[10px] font-black uppercase text-gb-muted tracking-widest">Montant</th>
                <th className="p-5 text-[10px] font-black uppercase text-gb-muted tracking-widest">Échéance</th>
                <th className="p-5 text-[10px] font-black uppercase text-gb-muted tracking-widest text-center">Statut</th>
                <th className="p-5"></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="p-20 text-center">
                    <Loader2 className="w-10 h-10 text-emerald-600 animate-spin mx-auto mb-4" />
                    <p className="text-gb-muted font-medium italic">Récupération du registre de facturation...</p>
                  </td>
                </tr>
              ) : filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-20 text-center">
                    <Receipt className="mx-auto text-gb-muted/20 mb-6" size={48} />
                    <p className="text-gb-muted font-bold">Aucune facture enregistrée pour le moment.</p>
                  </td>
                </tr>
              ) : (
                filteredInvoices.map((inv) => (
                  <tr key={inv.id} className="border-b border-gb-border group hover:bg-gb-app/30 transition-colors">
                    <td className="p-5">
                      <div className="flex flex-col">
                        <span className="font-black text-gb-text tracking-tight">{inv.number}</span>
                        <span className="text-[10px] font-bold text-gb-muted uppercase mt-0.5">
                          {format(new Date(inv.created_at), 'dd MMM yyyy', { locale: fr })}
                        </span>
                      </div>
                    </td>
                    <td className="p-5">
                      <div className="flex flex-col">
                         <span className="text-sm font-bold text-gb-text">{inv.contract?.reference}</span>
                         <span className="text-[10px] font-medium text-gb-muted truncate max-w-[200px]">{inv.project?.title}</span>
                      </div>
                    </td>
                    <td className="p-5">
                       <span className="text-sm font-black text-gb-text">
                         {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(inv.amount)}
                       </span>
                    </td>
                    <td className="p-5">
                       <div className="flex items-center gap-2 text-sm font-bold text-gb-muted">
                          <Clock size={14} className={new Date(inv.due_date) < new Date() && inv.status !== 'PAID' ? "text-gb-danger" : ""} />
                          <span className={new Date(inv.due_date) < new Date() && inv.status !== 'PAID' ? "text-gb-danger" : ""}>
                             {inv.due_date ? format(new Date(inv.due_date), 'dd/MM/yyyy') : "-"}
                          </span>
                       </div>
                    </td>
                    <td className="p-5 text-center">
                       {getStatusBadge(inv.status)}
                    </td>
                    <td className="p-5 text-right">
                       <button className="w-8 h-8 rounded-lg bg-gb-app border border-gb-border text-gb-muted flex items-center justify-center hover:bg-emerald-600 hover:text-white transition-all group-hover:scale-105">
                          <ChevronRight size={18} />
                       </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
