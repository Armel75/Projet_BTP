import React, { useMemo, useState } from "react";
import { apiFetch } from "../../lib/api";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Button } from "../ui/button";
import { Textarea } from "../ui/textarea";
import { AlertTriangle, Loader2, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

const API_BASE = import.meta.env.VITE_API_URL;

type ReportLike = {
  id: number;
  status: string;
  week_start: string;
  week_end: string;
};

interface DeleteWeeklyReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  report: ReportLike | null;
  onDeleted: () => Promise<void> | void;
}

export default function DeleteWeeklyReportDialog({
  open,
  onOpenChange,
  report,
  onDeleted,
}: DeleteWeeklyReportDialogProps) {
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reasonLength = reason.trim().length;
  const isValidReason = reasonLength >= 10 && reasonLength <= 500;

  const weekLabel = useMemo(() => {
    if (!report) return "";
    return `du ${format(new Date(report.week_start), "dd MMMM", { locale: fr })} au ${format(new Date(report.week_end), "dd MMMM yyyy", { locale: fr })}`;
  }, [report]);

  const handleClose = (nextOpen: boolean) => {
    if (submitting) return;
    if (!nextOpen) {
      setReason("");
      setError(null);
    }
    onOpenChange(nextOpen);
  };

  const handleDelete = async () => {
    if (!report || submitting) return;
    if (!isValidReason) {
      setError("Le motif est obligatoire (10 a 500 caracteres).");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const res = await apiFetch(`${API_BASE}/weekly-reports/${report.id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: reason.trim() }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error || `Suppression impossible (${res.status}).`);
        return;
      }

      await onDeleted();
      setReason("");
      onOpenChange(false);
    } catch {
      setError("Erreur reseau pendant la suppression.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[520px] bg-gb-surface-solid border-gb-border p-0 overflow-hidden" showCloseButton={!submitting}>
        <DialogHeader className="p-6 border-b border-gb-border bg-gb-app/40">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-xl border border-gb-danger/25 bg-gb-danger/10 text-gb-danger flex items-center justify-center shrink-0">
              <AlertTriangle size={18} />
            </div>
            <div>
              <DialogTitle className="text-xl font-black tracking-tight text-gb-text">Supprimer la revue hebdomadaire</DialogTitle>
              <DialogDescription className="text-sm text-gb-muted mt-1">
                Cette action est reservee aux brouillons. Renseignez un motif pour assurer la tracabilite.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="p-6 space-y-4">
          {report && (
            <div className="rounded-xl border border-gb-border bg-gb-app/40 px-4 py-3 text-xs font-bold uppercase tracking-widest text-gb-muted">
              Rapport {weekLabel}
            </div>
          )}

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-gb-muted">Motif de suppression</label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ex: Doublon genere par erreur lors des tests de consolidation."
              className="min-h-[120px] bg-gb-app border-gb-border rounded-xl text-sm"
              disabled={submitting}
            />
            <div className="flex items-center justify-between text-[11px]">
              <span className={isValidReason ? "text-emerald-500 font-semibold" : "text-gb-muted"}>Minimum 10 caracteres requis</span>
              <span className={reasonLength > 500 ? "text-gb-danger font-semibold" : "text-gb-muted"}>{reasonLength}/500</span>
            </div>
          </div>

          {error && (
            <div className="rounded-xl border border-gb-danger/20 bg-gb-danger/5 px-3 py-2 text-sm font-medium text-gb-danger">
              {error}
            </div>
          )}
        </div>

        <DialogFooter className="border-t border-gb-border bg-gb-app/30">
          <Button type="button" variant="outline" onClick={() => handleClose(false)} disabled={submitting}>
            Annuler
          </Button>
          <Button
            type="button"
            className="bg-gb-danger hover:bg-gb-danger/90 text-white"
            onClick={handleDelete}
            disabled={submitting || !isValidReason || !report}
          >
            {submitting ? <Loader2 size={14} className="mr-2 animate-spin" /> : <Trash2 size={14} className="mr-2" />}
            {submitting ? "Suppression..." : "Confirmer la suppression"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
