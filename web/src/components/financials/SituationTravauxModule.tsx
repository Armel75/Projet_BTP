import React, { useEffect, useMemo, useState } from "react";
import { apiFetch } from "../../lib/api";
import {
  ClipboardList,
  Plus,
  Search,
  Loader2,
  ChevronRight,
  Calendar,
  Wallet,
  CheckCircle2,
  Clock3,
  Edit,
} from "lucide-react";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

const API_BASE = import.meta.env.VITE_API_URL;

type SituationStatus = "DRAFT" | "SUBMITTED" | "APPROVED" | "PAID";

interface SituationTravaux {
  id: number;
  project_id: number;
  contract_id?: number | null;
  purchase_order_id?: number | null;
  supplier_id?: number | null;
  reference?: string | null;
  period_start: string;
  period_end: string;
  status: SituationStatus;
  reception_pct: number;
  amount_global: number;
  amount_proposed: number;
  amount_accorded: number;
  cumul_paid_before: number;
  amount_paid_current: number;
  balance_to_pay: number;
  remaining_to_receive: number;
  notes?: string | null;
  approved_at?: string | null;
  project?: { id: number; code?: string; title?: string };
  contract?: { id: number; reference?: string; title?: string };
  purchaseOrder?: { id: number; number?: string; title?: string };
  supplier?: { id: number; name?: string };
}

interface SituationFormData {
  project_id: string;
  contract_id: string;
  purchase_order_id: string;
  supplier_id: string;
  reference: string;
  period_start: string;
  period_end: string;
  status: SituationStatus;
  reception_pct: string;
  amount_global: string;
  amount_proposed: string;
  amount_accorded: string;
  cumul_paid_before: string;
  amount_paid_current: string;
  balance_to_pay: string;
  remaining_to_receive: string;
  notes: string;
}

const defaultForm: SituationFormData = {
  project_id: "",
  contract_id: "",
  purchase_order_id: "",
  supplier_id: "",
  reference: "",
  period_start: "",
  period_end: "",
  status: "DRAFT",
  reception_pct: "0",
  amount_global: "0",
  amount_proposed: "0",
  amount_accorded: "0",
  cumul_paid_before: "0",
  amount_paid_current: "0",
  balance_to_pay: "0",
  remaining_to_receive: "0",
  notes: "",
};

const toMoney = (value: number) =>
  new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 2,
  }).format(value || 0);

const statusBadge = (status: SituationStatus) => {
  switch (status) {
    case "PAID":
      return <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">Payee</Badge>;
    case "APPROVED":
      return <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20">Approuvee</Badge>;
    case "SUBMITTED":
      return <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20">Soumise</Badge>;
    default:
      return <Badge className="bg-gb-app text-gb-muted border-gb-border">Brouillon</Badge>;
  }
};

function toInputDate(value?: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export default function SituationTravauxModule() {
  const [situations, setSituations] = useState<SituationTravaux[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [error, setError] = useState<string | null>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<SituationTravaux | null>(null);
  const [form, setForm] = useState<SituationFormData>(defaultForm);

  const fetchSituations = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "ALL") params.set("status", statusFilter);
      const res = await apiFetch(`${API_BASE}/finance/situations-travaux?${params.toString()}`);
      if (!res.ok) {
        const payload = await res.json().catch(() => null);
        throw new Error(payload?.error || "Erreur de chargement des situations de travaux");
      }
      const data = (await res.json()) as SituationTravaux[];
      setSituations(data || []);
    } catch (e: any) {
      setError(e.message || "Erreur inconnue");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSituations();
  }, [statusFilter]);

  const openCreate = () => {
    setEditing(null);
    setForm(defaultForm);
    setDialogOpen(true);
  };

  const openEdit = (item: SituationTravaux) => {
    setEditing(item);
    setForm({
      project_id: String(item.project_id ?? ""),
      contract_id: item.contract_id ? String(item.contract_id) : "",
      purchase_order_id: item.purchase_order_id ? String(item.purchase_order_id) : "",
      supplier_id: item.supplier_id ? String(item.supplier_id) : "",
      reference: item.reference || "",
      period_start: toInputDate(item.period_start),
      period_end: toInputDate(item.period_end),
      status: item.status,
      reception_pct: String(item.reception_pct ?? 0),
      amount_global: String(item.amount_global ?? 0),
      amount_proposed: String(item.amount_proposed ?? 0),
      amount_accorded: String(item.amount_accorded ?? 0),
      cumul_paid_before: String(item.cumul_paid_before ?? 0),
      amount_paid_current: String(item.amount_paid_current ?? 0),
      balance_to_pay: String(item.balance_to_pay ?? 0),
      remaining_to_receive: String(item.remaining_to_receive ?? 0),
      notes: item.notes || "",
    });
    setDialogOpen(true);
  };

  const filteredSituations = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return situations;
    return situations.filter((s) => {
      return (
        String(s.id).includes(q) ||
        (s.reference || "").toLowerCase().includes(q) ||
        (s.project?.title || "").toLowerCase().includes(q) ||
        (s.project?.code || "").toLowerCase().includes(q) ||
        (s.contract?.reference || "").toLowerCase().includes(q) ||
        (s.purchaseOrder?.number || "").toLowerCase().includes(q) ||
        (s.supplier?.name || "").toLowerCase().includes(q)
      );
    });
  }, [situations, search]);

  const kpis = useMemo(() => {
    return {
      total: situations.length,
      draft: situations.filter((s) => s.status === "DRAFT").length,
      approved: situations.filter((s) => s.status === "APPROVED").length,
      paid: situations.filter((s) => s.status === "PAID").length,
      amountAccorded: situations.reduce((sum, s) => sum + Number(s.amount_accorded || 0), 0),
      balanceToPay: situations.reduce((sum, s) => sum + Number(s.balance_to_pay || 0), 0),
    };
  }, [situations]);

  const parseNullableInt = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const parsed = Number(trimmed);
    return Number.isNaN(parsed) ? null : parsed;
  };

  const parseRequiredInt = (value: string) => {
    const parsed = Number(value);
    return Number.isNaN(parsed) ? null : parsed;
  };

  const parseNumber = (value: string) => {
    const parsed = Number(value);
    return Number.isNaN(parsed) ? 0 : parsed;
  };

  const submitForm = async () => {
    setSaving(true);
    setError(null);
    try {
      const projectId = parseRequiredInt(form.project_id);
      if (!projectId) {
        throw new Error("project_id est obligatoire");
      }

      const payload: any = {
        project_id: projectId,
        contract_id: parseNullableInt(form.contract_id),
        purchase_order_id: parseNullableInt(form.purchase_order_id),
        supplier_id: parseNullableInt(form.supplier_id),
        reference: form.reference || null,
        period_start: form.period_start,
        period_end: form.period_end,
        status: form.status,
        reception_pct: parseNumber(form.reception_pct),
        amount_global: parseNumber(form.amount_global),
        amount_proposed: parseNumber(form.amount_proposed),
        amount_accorded: parseNumber(form.amount_accorded),
        cumul_paid_before: parseNumber(form.cumul_paid_before),
        amount_paid_current: parseNumber(form.amount_paid_current),
        balance_to_pay: parseNumber(form.balance_to_pay),
        remaining_to_receive: parseNumber(form.remaining_to_receive),
        notes: form.notes || null,
      };

      if (!payload.contract_id && !payload.purchase_order_id) {
        throw new Error("contract_id ou purchase_order_id est requis");
      }

      const isEdit = Boolean(editing);
      const endpoint = isEdit
        ? `${API_BASE}/finance/situations-travaux/${editing?.id}`
        : `${API_BASE}/finance/situations-travaux`;
      const method = isEdit ? "PUT" : "POST";

      const res = await apiFetch(endpoint, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const json = await res.json().catch(() => null);
        throw new Error(json?.error || "Erreur pendant l'enregistrement");
      }

      setDialogOpen(false);
      setEditing(null);
      setForm(defaultForm);
      await fetchSituations();
    } catch (e: any) {
      setError(e.message || "Erreur inconnue");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-gb-border bg-gb-surface-solid p-5">
          <p className="text-[10px] font-black uppercase tracking-widest text-gb-muted mb-1">Situations</p>
          <p className="text-2xl font-black text-gb-text">{kpis.total}</p>
          <p className="text-xs text-gb-muted mt-1">{kpis.draft} brouillon(s)</p>
        </div>
        <div className="rounded-2xl border border-gb-border bg-gb-surface-solid p-5">
          <p className="text-[10px] font-black uppercase tracking-widest text-gb-muted mb-1">Approuvees</p>
          <p className="text-2xl font-black text-blue-600">{kpis.approved}</p>
          <p className="text-xs text-gb-muted mt-1">{kpis.paid} payee(s)</p>
        </div>
        <div className="rounded-2xl border border-gb-border bg-gb-surface-solid p-5">
          <p className="text-[10px] font-black uppercase tracking-widest text-gb-muted mb-1">Montant accorde</p>
          <p className="text-2xl font-black text-emerald-600">{toMoney(kpis.amountAccorded)}</p>
        </div>
        <div className="rounded-2xl border border-gb-border bg-gb-surface-solid p-5">
          <p className="text-[10px] font-black uppercase tracking-widest text-gb-muted mb-1">Solde a payer</p>
          <p className="text-2xl font-black text-amber-600">{toMoney(kpis.balanceToPay)}</p>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-3 items-center justify-between bg-gb-surface-solid p-4 rounded-2xl border border-gb-border">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gb-muted" size={18} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Reference, projet, contrat, fournisseur..."
            className="w-full pl-10 pr-4 h-11 bg-gb-app border border-gb-border rounded-xl text-sm outline-none focus:ring-2 focus:ring-gb-primary"
          />
        </div>

        <div className="flex gap-2 w-full md:w-auto">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-11 px-3 bg-gb-app border border-gb-border rounded-xl text-sm text-gb-text outline-none focus:ring-2 focus:ring-gb-primary"
          >
            <option value="ALL">Tous statuts</option>
            <option value="DRAFT">Brouillon</option>
            <option value="SUBMITTED">Soumise</option>
            <option value="APPROVED">Approuvee</option>
            <option value="PAID">Payee</option>
          </select>

          <Button onClick={openCreate} className="h-11 px-6 rounded-xl font-bold">
            <Plus size={18} className="mr-2" /> Nouvelle situation
          </Button>
        </div>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4 text-sm text-red-600">
          {error}
        </div>
      ) : null}

      <div className="bg-gb-surface-solid border border-gb-border rounded-3xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="bg-gb-app/50 border-b border-gb-border">
                <th className="p-4 text-[10px] font-black uppercase tracking-widest text-gb-muted">Situation</th>
                <th className="p-4 text-[10px] font-black uppercase tracking-widest text-gb-muted">Periode</th>
                <th className="p-4 text-[10px] font-black uppercase tracking-widest text-gb-muted">Projet / Tiers</th>
                <th className="p-4 text-[10px] font-black uppercase tracking-widest text-gb-muted">Montants</th>
                <th className="p-4 text-[10px] font-black uppercase tracking-widest text-gb-muted text-center">Statut</th>
                <th className="p-4 text-[10px] font-black uppercase tracking-widest text-gb-muted text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="p-16 text-center">
                    <Loader2 className="w-8 h-8 animate-spin text-gb-primary mx-auto mb-3" />
                    <p className="text-sm text-gb-muted italic">Chargement des situations de travaux...</p>
                  </td>
                </tr>
              ) : filteredSituations.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-16 text-center">
                    <ClipboardList className="mx-auto text-gb-muted/25 mb-3" size={42} />
                    <p className="text-sm text-gb-muted">Aucune situation de travaux.</p>
                  </td>
                </tr>
              ) : (
                filteredSituations.map((s) => (
                  <tr key={s.id} className="border-b border-gb-border hover:bg-gb-app/30 transition-colors group">
                    <td className="p-4">
                      <div className="flex flex-col">
                        <span className="font-black text-gb-text">{s.reference || `SIT-${s.id}`}</span>
                        <span className="text-[11px] text-gb-muted">ID #{s.id}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="text-sm text-gb-text font-semibold">
                        {format(new Date(s.period_start), "dd MMM yyyy", { locale: fr })}
                      </div>
                      <div className="text-xs text-gb-muted">
                        au {format(new Date(s.period_end), "dd MMM yyyy", { locale: fr })}
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="text-sm font-semibold text-gb-text truncate max-w-[260px]">{s.project?.title || `Projet #${s.project_id}`}</div>
                      <div className="text-xs text-gb-muted truncate max-w-[260px]">
                        {s.supplier?.name || s.contract?.reference || s.purchaseOrder?.number || "-"}
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="text-sm font-black text-gb-text">{toMoney(s.amount_accorded)}</div>
                      <div className="text-xs text-gb-muted">Solde: {toMoney(s.balance_to_pay)}</div>
                    </td>
                    <td className="p-4 text-center">{statusBadge(s.status)}</td>
                    <td className="p-4">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => openEdit(s)}
                          className="w-9 h-9 rounded-lg bg-gb-app border border-gb-border text-gb-muted hover:text-gb-text flex items-center justify-center"
                          title="Modifier"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          type="button"
                          className="w-9 h-9 rounded-lg bg-gb-app border border-gb-border text-gb-muted group-hover:text-gb-text flex items-center justify-center"
                          title="Voir"
                        >
                          <ChevronRight size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {dialogOpen ? (
        <div className="fixed inset-0 z-[80] bg-black/40 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="max-w-5xl mx-auto bg-gb-surface-solid border border-gb-border rounded-3xl mt-8 mb-8">
            <div className="p-6 border-b border-gb-border flex items-center justify-between">
              <div>
                <h3 className="text-xl font-black text-gb-text flex items-center gap-2">
                  <ClipboardList size={20} className="text-gb-primary" />
                  {editing ? "Modifier Situation de Travaux" : "Nouvelle Situation de Travaux"}
                </h3>
                <p className="text-sm text-gb-muted mt-1">Saisie finance chantier avec validation metier backend active.</p>
              </div>
              <button
                type="button"
                className="w-9 h-9 rounded-lg bg-gb-app border border-gb-border text-gb-muted"
                onClick={() => setDialogOpen(false)}
              >
                ×
              </button>
            </div>

            <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-4">
              <label className="space-y-1">
                <span className="text-xs font-bold text-gb-muted">Project ID *</span>
                <input
                  value={form.project_id}
                  onChange={(e) => setForm((p) => ({ ...p, project_id: e.target.value }))}
                  className="w-full h-10 px-3 rounded-xl bg-gb-app border border-gb-border"
                />
              </label>

              <label className="space-y-1">
                <span className="text-xs font-bold text-gb-muted">Contract ID</span>
                <input
                  value={form.contract_id}
                  onChange={(e) => setForm((p) => ({ ...p, contract_id: e.target.value }))}
                  className="w-full h-10 px-3 rounded-xl bg-gb-app border border-gb-border"
                />
              </label>

              <label className="space-y-1">
                <span className="text-xs font-bold text-gb-muted">Purchase Order ID</span>
                <input
                  value={form.purchase_order_id}
                  onChange={(e) => setForm((p) => ({ ...p, purchase_order_id: e.target.value }))}
                  className="w-full h-10 px-3 rounded-xl bg-gb-app border border-gb-border"
                />
              </label>

              <label className="space-y-1">
                <span className="text-xs font-bold text-gb-muted">Supplier ID</span>
                <input
                  value={form.supplier_id}
                  onChange={(e) => setForm((p) => ({ ...p, supplier_id: e.target.value }))}
                  className="w-full h-10 px-3 rounded-xl bg-gb-app border border-gb-border"
                />
              </label>

              <label className="space-y-1 md:col-span-2">
                <span className="text-xs font-bold text-gb-muted">Reference</span>
                <input
                  value={form.reference}
                  onChange={(e) => setForm((p) => ({ ...p, reference: e.target.value }))}
                  className="w-full h-10 px-3 rounded-xl bg-gb-app border border-gb-border"
                />
              </label>

              <label className="space-y-1">
                <span className="text-xs font-bold text-gb-muted">Periode debut *</span>
                <input
                  type="date"
                  value={form.period_start}
                  onChange={(e) => setForm((p) => ({ ...p, period_start: e.target.value }))}
                  className="w-full h-10 px-3 rounded-xl bg-gb-app border border-gb-border"
                />
              </label>

              <label className="space-y-1">
                <span className="text-xs font-bold text-gb-muted">Periode fin *</span>
                <input
                  type="date"
                  value={form.period_end}
                  onChange={(e) => setForm((p) => ({ ...p, period_end: e.target.value }))}
                  className="w-full h-10 px-3 rounded-xl bg-gb-app border border-gb-border"
                />
              </label>

              <label className="space-y-1">
                <span className="text-xs font-bold text-gb-muted">Statut</span>
                <select
                  value={form.status}
                  onChange={(e) => setForm((p) => ({ ...p, status: e.target.value as SituationStatus }))}
                  className="w-full h-10 px-3 rounded-xl bg-gb-app border border-gb-border"
                >
                  <option value="DRAFT">Brouillon</option>
                  <option value="SUBMITTED">Soumise</option>
                  <option value="APPROVED">Approuvee</option>
                  <option value="PAID">Payee</option>
                </select>
              </label>

              <label className="space-y-1">
                <span className="text-xs font-bold text-gb-muted">Reception %</span>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={form.reception_pct}
                  onChange={(e) => setForm((p) => ({ ...p, reception_pct: e.target.value }))}
                  className="w-full h-10 px-3 rounded-xl bg-gb-app border border-gb-border"
                />
              </label>

              <label className="space-y-1">
                <span className="text-xs font-bold text-gb-muted">Montant global</span>
                <input
                  type="number"
                  min={0}
                  value={form.amount_global}
                  onChange={(e) => setForm((p) => ({ ...p, amount_global: e.target.value }))}
                  className="w-full h-10 px-3 rounded-xl bg-gb-app border border-gb-border"
                />
              </label>

              <label className="space-y-1">
                <span className="text-xs font-bold text-gb-muted">Montant propose</span>
                <input
                  type="number"
                  min={0}
                  value={form.amount_proposed}
                  onChange={(e) => setForm((p) => ({ ...p, amount_proposed: e.target.value }))}
                  className="w-full h-10 px-3 rounded-xl bg-gb-app border border-gb-border"
                />
              </label>

              <label className="space-y-1">
                <span className="text-xs font-bold text-gb-muted">Montant accorde</span>
                <input
                  type="number"
                  min={0}
                  value={form.amount_accorded}
                  onChange={(e) => setForm((p) => ({ ...p, amount_accorded: e.target.value }))}
                  className="w-full h-10 px-3 rounded-xl bg-gb-app border border-gb-border"
                />
              </label>

              <label className="space-y-1">
                <span className="text-xs font-bold text-gb-muted">Cumul paye avant</span>
                <input
                  type="number"
                  min={0}
                  value={form.cumul_paid_before}
                  onChange={(e) => setForm((p) => ({ ...p, cumul_paid_before: e.target.value }))}
                  className="w-full h-10 px-3 rounded-xl bg-gb-app border border-gb-border"
                />
              </label>

              <label className="space-y-1">
                <span className="text-xs font-bold text-gb-muted">Paye courant</span>
                <input
                  type="number"
                  min={0}
                  value={form.amount_paid_current}
                  onChange={(e) => setForm((p) => ({ ...p, amount_paid_current: e.target.value }))}
                  className="w-full h-10 px-3 rounded-xl bg-gb-app border border-gb-border"
                />
              </label>

              <label className="space-y-1">
                <span className="text-xs font-bold text-gb-muted">Solde a payer</span>
                <input
                  type="number"
                  min={0}
                  value={form.balance_to_pay}
                  onChange={(e) => setForm((p) => ({ ...p, balance_to_pay: e.target.value }))}
                  className="w-full h-10 px-3 rounded-xl bg-gb-app border border-gb-border"
                />
              </label>

              <label className="space-y-1">
                <span className="text-xs font-bold text-gb-muted">Reste a recevoir</span>
                <input
                  type="number"
                  min={0}
                  value={form.remaining_to_receive}
                  onChange={(e) => setForm((p) => ({ ...p, remaining_to_receive: e.target.value }))}
                  className="w-full h-10 px-3 rounded-xl bg-gb-app border border-gb-border"
                />
              </label>

              <label className="space-y-1 md:col-span-3">
                <span className="text-xs font-bold text-gb-muted">Notes</span>
                <textarea
                  rows={3}
                  value={form.notes}
                  onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl bg-gb-app border border-gb-border"
                />
              </label>
            </div>

            <div className="p-6 border-t border-gb-border flex items-center justify-between">
              <div className="text-xs text-gb-muted flex items-center gap-4">
                <span className="inline-flex items-center gap-1"><Calendar size={14} /> Periode obligatoire</span>
                <span className="inline-flex items-center gap-1"><Wallet size={14} /> Montants non-negatifs</span>
                <span className="inline-flex items-center gap-1"><CheckCircle2 size={14} /> Validation backend active</span>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
                  Annuler
                </Button>
                <Button onClick={submitForm} disabled={saving}>
                  {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Clock3 className="w-4 h-4 mr-2" />}
                  {editing ? "Mettre a jour" : "Creer la situation"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
