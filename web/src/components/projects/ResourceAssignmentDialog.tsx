import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../ui/dialog";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Loader2, HardHat, Truck, User } from "lucide-react";

interface ResourceAssignmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: any;
  onAssign: (resourceId: number, data: any) => Promise<void>;
}

export function ResourceAssignmentDialog({ open, onOpenChange, task, onAssign }: ResourceAssignmentDialogProps) {
  const [resources, setResources] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedResourceId, setSelectedResourceId] = useState<string>("");
  const [plannedHours, setPlannedHours] = useState<string>("0");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      fetchResources();
    }
  }, [open]);

  const fetchResources = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("/api/resources", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setResources(await res.json());
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedResourceId) return;
    setSubmitting(true);
    try {
      await onAssign(parseInt(selectedResourceId), {
        resourceId: parseInt(selectedResourceId),
        plannedHours: parseFloat(plannedHours)
      });
      onOpenChange(false);
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const getIcon = (code: string) => {
    switch (code) {
      case "LABOR": return <HardHat size={14} className="text-amber-500" />;
      case "EQUIPMENT": return <Truck size={14} className="text-blue-500" />;
      default: return <User size={14} className="text-gb-muted" />;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px] bg-gb-surface-solid border-gb-border">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold tracking-tight">Affecter une ressource</DialogTitle>
          <p className="text-sm text-gb-muted">Affecter une ressource à la tâche : {task?.title}</p>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6 py-4">
          <div className="space-y-2">
            <Label className="text-sm font-bold text-gb-muted uppercase tracking-wider">Sélectionner la Ressource</Label>
            <Select 
              value={selectedResourceId} 
              onValueChange={setSelectedResourceId}
            >
              <SelectTrigger className="bg-gb-app border-gb-border h-11">
                <SelectValue placeholder={loading ? "Chargement..." : "Choisir une ressource..."} />
              </SelectTrigger>
              <SelectContent className="bg-gb-surface-solid border-gb-border max-h-[300px]">
                {resources.map((r) => (
                  <SelectItem key={r.id} value={r.id.toString()}>
                    <div className="flex items-center gap-2">
                      {getIcon(r.type.code)}
                      <span className="font-bold">{r.name}</span>
                      <span className="text-[10px] text-gb-muted">({r.type.code})</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="plannedHours" className="text-sm font-bold text-gb-muted uppercase tracking-wider">Heures Prévues</Label>
            <Input 
              id="plannedHours"
              type="number"
              value={plannedHours}
              onChange={(e) => setPlannedHours(e.target.value)}
              className="bg-gb-app border-gb-border h-11"
              required
            />
          </div>

          <DialogFooter className="pt-4 gap-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Annuler</Button>
            <Button type="submit" disabled={submitting || !selectedResourceId} className="px-8 shadow-lg shadow-gb-primary/20">
              {submitting ? "Affectation..." : "Affecter"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
