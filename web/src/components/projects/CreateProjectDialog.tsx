import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../ui/dialog";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Loader2, AlertCircle, FolderPlus, FileText } from "lucide-react";
import { apiFetch, API_BASE } from "../../lib/api";

// ─── Types ─────────────────────────────────────────────────────────────────────

interface CreateProjectDialogProps {
  open: boolean;
  onClose: () => void;
  onCreated: (project: any) => void;
}

const STATUS_OPTIONS = [
  { value: "PLANNING",    label: "Planification" },
  { value: "ACTIVE",      label: "En cours" },
  { value: "ON_HOLD",     label: "En pause" },
  { value: "COMPLETED",   label: "Terminé" },
];

const CURRENCY_OPTIONS = ["EUR", "USD", "XOF", "MAD", "DZD", "GBP"];
const DOC_CATEGORY_OPTIONS = [
  { value: "PLAN",     label: "Plan / Dessin" },
  { value: "REPORT",   label: "Rapport" },
  { value: "CONTRACT", label: "Contrat" },
  { value: "OTHER",    label: "Autre" },
];

// ─── CreateProjectDialog ───────────────────────────────────────────────────────

export function CreateProjectDialog({ open, onClose, onCreated }: CreateProjectDialogProps) {
  const [submitting, setSubmitting] = useState(false);
  const [error,      setError]      = useState<string | null>(null);

  const [form, setForm] = useState({
    title:           "",
    status:          "PLANNING",
    location:        "",
    currency:        "EUR",
    budget_initial:  "",
    start_date:      "",
    end_date:        "",
    doc_name:        "",
    doc_category:    "PLAN",
    doc_description: "",
  });

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(prev => ({ ...prev, [key]: e.target.value }));

  const handleClose = () => {
    if (submitting) return;
    setError(null);
    setForm({ title: "", status: "PLANNING", location: "", currency: "EUR",
      budget_initial: "", start_date: "", end_date: "", doc_name: "", doc_category: "PLAN", doc_description: "" });
    onClose();
  };

  const handleSubmit = async () => {
    // Client-side validation
    if (!form.title.trim())          { setError("Le titre est requis."); return; }
    if (!form.location.trim())       { setError("La localisation est requise."); return; }
    if (!form.budget_initial || isNaN(Number(form.budget_initial))) {
      setError("Le budget initial est requis (nombre)."); return;
    }
    if (!form.doc_name.trim())       { setError("Le nom du document principal est requis."); return; }
    if (form.start_date && form.end_date && form.start_date > form.end_date) {
      setError("La date de fin doit être postérieure à la date de début."); return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const res = await apiFetch(`${API_BASE}/projects`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          ...form,
          budget_initial:  Number(form.budget_initial),
          start_date:      form.start_date  || null,
          end_date:        form.end_date    || null,
          doc_description: form.doc_description || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Une erreur est survenue."); return; }
      onCreated(data);
      handleClose();
    } catch (e: any) {
      setError(e.message ?? "Erreur réseau.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="bg-gb-surface-solid border-gb-border w-[95vw] max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <FolderPlus className="w-5 h-5 text-gb-primary" />
            Nouveau Projet
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-2">

          {/* ── Section : Projet ──────────────────────────────────────────── */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gb-muted uppercase tracking-wider border-b border-gb-border pb-2">
              Informations projet
            </h3>

            <p className="text-xs text-gb-muted -mt-1">Code généré automatiquement &middot; format PROJ-2026-001</p>

            {/* Statut */}
            <div className="space-y-1.5">
              <Label>Statut initial</Label>
              <Select value={form.status} onValueChange={v => { if (v !== null) setForm(p => ({ ...p, status: v })); }}>
                <SelectTrigger className="bg-gb-app border-gb-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-gb-surface-solid border-gb-border">
                  {STATUS_OPTIONS.map(o => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Titre */}
            <div className="space-y-1.5">
              <Label htmlFor="title">Titre du projet <span className="text-gb-danger">*</span></Label>
              <Input id="title" value={form.title} onChange={set("title")} placeholder="Ex: Construction Centre Sportif Douala Nord"
                className="bg-gb-app border-gb-border" />
            </div>

            {/* Localisation */}
            <div className="space-y-1.5">
              <Label htmlFor="location">Localisation <span className="text-gb-danger">*</span></Label>
              <Input id="location" value={form.location} onChange={set("location")} placeholder="Ex: Douala, Cameroun"
                className="bg-gb-app border-gb-border" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Budget */}
              <div className="space-y-1.5">
                <Label htmlFor="budget">Budget initial <span className="text-gb-danger">*</span></Label>
                <Input id="budget" type="number" min="0" step="1000" value={form.budget_initial}
                  onChange={set("budget_initial")} placeholder="500000000"
                  className="bg-gb-app border-gb-border" />
              </div>
              {/* Devise */}
              <div className="space-y-1.5">
                <Label>Devise</Label>
                <Select value={form.currency} onValueChange={v => { if (v !== null) setForm(p => ({ ...p, currency: v })); }}>
                  <SelectTrigger className="bg-gb-app border-gb-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-gb-surface-solid border-gb-border">
                    {CURRENCY_OPTIONS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Start date */}
              <div className="space-y-1.5">
                <Label htmlFor="start_date">Date de début</Label>
                <Input id="start_date" type="date" value={form.start_date} onChange={set("start_date")}
                  className="bg-gb-app border-gb-border" />
              </div>
              {/* End date */}
              <div className="space-y-1.5">
                <Label htmlFor="end_date">Date de fin prévue</Label>
                <Input id="end_date" type="date" value={form.end_date} onChange={set("end_date")}
                  className="bg-gb-app border-gb-border" />
              </div>
            </div>
          </div>

          {/* ── Section : Document principal ─────────────────────────────── */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gb-muted uppercase tracking-wider border-b border-gb-border pb-2 flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Document principal
              <span className="text-[10px] font-normal text-gb-muted normal-case">(requis — créé automatiquement avec le projet)</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Nom du document */}
              <div className="space-y-1.5">
                <Label htmlFor="doc_name">Nom du document <span className="text-gb-danger">*</span></Label>
                <Input id="doc_name" value={form.doc_name} onChange={set("doc_name")}
                  placeholder="Ex: Dossier Technique Principal"
                  className="bg-gb-app border-gb-border" />
              </div>
              {/* Catégorie */}
              <div className="space-y-1.5">
                <Label>Catégorie</Label>
                <Select value={form.doc_category} onValueChange={v => { if (v !== null) setForm(p => ({ ...p, doc_category: v })); }}>
                  <SelectTrigger className="bg-gb-app border-gb-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-gb-surface-solid border-gb-border">
                    {DOC_CATEGORY_OPTIONS.map(o => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Description doc */}
            <div className="space-y-1.5">
              <Label htmlFor="doc_desc">Description (optionnel)</Label>
              <Input id="doc_desc" value={form.doc_description} onChange={set("doc_description")}
                placeholder="Description du document principal..."
                className="bg-gb-app border-gb-border" />
            </div>
          </div>

          {/* ── Erreur ───────────────────────────────────────────────────── */}
          {error && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-gb-danger/10 border border-gb-danger/20 text-gb-danger text-sm">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleClose} disabled={submitting}>
            Annuler
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Créer le projet
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
