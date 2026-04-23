import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { Hexagon, Lock, Mail, User, AlertCircle, Shield } from "lucide-react";

export default function RegisterView() {
  const [firstname, setFirstname] = useState("");
  const [lastname, setLastname] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [roleCode, setRoleCode] = useState("CHEF_PROJET");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ firstname, lastname, email, password, roleCode })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Échec d'inscription.");
      }

      login(data.token, data.user);
      navigate("/");
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
          <div className="flex flex-col items-center mb-6">
            <h1 className="text-2xl font-bold tracking-tight text-gb-text">Demande d'accès ERP</h1>
            <p className="text-sm text-gb-muted mt-2 text-center">Création d'un accès sécurisé d'entreprise</p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-rose-500/10 border border-rose-500/20 rounded-md flex items-start">
              <AlertCircle size={18} className="text-rose-500 mr-3 shrink-0 mt-0.5" />
              <p className="text-sm text-rose-500 font-medium">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-gb-muted ml-1">Prénom</label>
                <div className="relative">
                  <User size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gb-muted" />
                  <input
                    type="text"
                    value={firstname}
                    onChange={(e) => setFirstname(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-gb-surface-solid border border-gb-border text-gb-text rounded-lg text-sm outline-none focus:border-gb-primary transition-colors"
                    placeholder="Jean"
                    required
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-gb-muted ml-1">Nom</label>
                <div className="relative">
                  <User size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gb-muted" />
                  <input
                    type="text"
                    value={lastname}
                    onChange={(e) => setLastname(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-gb-surface-solid border border-gb-border text-gb-text rounded-lg text-sm outline-none focus:border-gb-primary transition-colors"
                    placeholder="Bâtisseur"
                    required
                  />
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-gb-muted ml-1">Email professionnel</label>
              <div className="relative">
                <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gb-muted" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-gb-surface-solid border border-gb-border text-gb-text rounded-lg text-sm outline-none focus:border-gb-primary transition-colors"
                  placeholder="jean@entreprise.com"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-gb-muted ml-1">Rôle demandé</label>
              <div className="relative">
                <Shield size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gb-muted" />
                <select
                  value={roleCode}
                  onChange={(e) => setRoleCode(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-gb-surface-solid border border-gb-border text-gb-text rounded-lg text-sm outline-none focus:border-gb-primary transition-colors appearance-none"
                >
                  <option value="CHEF_PROJET">Chef de Projet</option>
                  <option value="DG">Direction Générale (DG)</option>
                  <option value="SG">Secrétariat Général (SG)</option>
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-gb-muted ml-1">Mot de passe</label>
              <div className="relative">
                <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gb-muted" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-gb-surface-solid border border-gb-border text-gb-text rounded-lg text-sm outline-none focus:border-gb-primary transition-colors"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gb-primary hover:bg-gb-primary/90 text-gb-inverse font-bold py-3 px-4 rounded-lg mt-2 flex justify-center items-center h-[48px] transition-colors"
            >
              {loading ? (
                <div className="w-5 h-5 rounded-full border-2 border-gb-inverse border-t-transparent animate-spin"></div>
              ) : (
                "Demander l'accès"
              )}
            </button>
          </form>

          <div className="mt-6 text-center text-sm font-medium text-gb-muted">
            Déjà inscrit ? <Link to="/login" className="text-gb-primary hover:underline">Connectez-vous</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
