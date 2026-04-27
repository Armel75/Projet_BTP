import React, { useState } from "react";
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
import { Loader2, Zap, Calendar as CalendarIcon, Info } from "lucide-react";
import { format, startOfWeek, endOfWeek } from "date-fns";

interface GenerateWeeklyReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: number;
  onSuccess: () => void;
}

export default function GenerateWeeklyReportDialog({ open, onOpenChange, projectId, onSuccess }: GenerateWeeklyReportDialogProps) {
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [submitting, setSubmitting] = useState(false);

  const handleGenerate = async () => {
    setSubmitting(true);
    try {
      const selectedDate = new Date(date);
      const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
      const weekEnd = endOfWeek(selectedDate, { weekStartsOn: 1 });

      const token = localStorage.getItem("token");
      const res = await fetch("/api/weekly-reports/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          projectId,
          weekStart: weekStart.toISOString(),
          weekEnd: weekEnd.toISOString()
        })
      });

      if (res.ok) {
        onSuccess();
        onOpenChange(false);
      } else {
        const err = await res.json();
        alert(err.error || "Erreur de génération");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px] bg-gb-surface-solid border-gb-border p-0 overflow-hidden">
        <DialogHeader className="p-8 border-b border-gb-border bg-gb-app/30">
          <DialogTitle className="text-2xl font-black tracking-tight flex items-center gap-3">
             <Zap className="text-purple-600" size={28} />
             Génération Synthèse Hebdo
          </DialogTitle>
          <p className="text-xs text-gb-muted font-bold uppercase tracking-widest mt-1">Consolidation automatique des journaux</p>
        </DialogHeader>

        <div className="p-8 space-y-6">
           <div className="p-4 bg-gb-app/50 border border-gb-border rounded-xl flex items-start gap-3">
              <Info size={18} className="text-gb-primary shrink-0 mt-0.5" />
              <p className="text-xs text-gb-muted leading-relaxed font-medium">
                La synthèse hebdomadaire sera générée à partir de tous les journaux de bord existants pour la semaine de la date sélectionnée.
              </p>
           </div>

           <div className="space-y-2">
              <Label htmlFor="week" className="text-[10px] font-bold text-gb-muted uppercase tracking-widest flex items-center gap-2">
                 <CalendarIcon size={12} className="text-gb-primary" /> Sélectionner une date dans la semaine
              </Label>
              <Input 
                id="week" 
                type="date" 
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="h-12 bg-gb-app border-gb-border rounded-xl font-black text-lg focus:ring-purple-600"
              />
           </div>

           <DialogFooter className="pt-4 flex gap-3">
              <Button variant="ghost" className="rounded-xl flex-1 h-12 font-bold" onClick={() => onOpenChange(false)}>
                Annuler
              </Button>
              <Button 
                onClick={handleGenerate} 
                disabled={submitting} 
                className="rounded-xl flex-1 h-12 bg-purple-600 hover:bg-purple-700 shadow-lg shadow-purple-600/20 font-black tracking-tight"
              >
                {submitting ? <Loader2 className="animate-spin" /> : "Générer maintenant"}
              </Button>
           </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
