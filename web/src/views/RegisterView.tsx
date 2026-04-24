import React from "react";
import { Link } from "react-router-dom";

export default function RegisterView() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gb-app p-4">
      <div className="bg-gb-surface-solid border border-gb-border p-8 rounded-lg shadow-sm w-full max-w-md">
        <div className="mb-6 text-center">
          <h2 className="text-2xl font-semibold text-gb-text">Créer un compte</h2>
          <p className="text-gb-muted mt-2 text-sm">Rejoignez la plateforme ERP BTP</p>
        </div>

        <form className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gb-text mb-1">Prénom</label>
              <input type="text" className="w-full px-3 py-2 bg-gb-app border border-gb-border rounded text-gb-text focus:outline-none focus:border-gb-primary" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gb-text mb-1">Nom</label>
              <input type="text" className="w-full px-3 py-2 bg-gb-app border border-gb-border rounded text-gb-text focus:outline-none focus:border-gb-primary" required />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gb-text mb-1">Email</label>
            <input type="email" className="w-full px-3 py-2 bg-gb-app border border-gb-border rounded text-gb-text focus:outline-none focus:border-gb-primary" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gb-text mb-1">Mot de passe</label>
            <input type="password" className="w-full px-3 py-2 bg-gb-app border border-gb-border rounded text-gb-text focus:outline-none focus:border-gb-primary" required />
          </div>
          <button type="submit" className="w-full bg-gb-primary text-gb-inverse py-2 rounded font-medium hover:bg-gb-primary/90 transition-colors">
            S'inscrire
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-gb-muted">
          Déjà un compte ? <Link to="/login" className="text-gb-primary hover:underline">Se connecter</Link>
        </div>
      </div>
    </div>
  );
}
