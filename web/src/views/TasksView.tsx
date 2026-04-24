import React from "react";
import { CheckSquare, Filter } from "lucide-react";

export default function TasksView() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl md:text-2xl font-semibold flex items-center space-x-2">
          <CheckSquare className="text-gb-primary" />
          <span>Suivi Chantier</span>
        </h2>
        <button className="flex items-center justify-center space-x-2 bg-gb-surface-solid border border-gb-border px-3 py-2 rounded text-sm text-gb-text hover:bg-gb-surface-hover min-h-[44px]">
          <Filter size={16} />
          <span className="hidden sm:inline">Filtrer</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* À faire */}
        <div className="bg-gb-surface-solid border border-gb-border rounded-lg p-4">
          <h3 className="font-semibold mb-4 text-gb-text pb-2 border-b border-gb-border flex items-center justify-between">
            <span>À faire</span>
            <span className="bg-gb-surface-hover text-gb-muted px-2 py-1 rounded text-xs">1</span>
          </h3>
          <div className="space-y-3">
            <div className="bg-gb-app p-4 rounded border border-gb-border text-sm active:scale-[0.98] transition-transform cursor-pointer shadow-sm">
              <p className="font-medium text-gb-text mb-1 text-base">Préparation terrain</p>
              <div className="flex items-center justify-between mt-2">
                <span className="text-xs font-mono text-gb-muted bg-gb-surface-hover px-2 py-1 rounded">PRJ-2023-01</span>
                <span className="w-6 h-6 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center text-xs font-bold">JD</span>
              </div>
            </div>
          </div>
        </div>

        {/* En cours */}
        <div className="bg-gb-surface-solid border border-gb-border rounded-lg p-4">
          <h3 className="font-semibold mb-4 text-gb-text pb-2 border-b border-gb-border flex items-center justify-between">
            <span>En cours</span>
            <span className="bg-gb-surface-hover text-gb-muted px-2 py-1 rounded text-xs">1</span>
          </h3>
          <div className="space-y-3">
            <div className="bg-gb-app p-4 rounded border border-gb-border text-sm border-l-4 border-l-blue-500 active:scale-[0.98] transition-transform cursor-pointer shadow-sm">
              <p className="font-medium text-gb-text mb-1 text-base">Fondations béton</p>
              <div className="flex items-center justify-between mt-2 mb-3">
                <span className="text-xs font-mono text-gb-muted bg-gb-surface-hover px-2 py-1 rounded">PRJ-2023-01</span>
              </div>
              <div className="w-full bg-gb-surface-solid border border-gb-border h-2 rounded-full overflow-hidden">
                <div className="bg-blue-500 h-full w-[45%]"></div>
              </div>
              <p className="text-[10px] text-right mt-1 text-gb-muted font-medium">45%</p>
            </div>
          </div>
        </div>

        {/* Terminé */}
        <div className="bg-gb-surface-solid border border-gb-border rounded-lg p-4 opacity-70">
          <h3 className="font-semibold mb-4 text-gb-text pb-2 border-b border-gb-border flex items-center justify-between">
            <span>Terminé</span>
            <span className="bg-gb-surface-hover text-gb-muted px-2 py-1 rounded text-xs">1</span>
          </h3>
          <div className="space-y-3">
            <div className="bg-gb-app p-4 rounded border border-gb-border text-sm">
              <p className="font-medium text-gb-muted line-through mb-1 text-base">Validation permis</p>
              <div className="flex items-center justify-between mt-2">
                <span className="text-xs font-mono text-gb-muted bg-gb-surface-hover px-2 py-1 rounded">PRJ-2023-01</span>
                <CheckSquare size={16} className="text-green-500" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
