import React from "react";

export default function TasksView() {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-gb-surface p-4 rounded-lg grid-border transition-colors duration-300">
        <h1 className="text-2xl font-bold tracking-tight text-gb-text">Chantier - Kanban d'Exécution</h1>
        <p className="text-sm text-gb-muted mt-1">Suivi des tâches et avancement terrain.</p>
      </div>

      <div className="flex gap-6 h-full min-h-[500px] overflow-x-auto pb-4">
        {/* TO DO Column */}
        <div className="flex-1 min-w-[300px] flex flex-col bg-gb-surface rounded-xl grid-border p-4 transition-colors duration-300">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gb-text">À Faire</h3>
            <span className="bg-gb-surface-hover text-gb-muted px-2 py-0.5 rounded text-xs font-bold border border-gb-border">2</span>
          </div>
          <div className="space-y-3 overflow-y-auto pr-1">
            <div className="bg-gb-surface-solid p-4 rounded-lg grid-border cursor-grab active:cursor-grabbing hover:border-gb-primary transition-colors">
               <div className="flex justify-between items-start mb-2">
                <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded bg-rose-500/10 text-rose-500 border border-rose-500/20">Urgent</span>
                <span className="text-xs text-gb-muted font-mono">#T-124</span>
              </div>
              <h4 className="text-sm font-semibold text-gb-text mb-1">Commande Béton Lot C</h4>
              <p className="text-xs text-gb-muted line-clamp-2 mb-3">Validation de la commande fournisseur 100m3.</p>
              <div className="flex justify-between items-center">
                <div className="text-xs font-medium text-gb-muted px-2 py-1 bg-gb-surface-hover rounded">24 Oct</div>
                <div className="w-6 h-6 rounded-full bg-blue-500/20 text-gb-primary border border-blue-500/30 flex items-center justify-center text-[10px] font-bold">JD</div>
              </div>
            </div>
            
            <div className="bg-gb-surface-solid p-4 rounded-lg grid-border cursor-grab active:cursor-grabbing hover:border-gb-primary transition-colors">
               <div className="flex justify-between items-start mb-2">
                <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">Normal</span>
                <span className="text-xs text-gb-muted font-mono">#T-125</span>
              </div>
              <h4 className="text-sm font-semibold text-gb-text mb-1">Menuiseries Extérieures</h4>
              <p className="text-xs text-gb-muted line-clamp-2 mb-3">Mesures finales rez-de-chaussée.</p>
            </div>
          </div>
        </div>

        {/* IN PROGRESS Column */}
        <div className="flex-1 min-w-[300px] flex flex-col bg-gb-surface rounded-xl grid-border p-4 transition-colors duration-300">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gb-text">En Cours</h3>
            <span className="bg-gb-surface-hover text-gb-muted px-2 py-0.5 rounded text-xs font-bold border border-gb-border">1</span>
          </div>
          <div className="space-y-3 overflow-y-auto pr-1">
             <div className="bg-gb-surface-solid p-4 rounded-lg grid-border cursor-grab active:cursor-grabbing border-gb-primary">
              <div className="flex justify-between items-start mb-2">
                <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded bg-blue-500/10 text-blue-500 border border-blue-500/20">Normal</span>
                <span className="text-xs text-gb-muted font-mono">#T-123</span>
              </div>
              <h4 className="text-sm font-semibold text-gb-text mb-1">Traçage Fondations</h4>
              <p className="text-xs text-gb-muted line-clamp-2 mb-3">Intervention géomètre sur site.</p>
              <div className="w-full bg-gb-surface-hover rounded-full h-1.5 mt-2">
                <div className="bg-gb-primary h-1.5 rounded-full" style={{ width: "45%" }}></div>
              </div>
            </div>
          </div>
        </div>

        {/* DONE Column */}
        <div className="flex-1 min-w-[300px] flex flex-col bg-gb-surface rounded-xl grid-border p-4 opacity-75 transition-colors duration-300">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gb-text">Terminé</h3>
            <span className="bg-gb-surface-hover text-gb-muted px-2 py-0.5 rounded text-xs font-bold border border-gb-border">1</span>
          </div>
          <div className="space-y-3 overflow-y-auto pr-1">
             <div className="bg-gb-surface-solid p-4 rounded-lg grid-border opacity-60">
                <h4 className="text-sm font-semibold text-gb-muted mb-1 line-through">Préparation terrain</h4>
                 <div className="flex justify-between items-center mt-3">
                  <div className="text-xs font-medium text-emerald-500/80">Terminé le 10 Oct</div>
                </div>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}
