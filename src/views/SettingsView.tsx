import React, { useState } from "react";
import { Database, Users, Settings } from "lucide-react";

export default function SettingsView() {
  const [seeded, setSeeded] = useState(false);
  const [loading, setLoading] = useState(false);

  const seedDatabase = async () => {
    setLoading(true);
    try {
      await fetch("/api/seed", { method: "POST" });
      setSeeded(true);
      window.location.reload();
    } catch(err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-gb-surface p-4 rounded-lg grid-border transition-colors duration-300">
        <h1 className="text-2xl font-bold tracking-tight text-gb-text">Administration Système</h1>
        <p className="text-sm text-gb-muted mt-1">Configuration de la base de données ERP et rôles utilisateurs.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-gb-surface p-6 rounded-lg grid-border transition-colors duration-300">
          <div className="flex items-center space-x-2 mb-2">
            <Database size={20} className="text-gb-primary" />
            <h3 className="text-lg font-semibold text-gb-text">Base de Données (PostgreSQL)</h3>
          </div>
          <p className="text-sm text-gb-muted mb-6">Statut du schéma Prisma et santé de l'instance.</p>

          <div className="space-y-4">
            <div className="flex justify-between items-center py-3 border-b border-gb-border">
              <span className="text-sm text-gb-muted">Statut de la base</span>
              <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-500 rounded text-xs font-medium border border-emerald-500/20">Connecté</span>
            </div>
            <div className="flex justify-between items-center py-3 border-b border-gb-border">
              <span className="text-sm text-gb-muted">Provider Prisma</span>
              <span className="text-sm font-medium text-gb-text font-mono bg-gb-surface-solid border border-gb-border px-2 py-1 rounded">sqlite (simulating postgresql)</span>
            </div>
            <div className="flex justify-between items-center py-3">
              <span className="text-sm text-gb-muted">Données Initiales (Seed)</span>
              <button 
                onClick={seedDatabase}
                disabled={loading || seeded}
                className="text-xs bg-gb-primary text-gb-inverse px-4 py-2 rounded-md hover:bg-gb-primary/90 disabled:opacity-50 disabled:bg-gb-surface-hover disabled:text-gb-muted transition-colors"
              >
                {loading ? "Génération..." : seeded ? "Généré" : "Générer les tables de base"}
              </button>
            </div>
          </div>
        </div>

        <div className="bg-gb-surface p-6 rounded-lg grid-border transition-colors duration-300">
          <div className="flex items-center space-x-2 mb-2">
            <Users size={20} className="text-purple-500" />
            <h3 className="text-lg font-semibold text-gb-text">Acteurs & Rôles (RBAC)</h3>
          </div>
          <p className="text-sm text-gb-muted mb-6">Principales entités de validation.</p>

          <div className="space-y-3">
             <div className="flex items-center space-x-4 p-4 bg-gb-surface-solid rounded-lg grid-border transition-colors duration-300">
               <div className="w-10 h-10 rounded bg-gb-surface-hover border border-gb-border flex items-center justify-center font-bold text-xs text-gb-text">DG</div>
               <div>
                 <p className="text-sm font-semibold text-gb-text">Direction Générale</p>
                 <p className="text-xs text-gb-muted">Validation finale, vue consolidée</p>
               </div>
             </div>
             <div className="flex items-center space-x-4 p-4 bg-gb-surface-solid rounded-lg grid-border transition-colors duration-300">
               <div className="w-10 h-10 rounded bg-gb-surface-hover border border-gb-border flex items-center justify-center font-bold text-xs text-gb-text">SG</div>
               <div>
                 <p className="text-sm font-semibold text-gb-text">Secrétariat Général</p>
                 <p className="text-xs text-gb-muted">Validation administrative, contrats</p>
               </div>
             </div>
             <div className="flex items-center space-x-4 p-4 bg-gb-surface-solid rounded-lg grid-border transition-colors duration-300">
               <div className="w-10 h-10 rounded bg-gb-surface-hover border border-gb-border flex items-center justify-center font-bold text-xs text-gb-text">CP</div>
               <div>
                 <p className="text-sm font-semibold text-gb-text">Chef de Projet</p>
                 <p className="text-xs text-gb-muted">Initiation, exécution chantier</p>
               </div>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}
