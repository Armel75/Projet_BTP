import React from "react";

export default function WorkflowView() {
  const workflowSteps = [
    { name: "Cadrage", sub: "PROJET - OK", role: "CHEF_PROJET", status: "completed" },
    { name: "Études Tech", sub: "CONTROLE - OK", role: "BUREAU_ETUDES", status: "completed" },
    { name: "Valid. SG", sub: "SEC GEN - OK", role: "SG", status: "completed" },
    { name: "Valid. DG", sub: "EN ATTENTE", role: "DG", status: "active" },
    { name: "Exécution", sub: "VERROUILLÉ", role: "ACHATS", status: "pending" },
    { name: "Archive", sub: "VERROUILLÉ", role: "ADMIN", status: "pending" },
  ];

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-gb-surface p-4 rounded-lg grid-border transition-colors duration-300">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gb-text">Moteur de Workflow DG / SG</h1>
          <p className="text-sm text-gb-muted mt-1">Validation dynamique multi-niveaux DG/SG</p>
        </div>
      </div>

      <div className="bg-gb-surface p-6 rounded-lg grid-border transition-colors duration-300">
        <div className="flex justify-between items-center mb-8">
          <h3 className="text-xs font-bold uppercase tracking-widest text-gb-muted">Dossier: PRJ-2026-001</h3>
          <span className="text-xs text-gb-primary underline cursor-pointer">Voir l'historique complet</span>
        </div>

        <div className="relative flex flex-col md:flex-row justify-between px-2 md:px-10 overflow-x-auto pb-4 md:pb-0 gap-6 md:gap-0">
          {workflowSteps.map((step, idx) => {
            const isCompleted = step.status === "completed";
            const isActive = step.status === "active";
            const isPending = step.status === "pending";
            const isLast = idx === workflowSteps.length - 1;
            
            return (
              <div key={idx} className="flex flex-row md:flex-col items-center md:space-y-3 z-10 w-full md:w-32 group">
                <div className="relative flex items-center justify-center shrink-0">
                  <div className={`workflow-dot ${
                    isCompleted ? 'completed-step' : 
                    isActive ? 'active-step' : 
                    'pending-step'
                  }`}></div>
                  {!isLast && <div className="hidden md:block workflow-line"></div>}
                </div>
                {!isLast && <div className="block md:hidden h-full w-0.5 bg-gb-border ml-1.5 my-2"></div>}
                
                <div className="ml-4 md:ml-0 text-left md:text-center">
                  <p className={`text-[10px] font-bold uppercase ${
                    isActive ? 'text-gb-primary' :
                    isPending ? 'text-gb-muted opacity-60' :
                    'text-gb-text'
                  }`}>{step.name}</p>
                  <p className={`text-[9px] ${
                    isPending ? 'text-gb-muted opacity-60' : 'text-gb-muted'
                  }`}>{step.sub}</p>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-12 pt-6 border-t border-gb-border flex flex-col items-center text-center">
          <h4 className="text-sm font-semibold text-gb-text mb-4 uppercase tracking-widest">Action Requise: Direction Générale (DG)</h4>
          <div className="flex gap-4 w-full md:w-auto">
            <button className="flex-1 md:flex-none justify-center px-6 py-2.5 rounded-md font-medium text-white bg-emerald-600 hover:bg-emerald-700 transition">
              Approuver le dossier
            </button>
            <button className="flex-1 md:flex-none justify-center px-6 py-2.5 rounded-md font-medium text-gb-text bg-gb-surface-hover border border-gb-border hover:bg-gb-border transition-colors">
              Rejeter / Commenter
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
