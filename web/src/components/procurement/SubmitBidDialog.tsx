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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Loader2, Send } from "lucide-react";

interface SubmitBidDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tender: any;
  onSuccess: () => void;
}

export default function SubmitBidDialog({ open, onOpenChange, tender, onSuccess }: SubmitBidDialogProps) {
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedSupplierId, setSelectedSupplierId] = useState("");
  const [amount, setAmount] = useState("");

  const fetchSuppliers = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("/api/procurement/suppliers", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setSuppliers(await res.json());
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      fetchSuppliers();
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSupplierId || !amount) return;

    setSubmitting(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`/api/procurement/tenders/${tender.id}/bids`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          supplier_id: parseInt(selectedSupplierId),
          amount: parseFloat(amount)
        })
      });

      if (res.ok) {
        onSuccess();
        onOpenChange(false);
        setSelectedSupplierId("");
        setAmount("");
      } else {
        const err = await res.json();
        alert(err.error || "Erreur lors de la soumission");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px] bg-gb-surface-solid border-gb-border px-0 py-0 overflow-hidden">
        <DialogHeader className="p-6 border-b border-gb-border bg-gb-app/30">
          <DialogTitle className="text-xl font-extrabold tracking-tight">Soumettre une offre</DialogTitle>
          <p className="text-xs text-gb-muted font-medium mt-1">Saisissez l'offre reçue pour : <span className="text-gb-text">{tender.title}</span></p>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="space-y-2">
            <Label className="text-[10px] font-bold text-gb-muted uppercase tracking-widest">Fournisseur</Label>
            <Select value={selectedSupplierId} onValueChange={setSelectedSupplierId}>
              <SelectTrigger className="h-12 bg-gb-app border-gb-border rounded-xl">
                <SelectValue placeholder={loading ? "Chargement des fournisseurs..." : "Choisir un fournisseur..."} />
              </SelectTrigger>
              <SelectContent className="bg-gb-surface-solid border-gb-border">
                {suppliers.map((s) => (
                  <SelectItem key={s.id} value={s.id.toString()}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount" className="text-[10px] font-bold text-gb-muted uppercase tracking-widest">Montant de l'offre (€)</Label>
            <Input 
              id="amount" 
              type="number" 
              step="0.01" 
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="h-12 bg-gb-app border-gb-border rounded-xl text-lg font-bold"
              required
            />
          </div>

          <DialogFooter className="pt-4 flex gap-3">
             <Button type="button" variant="ghost" className="rounded-xl flex-1 h-12" onClick={() => onOpenChange(false)}>
               Annuler
             </Button>
             <Button type="submit" disabled={submitting || !selectedSupplierId} className="rounded-xl flex-1 h-12 shadow-lg shadow-gb-primary/20">
               {submitting ? <Loader2 className="animate-spin" size={18} /> : <><Send size={16} className="mr-2" /> Envoyer l'offre</>}
             </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
