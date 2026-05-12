import React, { useState, useEffect } from "react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle 
} from "../ui/dialog";
import { 
  CalendarDays, 
  TrendingUp, 
  FileText, 
  CheckCircle2, 
  AlertTriangle,
  Loader2,
  User,
  ExternalLink,
  Target,
  BarChart3,
  MessageSquare,
  Download,
  Printer
} from "lucide-react";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { apiFetch } from "../../lib/api";

const API_BASE = import.meta.env.VITE_API_URL;

interface WeeklyReportDetailDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reportId: number;
}

export default function WeeklyReportDetailDrawer({ open, onOpenChange, reportId }: WeeklyReportDetailDrawerProps) {
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [previewingPdf, setPreviewingPdf] = useState(false);
  const [workflowLoading, setWorkflowLoading] = useState<null | 'submit' | 'approve' | 'reject'>(null);

  useEffect(() => {
    if (open) {
      fetchReport();
    }
  }, [open, reportId]);

  const fetchReport = async () => {
    setLoading(true);
    try {
      const res = await apiFetch(`${API_BASE}/weekly-reports/${reportId}`);
      if (res.ok) {
        setReport(await res.json());
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const downloadPdf = async () => {
    if (!report || downloadingPdf) return;

    setDownloadingPdf(true);
    try {
      const res = await apiFetch(`${API_BASE}/weekly-reports/${report.id}/pdf`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert(err.error || "Impossible de générer le rapport hebdomadaire PDF.");
        return;
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `WR-${report.id}-${new Date(report.week_start).toISOString().slice(0, 10)}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      alert("Impossible de générer le rapport hebdomadaire PDF.");
    } finally {
      setDownloadingPdf(false);
    }
  };

  const previewPrintPdf = async () => {
    if (!report || previewingPdf) return;

    setPreviewingPdf(true);
    try {
      const res = await apiFetch(`${API_BASE}/weekly-reports/${report.id}/pdf?disposition=inline`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert(err.error || "Impossible d'ouvrir la previsualisation d'impression.");
        return;
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const previewWindow = window.open(url, "_blank");
      if (!previewWindow) {
        window.URL.revokeObjectURL(url);
        alert("La previsualisation d'impression a ete bloquee par le navigateur.");
        return;
      }

      previewWindow.focus();
      window.setTimeout(() => window.URL.revokeObjectURL(url), 60000);
    } catch {
      alert("Impossible d'ouvrir la previsualisation d'impression.");
    } finally {
      setPreviewingPdf(false);
    }
  };

  const submitForValidation = async () => {
    if (!report || workflowLoading) return;

    setWorkflowLoading('submit');
    try {
      const res = await apiFetch(`${API_BASE}/weekly-reports/${report.id}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert(err.error || 'Impossible de soumettre ce rapport.');
        return;
      }

      await fetchReport();
    } catch {
      alert('Impossible de soumettre ce rapport.');
    } finally {
      setWorkflowLoading(null);
    }
  };

  const approveReport = async () => {
    if (!report || workflowLoading) return;

    setWorkflowLoading('approve');
    try {
      const res = await apiFetch(`${API_BASE}/weekly-reports/${report.id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert(err.error || 'Impossible d\'approuver ce rapport.');
        return;
      }

      await fetchReport();
    } catch {
      alert('Impossible d\'approuver ce rapport.');
    } finally {
      setWorkflowLoading(null);
    }
  };

  const rejectReport = async () => {
    if (!report || workflowLoading) return;

    const reason = window.prompt('Motif du rejet (obligatoire) :', '');
    if (!reason || reason.trim().length < 3) {
      alert('Le motif du rejet doit contenir au moins 3 caractères.');
      return;
    }

    setWorkflowLoading('reject');
    try {
      const res = await apiFetch(`${API_BASE}/weekly-reports/${report.id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: reason.trim() }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert(err.error || 'Impossible de rejeter ce rapport.');
        return;
      }

      await fetchReport();
    } catch {
      alert('Impossible de rejeter ce rapport.');
    } finally {
      setWorkflowLoading(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "DRAFT": return <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/20">Brouillon</Badge>;
      case "SUBMITTED": return <Badge className="bg-blue-500/10 text-blue-500 border-blue-500/20">Soumis</Badge>;
      case "APPROVED": return <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20">Approuvé</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  const computeWorkflowBlockers = () => {
    if (!report) return [];

    const blockers: Array<{ type: 'error' | 'warning', message: string }> = [];
    const status = (report.status || 'DRAFT').toUpperCase();

    // DRAFT state blockers
    if (status === 'DRAFT') {
      if (!report.summary || report.summary.trim().length === 0) {
        blockers.push({ type: 'error', message: 'La synthèse de direction est obligatoire avant la soumission' });
      }
      if (!report.items || report.items.length === 0) {
        blockers.push({ type: 'error', message: 'Au moins une ligne d\'avancement est requise avant la soumission' });
      }
    }

    // SUBMITTED state info
    if (status === 'SUBMITTED') {
      blockers.push({ type: 'warning', message: 'Ce rapport est en attente de validation. Seul un validateur peut approuver ou rejeter.' });
    }

    // APPROVED state info (read-only)
    if (status === 'APPROVED') {
      blockers.push({ type: 'warning', message: 'Ce rapport est approuvé et verrouillé. Aucune modification n\'est possible.' });
    }

    return blockers;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[850px] bg-gb-surface-solid border-gb-border p-0 overflow-hidden flex flex-col max-h-[95vh]">
        {loading ? (
          <div className="p-20 flex justify-center">
            <Loader2 className="animate-spin text-purple-600" size={40} />
          </div>
        ) : report ? (
          <>
            <DialogHeader className="p-8 border-b border-gb-border bg-gb-app/30 shrink-0">
               <div className="flex justify-between items-start gap-4">
                  <div>
                    <div className="flex items-center gap-4 mb-2">
                      <h2 className="text-3xl font-black tracking-tighter text-gb-text">Revue Hebdomadaire</h2>
                      {getStatusBadge(report.status)}
                    </div>
                    <div className="flex items-center gap-2 text-xs font-bold text-gb-muted uppercase tracking-widest">
                       <CalendarDays size={14} className="text-purple-600" />
                       Semaine du {format(new Date(report.week_start), 'dd MMMM', { locale: fr })} au {format(new Date(report.week_end), 'dd MMMM yyyy', { locale: fr })}
                    </div>
                  </div>
                  
                  <div className="flex flex-col items-end gap-3 shrink-0">
                    <div className="flex items-center gap-2">
                      {report.status === 'DRAFT' && (
                        <Button
                          type="button"
                          variant="outline"
                          className="rounded-xl h-10 px-4 font-bold"
                          onClick={submitForValidation}
                          disabled={workflowLoading !== null || computeWorkflowBlockers().some(b => b.type === 'error')}
                          title={computeWorkflowBlockers().some(b => b.type === 'error') ? 'Impossible de soumettre: des champs obligatoires manquent' : ''}
                        >
                          {workflowLoading === 'submit' ? <Loader2 size={14} className="mr-2 animate-spin" /> : <CheckCircle2 size={14} className="mr-2" />}
                          {workflowLoading === 'submit' ? 'Soumission...' : 'Soumettre'}
                        </Button>
                      )}

                      {report.status === 'SUBMITTED' && (
                        <>
                          <Button
                            type="button"
                            variant="outline"
                            className="rounded-xl h-10 px-4 font-bold text-emerald-600 border-emerald-500/30 hover:bg-emerald-500/5"
                            onClick={approveReport}
                            disabled={workflowLoading !== null}
                          >
                            {workflowLoading === 'approve' ? <Loader2 size={14} className="mr-2 animate-spin" /> : <CheckCircle2 size={14} className="mr-2" />}
                            {workflowLoading === 'approve' ? 'Validation...' : 'Approuver'}
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            className="rounded-xl h-10 px-4 font-bold text-gb-danger border-gb-danger/30 hover:bg-gb-danger/5"
                            onClick={rejectReport}
                            disabled={workflowLoading !== null}
                          >
                            {workflowLoading === 'reject' ? <Loader2 size={14} className="mr-2 animate-spin" /> : <AlertTriangle size={14} className="mr-2" />}
                            {workflowLoading === 'reject' ? 'Rejet...' : 'Rejeter'}
                          </Button>
                        </>
                      )}

                      <Button
                        type="button"
                        variant="outline"
                        className="rounded-xl h-10 px-4 font-bold"
                        onClick={previewPrintPdf}
                        disabled={previewingPdf}
                      >
                        {previewingPdf ? <Loader2 size={14} className="mr-2 animate-spin" /> : <Printer size={14} className="mr-2" />}
                        {previewingPdf ? "Ouverture..." : "Imprimer"}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        className="rounded-xl h-10 px-4 font-bold"
                        onClick={downloadPdf}
                        disabled={downloadingPdf}
                      >
                        {downloadingPdf ? <Loader2 size={14} className="mr-2 animate-spin" /> : <Download size={14} className="mr-2" />}
                        {downloadingPdf ? "Generation PDF..." : "Telecharger PDF"}
                      </Button>
                    </div>
                    <div className="flex flex-col items-end gap-1 bg-gb-surface-solid p-4 rounded-2xl border border-gb-border shadow-sm">
                       <span className="text-[10px] font-black text-gb-muted uppercase tracking-widest leading-none">Avancement Global</span>
                       <span className="text-3xl font-black text-gb-primary tracking-tighter">{report.overall_progress}%</span>
                    </div>
                  </div>
               </div>
            </DialogHeader>

            <div className="flex-1 overflow-y-auto p-8 space-y-10">
              {/* Workflow Blockers / Status Info */}
              {(() => {
                const blockers = computeWorkflowBlockers();
                if (blockers.length === 0) return null;

                return (
                  <div className="space-y-2">
                    {blockers.map((blocker, idx) => (
                      <div 
                        key={idx}
                        className={`p-4 rounded-2xl border flex items-start gap-3 ${
                          blocker.type === 'error'
                            ? 'bg-red-500/5 border-red-500/20 text-red-600'
                            : 'bg-amber-500/5 border-amber-500/20 text-amber-600'
                        }`}
                      >
                        {blocker.type === 'error' ? (
                          <AlertTriangle size={16} className="flex-shrink-0 mt-0.5" />
                        ) : (
                          <AlertTriangle size={16} className="flex-shrink-0 mt-0.5" />
                        )}
                        <span className="text-sm font-bold">{blocker.message}</span>
                      </div>
                    ))}
                  </div>
                );
              })()}

              {/* Premium KPI Layer */}
              <section className="space-y-4">
                 <h4 className="text-[10px] font-black uppercase text-gb-muted tracking-widest flex items-center gap-2">
                    <BarChart3 size={14} className="text-emerald-600" /> Indicateurs de Pilotage (KPI)
                 </h4>
                 <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div className="bg-emerald-500/5 p-4 rounded-2xl border border-emerald-500/10">
                       <p className="text-[9px] font-black uppercase tracking-widest text-gb-muted mb-2">Productivité</p>
                       <p className="text-2xl font-black text-emerald-600">{report.productivity_score?.toFixed(1) || '0'}%</p>
                    </div>
                    <div className="bg-blue-500/5 p-4 rounded-2xl border border-blue-500/10">
                       <p className="text-[9px] font-black uppercase tracking-widest text-gb-muted mb-2">Variance Planning</p>
                       <p className="text-2xl font-black text-blue-600">{report.planning_variance_pct?.toFixed(1) || '0'}%</p>
                    </div>
                    <div className="bg-amber-500/5 p-4 rounded-2xl border border-amber-500/10">
                       <p className="text-[9px] font-black uppercase tracking-widest text-gb-muted mb-2">Variance Coût</p>
                       <p className="text-2xl font-black text-amber-600">{report.cost_variance_pct?.toFixed(1) || '0'}%</p>
                    </div>
                    <div className="bg-red-500/5 p-4 rounded-2xl border border-red-500/10">
                       <p className="text-[9px] font-black uppercase tracking-widest text-gb-muted mb-2">Actions Retardées</p>
                       <p className="text-2xl font-black text-red-600">{report.overdue_actions_count || 0}</p>
                    </div>
                    <div className="bg-purple-500/5 p-4 rounded-2xl border border-purple-500/10">
                       <p className="text-[9px] font-black uppercase tracking-widest text-gb-muted mb-2">Tendance Incidents</p>
                       <p className="text-sm font-black text-purple-600">{report.incident_trend || 'stable'}</p>
                    </div>
                    <div className="bg-indigo-500/5 p-4 rounded-2xl border border-indigo-500/10">
                       <p className="text-[9px] font-black uppercase tracking-widest text-gb-muted mb-2">Prévision 2 Sem.</p>
                       <p className="text-xs font-bold text-indigo-600 line-clamp-2">{report.forecast_2weeks || 'À confirmer'}</p>
                    </div>
                 </div>
              </section>

              {/* Executive Summary */}
              <section className="space-y-4">
                 <h4 className="text-[10px] font-black uppercase text-gb-muted tracking-widest flex items-center gap-2">
                    <FileText size={14} className="text-purple-600" /> Synthèse de la Direction
                 </h4>
                 <div className="bg-purple-500/5 p-6 rounded-2xl border border-purple-500/10 text-sm leading-relaxed text-gb-text whitespace-pre-wrap italic">
                    {report.summary || "Aucune synthèse rédigée pour cette période."}
                 </div>
              </section>

              {/* Tasks Progress Breakdown */}
              <section className="space-y-6">
                 <h4 className="text-[10px] font-black uppercase text-gb-muted tracking-widest flex items-center gap-2">
                    <TrendingUp size={14} className="text-gb-primary" /> État d'avancement des macro-tâches
                 </h4>
                 
                 <div className="space-y-3">
                    {report.items?.length > 0 ? (
                      report.items.map((item: any) => (
                        <div key={item.id} className="p-6 bg-gb-app/50 border border-gb-border rounded-2xl hover:border-gb-primary/30 transition-all flex flex-col md:flex-row md:items-center justify-between gap-6 group">
                           <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <h5 className="font-bold text-gb-text truncate">{item.description}</h5>
                                {item.task_id && (
                                  <Badge variant="outline" className="text-[9px] font-bold py-0 h-4 border-gb-border bg-gb-surface-solid">Tâche #{item.task_id}</Badge>
                                )}
                              </div>
                              <p className="text-xs text-gb-muted italic line-clamp-1">{item.comment || "Aucun commentaire technique."}</p>
                           </div>

                           <div className="flex items-center gap-10 shrink-0">
                              <div className="flex flex-col items-end">
                                 <span className="text-[8px] font-black uppercase text-gb-muted tracking-widest mb-1">Hebdo</span>
                                 <div className="flex items-center gap-1.5 px-2 py-0.5 bg-blue-500/10 text-blue-600 rounded-md border border-blue-500/10">
                                    <TrendingUp size={10} />
                                    <span className="text-xs font-black">+{item.weekly_progress}%</span>
                                 </div>
                              </div>

                              <div className="flex flex-col items-end w-28">
                                 <span className="text-[8px] font-black uppercase text-gb-muted tracking-widest mb-1">Cumulé</span>
                                 <div className="w-full flex items-center gap-2">
                                    <div className="flex-1 h-1.5 bg-gb-border rounded-full overflow-hidden">
                                       <div className="h-full bg-emerald-500" style={{ width: `${item.cumulative_progress}%` }}></div>
                                    </div>
                                    <span className="text-xs font-black text-gb-text">{item.cumulative_progress}%</span>
                                 </div>
                              </div>
                           </div>
                        </div>
                      ))
                    ) : (
                      <div className="p-20 text-center bg-gb-surface-solid border border-gb-border border-dashed rounded-2xl">
                         <Target className="mx-auto text-gb-muted/20 mb-4" size={40} />
                         <p className="text-sm font-bold text-gb-muted">Aucun élément d'avancement détaillé dans ce rapport.</p>
                      </div>
                    )}
                 </div>
              </section>

              {/* Roles & Validation Signature */}
              <section className="pt-6 border-t border-gb-border">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="flex items-center gap-4 bg-gb-app/30 p-4 rounded-2xl border border-gb-border">
                       <div className="w-10 h-10 rounded-full bg-gb-surface-solid border border-gb-border flex items-center justify-center text-gb-muted">
                          <User size={20} />
                       </div>
                       <div>
                          <p className="text-[9px] font-black text-gb-muted uppercase tracking-widest">Préparé par</p>
                          <p className="font-bold text-sm text-gb-text">{report.preparedBy?.firstname} {report.preparedBy?.lastname}</p>
                       </div>
                    </div>

                    <div className={`flex items-center gap-4 p-4 rounded-2xl border border-dashed ${report.validated_by ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-gb-app/10 border-gb-border'}`}>
                       <div className={`w-10 h-10 rounded-full border flex items-center justify-center ${report.validated_by ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' : 'bg-gb-surface-solid border-gb-border text-gb-muted'}`}>
                          {report.validated_by ? <CheckCircle2 size={20} /> : <AlertTriangle size={20} />}
                       </div>
                       <div>
                          <p className="text-[9px] font-black text-gb-muted uppercase tracking-widest">Validé par</p>
                          <p className="font-bold text-sm text-gb-text">
                             {report.validatedBy ? `${report.validatedBy.firstname} ${report.validatedBy.lastname}` : 'En attente de validation'}
                          </p>
                       </div>
                    </div>
                 </div>
              </section>
            </div>
          </>
        ) : (
          <div className="p-20 text-center">
            <p className="text-gb-muted italic">Impossible de charger les données du rapport hebdomadaire.</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
