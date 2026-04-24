import React from "react";
import { FolderKanban, Plus, MapPin, Euro } from "lucide-react";

export default function ProjectsView() {
  const projects = [
    { code: "PRJ-2023-01", title: "Construction Tour A", status: "En cours", statusColor: "text-green-600 bg-green-500/10", location: "Paris (75)", budget: "1,500,000 €" },
    { code: "PRJ-2023-02", title: "Rénovation Lycée", status: "Préparation", statusColor: "text-amber-600 bg-amber-500/10", location: "Lyon (69)", budget: "850,000 €" }
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl md:text-2xl font-semibold flex items-center space-x-2">
          <FolderKanban className="text-gb-primary" />
          <span>Gestion des Projets</span>
        </h2>
        <button className="flex items-center justify-center space-x-2 bg-gb-primary text-gb-inverse px-3 py-2 md:px-4 rounded font-medium hover:bg-gb-primary/90 transition-colors text-sm min-h-[44px]">
          <Plus size={16} />
          <span className="hidden md:inline">Nouveau Projet</span>
        </button>
      </div>

      {/* Vue Bureau : Tableau */}
      <div className="hidden md:block bg-gb-surface-solid border border-gb-border rounded-lg overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-gb-surface-hover border-b border-gb-border text-gb-muted">
            <tr>
              <th className="p-4 font-medium">Code</th>
              <th className="p-4 font-medium">Titre</th>
              <th className="p-4 font-medium">Statut</th>
              <th className="p-4 font-medium">Lieu</th>
              <th className="p-4 font-medium">Budget</th>
            </tr>
          </thead>
          <tbody>
            {projects.map((prj) => (
              <tr key={prj.code} className="border-b border-gb-border hover:bg-gb-surface-hover/50">
                <td className="p-4 font-medium text-gb-text">{prj.code}</td>
                <td className="p-4">{prj.title}</td>
                <td className="p-4"><span className={`px-2 py-1 rounded text-xs font-medium ${prj.statusColor}`}>{prj.status}</span></td>
                <td className="p-4 text-gb-muted">{prj.location}</td>
                <td className="p-4 text-gb-muted">{prj.budget}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Vue Mobile : Cartes (Optimisé Chantier) */}
      <div className="md:hidden space-y-4">
        {projects.map((prj) => (
          <div key={prj.code} className="bg-gb-surface-solid border border-gb-border rounded-lg p-4 shadow-sm">
            <div className="flex justify-between items-start mb-3">
              <div>
                <span className="text-xs font-mono text-gb-muted block mb-1">{prj.code}</span>
                <h3 className="font-semibold text-gb-text text-base leading-tight">{prj.title}</h3>
              </div>
              <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${prj.statusColor}`}>
                {prj.status}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-gb-border text-sm">
              <div className="flex items-center text-gb-muted space-x-1">
                <MapPin size={14} className="shrink-0" />
                <span className="truncate">{prj.location}</span>
              </div>
              <div className="flex items-center text-gb-muted space-x-1 justify-end">
                <Euro size={14} className="shrink-0 text-gb-primary" />
                <span className="font-medium text-gb-text">{prj.budget}</span>
              </div>
            </div>
            <button className="w-full mt-4 bg-gb-surface-hover hover:bg-gb-border text-gb-text font-medium text-sm py-2 rounded transition-colors min-h-[44px]">
              Ouvrir le projet
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
