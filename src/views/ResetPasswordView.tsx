import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Hexagon, Mail, AlertCircle, CheckCircle } from "lucide-react";

export default function ResetPasswordView() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // Simulate API call for reset password
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      if (!email.includes("@")) {
        throw new Error("Adresse email invalide.");
      }

      setSuccess(true);
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
            <div className="w-16 h-16 bg-gb-surface-hover border border-gb-border rounded-full flex items-center justify-center mb-4">
              <Hexagon size={32} className="text-gb-primary" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-gb-text">Mot de passe oublié</h1>
            <p className="text-sm text-gb-muted mt-2 text-center">Entrez votre email pour recevoir un lien de réinitialisation sécurisé.</p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-rose-500/10 border border-rose-500/20 rounded-md flex items-start">
              <AlertCircle size={18} className="text-rose-500 mr-3 shrink-0 mt-0.5" />
              <p className="text-sm text-rose-500 font-medium">{error}</p>
            </div>
          )}

          {success ? (
            <div className="mb-6 p-6 bg-emerald-500/10 border border-emerald-500/20 rounded-md flex flex-col items-center text-center">
              <CheckCircle size={32} className="text-emerald-500 mb-3" />
              <h3 className="text-lg font-bold text-emerald-500 mb-1">Email envoyé !</h3>
              <p className="text-sm text-gb-muted mb-4">Si un compte existe pour {email}, un lien de réinitialisation a été envoyé.</p>
              <Link to="/login" className="w-full bg-gb-surface-solid border border-gb-border hover:bg-gb-surface-hover text-gb-text font-bold py-2.5 px-4 rounded-lg transition-colors">
                Retour à la connexion
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-gb-muted ml-1">Email professionnel</label>
                <div className="relative">
                  <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gb-muted" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-gb-surface-solid border border-gb-border text-gb-text rounded-lg text-sm outline-none focus:border-gb-primary focus:ring-1 focus:ring-gb-primary transition-colors"
                    placeholder="jean@entreprise.com"
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
                  "Envoyer le lien"
                )}
              </button>
            </form>
          )}

          {!success && (
            <div className="mt-6 text-center text-sm font-medium text-gb-muted">
               <Link to="/login" className="text-gb-primary hover:underline">Retour à la connexion</Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
