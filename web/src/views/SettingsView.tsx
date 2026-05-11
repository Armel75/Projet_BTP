import React from "react";
import { Settings, Users, Database } from "lucide-react";
import { Link } from "react-router-dom";
import { usePermissions } from "../contexts/AuthContext";
import { NAV_PERMISSION_GROUPS } from "../constants/navigationPermissions";

export default function SettingsView() {
  const { can, canAny } = usePermissions();

  if (!canAny(...NAV_PERMISSION_GROUPS.settings)) {
    return (
      <div className="rounded-xl border border-gb-border bg-gb-surface-solid p-6 text-sm text-gb-muted">
        Vous n'avez pas les permissions nécessaires pour accéder aux réglages d'administration.
      </div>
    );
  }

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
              {can("resource:create") && (
                <button className="w-full text-left p-3 border border-gb-border rounded bg-gb-app hover:border-gb-primary transition-colors text-sm font-medium">
                  Initialiser les Nomenclatures (Seed)
                </button>
              )}
              {can("resource:read") && (
                <Link to="/settings/resource-types" className="block w-full text-left p-3 border border-gb-border rounded bg-gb-app hover:border-gb-primary transition-colors text-sm font-medium">
                  Paramétrer les types de ressources
                </Link>
              )}
              {can("tenant:read") && (
                <Link to="/settings/tenants" className="block w-full text-left p-3 border border-gb-border rounded bg-gb-app hover:border-gb-primary transition-colors text-sm font-medium">
                   Gérer les entreprises (Multi-Tenant)
                </Link>
              )}
            </div>
          </div>
          
          <div>
             <h3 className="text-lg font-medium flex items-center space-x-2 mb-4 border-b border-gb-border pb-2">
              <Users size={18} className="text-gb-muted" />
              <span>Utilisateurs & Rôles</span>
            </h3>
            <p className="text-sm text-gb-muted mb-4">Configurez les accès et les permissions de validation.</p>
             <div className="space-y-3">
              {canAny("user:read", "role:read", "permission:read") && (
                <Link to="/settings/rbac" className="block w-full text-left p-3 border border-gb-border rounded bg-gb-app hover:border-gb-primary transition-colors text-sm font-medium">
                  Matrice des droits (RBAC Configuration)
                </Link>
              )}
              {can("user:read") && (
                <button className="w-full text-left p-3 border border-gb-border rounded bg-gb-app hover:border-gb-primary transition-colors text-sm font-medium">
                  Annuaire Employés
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
