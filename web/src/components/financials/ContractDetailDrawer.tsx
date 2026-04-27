import React, { useState, useEffect } from "react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle 
} from "../ui/dialog";
import { 
  FileSignature, 
  Building2, 
  Calendar, 
  Layers, 
  Banknote,
  Receipt,
  FileEdit,
  CreditCard,
  History,
  Loader2,
  TrendingUp,
  Download,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  Clock
} from "lucide-react";
import { Badge } from "../ui/badge";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { motion } from "motion/react";

interface ContractDetailDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contractId: number;
}

export default function ContractDetailDrawer({ open, onOpenChange, contractId }: ContractDetailDrawerProps) {
  const [contract, setContract] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (open && contractId) {
      fetchContractDetails();
    }
  }, [open, contractId]);

  const fetchContractDetails = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`/api/contracts/${contractId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setContract(await res.json());
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[900px] p-0 bg-gb-surface-solid border-gb-border overflow-hidden flex flex-col max-h-[90vh]">
        {loading ? (
          <div className="p-32 flex flex-col items-center justify-center">
            <Loader2 className="w-12 h-12 text-gb-primary animate-spin mb-4" />
            <p className="text-gb-muted italic">Extraction des données contractuelles...</p>
          </div>
        ) : contract ? (
          <>            <DialogHeader className="p-4 sm:p-8 border-b border-gb-border bg-gb-app/30 shrink-0">
               <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                  <div className="flex gap-3 sm:gap-5">
                     <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-2xl bg-gb-surface-solid border border-gb-border shadow-sm flex items-center justify-center text-gb-primary shrink-0">
                        <FileSignature size={24} className="sm:hidden" />
                        <FileSignature size={32} className="hidden sm:block" />
                     </div>
                     <div>
                        <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-1">
                           <DialogTitle className="text-xl sm:text-3xl font-black tracking-tighter text-gb-text">
                               {contract.reference}
                           </DialogTitle>
                           <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[9px] sm:text-xs">
                               {contract.status}
                           </Badge>
                        </div>
                        <p className="text-[9px] sm:text-xs font-bold text-gb-muted uppercase tracking-[0.1em] sm:tracking-[0.2em] flex items-center gap-2">
                           {contract.type === "OWNER" ? "Contrat Client" : "Sous-traitance"}
                        </p>
                     </div>
                  </div>
                  <div className="flex gap-2 w-full sm:w-auto">
                     <button className="flex-1 sm:flex-none justify-center px-4 py-2 rounded-xl bg-gb-app border border-gb-border text-xs font-bold hover:bg-gb-border transition-colors flex items-center gap-2">
                        <Download size={14} /> <span className="sm:hidden">Télécharger</span> <span className="hidden sm:inline">PDF</span>
                     </button>
                     <button className="flex-1 sm:flex-none justify-center px-4 py-2 rounded-xl bg-gb-primary text-gb-inverse text-xs font-black hover:bg-gb-primary-dark transition-colors shadow-lg shadow-gb-primary/20 uppercase">
                        Éditer
                     </button>
                  </div>
               </div>
            </DialogHeader>

            <div className="flex-1 overflow-y-auto p-4 sm:p-8 space-y-8 sm:space-y-12">
               {/* Metadata Grid */}
               <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-8">
                  <div className="space-y-1">
                     <p className="text-[10px] font-black uppercase text-gb-muted tracking-widest">Client / Tier</p>
                     <p className="font-bold text-gb-text flex items-center gap-2">
                        <Building2 size={16} className="text-gb-primary" /> {contract.supplier?.name}
                     </p>
                  </div>
                  <div className="space-y-1">
                     <p className="text-[10px] font-black uppercase text-gb-muted tracking-widest">Projet</p>
                     <p className="font-bold text-gb-text flex items-center gap-2 truncate">
                        <ShieldCheck size={16} className="text-gb-primary" /> {contract.project?.title}
                     </p>
                  </div>
                  <div className="space-y-1">
                     <p className="text-[10px] font-black uppercase text-gb-muted tracking-widest">Signature</p>
                     <p className="font-bold text-gb-text flex items-center gap-2">
                        <Calendar size={16} className="text-gb-primary" /> 
                        {contract.executed_at ? format(new Date(contract.executed_at), 'dd/MM/yyyy') : "-"}
                     </p>
                  </div>
                  <div className="space-y-1">
                     <p className="text-[10px] font-black uppercase text-gb-muted tracking-widest">Retenue de garantie</p>
                     <p className="font-bold text-gb-text flex items-center gap-2">
                        <CreditCard size={16} className="text-gb-primary" /> {contract.retention_pct || 0}%
                     </p>
                  </div>
               </div>

               <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                  {/* Financial Overview */}
                  <div className="lg:col-span-1 space-y-6">
                     <div className="p-6 rounded-3xl bg-gb-app border border-gb-border space-y-4">
                        <h4 className="text-[10px] font-black uppercase text-gb-muted tracking-widest flex items-center gap-2">
                           <TrendingUp size={14} /> Récapitulatif Financier
                        </h4>
                        <div className="space-y-4">
                           <div className="flex justify-between items-end border-b border-gb-border/50 pb-2">
                              <span className="text-xs font-bold text-gb-muted">Montant Initial</span>
                              <span className="font-black text-gb-text">
                                 {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: contract.currency || 'EUR' }).format(
                                    contract.line_items?.reduce((sum: number, i: any) => sum + i.total_price, 0) || 0
                                 )}
                              </span>
                           </div>
                           <div className="flex justify-between items-end border-b border-gb-border/50 pb-2">
                              <span className="text-xs font-bold text-gb-muted">Avenants Approuvés</span>
                              <span className="font-black text-emerald-500">
                                 +{new Intl.NumberFormat('fr-FR', { style: 'currency', currency: contract.currency || 'EUR' }).format(
                                    contract.change_orders?.filter((co: any) => co.status === 'APPROVED').reduce((sum: number, co: any) => sum + co.amount, 0) || 0
                                 )}
                              </span>
                           </div>
                           <div className="flex justify-between items-end pt-2">
                              <span className="text-sm font-black text-gb-text uppercase">Montant Actuel</span>
                              <span className="text-2xl font-black text-gb-primary tracking-tighter">
                                 {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: contract.currency || 'EUR' }).format(
                                    (contract.line_items?.reduce((sum: number, i: any) => sum + i.total_price, 0) || 0) +
                                    (contract.change_orders?.filter((co: any) => co.status === 'APPROVED').reduce((sum: number, co: any) => sum + co.amount, 0) || 0)
                                 )}
                              </span>
                           </div>
                        </div>
                     </div>

                     <div className="p-6 rounded-3xl border border-gb-border space-y-4">
                        <h4 className="text-[10px] font-black uppercase text-gb-muted tracking-widest">Facturation & Paiements</h4>
                        <div className="space-y-3">
                           <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-gb-muted">Facturé</span>
                              <span className="text-sm font-black">{contract.invoices?.length || 0} factures</span>
                           </div>
                           <div className="w-full bg-gb-app h-2 rounded-full overflow-hidden">
                              <motion.div 
                                 initial={{ width: 0 }}
                                 animate={{ width: "65%" }}
                                 className="h-full bg-gb-primary"
                              />
                           </div>
                        </div>
                     </div>
                  </div>

                  {/* Sections List */}
                  <div className="lg:col-span-2 space-y-10">
                     {/* Change Orders Section */}
                     <section className="space-y-4">
                        <div className="flex justify-between items-center">
                           <h4 className="text-[10px] font-black uppercase text-gb-muted tracking-[0.2em] flex items-center gap-2">
                              <FileEdit size={14} className="text-amber-500" /> Avenants récents
                           </h4>
                           <button className="text-[10px] font-bold text-gb-primary hover:underline">VOIR TOUT</button>
                        </div>
                        <div className="space-y-3">
                           {contract.change_orders?.length > 0 ? (
                              contract.change_orders.slice(0, 3).map((co: any) => (
                                 <div key={co.id} className="flex items-center justify-between p-4 bg-gb-app/30 border border-gb-border rounded-2xl group hover:bg-gb-app/50 transition-colors">
                                    <div className="flex items-center gap-4">
                                       <div className="p-2 bg-amber-500/10 text-amber-600 rounded-lg">
                                          <Receipt size={16} />
                                       </div>
                                       <div>
                                          <p className="text-sm font-black text-gb-text">#{co.number}</p>
                                          <p className="text-[10px] font-medium text-gb-muted italic truncate max-w-[200px]">{co.description}</p>
                                       </div>
                                    </div>
                                    <div className="flex items-center gap-6">
                                       <span className="text-sm font-black text-emerald-500">+{co.amount} €</span>
                                       <Badge className="bg-emerald-500/10 text-emerald-600 text-[9px] font-black">{co.status}</Badge>
                                    </div>
                                 </div>
                              ))
                           ) : (
                              <p className="text-xs text-gb-muted italic p-10 text-center border border-dashed border-gb-border rounded-3xl">Aucun avenant enregistré</p>
                           )}
                        </div>
                     </section>

                     {/* Invoices Section */}
                     <section className="space-y-4">
                        <div className="flex justify-between items-center">
                           <h4 className="text-[10px] font-black uppercase text-gb-muted tracking-[0.2em] flex items-center gap-2">
                              <Receipt size={14} className="text-emerald-500" /> Dernières factures
                           </h4>
                           <button className="text-[10px] font-bold text-gb-primary hover:underline">VOIR TOUT</button>
                        </div>
                        <div className="space-y-3">
                           {contract.invoices?.length > 0 ? (
                              contract.invoices.slice(0, 3).map((inv: any) => (
                                 <div key={inv.id} className="flex items-center justify-between p-4 bg-gb-app/30 border border-gb-border rounded-2xl group hover:bg-gb-app/50 transition-colors">
                                    <div className="flex items-center gap-4">
                                       <div className="p-2 bg-emerald-500/10 text-emerald-600 rounded-lg">
                                          <CheckCircle2 size={16} />
                                       </div>
                                       <div>
                                          <p className="text-sm font-black text-gb-text">{inv.number}</p>
                                          <p className="text-[10px] font-medium text-gb-muted">Échéance {inv.due_date ? format(new Date(inv.due_date), 'dd/MM/yyyy') : "-"}</p>
                                       </div>
                                    </div>
                                    <div className="flex items-center gap-6">
                                       <span className="text-sm font-black text-gb-text">{inv.amount} €</span>
                                       <Badge className="bg-blue-500/10 text-blue-600 text-[9px] font-black">{inv.status}</Badge>
                                    </div>
                                 </div>
                              ))
                           ) : (
                              <p className="text-xs text-gb-muted italic p-10 text-center border border-dashed border-gb-border rounded-3xl">Aucune facture enregistrée</p>
                           )}
                        </div>
                     </section>
                  </div>
               </div>
            </div>

            <DialogHeader className="p-4 border-t border-gb-border bg-gb-app/10 flex flex-row justify-between items-center shrink-0">
               <div className="flex items-center gap-3 text-[10px] font-bold text-gb-muted uppercase tracking-widest">
                  <Clock size={12} />
                  Dernière modification le {format(new Date(contract.updated_at), "dd/MM/yyyy à HH:mm")}
               </div>
               <div className="text-[10px] font-black text-gb-muted uppercase">
                  ID: {contract.id}
               </div>
            </DialogHeader>
          </>
        ) : (
          <div className="p-20 text-center">
            <p className="text-gb-muted">Erreur de chargement du contrat.</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
