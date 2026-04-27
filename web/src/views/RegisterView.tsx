import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

export default function RegisterView() {
  const [formData, setFormData] = useState({
    firstname: "",
    lastname: "",
    email: "",
    username: "",
    matricule: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Une erreur est survenue.");
      }

      // Automatically log the user in on successful registration
      localStorage.setItem("token", data.token);
      navigate("/");
      // Need a full reload to apply state correctly based on current context
      window.location.reload(); 
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gb-app p-4">
      <div className="bg-gb-surface-solid border border-gb-border p-8 rounded-lg shadow-sm w-full max-w-md">
        <div className="mb-6 text-center">
          <h2 className="text-2xl font-semibold text-gb-text">Créer un compte</h2>
          <p className="text-gb-muted mt-2 text-sm">Rejoignez la plateforme ERP BTP</p>
        </div>

        {error && <div className="mb-4 text-red-500 text-sm text-center">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gb-text mb-1">Prénom</label>
              <input type="text" name="firstname" value={formData.firstname} onChange={handleChange} className="w-full px-3 py-2 bg-gb-app border border-gb-border rounded text-gb-text focus:outline-none focus:border-gb-primary" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gb-text mb-1">Nom</label>
              <input type="text" name="lastname" value={formData.lastname} onChange={handleChange} className="w-full px-3 py-2 bg-gb-app border border-gb-border rounded text-gb-text focus:outline-none focus:border-gb-primary" required />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gb-text mb-1">Matricule</label>
              <input type="text" name="matricule" value={formData.matricule} onChange={handleChange} className="w-full px-3 py-2 bg-gb-app border border-gb-border rounded text-gb-text focus:outline-none focus:border-gb-primary" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gb-text mb-1">Nom d'utilisateur</label>
              <input type="text" name="username" value={formData.username} onChange={handleChange} className="w-full px-3 py-2 bg-gb-app border border-gb-border rounded text-gb-text focus:outline-none focus:border-gb-primary" required />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gb-text mb-1">Email</label>
            <input type="email" name="email" value={formData.email} onChange={handleChange} className="w-full px-3 py-2 bg-gb-app border border-gb-border rounded text-gb-text focus:outline-none focus:border-gb-primary" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gb-text mb-1">Mot de passe</label>
            <input type="password" name="password" value={formData.password} onChange={handleChange} className="w-full px-3 py-2 bg-gb-app border border-gb-border rounded text-gb-text focus:outline-none focus:border-gb-primary" required />
          </div>
          <button type="submit" disabled={loading} className="w-full bg-gb-primary text-gb-inverse py-2 rounded font-medium hover:bg-gb-primary/90 transition-colors disabled:opacity-50">
            {loading ? "Inscription..." : "S'inscrire"}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-gb-muted">
          Déjà un compte ? <Link to="/login" className="text-gb-primary hover:underline">Se connecter</Link>
        </div>
      </div>
    </div>
  );
}
