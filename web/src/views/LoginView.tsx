import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

export default function LoginView() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    login({
      id: "1",
      firstname: "Admin",
      lastname: "BTP",
      email: "admin@btp.com",
      roles: [{ role: { code: "ADMIN" } }]
    });
    navigate("/");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gb-app p-4">
      <div className="bg-gb-surface-solid border border-gb-border p-8 rounded-lg shadow-sm w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="w-12 h-12 bg-gb-primary rounded mx-auto mb-4 flex items-center justify-center font-bold text-gb-inverse text-xl shadow-[0_0_15px_rgba(59,130,246,0.3)]">
            B
          </div>
          <h2 className="text-2xl font-semibold text-gb-text">Connexion ERP</h2>
          <p className="text-gb-muted mt-2 text-sm">Veuillez vous identifier pour continuer</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gb-text mb-1">Email</label>
            <input 
              type="email" 
              className="w-full px-3 py-2 bg-gb-app border border-gb-border rounded text-gb-text focus:outline-none focus:border-gb-primary"
              placeholder="admin@btp.com"
              required 
            />
          </div>
          <div>
            <div className="flex justify-between mb-1">
              <label className="block text-sm font-medium text-gb-text">Mot de passe</label>
              <Link to="/reset-password" className="text-xs text-gb-primary hover:underline">Mot de passe oublié ?</Link>
            </div>
            <input 
              type="password" 
              className="w-full px-3 py-2 bg-gb-app border border-gb-border rounded text-gb-text focus:outline-none focus:border-gb-primary"
              placeholder="••••••••"
              required 
            />
          </div>
          <button 
            type="submit"
            className="w-full bg-gb-primary text-gb-inverse py-2 rounded font-medium hover:bg-gb-primary/90 transition-colors"
          >
            Se connecter
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-gb-muted">
          Pas encore de compte ? <Link to="/register" className="text-gb-primary hover:underline">S'inscrire</Link>
        </div>
      </div>
    </div>
  );
}
