import React, { useState } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { Hexagon, Lock, Mail, AlertCircle } from "lucide-react";

export default function LoginView() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || "/";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Échec de connexion.");
      }

      login(data.token, data.user);
      navigate(from, { replace: true });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gb-app font-sans text-gb-text p-4">
      <div className="w-full max-w-md animate-in fade-in zoom-in-95 duration-500">
        <div className="bg-gb-surface rounded-xl p-8 grid-border shadow-[0_0_40px_rgba(0,0,0,0.3)]">
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 bg-gb-surface-hover border border-gb-border rounded-full flex items-center justify-center mb-4">
              <Hexagon size={32} className="text-gb-primary" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-gb-text">Connexion ERP BTP</h1>
            <p className="text-sm text-gb-muted mt-2 text-center">Accès sécurisé à votre espace d'entreprise</p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-rose-500/10 border border-rose-500/20 rounded-md flex items-start">
              <AlertCircle size={18} className="text-rose-500 mr-3 shrink-0 mt-0.5" />
              <p className="text-sm text-rose-500 font-medium">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-gb-muted ml-1">Email professionnel</label>
              <div className="relative">
                <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gb-muted" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-gb-surface-solid border border-gb-border text-gb-text rounded-lg text-sm outline-none focus:border-gb-primary focus:ring-1 focus:ring-gb-primary transition-colors"
                  placeholder="jean.batisseur@entreprise.com"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between items-center px-1">
                <label className="text-sm font-semibold text-gb-muted">Mot de passe</label>
                <Link to="/reset-password" className="text-xs font-medium text-gb-primary hover:underline">Mot de passe oublié ?</Link>
              </div>
              <div className="relative">
                <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gb-muted" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-gb-surface-solid border border-gb-border text-gb-text rounded-lg text-sm outline-none focus:border-gb-primary focus:ring-1 focus:ring-gb-primary transition-colors"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gb-primary hover:bg-gb-primary/90 text-gb-inverse font-bold py-3 px-4 rounded-lg flex justify-center items-center h-[48px] transition-colors"
            >
              {loading ? (
                <div className="w-5 h-5 rounded-full border-2 border-gb-inverse border-t-transparent animate-spin"></div>
              ) : (
                "Se connecter"
              )}
            </button>
          </form>

          <div className="mt-8 text-center text-sm font-medium text-gb-muted">
            L'API doit être initiée par `seed` (email: projet@btp.erp, pass: admin123). <br/>
            Pas de compte ? <Link to="/register" className="text-gb-primary hover:underline">Créer un compte</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
