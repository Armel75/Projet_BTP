import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../ui/dialog";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";

interface ResourceFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: any) => Promise<void>;
  initialData?: any;
  types: any[];
}

export function ResourceFormDialog({ open, onOpenChange, onSubmit, initialData, types }: ResourceFormDialogProps) {
  const [formData, setFormData] = useState({
    name: "",
    type_id: "",
    cost_rate: "",
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name,
        type_id: initialData.type_id.toString(),
        cost_rate: initialData.cost_rate.toString(),
      });
    } else {
      setFormData({ name: "", type_id: "", cost_rate: "" });
    }
  }, [initialData, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSubmit({
        ...formData,
        type_id: parseInt(formData.type_id),
        cost_rate: parseFloat(formData.cost_rate),
      });
      onOpenChange(false);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] bg-gb-surface-solid border-gb-border">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold tracking-tight">
            {initialData ? "Modifier la ressource" : "Nouvelle ressource"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6 py-4">
          <div className="space-y-2">
            <Label htmlFor="name" className="text-sm font-bold text-gb-muted uppercase tracking-wider">Nom / Désignation</Label>
            <Input 
              id="name" 
              value={formData.name} 
              onChange={(e) => setFormData({ ...formData, name: e.target.value })} 
              className="bg-gb-app border-gb-border h-11"
              required
              placeholder="ex: Grue Levage GT-400"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="type" className="text-sm font-bold text-gb-muted uppercase tracking-wider">Type</Label>
              <Select 
                value={formData.type_id} 
                onValueChange={(val) => setFormData({ ...formData, type_id: val })}
              >
                <SelectTrigger id="type" className="bg-gb-app border-gb-border h-11">
                  <SelectValue placeholder="Choisir..." />
                </SelectTrigger>
                <SelectContent className="bg-gb-surface-solid border-gb-border">
                  {types.map((t) => (
                    <SelectItem key={t.id} value={t.id.toString()}>{t.code}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="rate" className="text-sm font-bold text-gb-muted uppercase tracking-wider">Taux horaire (€)</Label>
              <Input 
                id="rate" 
                type="number" 
                step="0.01"
                value={formData.cost_rate} 
                onChange={(e) => setFormData({ ...formData, cost_rate: e.target.value })} 
                className="bg-gb-app border-gb-border h-11"
                required
                placeholder="45.00"
              />
            </div>
          </div>
          
          <DialogFooter className="pt-4 gap-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Annuler</Button>
            <Button type="submit" disabled={loading} className="px-8 shadow-lg shadow-gb-primary/20">
              {loading ? "Enregistrement..." : "Enregistrer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
