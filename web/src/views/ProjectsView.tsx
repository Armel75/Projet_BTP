import React, { useState, useEffect } from "react";
import { FolderKanban, Plus, MapPin, Euro, Loader2, AlertCircle } from "lucide-react";
import { ProjectDetail } from "../components/projects/ProjectDetail";
import { motion, AnimatePresence } from "motion/react";
import { Badge } from "../components/ui/badge";

export default function ProjectsView() {
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);

  const fetchProjects = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("/api/project-management/projects", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setProjects(await res.json());
      } else {
        throw new Error("Erreur de récupération des projets");
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

  if (selectedProjectId) {
    return <ProjectDetail projectId={selectedProjectId} onBack={() => setSelectedProjectId(null)} />;
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-20 space-y-4">
        <Loader2 className="w-10 h-10 text-gb-primary animate-spin" />
        <p className="text-gb-muted font-medium">Chargement de vos chantiers...</p>
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8"
    >
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight text-gb-text flex items-center gap-3">
            <FolderKanban className="text-gb-primary" size={32} />
            <span>Gestion des Projets</span>
          </h2>
          <p className="text-gb-muted mt-1">Suivi et pilotage de l'ensemble de vos opérations BTP.</p>
        </div>
        <button className="flex items-center justify-center space-x-2 bg-gb-primary text-gb-inverse px-6 py-3 rounded-full font-bold hover:bg-gb-primary/90 transition-all shadow-lg shadow-gb-primary/20 text-sm active:scale-95">
          <Plus size={18} />
          <span>Nouveau Projet</span>
        </button>
      </div>

      {error && (
        <div className="bg-gb-danger/10 border border-gb-danger/20 p-4 rounded-xl flex items-center gap-3 text-gb-danger">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <p className="text-sm font-medium">{error}</p>
          <button onClick={fetchProjects} className="ml-auto underline text-xs">Réessayer</button>
        </div>
      )}

      {/* Grid of Projects */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {projects.map((prj) => (
          <motion.div 
            key={prj.id}
            whileHover={{ y: -4 }}
            className="group bg-gb-surface-solid border border-gb-border rounded-2xl p-6 shadow-sm hover:shadow-xl hover:border-gb-primary/50 transition-all cursor-pointer flex flex-col justify-between"
            onClick={() => setSelectedProjectId(prj.id)}
          >
            <div>
              <div className="flex justify-between items-start mb-4">
                <span className="text-[10px] font-mono font-bold text-gb-primary bg-gb-primary/10 px-2 py-1 rounded ring-1 ring-gb-primary/10">
                  {prj.code}
                </span>
                <Badge variant={prj.status === "ACTIVE" ? "default" : "secondary"} className="text-[10px] py-0 px-2">
                  {prj.status}
                </Badge>
              </div>
              <h3 className="font-extrabold text-xl text-gb-text leading-tight group-hover:text-gb-primary transition-colors mb-2">
                {prj.title}
              </h3>
              <div className="flex items-center text-gb-muted text-xs gap-2 mb-6">
                <MapPin size={12} />
                <span>{prj.location}</span>
              </div>
            </div>

            <div className="space-y-4 pt-4 border-t border-gb-border/50">
               <div className="flex justify-between items-center text-xs">
                  <span className="text-gb-muted uppercase tracking-wider font-bold">Progression</span>
                  <span className="text-gb-text font-bold">45%</span>
               </div>
               <div className="w-full bg-gb-surface-hover h-2 rounded-full overflow-hidden">
                  <div className="bg-gb-primary h-full w-[45%] transition-all duration-700" />
               </div>
               
               <div className="flex justify-between items-center pt-2">
                  <div className="flex items-center gap-1 text-gb-text font-bold">
                    <Euro size={14} className="text-gb-primary" />
                    <span>{prj.budget_initial.toLocaleString()} {prj.currency}</span>
                  </div>
                  <div className="flex -space-x-2">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="w-6 h-6 rounded-full border-2 border-gb-surface-solid bg-gb-surface-hover flex items-center justify-center text-[8px] font-bold">
                        {String.fromCharCode(64 + i)}
                      </div>
                    ))}
                  </div>
               </div>
            </div>
          </motion.div>
        ))}

        {projects.length === 0 && !loading && (
          <div className="col-span-full py-20 text-center bg-gb-surface-solid border border-gb-border border-dashed rounded-2xl">
            <FolderKanban className="mx-auto text-gb-muted mb-4 opacity-20" size={48} />
            <p className="text-gb-muted font-medium">Aucun projet trouvé.</p>
            <p className="text-gb-muted text-xs mt-1">Commencez par créer votre premier chantier.</p>
          </div>
        )}
      </div>
    </motion.div>
  );
}

