import React, { useEffect, useState } from "react";
import { Plus, Search, Filter } from "lucide-react";
import { Project } from "../types";
import { useAuth } from "../contexts/AuthContext";

export default function ProjectsView() {
  const [projects, setProjects] = useState<Project[]>([]);
  const { token } = useAuth();

  useEffect(() => {
    if (!token) return;
    
    fetch("/api/projects", {
      headers: {
        "Authorization": `Bearer ${token}`
      }
    })
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setProjects(data);
      })
      .catch(console.error);
  }, [token]);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-gb-surface p-4 rounded-lg grid-border transition-colors duration-300">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gb-text">Projets de Construction</h1>
          <p className="text-sm text-gb-muted mt-1">Gestion et suivi complet des chantiers (ERP)</p>
        </div>
        <button className="bg-gb-primary hover:bg-gb-primary/90 text-gb-inverse px-4 py-2 rounded-md text-sm font-semibold flex items-center transition-colors">
          <Plus size={16} className="mr-2" />
          Nouveau Projet
        </button>
      </div>

      <div className="flex gap-2 items-center w-full">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gb-muted" />
          <input 
            className="w-full pl-9 pr-4 py-2.5 bg-gb-surface border border-gb-border text-gb-text rounded-md text-sm outline-none focus:ring-1 focus:ring-gb-primary transition-shadow placeholder:text-gb-muted" 
            placeholder="Rechercher par code, nom de projet, statut..."
          />
        </div>
        <button className="shrink-0 flex items-center px-4 py-2.5 bg-gb-surface border border-gb-border text-gb-text rounded-md text-sm hover:bg-gb-surface-hover transition-colors">
          <Filter size={16} className="mr-2" /> Filtrer
        </button>
      </div>

      <div className="grid gap-4">
        {projects.length === 0 ? (
           <div className="bg-gb-surface p-10 rounded-lg grid-border flex flex-col items-center justify-center h-64 transition-colors duration-300">
             <div className="text-gb-muted font-medium pb-2">Aucun projet trouvé.</div>
             <div className="text-sm text-gb-muted pb-4">Assurez-vous que l'API est lancée.</div>
             <button className="bg-gb-surface-hover border border-gb-border text-gb-text px-4 py-2 rounded text-sm hover:bg-gb-border transition-colors" onClick={() => fetch("/api/seed", {method: "POST"}).then(() => window.location.reload())}>
               Générer un projet démo (Seed)
             </button>
           </div>
        ) : (
          projects.map((p) => (
            <div key={p.id} className="bg-gb-surface p-5 rounded-lg grid-border hover:border-gb-primary transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4 duration-300">
              <div className="flex-1 space-y-1">
                <div className="flex items-center space-x-3">
                  <span className="text-xs font-mono px-2 py-0.5 rounded bg-gb-surface-solid text-gb-muted border border-gb-border">
                    {p.project_code}
                  </span>
                  <h3 className="font-semibold text-gb-text text-base">{p.title}</h3>
                </div>
                <p className="text-sm text-gb-muted line-clamp-1">{p.description}</p>
              </div>

              <div className="flex items-center gap-6 shrink-0 text-sm">
                 <div className="text-right hidden md:block px-4 border-r border-gb-border">
                   <p className="text-xs text-gb-muted uppercase">Budget Estimé</p>
                   <p className="font-mono text-gb-text text-lg">
                      {p.metadata?.budget_estimated ? new Intl.NumberFormat('fr-FR', { style: 'currency', currency: p.metadata.currency }).format(p.metadata.budget_estimated) : 'N/A'}
                   </p>
                 </div>
                 <div className="text-right px-4 border-r border-gb-border">
                   <p className="text-xs text-gb-muted uppercase">Avancement</p>
                   <p className="font-mono text-gb-primary text-lg">
                      64.2%
                   </p>
                 </div>
                 <div className="text-right w-24">
                   <p className="text-xs text-gb-muted uppercase mb-1">Statut</p>
                   <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium border ${
                     p.status === 'DRAFT' ? 'bg-gb-surface-hover text-gb-muted border-gb-border' :
                     p.status === 'IN_VALIDATION' ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20' :
                     p.status === 'APPROVED' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-gb-surface-hover text-gb-muted border-gb-border'
                   }`}>
                     {p.status}
                   </span>
                 </div>
                 <button className="bg-gb-surface-solid border border-gb-border hover:bg-gb-surface-hover text-gb-text px-4 py-2 rounded-md text-sm transition-colors">
                   Gérer
                 </button>
              </div>
            </div>
          ))
        )}
      </div>

    </div>
  );
}
