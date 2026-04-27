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
  FileText
} from "lucide-react";
import { Badge } from "../ui/badge";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

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
      const token = localStorage.getItem("token");
      const res = await fetch(`/api/daily-logs/${logId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                 {/* Labor Entries */}
                 <section className="space-y-4">
                    <h4 className="text-[10px] font-black uppercase text-gb-muted tracking-widest flex items-center gap-2">
                       <Users size={14} className="text-blue-500" /> Main d'œuvre
                    </h4>
                    <div className="space-y-2">
                       {log.labor_entries?.length > 0 ? (
                         log.labor_entries.map((entry: any) => (
                           <div key={entry.id} className="flex justify-between items-center p-3 bg-gb-app/30 border border-gb-border rounded-xl">
                              <div className="flex items-center gap-3">
                                 <div className="p-1.5 bg-blue-500/10 text-blue-500 rounded-lg">
                                    <HardHat size={14} />
                                 </div>
                                 <div>
                                    <p className="text-sm font-bold text-gb-text leading-none mb-1">{entry.worker_name || 'Équipe'}</p>
                                    <p className="text-[9px] font-bold text-gb-muted uppercase tracking-tighter">{entry.trade || "Corps d'état"}</p>
                                 </div>
                              </div>
                              <div className="text-right">
                                 <span className="text-sm font-black text-gb-text">{entry.hours}</span>
                                 <span className="text-[10px] font-bold text-gb-muted ml-0.5">h</span>
                              </div>
                           </div>
                         ))
                       ) : (
                         <p className="text-xs text-gb-muted italic py-4 text-center border border-dashed border-gb-border rounded-xl">Aucune saisie</p>
                       )}
                    </div>
                 </section>

                 {/* Equipment Entries */}
                 <section className="space-y-4">
                    <h4 className="text-[10px] font-black uppercase text-gb-muted tracking-widest flex items-center gap-2">
                       <Truck size={14} className="text-amber-500" /> Équipement & Engins
                    </h4>
                    <div className="space-y-2">
                       {log.equipment_entries?.length > 0 ? (
                         log.equipment_entries.map((entry: any) => (
                           <div key={entry.id} className="flex justify-between items-center p-3 bg-gb-app/30 border border-gb-border rounded-xl">
                              <div className="flex items-center gap-3">
                                 <div className="p-1.5 bg-amber-500/10 text-amber-500 rounded-lg">
                                    <Truck size={14} />
                                 </div>
                                 <p className="text-sm font-bold text-gb-text">{entry.equipment_id || 'Engin'}</p>
                              </div>
                              <div className="text-right">
                                 <span className="text-sm font-black text-gb-text">{entry.hours_used}</span>
                                 <span className="text-[10px] font-bold text-gb-muted ml-0.5">h</span>
                              </div>
                           </div>
                         ))
                       ) : (
                         <p className="text-xs text-gb-muted italic py-4 text-center border border-dashed border-gb-border rounded-xl">Aucune saisie</p>
                       )}
                    </div>
                 </section>
              </div>

              {/* Material Entries */}
              <section className="space-y-4">
                 <h4 className="text-[10px] font-black uppercase text-gb-muted tracking-widest flex items-center gap-2">
                    <Package size={14} className="text-emerald-500" /> Matériaux Consommés
                 </h4>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {log.material_entries?.length > 0 ? (
                      log.material_entries.map((entry: any) => (
                        <div key={entry.id} className="flex justify-between items-center p-4 bg-gb-app/30 border border-gb-border rounded-xl">
                           <div className="flex items-center gap-3">
                              <div className="p-2 bg-emerald-500/10 text-emerald-500 rounded-xl">
                                 <Package size={16} />
                              </div>
                              <p className="text-sm font-black text-gb-text">{entry.material_id || 'Consommable'}</p>
                           </div>
                           <div className="flex items-center gap-1.5 px-3 py-1 bg-gb-surface-solid border border-gb-border rounded-lg">
                              <span className="text-sm font-black text-gb-primary">{entry.quantity}</span>
                              <span className="text-[10px] font-bold text-gb-muted">{entry.unit || 'unit'}</span>
                           </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-gb-muted italic py-8 text-center border border-dashed border-gb-border rounded-2xl col-span-full">Aucun matériau renseigné dans ce rapport.</p>
                    )}
                 </div>
              </section>
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
