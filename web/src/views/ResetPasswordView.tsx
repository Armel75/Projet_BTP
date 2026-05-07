import React, { useState } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { API_BASE } from "../lib/api";

export default function ResetPasswordView() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token");

  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleForgot(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");
    try {
      const res = await fetch(`${API_BASE}/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Une erreur est survenue.");
      } else {
        setMessage(data.message || "Si un compte existe avec cet email, un lien de réinitialisation a été envoyé.");
      }
    } catch {
      setError("Impossible de contacter le serveur.");
    } finally {
      setLoading(false);
    }
  }

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");
    try {
      const res = await fetch(`${API_BASE}/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Une erreur est survenue.");
      } else {
        navigate("/login");
      }
    } catch {
      setError("Impossible de contacter le serveur.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gb-app p-4">
      <div className="bg-gb-surface-solid border border-gb-border p-8 rounded-lg shadow-sm w-full max-w-md">
        <div className="mb-6 text-center">
          <h2 className="text-2xl font-semibold text-gb-text">
            {token ? "Nouveau mot de passe" : "Mot de passe oublié"}
          </h2>
          <p className="text-gb-muted mt-2 text-sm">
            {token
              ? "Entrez votre nouveau mot de passe"
              : "Entrez votre email pour recevoir les instructions"}
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded text-red-500 text-sm">
            {error}
          </div>
        )}
        {message && (
          <div className="mb-4 p-3 bg-green-500/10 border border-green-500/30 rounded text-green-600 text-sm">
            {message}
          </div>
        )}

        {!token ? (
          <form className="space-y-4" onSubmit={handleForgot}>
            <div>
              <label className="block text-sm font-medium text-gb-text mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 bg-gb-app border border-gb-border rounded text-gb-text focus:outline-none focus:border-gb-primary"
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gb-primary text-gb-inverse py-2 rounded font-medium hover:bg-gb-primary/90 transition-colors disabled:opacity-50"
            >
              {loading ? "Envoi..." : "Envoyer le lien"}
            </button>
          </form>
        ) : (
          <form className="space-y-4" onSubmit={handleReset}>
            <div>
              <label className="block text-sm font-medium text-gb-text mb-1">Nouveau mot de passe</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-3 py-2 bg-gb-app border border-gb-border rounded text-gb-text focus:outline-none focus:border-gb-primary"
                required
                minLength={8}
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gb-primary text-gb-inverse py-2 rounded font-medium hover:bg-gb-primary/90 transition-colors disabled:opacity-50"
            >
              {loading ? "Mise à jour..." : "Réinitialiser le mot de passe"}
            </button>
          </form>
        )}

        <div className="mt-6 text-center text-sm text-gb-muted">
          <Link to="/login" className="text-gb-primary hover:underline">Retour à la connexion</Link>
        </div>
      </div>
    </div>
  );
}

