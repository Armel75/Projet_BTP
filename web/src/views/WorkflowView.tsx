import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ShieldCheck, X, Check, RefreshCw, AlertTriangle } from "lucide-react";
import { apiFetch, API_BASE } from "../lib/api";

type ValidationEntityType = "purchase-order" | "change-order" | "situation-travaux" | "control-report";

type ValidationItem = {
  id: string;
  entityType: ValidationEntityType;
  entityId: number;
  title: string;
  subtitle: string;
  status: string;
  requestedAt: string;
  requester?: { name: string };
  amount?: number | null;
  currency?: string | null;
  priority?: "LOW" | "MEDIUM" | "HIGH";
};

type PendingPayload = {
  items: ValidationItem[];
  stats: Record<ValidationEntityType, number>;
};

const ENTITY_LABEL: Record<ValidationEntityType, string> = {
  "purchase-order": "Bon de commande",
  "change-order": "Avenant",
  "situation-travaux": "Situation travaux",
  "control-report": "Rapport de controle",
};

const formatDateTime = (value: string): string => {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatMoney = (amount?: number | null, currency?: string | null): string | null => {
  if (amount === null || amount === undefined) return null;
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: currency || "EUR",
    maximumFractionDigits: 0,
  }).format(amount);
};

export default function WorkflowView() {
  const [items, setItems] = useState<ValidationItem[]>([]);
  const [stats, setStats] = useState<Record<ValidationEntityType, number>>({
    "purchase-order": 0,
    "change-order": 0,
    "situation-travaux": 0,
    "control-report": 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeActionId, setActiveActionId] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState<ValidationItem | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const loadPending = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiFetch(`${API_BASE}/validation/pending`);
      const data = (await response.json()) as PendingPayload | { error?: string };
      if (!response.ok) {
        throw new Error((data as { error?: string }).error || "Impossible de charger les validations.");
      }
      setItems(Array.isArray((data as PendingPayload).items) ? (data as PendingPayload).items : []);
      setStats((data as PendingPayload).stats || {
        "purchase-order": 0,
        "change-order": 0,
        "situation-travaux": 0,
        "control-report": 0,
      });
    } catch (e: any) {
      setError(e?.message || "Impossible de charger les validations.");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPending();
  }, [loadPending]);

  const totalPending = useMemo(() => items.length, [items]);

  const runAction = async (item: ValidationItem, action: "approve" | "reject", reason?: string) => {
    setActiveActionId(item.id);
    setError(null);
    try {
      const response = await apiFetch(`${API_BASE}/validation/${item.entityType}/${item.entityId}/${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: action === "reject" ? JSON.stringify({ reason: reason || "" }) : undefined,
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data?.error || `Action ${action} impossible.`);
      }
      await loadPending();
      if (action === "reject") {
        setRejecting(null);
        setRejectReason("");
      }
    } catch (e: any) {
      setError(e?.message || `Action ${action} impossible.`);
    } finally {
      setActiveActionId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-6 gap-3 flex-wrap">
        <h2 className="text-xl md:text-2xl font-semibold flex items-center space-x-2">
          <ShieldCheck className="text-gb-primary" />
          <span>Validation SG/DG</span>
        </h2>
        <button
          type="button"
          onClick={loadPending}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-md border border-gb-border bg-gb-surface-solid hover:bg-gb-surface-hover text-sm"
          disabled={loading}
        >
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          <span>Rafraichir</span>
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {(Object.keys(ENTITY_LABEL) as ValidationEntityType[]).map((type) => (
          <div key={type} className="rounded-lg border border-gb-border bg-gb-surface-solid p-3">
            <div className="text-xs text-gb-muted">{ENTITY_LABEL[type]}</div>
            <div className="text-xl font-semibold text-gb-text mt-1">{stats[type] || 0}</div>
          </div>
        ))}
      </div>

      <div className="bg-gb-surface-solid border border-gb-border rounded-lg p-4 md:p-6 shadow-sm">
        <h3 className="text-base md:text-lg font-medium mb-2">Demandes en attente d'approbation</h3>
        <p className="text-sm text-gb-muted mb-4">{totalPending} demande(s) a traiter</p>

        {error && (
          <div className="mb-4 p-3 rounded-md border border-gb-danger/40 bg-gb-danger/10 text-gb-danger text-sm flex items-center gap-2">
            <AlertTriangle size={16} />
            <span>{error}</span>
          </div>
        )}

        {loading ? (
          <div className="py-10 text-center text-gb-muted">Chargement des validations...</div>
        ) : items.length === 0 ? (
          <div className="py-10 text-center text-gb-muted">Aucune demande en attente pour vos permissions.</div>
        ) : (
          <div className="space-y-4">
            {items.map((item) => {
              const amount = formatMoney(item.amount, item.currency);
              const isBusy = activeActionId === item.id;
              return (
                <div
                  key={item.id}
                  className="p-4 border border-gb-border rounded-lg flex flex-col md:flex-row md:items-center justify-between hover:bg-gb-surface-hover transition-colors gap-4"
                >
                  <div className="flex items-start space-x-4">
                    <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center shrink-0">
                      <ShieldCheck className="text-blue-500" size={20} />
                    </div>
                    <div>
                      <h4 className="font-medium text-gb-text text-base">{item.title}</h4>
                      <p className="text-sm text-gb-muted mt-1">
                        {item.subtitle}
                        {amount ? ` • ${amount}` : ""}
                      </p>
                      <div className="text-[11px] md:text-xs mt-2 text-gb-muted flex items-center space-x-1 md:space-x-2 flex-wrap gap-y-1">
                        <span className="bg-gb-app px-2 py-0.5 rounded border border-gb-border">Par {item.requester?.name || "Utilisateur"}</span>
                        <span className="hidden md:inline">•</span>
                        <span>{formatDateTime(item.requestedAt)}</span>
                        <span className="hidden md:inline">•</span>
                        <span className="uppercase">{item.status}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex space-x-2 shrink-0 md:ml-4 border-t border-gb-border md:border-t-0 pt-3 md:pt-0 mt-2 md:mt-0">
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => {
                        setRejecting(item);
                        setRejectReason("");
                      }}
                      className="flex-1 md:flex-none flex items-center justify-center space-x-1 px-3 py-2 md:py-1.5 border border-gb-danger text-gb-danger rounded text-sm font-medium hover:bg-gb-danger hover:text-white transition-colors min-h-[44px] disabled:opacity-60"
                    >
                      <X size={16} />
                      <span>Refuser</span>
                    </button>
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => runAction(item, "approve")}
                      className="flex-1 md:flex-none flex items-center justify-center space-x-1 px-4 py-2 md:py-1.5 bg-green-600 text-white rounded text-sm font-medium hover:bg-green-700 transition-colors min-h-[44px] shadow-sm disabled:opacity-60"
                    >
                      <Check size={16} />
                      <span>{isBusy ? "Traitement..." : "Approuver"}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {rejecting && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="w-full max-w-xl rounded-lg border border-gb-border bg-gb-surface-solid p-5 shadow-lg">
            <h4 className="text-lg font-semibold text-gb-text">Motif de rejet</h4>
            <p className="text-sm text-gb-muted mt-1 mb-3">{rejecting.title}</p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              className="w-full min-h-[130px] rounded-md border border-gb-border bg-gb-app px-3 py-2 text-sm"
              placeholder="Expliquez la raison du rejet..."
            />
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setRejecting(null);
                  setRejectReason("");
                }}
                className="px-3 py-2 rounded-md border border-gb-border bg-gb-app hover:bg-gb-surface-hover text-sm"
                disabled={activeActionId === rejecting.id}
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={() => runAction(rejecting, "reject", rejectReason)}
                disabled={!rejectReason.trim() || activeActionId === rejecting.id}
                className="px-4 py-2 rounded-md bg-gb-danger text-white text-sm font-medium hover:opacity-90 disabled:opacity-60"
              >
                {activeActionId === rejecting.id ? "Traitement..." : "Confirmer le rejet"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
