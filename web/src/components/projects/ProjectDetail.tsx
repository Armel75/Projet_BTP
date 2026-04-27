import React, { useState, useEffect } from "react";
import { ArrowLeft, LayoutGrid, Layers, GitBranch, Search, Filter } from "lucide-react";
import { WBSTree } from "./WBSTree";
import { TaskDetail } from "./TaskDetail";
import { Badge } from "../ui/badge";
import { motion, AnimatePresence } from "motion/react";

interface ProjectDetailProps {
  projectId: number;
  onBack: () => void;
}

export function ProjectDetail({ projectId, onBack }: ProjectDetailProps) {
  const [project, setProject] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<"wbs" | "lots" | "incidents">("wbs");

  useEffect(() => {
    const fetchProjectData = async () => {
      const token = localStorage.getItem("token");
      try {
        const [prjRes, wbsRes, lotsRes] = await Promise.all([
          fetch(`/api/project-management/projects/${projectId}`, { headers: { Authorization: `Bearer ${token}` } }),
          fetch(`/api/project-management/projects/${projectId}/wbs`, { headers: { Authorization: `Bearer ${token}` } }),
          fetch(`/api/project-management/projects/${projectId}/lots`, { headers: { Authorization: `Bearer ${token}` } })
        ]);

        if (prjRes.ok && wbsRes.ok && lotsRes.ok) {
          const prjData = await prjRes.json();
          const wbsData = await wbsRes.json();
          const lotsData = await lotsRes.json();
          
          setProject({
            ...prjData,
            wbs: wbsData,
            lots: lotsData
          });
        }
      } catch (err) {
        console.error("Failed to fetch project detail", err);
      } finally {
        setLoading(false);
      }
    };
    fetchProjectData();
  }, [projectId]);

  if (loading) return <div className="p-10 text-center animate-pulse">Chargement des données du projet...</div>;
  if (!project) return <div className="p-10 text-center text-gb-danger">Projet non trouvé.</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col space-y-4">
        <button 
          onClick={onBack}
          className="flex items-center gap-2 text-gb-muted hover:text-gb-primary transition-colors text-sm font-medium w-fit"
        >
          <ArrowLeft size={16} />
          Retour aux projets
        </button>

        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <span className="text-xs font-mono font-bold text-gb-primary bg-gb-primary/10 px-2 py-1 rounded ring-1 ring-gb-primary/20">
                {project.code}
              </span>
              <Badge variant="outline" className="border-gb-border text-gb-muted">
                {project.status}
              </Badge>
            </div>
            <h2 className="text-3xl font-extrabold text-gb-text tracking-tight">{project.title}</h2>
            <p className="text-gb-muted text-sm flex items-center gap-2 mt-2">
              <span className="font-medium text-gb-text/70">{project.location}</span>
              <span>•</span>
              <span>{new Date(project.start_date).toLocaleDateString()} — {new Date(project.end_date).toLocaleDateString()}</span>
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="bg-gb-surface-solid border border-gb-border p-1 rounded-lg flex gap-1">
              {[
                { id: "wbs", icon: GitBranch, label: "Structure WBS" },
                { id: "lots", icon: Layers, label: "Lots" }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-bold transition-all ${
                    activeTab === tab.id 
                    ? "bg-gb-primary text-gb-inverse shadow-lg shadow-gb-primary/20" 
                    : "text-gb-muted hover:bg-gb-surface-hover hover:text-gb-text"
                  }`}
                >
                  <tab.icon size={16} />
                  <span className="hidden sm:inline">{tab.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-8 space-y-6">
          {activeTab === "wbs" && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="space-y-4"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-gb-text tracking-tight flex items-center gap-2">
                  <GitBranch className="text-gb-primary" />
                  Work Breakdown Structure
                </h3>
                <div className="flex gap-2">
                   <div className="relative">
                      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gb-muted" />
                      <input 
                        className="bg-gb-surface-solid border border-gb-border rounded-full pl-9 pr-4 py-1.5 text-xs focus:ring-2 focus:ring-gb-primary focus:outline-none transition-all w-48"
                        placeholder="Filtrer les tâches..."
                      />
                   </div>
                </div>
              </div>
              <WBSTree nodes={project.wbs || []} onTaskSelect={setSelectedTask} />
            </motion.div>
          )}

          {activeTab === "lots" && (
            <motion.div 
               initial={{ opacity: 0, x: -20 }}
               animate={{ opacity: 1, x: 0 }}
               className="grid grid-cols-1 md:grid-cols-2 gap-4"
            >
              {project.lots?.map((lot: any) => (
                <div key={lot.id} className="bg-gb-surface-solid border border-gb-border rounded-xl p-5 hover:border-gb-primary/50 transition-colors cursor-pointer group">
                  <div className="flex justify-between items-start mb-4">
                    <h4 className="font-bold text-lg group-hover:text-gb-primary transition-colors">{lot.name}</h4>
                    <LayoutGrid size={18} className="text-gb-muted group-hover:text-gb-primary/50" />
                  </div>
                  <p className="text-sm text-gb-muted line-clamp-2 mb-4 leading-relaxed">{lot.description || "Aucune description fournie pour ce lot technique."}</p>
                  <div className="flex items-center justify-between pt-4 border-t border-gb-border/50">
                    <span className="text-xs font-bold text-gb-muted uppercase tracking-wider">Avancement</span>
                    <span className="text-xs font-bold text-gb-text">70%</span>
                  </div>
                  <div className="mt-2 w-full bg-gb-surface-hover h-1.5 rounded-full">
                    <div className="bg-gb-primary h-full w-[70%]" />
                  </div>
                </div>
              ))}
            </motion.div>
          )}
        </div>

        <div className="lg:col-span-4 lg:sticky lg:top-6">
          <AnimatePresence mode="wait">
            {selectedTask ? (
              <motion.div
                key="task-detail"
                initial={{ opacity: 0, y: 20, x: 0 }}
                animate={{ opacity: 1, y: 0, x: 0 }}
                exit={{ opacity: 0, y: 20, x: 0 }}
                className="fixed inset-x-4 bottom-20 z-40 lg:relative lg:inset-auto lg:z-auto lg:bottom-auto"
              >
                <div className="absolute inset-0 -top-[calc(100vh-100px)] bg-black/20 backdrop-blur-sm lg:hidden rounded-xl overflow-hidden pointer-events-none" />
                <TaskDetail task={selectedTask} onClose={() => setSelectedTask(null)} />
              </motion.div>
            ) : (
              <motion.div 
                key="task-placeholder"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="hidden lg:block bg-gb-surface-solid border border-gb-border border-dashed rounded-xl p-8 text-center"
              >
                <div className="w-16 h-16 bg-gb-app rounded-full flex items-center justify-center mx-auto mb-4 border border-gb-border">
                  <Filter size={24} className="text-gb-muted" />
                </div>
                <h4 className="font-bold text-gb-text">Détails de la tâche</h4>
                <p className="text-gb-muted text-sm mt-2">Sélectionnez une tâche dans l'arborescence WBS pour visualiser ses détails et ses dépendances.</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
