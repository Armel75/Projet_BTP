import React, { useState, useEffect } from "react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter 
} from "../ui/dialog";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { 
  PackageCheck, 
  AlertCircle, 
  Minus, 
  Plus, 
  Trash2,
  Table as TableIcon,
  CheckCircle2,
  Loader2
} from "lucide-react";
import { motion } from "motion/react";

interface CreateGoodsReceiptDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  delivery: any;
  onSuccess: () => void;
}

export default function CreateGoodsReceiptDialog({ open, onOpenChange, delivery, onSuccess }: CreateGoodsReceiptDialogProps) {
  const [purchaseOrders, setPurchaseOrders] = useState<any[]>([]);
  const [selectedOrderId, setSelectedOrderId] = useState<string>(""); // Should ideally be deduced from delivery
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [items, setItems] = useState<any[]>([
    { id: 1, name: "Matériel Standard", quantity_ordered: 100, quantity_received: 100, quantity_rejected: 0 }
  ]);

  // In a real scenario, we'd fetch items from the Purchase Order
  const fetchPurchaseOrders = async () => {
     setLoading(true);
     try {
       const token = localStorage.getItem("token");
       const res = await fetch("/api/procurement/purchase-orders", {
         headers: { Authorization: `Bearer ${token}` }
       });
       if (res.ok) {
         const data = await res.json();
         setPurchaseOrders(data);
         // Auto-select if there's an order for this supplier
         const auto = data.find((o: any) => o.supplier_id === delivery.supplier_id);
         if (auto) setSelectedOrderId(auto.id.toString());
       }
     } catch (err) {
       console.error(err);
     } finally {
       setLoading(false);
     }
  };

  useEffect(() => {
    if (open) fetchPurchaseOrders();
  }, [open]);

  const updateItem = (id: number, field: string, value: number) => {
    setItems(items.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrderId) {
      alert("Veuillez sélectionner un bon de commande associé.");
      return;
    }

    setSubmitting(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("/api/procurement/goods-receipts", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          project_id: delivery.project_id,
          order_id: parseInt(selectedOrderId),
          delivery_id: delivery.id,
          received_at: new Date().toISOString(),
          items: items.map(it => ({
            item_id: it.id, // In a real app this would be a real Inventory Item ID
            quantity_ordered: it.quantity_ordered,
            quantity_received: it.quantity_received,
            quantity_rejected: it.quantity_rejected
          }))
        })
      });

      if (res.ok) {
        onSuccess();
        onOpenChange(false);
      } else {
        const err = await res.json();
        alert(err.error || "Erreur de réception");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px] bg-gb-surface-solid border-gb-border p-0 overflow-hidden flex flex-col max-h-[90vh]">
        <DialogHeader className="p-6 border-b border-gb-border bg-gb-app/30 flex-row items-center justify-between space-y-0">
          <div>
            <DialogTitle className="text-2xl font-black tracking-tight flex items-center gap-3">
              <PackageCheck className="text-purple-600" size={28} />
              Bordereau de Réception
            </DialogTitle>
            <p className="text-xs text-gb-muted font-bold uppercase tracking-widest mt-1">Fournisseur: {delivery.supplier?.name}</p>
          </div>
          <div className="text-right">
             <p className="text-[10px] font-bold text-gb-muted uppercase tracking-tighter">Date de réception</p>
             <p className="font-mono font-bold text-sm">{new Date().toLocaleDateString()}</p>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-8">
           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                 <Label className="text-[10px] font-bold text-gb-muted uppercase tracking-widest">Associer au Bon de Commande</Label>
                 <select 
                   value={selectedOrderId}
                   onChange={(e) => setSelectedOrderId(e.target.value)}
                   className="w-full h-12 bg-gb-app border border-gb-border rounded-xl px-4 font-bold focus:ring-2 focus:ring-gb-primary outline-none"
                 >
                   <option value="">Sélectionner un BC...</option>
                   {purchaseOrders.map(o => (
                     <option key={o.id} value={o.id}>BC #{o.id} - {o.project?.code}</option>
                   ))}
                 </select>
              </div>
              <div className="flex items-center gap-3 p-4 bg-emerald-500/5 border border-emerald-500/10 rounded-xl">
                 <CheckCircle2 className="text-emerald-500" />
                 <div>
                    <h5 className="text-[10px] font-black uppercase text-emerald-600">Statut Livraison</h5>
                    <p className="text-xs font-medium text-gb-text">Le fournisseur a annoncé la livraison complète.</p>
                 </div>
              </div>
           </div>

           <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-black uppercase tracking-wider flex items-center gap-2">
                  <TableIcon size={16} className="text-gb-primary" />
                  Pointage des articles
                </h4>
                <Button type="button" variant="ghost" size="sm" className="text-[10px] font-bold text-gb-primary h-7">
                  <Plus size={12} className="mr-1" /> Ajouter une ligne
                </Button>
              </div>

              <div className="border border-gb-border rounded-2xl overflow-hidden bg-gb-app/30">
                 <table className="w-full text-left">
                    <thead className="bg-gb-surface-hover/30 border-b border-gb-border">
                       <tr>
                          <th className="p-4 text-[10px] font-black text-gb-muted uppercase">Désignation</th>
                          <th className="p-4 text-[10px] font-black text-gb-muted uppercase w-24">Commandé</th>
                          <th className="p-4 text-[10px] font-black text-gb-muted uppercase w-24">Reçu</th>
                          <th className="p-4 text-[10px] font-black text-gb-muted uppercase w-24 text-gb-danger">Rejeté</th>
                       </tr>
                    </thead>
                    <tbody>
                       {items.map((item) => (
                         <tr key={item.id} className="border-b border-gb-border/50 group hover:bg-gb-surface-hover/20 transition-colors">
                            <td className="p-4 font-bold text-sm text-gb-text">{item.name}</td>
                            <td className="p-4">
                               <Input 
                                 type="number" 
                                 readOnly 
                                 value={item.quantity_ordered} 
                                 className="h-9 bg-gb-surface-hover/50 border-0 text-center font-mono font-bold"
                               />
                            </td>
                            <td className="p-4">
                               <Input 
                                 type="number" 
                                 value={item.quantity_received}
                                 onChange={(e) => updateItem(item.id, 'quantity_received', parseInt(e.target.value))}
                                 className="h-9 bg-gb-surface-solid border-gb-border text-center font-mono font-bold focus:ring-gb-primary"
                               />
                            </td>
                            <td className="p-4">
                               <Input 
                                 type="number" 
                                 value={item.quantity_rejected}
                                 onChange={(e) => updateItem(item.id, 'quantity_rejected', parseInt(e.target.value))}
                                 className="h-9 bg-gb-surface-solid border-gb-danger/30 text-gb-danger text-center font-mono font-bold focus:ring-gb-danger"
                               />
                            </td>
                         </tr>
                       ))}
                    </tbody>
                 </table>
              </div>
           </div>

           <div className="p-4 bg-gb-surface-hover/50 rounded-xl flex items-start gap-3">
              <AlertCircle size={18} className="text-gb-primary shrink-0 mt-0.5" />
              <p className="text-[10px] leading-relaxed text-gb-muted font-medium italic">
                En validant cette réception, vous confirmez l'entrée en stock et l'acceptation de la marchandise. 
                Les quantités rejetées feront l'objet d'un avoir ou d'une demande de remplacement automatique.
              </p>
           </div>
        </form>

        <DialogFooter className="p-6 border-t border-gb-border bg-gb-app/30 gap-3">
           <Button type="button" variant="ghost" className="rounded-xl px-8 h-12 font-bold" onClick={() => onOpenChange(false)}>
             Annuler
           </Button>
           <Button 
            onClick={handleSubmit} 
            disabled={submitting}
            className="rounded-xl px-12 h-12 bg-purple-600 hover:bg-purple-700 shadow-lg shadow-purple-600/20 font-black tracking-tight"
           >
             {submitting ? <Loader2 className="animate-spin" /> : "Valider la réception chantier"}
           </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
