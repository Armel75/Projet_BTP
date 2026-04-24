import React from "react";
import { Settings, Users, Database } from "lucide-react";

export default function SettingsView() {
  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-semibold flex items-center space-x-2">
          <Settings className="text-gb-primary" />
          <span>Administration</span>
        </h2>
      </div>

      <div className="bg-gb-surface-solid border border-gb-border rounded-lg p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <h3 className="text-lg font-medium flex items-center space-x-2 mb-4 border-b border-gb-border pb-2">
              <Database size={18} className="text-gb-muted" />
              <span>Base de données</span>
            </h3>
            <p className="text-sm text-gb-muted mb-4">Gérez la structure et les données par défaut du système.</p>
            <div className="space-y-3">
              <button className="w-full text-left p-3 border border-gb-border rounded bg-gb-app hover:border-gb-primary transition-colors text-sm font-medium">
                Initialiser les Nomenclatures (Seed)
              </button>
              <button className="w-full text-left p-3 border border-gb-border rounded bg-gb-app hover:border-gb-primary transition-colors text-sm font-medium">
                 Gérer les entreprises (Multi-Tenant)
              </button>
            </div>
          </div>
          
          <div>
             <h3 className="text-lg font-medium flex items-center space-x-2 mb-4 border-b border-gb-border pb-2">
              <Users size={18} className="text-gb-muted" />
              <span>Utilisateurs & Rôles</span>
            </h3>
            <p className="text-sm text-gb-muted mb-4">Configurez les accès et les permissions de validation.</p>
             <div className="space-y-3">
              <button className="w-full text-left p-3 border border-gb-border rounded bg-gb-app hover:border-gb-primary transition-colors text-sm font-medium">
                Annuaire Employés
              </button>
              <button className="w-full text-left p-3 border border-gb-border rounded bg-gb-app hover:border-gb-primary transition-colors text-sm font-medium">
                Matrice des droits SG/DG
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
