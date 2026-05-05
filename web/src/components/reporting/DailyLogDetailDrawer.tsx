import React, { useState, useEffect } from "react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle 
} from "../ui/dialog";
import { 
  Calendar, 
  CloudSun, 
  Thermometer, 
  Users, 
  HardHat, 
  Truck, 
  Package, 
  Loader2,
  Clock,
  Briefcase,
  FileText,
  CheckCircle,
  ImageIcon,
  Download
} from "lucide-react";
import { Badge } from "../ui/badge";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { apiFetch } from "../../lib/api";
const API_BASE = import.meta.env.VITE_API_URL;

interface DailyLogDetailDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  logId: number;
}

export default function DailyLogDetailDrawer({ open, onOpenChange, logId }: DailyLogDetailDrawerProps) {
  const [log, setLog] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (open) {
      fetchLog();
    }
  }, [open, logId]);

  const fetchLog = async () => {
    setLoading(true);
    try {
      const res = await apiFetch(`${API_BASE}/daily-logs/${logId}`);
      if (res.ok) {
        setLog(await res.json());
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] bg-gb-surface-solid border-gb-border p-0 overflow-hidden flex flex-col max-h-[90vh] sm:max-h-[85vh]">
        {loading ? (
          <div className="p-20 flex justify-center">
            <Loader2 className="animate-spin text-gb-primary" size={40} />
          </div>
        ) : log ? (
          <>
            <DialogHeader className="p-6 sm:p-8 border-b border-gb-border bg-gb-app/30 shrink-0">
               <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                  <div>
                    <h2 className="text-xl sm:text-2xl font-black tracking-tight text-gb-text leading-tight">
                      Journal du {format(new Date(log.date), 'dd MMMM yyyy', { locale: fr })}
                    </h2>
                    <p className="text-[10px] text-gb-muted font-bold uppercase tracking-widest mt-2 sm:mt-1">
                      Enregistré par {log.createdBy?.firstname} {log.createdBy?.lastname}
                    </p>
                  </div>
                  <div className="flex gap-2 w-full sm:w-auto">
                     {log.weather && (
                       <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20 px-3 py-1 flex flex-1 sm:flex-none justify-center gap-1.5 items-center text-[10px] sm:text-xs">
                         <CloudSun size={14} /> {log.weather}
                       </Badge>
                     )}
                     {log.temperature !== null && (
                       <Badge className="bg-gb-danger/10 text-gb-danger border-gb-danger/20 px-3 py-1 flex flex-1 sm:flex-none justify-center gap-1.5 items-center text-[10px] sm:text-xs">
                         <Thermometer size={14} /> {log.temperature}°C
                       </Badge>
                     )}
                  </div>
               </div>
            </DialogHeader>

            <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-8 sm:space-y-10">
              {/* Notes Section */}
              <section className="space-y-4">
                 <h4 className="text-[10px] font-black uppercase text-gb-muted tracking-widest flex items-center gap-2">
                    <FileText size={14} className="text-gb-primary" /> Notes & Évènements
                 </h4>
                 <div className="bg-gb-app/50 p-6 rounded-2xl border border-gb-border text-sm leading-relaxed text-gb-text whitespace-pre-wrap italic">
                    {log.notes || "Aucune note spécifique saisie pour cette journée."}
                 </div>
              </section>

              {/* Activités du jour */}
              {/* Activités du jour */}
              {log.task_progress && log.task_progress.length > 0 && (
                <section className="space-y-4">
                  <h4 className="text-[10px] font-black uppercase text-gb-muted tracking-widest flex items-center gap-2">
                    <CheckCircle size={14} className="text-gb-primary" /> Activités du jour
                  </h4>
                  <div className="space-y-4">
                    {log.task_progress.map((entry: any, idx: number) => {
                      const laborData   = (() => { try { return entry.labor_data     ? JSON.parse(entry.labor_data)     : []; } catch { return []; } })();
                      const equipData   = (() => { try { return entry.equipment_data ? JSON.parse(entry.equipment_data) : []; } catch { return []; } })();
                      const matData     = (() => { try { return entry.material_data  ? JSON.parse(entry.material_data)  : []; } catch { return []; } })();
                      const photosData  = (() => { try { return entry.photos_url     ? JSON.parse(entry.photos_url)     : []; } catch { return typeof entry.photos_url === "string" ? [entry.photos_url] : []; } })();
                      const title       = entry.task_type === "unplanned" ? entry.task_title_custom : (entry.task?.title || "Tâche");
                      const isUnplanned = entry.task_type === "unplanned";
                      const totalH      = laborData.reduce((s: number, l: any) => s + (parseFloat(l.hours) || 0), 0);

                      return (
                        <div key={idx} className="border border-gb-border rounded-2xl overflow-hidden">
                          {/* Header activité */}
                          <div className="flex items-center justify-between p-4 bg-gb-surface-solid">
                            <div className="flex items-center gap-3">
                              <div className={`w-1.5 h-10 rounded-full shrink-0 ${isUnplanned ? "bg-amber-400" : "bg-gb-primary"}`} />
                              <div>
                                <p className="text-sm font-black text-gb-text leading-none mb-1.5">{title}</p>
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className={`text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded ${isUnplanned ? "bg-amber-500/15 text-amber-600" : "bg-gb-primary/10 text-gb-primary"}`}>
                                    {isUnplanned ? "⚡ Imprévue" : "✓ Planifiée"}
                                  </span>
                                  {laborData.length > 0   && <span className="text-[10px] font-bold text-blue-500">{laborData.length} ouvrier{laborData.length > 1 ? "s" : ""} · {totalH}h</span>}
                                  {equipData.length > 0   && <span className="text-[10px] font-bold text-amber-500">{equipData.length} engin{equipData.length > 1 ? "s" : ""}</span>}
                                  {matData.length > 0     && <span className="text-[10px] font-bold text-emerald-500">{matData.length} mat.</span>}
                                  {photosData.length > 0  && <span className="text-[10px] font-bold text-purple-500">{photosData.length} photo{photosData.length > 1 ? "s" : ""}</span>}
                                </div>
                              </div>
                            </div>
                            {entry.progress_percentage != null && (
                              <div className="w-14 h-14 rounded-full bg-gb-primary/10 border-2 border-gb-primary flex items-center justify-center shrink-0">
                                <span className="text-sm font-black text-gb-primary">{entry.progress_percentage}%</span>
                              </div>
                            )}
                          </div>

                          {/* Body activité */}
                          <div className="p-4 space-y-4 border-t border-gb-border bg-gb-app/10">
                            {/* Main d'œuvre */}
                            {laborData.length > 0 && (
                              <div className="space-y-2">
                                <p className="text-[10px] font-black uppercase text-blue-600 flex items-center gap-1.5 tracking-widest"><HardHat size={12} /> Main d'œuvre</p>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                  {laborData.map((l: any, li: number) => (
                                    <div key={li} className="flex items-center justify-between p-2.5 bg-gb-surface-solid rounded-xl border border-gb-border">
                                      <div className="flex items-center gap-2">
                                        <div className="w-7 h-7 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center"><HardHat size={12} /></div>
                                        <div>
                                          <p className="text-xs font-bold text-gb-text leading-none">{l.worker_name || "—"}</p>
                                          <p className="text-[9px] text-gb-muted mt-0.5">{l.trade || "Corps d'état"}</p>
                                        </div>
                                      </div>
                                      <span className="text-xs font-black text-gb-text">{l.hours}h</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Équipement */}
                            {equipData.length > 0 && (
                              <div className="space-y-2">
                                <p className="text-[10px] font-black uppercase text-amber-600 flex items-center gap-1.5 tracking-widest"><Truck size={12} /> Équipement & Engins</p>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                  {equipData.map((eq: any, ei: number) => (
                                    <div key={ei} className="flex items-center justify-between p-2.5 bg-gb-surface-solid rounded-xl border border-gb-border">
                                      <div className="flex items-center gap-2">
                                        <div className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center"><Truck size={12} /></div>
                                        <p className="text-xs font-bold text-gb-text">{eq.equipment_name || "—"}</p>
                                      </div>
                                      <span className="text-xs font-black text-gb-text">{eq.hours_used}h</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Matériaux */}
                            {matData.length > 0 && (
                              <div className="space-y-2">
                                <p className="text-[10px] font-black uppercase text-emerald-600 flex items-center gap-1.5 tracking-widest"><Package size={12} /> Matériaux</p>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                  {matData.map((m: any, mi: number) => (
                                    <div key={mi} className="flex items-center justify-between p-2.5 bg-gb-surface-solid rounded-xl border border-gb-border">
                                      <div className="flex items-center gap-2">
                                        <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center"><Package size={12} /></div>
                                        <p className="text-xs font-bold text-gb-text">{m.material_name || "—"}</p>
                                      </div>
                                      <span className="text-xs font-black text-gb-primary">{m.quantity} <span className="text-[10px] text-gb-muted font-normal">{m.unit}</span></span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Observations */}
                            {entry.comment && (
                              <div className="p-3 bg-gb-surface-solid rounded-xl border border-gb-border">
                                <p className="text-[10px] font-bold text-gb-muted uppercase tracking-tighter mb-1.5">Observations</p>
                                <p className="text-sm text-gb-text leading-relaxed whitespace-pre-wrap">{entry.comment}</p>
                              </div>
                            )}

                            {/* Photos */}
                            {photosData.length > 0 && (
                              <div className="space-y-2">
                                <p className="text-[10px] font-black uppercase text-purple-600 flex items-center gap-1.5 tracking-widest"><ImageIcon size={12} /> Photos ({photosData.length})</p>
                                <div className="grid grid-cols-3 md:grid-cols-5 gap-2">
                                  {photosData.map((photo: string, pi: number) => (
                                    <div key={pi} className="relative group">
                                      <img src={photo} alt={`Photo ${pi + 1}`} className="w-full h-20 object-cover rounded-lg border border-gb-border" />
                                      {photo.startsWith("http") && (
                                        <a href={photo} download className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-gb-primary text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity" title="Télécharger">
                                          <Download size={10} />
                                        </a>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              )}
            </div>
          </>
        ) : (
          <div className="p-20 text-center">
            <p className="text-gb-muted italic">Impossible de charger les données du rapport.</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
