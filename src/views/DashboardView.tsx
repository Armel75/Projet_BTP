import React from "react";
import { FolderKanban, CheckSquare, FileText, AlertTriangle } from "lucide-react";

export default function DashboardView() {
  const kpis = [
    { title: "Projets Actifs", value: 42, icon: <FolderKanban size={20} className="text-blue-500" /> },
    { title: "Tâches en Cours", value: 184, icon: <CheckSquare size={20} className="text-indigo-500" /> },
    { title: "Documents à Valider", value: 12, icon: <FileText size={20} className="text-amber-500" /> },
    { title: "Alertes Qualité", value: 3, icon: <AlertTriangle size={20} className="text-rose-500" /> },
  ];

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-gb-surface p-4 rounded-lg grid-border transition-colors duration-300">
        <h1 className="text-2xl font-bold tracking-tight text-gb-text">Tableau de bord directeur</h1>
        <p className="text-sm text-gb-muted mt-1">Vue consolidée de l'ensemble des activités BTP et validations SG/DG.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 content-start">
        {kpis.map((kpi, idx) => (
          <div key={idx} className="bg-gb-surface p-6 rounded-lg grid-border flex flex-col justify-between transition-colors duration-300">
            <div className="flex flex-row items-center justify-between pb-2 space-y-0">
              <h3 className="text-sm font-medium text-gb-muted">{kpi.title}</h3>
              {kpi.icon}
            </div>
            <div>
              <div className="text-2xl font-bold text-gb-text">{kpi.value}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="col-span-12 lg:col-span-8 bg-gb-surface p-6 rounded-lg grid-border transition-colors duration-300">
          <div className="mb-4">
            <h3 className="text-xs font-bold uppercase tracking-widest text-gb-muted mb-1">Workflow DG / SG</h3>
            <p className="text-lg text-gb-text">Derniers projets nécessitant validation</p>
          </div>
          <div className="space-y-4">
            {[1, 2, 3].map((_, i) => (
              <div key={i} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border border-gb-border rounded-lg bg-gb-surface-hover transition-colors duration-300">
                <div className="flex items-center space-x-4 mb-2 sm:mb-0">
                  <div className="h-10 w-10 rounded-full bg-blue-500/10 text-blue-500 flex items-center justify-center font-bold text-xs border border-blue-500/20">
                    P{i+1}
                  </div>
                  <div>
                    <p className="font-semibold text-gb-text text-sm">Construction Centre Commercial - Lot {i+1}</p>
                    <p className="text-xs text-gb-muted">Créé le 12 Oct • Par Jean (Chef de projet)</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <span className="px-2 py-0.5 bg-yellow-500/10 text-yellow-500 rounded text-xs font-medium border border-yellow-500/20">
                    En attente SG
                  </span>
                  <button className="text-xs font-medium text-gb-inverse bg-gb-primary px-3 py-1.5 rounded-md hover:bg-gb-primary/90 transition">
                    Examiner
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="col-span-12 lg:col-span-4 bg-gb-surface p-6 rounded-lg grid-border transition-colors duration-300">
          <h3 className="text-xs font-bold uppercase tracking-widest text-gb-muted mb-4">Piste d'Audit Immuable</h3>
          <div className="space-y-4 relative">
            <div className="flex space-x-3 text-[10px]">
              <div className="w-1 bg-blue-500 h-8"></div>
              <div>
                <p className="text-gb-text font-bold uppercase">VALIDATION BUDGÉTAIRE</p>
                <p className="text-gb-muted">Par: J. Bâtisseur (DG) • Il y a 1h</p>
                <p className="text-gb-muted mt-1">Projet "Tour Skyline" - Approuvé</p>
              </div>
            </div>
            <div className="flex space-x-3 text-[10px]">
              <div className="w-1 bg-emerald-500 h-8"></div>
              <div>
                <p className="text-gb-text font-bold uppercase">NOUVEAU DOCUMENT</p>
                <p className="text-gb-muted">Par: M. Durant (BE) • Il y a 3h</p>
                <p className="text-gb-muted mt-1">Lot C - CVC - Téléchargé</p>
              </div>
            </div>
             <div className="flex space-x-3 text-[10px]">
              <div className="w-1 bg-amber-500 h-8"></div>
              <div>
                <p className="text-gb-text font-bold uppercase">ALERTE QUALITÉ</p>
                <p className="text-gb-muted">Par: SYSTEM_AUTOBOT • Il y a 5h</p>
                <p className="text-gb-muted mt-1 uppercase text-amber-500">Inspections fondations échouée</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
