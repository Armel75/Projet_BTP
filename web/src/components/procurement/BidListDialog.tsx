import React, { useState } from "react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter 
} from "../ui/dialog";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { 
  Trophy, 
  User, 
  Calendar, 
  Euro, 
  AlertCircle,
  ChevronRight,
  TrendingUp,
  Award
} from "lucide-react";
import { motion } from "motion/react";

interface BidListDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tender: any;
  onBidAwarded: () => void;
}

export default function BidListDialog({ open, onOpenChange, tender, onBidAwarded }: BidListDialogProps) {
  const [loading, setLoading] = useState(false);

  const handleAward = async (bidId: number) => {
    if (!confirm("Voulez-vous attribuer le marché à cette offre ? Cela générera automatiquement un bon de commande.")) return;
    
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("/api/procurement/purchase-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ bidId })
      });
      if (res.ok) {
        onBidAwarded();
        onOpenChange(false);
      } else {
        const err = await res.json();
        alert(err.error || "Erreur lors de l'attribution");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Sort bids by amount to help comparison
  const sortedBids = [...(tender.bids || [])].sort((a, b) => a.amount - b.amount);
  const bestAmount = sortedBids.length > 0 ? sortedBids[0].amount : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] bg-gb-surface-solid border-gb-border max-h-[85vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="p-6 border-b border-gb-border bg-gb-app/30">
          <div className="flex justify-between items-start">
             <div>
                <p className="text-[10px] font-bold text-gb-primary uppercase tracking-widest mb-1">Appel d'offres</p>
                <DialogTitle className="text-2xl font-extrabold tracking-tight">{tender.title}</DialogTitle>
             </div>
             <Badge className="bg-gb-surface-hover text-gb-text h-6">{tender.bids?.length || 0} Offres</Badge>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {sortedBids.length === 0 ? (
            <div className="text-center py-12">
              <AlertCircle className="mx-auto text-gb-muted mb-4 opacity-20" size={48} />
              <p className="text-gb-muted italic">Aucune offre n'a encore été soumise.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {sortedBids.map((bid, index) => {
                const isBest = bid.amount === bestAmount;
                return (
                  <motion.div 
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    key={bid.id} 
                    className={`p-5 rounded-2xl border transition-all duration-300 relative group overflow-hidden ${
                      isBest 
                      ? "bg-emerald-500/5 border-emerald-500/30 shadow-lg shadow-emerald-500/5" 
                      : "bg-gb-app/50 border-gb-border hover:border-gb-primary/50"
                    }`}
                  >
                    {isBest && (
                      <div className="absolute top-0 right-0 px-3 py-1 bg-emerald-500 text-white text-[10px] font-bold uppercase rounded-bl-xl tracking-tighter flex items-center gap-1 shadow-sm">
                        <TrendingUp size={12} />
                        Meilleur Prix
                      </div>
                    )}

                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex items-start gap-4">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 border ${
                          isBest ? "bg-emerald-100 border-emerald-200 text-emerald-600" : "bg-gb-app border-gb-border text-gb-muted"
                        }`}>
                          <Award size={24} />
                        </div>
                        <div>
                          <h4 className="font-extrabold text-lg text-gb-text leading-tight group-hover:text-gb-primary transition-colors">
                            {bid.supplier?.name}
                          </h4>
                          <div className="flex items-center gap-3 mt-1.5">
                             <span className="flex items-center gap-1 text-[10px] text-gb-muted font-bold uppercase">
                               <Calendar size={10} /> {new Date(bid.created_at).toLocaleDateString()}
                             </span>
                             <span className="text-gb-border">•</span>
                             <span className="flex items-center gap-1 text-[10px] text-gb-muted font-bold uppercase">
                               <User size={10} /> {bid.createdBy?.firstname}
                             </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-6 justify-between md:justify-end">
                         <div className="text-right">
                            <p className="text-[10px] font-bold uppercase text-gb-muted tracking-wide">Montant Total</p>
                            <p className={`text-xl font-black ${isBest ? "text-emerald-600" : "text-gb-text"}`}>
                              {bid.amount.toLocaleString()} <span className="text-sm">€</span>
                            </p>
                         </div>
                         
                         {tender.status !== 'AWARDED' && (
                           <Button 
                             disabled={loading}
                             onClick={() => handleAward(bid.id)}
                             className={`rounded-xl shadow-md h-10 px-5 group-hover:scale-105 transition-all ${
                               isBest ? "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20" : "shadow-gb-primary/20"
                             }`}
                           >
                             Retenir <ChevronRight size={16} className="ml-1" />
                           </Button>
                         )}
                         {tender.status === 'AWARDED' && bid.id === tender.awardedBidId && (
                            <Badge className="bg-emerald-500 text-white border-0 py-1.5 px-3 rounded-lg shadow-lg shadow-emerald-500/30">
                              MARCHÉ ATTRIBUÉ
                            </Badge>
                         )}
                      </div>
                    </div>

                    <div className="mt-4 pt-4 border-t border-dashed border-gb-border/50 flex gap-4">
                        <div className="px-3 py-1 bg-gb-surface-hover rounded-lg text-[10px] font-bold text-gb-muted uppercase">Délai estimé: 15j</div>
                        <div className="px-3 py-1 bg-gb-surface-hover rounded-lg text-[10px] font-bold text-gb-muted uppercase">Validité: 30j</div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>

        <DialogFooter className="p-6 border-t border-gb-border bg-gb-app/30">
           <Button variant="ghost" className="rounded-xl px-10 h-11 font-bold" onClick={() => onOpenChange(false)}>Fermer</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
