import React from "react";
import { ShieldCheck, ArrowRight, X, Check } from "lucide-react";

export default function WorkflowView() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl md:text-2xl font-semibold flex items-center space-x-2">
          <ShieldCheck className="text-gb-primary" />
          <span>Validation SG/DG</span>
        </h2>
      </div>

      <div className="bg-gb-surface-solid border border-gb-border rounded-lg p-4 md:p-6 shadow-sm">
        <h3 className="text-base md:text-lg font-medium mb-4">Demandes en attente d'approbation</h3>
        
        <div className="space-y-4">
          {/* Item 1 */}
          <div className="p-4 border border-gb-border rounded-lg flex flex-col md:flex-row md:items-center justify-between hover:bg-gb-surface-hover transition-colors gap-4">
            <div className="flex items-start space-x-4">
              <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center shrink-0">
                <ShieldCheck className="text-blue-500" size={20} />
              </div>
              <div>
                <h4 className="font-medium text-gb-text text-base">Validation Budget Achat #PO-892</h4>
                <p className="text-sm text-gb-muted mt-1">Projet PRJ-2023-02 • Fournisseur: BatiMat SARL • 45,000 €</p>
                <div className="text-[11px] md:text-xs mt-2 text-gb-muted flex items-center space-x-1 md:space-x-2 flex-wrap gap-y-1">
                  <span className="bg-gb-app px-2 py-0.5 rounded border border-gb-border">Par Jean D.</span>
                  <span className="hidden md:inline">•</span>
                  <span>Il y a 2 heures</span>
                </div>
              </div>
            </div>
            <div className="flex space-x-2 shrink-0 md:ml-4 border-t border-gb-border md:border-t-0 pt-3 md:pt-0 mt-2 md:mt-0">
              <button className="flex-1 md:flex-none flex items-center justify-center space-x-1 px-3 py-2 md:py-1.5 border border-gb-danger text-gb-danger rounded text-sm font-medium hover:bg-gb-danger hover:text-white transition-colors min-h-[44px]">
                <X size={16} />
                <span className="md:hidden">Refuser</span>
              </button>
              <button className="flex-1 md:flex-none flex items-center justify-center space-x-1 px-4 py-2 md:py-1.5 bg-green-600 text-white rounded text-sm font-medium hover:bg-green-700 transition-colors min-h-[44px] shadow-sm">
                <Check size={16} />
                <span>Approuver</span>
              </button>
            </div>
          </div>
          
          {/* Item 2 */}
          <div className="p-4 border border-gb-border rounded-lg flex flex-col md:flex-row md:items-center justify-between hover:bg-gb-surface-hover transition-colors gap-4">
            <div className="flex items-start space-x-4">
              <div className="w-10 h-10 rounded-full bg-purple-500/10 flex items-center justify-center shrink-0">
                <ShieldCheck className="text-purple-500" size={20} />
              </div>
              <div>
                <h4 className="font-medium text-gb-text text-base">Clôture de phase Chantier</h4>
                <p className="text-sm text-gb-muted mt-1">Projet PRJ-2023-01 • Phase: Maçonnerie terminée</p>
                <div className="text-[11px] md:text-xs mt-2 text-gb-muted flex items-center space-x-1 md:space-x-2 flex-wrap gap-y-1">
                  <span className="bg-gb-app px-2 py-0.5 rounded border border-gb-border">Par Chef de chantier</span>
                  <span className="hidden md:inline">•</span>
                  <span>Hier</span>
                </div>
              </div>
            </div>
            <div className="flex space-x-2 shrink-0 md:ml-4 border-t border-gb-border md:border-t-0 pt-3 md:pt-0 mt-2 md:mt-0">
              <button className="flex-1 md:flex-none flex items-center justify-center space-x-2 px-4 py-2 md:py-1.5 border border-gb-border bg-gb-app text-gb-text rounded text-sm font-medium hover:bg-gb-surface-hover transition-colors min-h-[44px]">
                <span>Voir détails</span>
                <ArrowRight size={16} />
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
