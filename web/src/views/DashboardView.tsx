import React from "react";
import { BarChart3, Users, Building2, AlertTriangle } from "lucide-react";

export default function DashboardView() {
  const stats = [
    { label: "Projets Actifs", value: "12", icon: <Building2 size={20} className="text-blue-500" /> },
    { label: "Utilisateurs", value: "48", icon: <Users size={20} className="text-green-500" /> },
    { label: "Tâches en retard", value: "7", icon: <AlertTriangle size={20} className="text-amber-500" /> },
    { label: "Budget Consommé", value: "68%", icon: <BarChart3 size={20} className="text-purple-500" /> }
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-semibold">Tableau de Bord</h2>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, idx) => (
           <div key={idx} className="bg-gb-surface-solid border border-gb-border p-5 rounded-lg flex items-center justify-between">
             <div>
               <p className="text-sm text-gb-muted mb-1">{stat.label}</p>
               <h3 className="text-2xl font-bold">{stat.value}</h3>
             </div>
             <div className="p-3 bg-gb-surface-hover rounded-full">
               {stat.icon}
             </div>
           </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        <div className="bg-gb-surface-solid border border-gb-border rounded-lg p-5 min-h-[300px]">
          <h3 className="font-semibold mb-4 text-gb-text">Activité récente</h3>
          <div className="text-sm text-gb-muted text-center pt-20">Graphique à venir</div>
        </div>
        <div className="bg-gb-surface-solid border border-gb-border rounded-lg p-5 min-h-[300px]">
          <h3 className="font-semibold mb-4 text-gb-text">Alertes Chantiers</h3>
          <div className="text-sm text-gb-muted text-center pt-20">Liste des incidents</div>
        </div>
      </div>
    </div>
  );
}
