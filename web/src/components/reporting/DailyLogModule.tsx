import React, { useState, useEffect } from "react";
import { apiFetch } from "../../lib/api";
const API_BASE = import.meta.env.VITE_API_URL;
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
  Calendar as CalendarIcon,
  Archive,
  RotateCcw
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
  const [editingLog, setEditingLog] = useState<any>(null);
  const [showArchived, setShowArchived] = useState(false);

  const fetchProjects = async () => {
    try {
      const res = await apiFetch(`${API_BASE}/projects?limit=100`);
      if (res.ok) {
        const data = await res.json();
        const list = data.data ?? data;
        setProjects(list);
        if (list.length > 0 && !selectedProjectId) setSelectedProjectId(list[0].id.toString());
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchLogs = async (projectId: string, archived = showArchived) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        project_id: projectId,
        is_archived: archived ? "true" : "false",
      });
      const res = await apiFetch(`${API_BASE}/daily-logs?${params.toString()}`);
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
    if (selectedProjectId) fetchLogs(selectedProjectId, showArchived);
  }, [selectedProjectId, showArchived]);

  const handleArchiveToggle = async (log: any, archived: boolean) => {
    const message = archived
      ? "Confirmer la suppression logique de ce rapport journalier ?"
      : "Confirmer la restauration de ce rapport journalier ?";

    if (!window.confirm(message)) return;

    try {
      const endpoint = archived
        ? `${API_BASE}/daily-logs/${log.id}`
        : `${API_BASE}/daily-logs/${log.id}/archive`;
      const res = await apiFetch(endpoint, archived ? {
        method: "DELETE",
      } : {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ archived: false }),
      });

      if (!res.ok) {
        const payload = await res.json().catch(() => null);
        throw new Error(payload?.error || (archived ? "Impossible de supprimer ce rapport." : "Impossible de restaurer ce rapport."));
      }

      setIsDetailOpen(false);
      setSelectedLog(null);
      setEditingLog(null);
      await fetchLogs(selectedProjectId, showArchived);
    } catch (err: any) {
      alert(err.message || "Une erreur est survenue.");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row gap-4 items-end justify-between bg-gb-surface-solid p-6 rounded-2xl border border-gb-border shadow-sm">
        <div className="flex flex-col md:flex-row gap-4 w-full">
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

          <div className="space-y-2">
            <label className="text-xs font-bold text-gb-muted uppercase tracking-wider">Affichage</label>
            <Button
              type="button"
              variant="outline"
              className="h-11 px-4 rounded-xl"
              onClick={() => setShowArchived((current) => !current)}
            >
              {showArchived ? <RotateCcw size={16} className="mr-2" /> : <Archive size={16} className="mr-2" />}
              {showArchived ? "Voir les actifs" : "Voir les supprimés"}
            </Button>
          </div>
        </div>

        <div className="space-y-2 w-full md:w-auto">
          <Button 
            onClick={() => setIsCreateOpen(true)}
            disabled={!selectedProjectId}
            className="h-11 px-6 rounded-xl shadow-lg shadow-gb-primary/20 w-full md:w-auto"
          >
            <Plus size={18} className="mr-2" />
            Nouveau Rapport Journalier
          </Button>
          {!selectedProjectId && (
            <p className="text-sm text-gb-muted italic">⚠️ Choisissez un chantier ci-dessus pour créer un rapport</p>
          )}
        </div>
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
          <p className="text-gb-muted italic">{showArchived ? "Aucun rapport supprimé pour ce chantier." : "Commencez par documenter l'activité d'aujourd'hui."}</p>
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
                   {log.is_archived && (
                     <Badge className="bg-gb-danger/10 text-gb-danger border-gb-danger/20">Archive</Badge>
                   )}
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
                 <div className="flex items-center gap-1.5 text-sm font-bold text-gb-muted group-hover:text-gb-primary transition-colors">
                    <span>Voir détails</span>
                    <ChevronRight size={20} className="shrink-0" />
                 </div>
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
          onArchive={(log) => handleArchiveToggle(log, true)}
          onRestore={(log) => handleArchiveToggle(log, false)}
          onEdit={(log) => {
            if (log.is_archived) {
              return;
            }
            setEditingLog(log);
            setIsDetailOpen(false);
            setIsCreateOpen(true);
          }}
        />
      )}

      {isCreateOpen && (
        <CreateDailyLogDialog 
          open={isCreateOpen}
          onOpenChange={(nextOpen) => {
            setIsCreateOpen(nextOpen);
            if (!nextOpen) {
              setEditingLog(null);
            }
          }}
          projectId={editingLog?.project_id ?? parseInt(selectedProjectId)}
          initialData={editingLog}
          onSuccess={() => {
            setEditingLog(null);
            fetchLogs(selectedProjectId);
          }}
        />
      )}
    </div>
  );
}
