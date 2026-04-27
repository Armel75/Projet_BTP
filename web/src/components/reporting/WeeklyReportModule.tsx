import React, { useState, useEffect } from "react";
import { 
  ClipboardList, 
  Plus, 
  Loader2, 
  AlertCircle, 
  CalendarDays,
  ChevronRight,
  TrendingUp,
  FileCheck,
  Zap
} from "lucide-react";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { motion } from "motion/react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import WeeklyReportDetailDrawer from "./WeeklyReportDetailDrawer";
import GenerateWeeklyReportDialog from "./GenerateWeeklyReportDialog";

export default function WeeklyReportModule() {
  const [reports, setReports] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedReportId, setSelectedReportId] = useState<number | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isGenerateOpen, setIsGenerateOpen] = useState(false);

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

  const fetchReports = async (projectId: string) => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`/api/weekly-reports/project/${projectId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setReports(await res.json());
      } else {
        throw new Error("Impossible de charger les rapports hebdomadaires");
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
    if (selectedProjectId) fetchReports(selectedProjectId);
  }, [selectedProjectId]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "DRAFT": return <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/20">Brouillon</Badge>;
      case "SUBMITTED": return <Badge className="bg-blue-500/10 text-blue-500 border-blue-500/20">Soumis</Badge>;
      case "APPROVED": return <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20">Approuvé</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

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
          onClick={() => setIsGenerateOpen(true)}
          className="h-11 px-6 rounded-xl shadow-lg shadow-gb-primary/20 w-full md:w-auto bg-purple-600 hover:bg-purple-700 font-bold"
        >
          <Zap size={18} className="mr-2" />
          Générer la Synthèse Hebdo
        </Button>
      </div>

      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center space-y-4">
          <Loader2 className="w-10 h-10 text-purple-600 animate-spin" />
          <p className="text-gb-muted font-medium italic">Consolidation des données...</p>
        </div>
      ) : error ? (
        <div className="p-8 text-center bg-gb-danger/5 border border-gb-danger/10 rounded-2xl text-gb-danger font-medium">
          {error}
        </div>
      ) : reports.length === 0 ? (
        <div className="p-20 text-center bg-gb-surface-solid border border-gb-border border-dashed rounded-3xl">
          <ClipboardList className="mx-auto text-gb-muted/20 mb-6" size={64} />
          <h3 className="text-xl font-bold text-gb-text mb-2">Aucun rapport hebdomadaire</h3>
          <p className="text-gb-muted">Générez votre premier rapport à partir des journaux de bord quotidiens.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {reports.map((report) => (
            <motion.div 
              key={report.id}
              whileHover={{ scale: 1.002, x: 4 }}
              onClick={() => { setSelectedReportId(report.id); setIsDetailOpen(true); }}
              className="group bg-gb-surface-solid border border-gb-border rounded-2xl p-6 hover:shadow-xl hover:border-purple-500/30 transition-all cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-6"
            >
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 rounded-2xl bg-purple-500/5 border border-purple-500/10 flex flex-col items-center justify-center text-purple-600 shrink-0 group-hover:bg-purple-600 group-hover:text-white transition-colors">
                  <CalendarDays size={24} />
                </div>
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <h4 className="font-extrabold text-lg text-gb-text">Revue de la semaine</h4>
                    {getStatusBadge(report.status)}
                  </div>
                  <p className="text-[10px] font-bold text-gb-muted uppercase tracking-widest">
                    Du {format(new Date(report.week_start), 'dd MMMM', { locale: fr })} au {format(new Date(report.week_end), 'dd MMMM yyyy', { locale: fr })}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-8 justify-between md:justify-end">
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                       <p className="text-[10px] font-black uppercase text-gb-muted tracking-widest mb-1">Avancement Global</p>
                       <div className="flex items-center gap-2">
                         <div className="w-24 h-2 bg-gb-app rounded-full overflow-hidden border border-gb-border">
                           <div className="h-full bg-gb-primary" style={{ width: `${report.overall_progress}%` }}></div>
                         </div>
                         <span className="text-lg font-black text-gb-text tracking-tight">{report.overall_progress}%</span>
                       </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <div className="flex flex-col items-end">
                       <span className="text-[9px] font-bold text-gb-muted uppercase">Préparé par</span>
                       <span className="text-xs font-bold">{report.preparedBy?.firstname} {report.preparedBy?.lastname}</span>
                    </div>
                    <ChevronRight size={20} className="text-gb-muted group-hover:text-gb-primary transition-all" />
                  </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {selectedReportId && (
        <WeeklyReportDetailDrawer 
          open={isDetailOpen}
          onOpenChange={setIsDetailOpen}
          reportId={selectedReportId}
        />
      )}

      {isGenerateOpen && (
        <GenerateWeeklyReportDialog 
          open={isGenerateOpen}
          onOpenChange={setIsGenerateOpen}
          projectId={parseInt(selectedProjectId)}
          onSuccess={() => fetchReports(selectedProjectId)}
        />
      )}
    </div>
  );
}
