import React, { useState, useEffect } from "react";
import { 
  CalendarDays, 
  Plus, 
  Search, 
  Loader2, 
  AlertCircle, 
  CloudSun, 
  Thermometer,
  ChevronRight,
  BookOpen,
  Calendar as CalendarIcon
} from "lucide-react";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { motion, AnimatePresence } from "motion/react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import DailyLogDetailDrawer from "./DailyLogDetailDrawer";
import CreateDailyLogDialog from "./CreateDailyLogDialog";

export default function DailyLogModule() {
  const [logs, setLogs] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedLog, setSelectedLog] = useState<any>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const fetchProjects = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("/api/project-management/projects", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setProjects(data);
        if (data.length > 0 && !selectedProjectId) setSelectedProjectId(data[0].id.toString());
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchLogs = async (projectId: string) => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`/api/daily-logs?projectId=${projectId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setLogs(await res.json());
      } else {
        throw new Error("Impossible de charger les journaux");
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  useEffect(() => {
    if (selectedProjectId) fetchLogs(selectedProjectId);
  }, [selectedProjectId]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row gap-4 items-end justify-between bg-gb-surface-solid p-6 rounded-2xl border border-gb-border shadow-sm">
        <div className="space-y-2 w-full md:w-64">
          <label className="text-xs font-bold text-gb-muted uppercase tracking-wider">Chantier</label>
          <select 
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
            className="w-full bg-gb-app border border-gb-border rounded-xl h-11 px-4 text-sm font-medium focus:ring-2 focus:ring-gb-primary transition-all outline-none"
          >
            <option value="">Sélectionner un chantier...</option>
            {projects.map(p => (
              <option key={p.id} value={p.id}>{p.title}</option>
            ))}
          </select>
        </div>

        <Button 
          onClick={() => setIsCreateOpen(true)}
          className="h-11 px-6 rounded-xl shadow-lg shadow-gb-primary/20 w-full md:w-auto"
        >
          <Plus size={18} className="mr-2" />
          Nouveau Rapport Journalier
        </Button>
      </div>

      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center space-y-4">
          <Loader2 className="w-10 h-10 text-gb-primary animate-spin" />
          <p className="text-gb-muted font-medium italic">Chargement du journal...</p>
        </div>
      ) : error ? (
        <div className="p-8 text-center bg-gb-danger/5 border border-gb-danger/10 rounded-2xl text-gb-danger font-medium">
          {error}
        </div>
      ) : logs.length === 0 ? (
        <div className="p-20 text-center bg-gb-surface-solid border border-gb-border border-dashed rounded-3xl">
          <BookOpen className="mx-auto text-gb-muted/20 mb-6" size={64} />
          <h3 className="text-xl font-bold text-gb-text mb-2">Aucun rapport journalier</h3>
          <p className="text-gb-muted italic">Commencez par documenter l'activité d'aujourd'hui.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {logs.map((log) => (
            <motion.div 
              key={log.id}
              whileHover={{ y: -4 }}
              onClick={() => { setSelectedLog(log); setIsDetailOpen(true); }}
              className="bg-gb-surface-solid border border-gb-border rounded-2xl p-6 shadow-sm hover:shadow-xl hover:border-gb-primary/30 transition-all cursor-pointer flex flex-col justify-between group"
            >
              <div>
                <div className="flex justify-between items-start mb-4">
                   <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gb-app border border-gb-border flex items-center justify-center text-gb-primary group-hover:bg-gb-primary group-hover:text-gb-inverse transition-colors">
                        <CalendarIcon size={20} />
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-gb-muted uppercase tracking-widest leading-none mb-1">Rapport du</p>
                        <h4 className="font-extrabold text-lg text-gb-text leading-tight">
                          {format(new Date(log.date), 'dd MMMM yyyy', { locale: fr })}
                        </h4>
                      </div>
                   </div>
                </div>

                <div className="flex items-center gap-4 mb-6">
                   {log.weather && (
                     <div className="flex items-center gap-1.5 text-xs font-bold text-gb-muted bg-gb-app/50 px-2 py-1 rounded-lg border border-gb-border">
                        <CloudSun size={14} className="text-amber-500" />
                        <span>{log.weather}</span>
                     </div>
                   )}
                   {log.temperature !== null && (
                     <div className="flex items-center gap-1.5 text-xs font-bold text-gb-muted bg-gb-app/50 px-2 py-1 rounded-lg border border-gb-border">
                        <Thermometer size={14} className="text-gb-danger" />
                        <span>{log.temperature} °C</span>
                     </div>
                   )}
                </div>

                <p className="text-sm text-gb-muted line-clamp-2 mb-6 italic">
                  {log.notes || "Aucune note saisie pour cette journée."}
                </p>
              </div>

              <div className="pt-4 border-t border-gb-border/50 flex items-center justify-between">
                 <div className="flex gap-4">
                    <div className="flex flex-col">
                       <span className="text-[8px] font-black uppercase text-gb-muted tracking-tighter">Main d'œuvre</span>
                       <span className="text-sm font-black text-gb-text">{log.labor_entries?.length || 0}</span>
                    </div>
                    <div className="flex flex-col">
                       <span className="text-[8px] font-black uppercase text-gb-muted tracking-tighter">Équipement</span>
                       <span className="text-sm font-black text-gb-text">{log.equipment_entries?.length || 0}</span>
                    </div>
                 </div>
                 <ChevronRight size={20} className="text-gb-muted group-hover:text-gb-primary transition-colors" />
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {selectedLog && (
        <DailyLogDetailDrawer 
          open={isDetailOpen}
          onOpenChange={setIsDetailOpen}
          logId={selectedLog.id}
        />
      )}

      {isCreateOpen && (
        <CreateDailyLogDialog 
          open={isCreateOpen}
          onOpenChange={setIsCreateOpen}
          projectId={parseInt(selectedProjectId)}
          onSuccess={() => fetchLogs(selectedProjectId)}
        />
      )}
    </div>
  );
}
