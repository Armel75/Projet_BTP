import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { 
  HardHat, 
  Clock, 
  CheckCircle2, 
  Users, 
  FileText, 
  AlertTriangle, 
  ShoppingCart, 
  ChevronRight,
  ShieldCheck,
  LayoutDashboard,
  Loader2
} from "lucide-react";
import { motion } from "motion/react";

export default function LoginView() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = React.useState("");
  const [loading, setLoading] = React.useState(false);

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const target = e.target as typeof e.target & {
      username: { value: string };
      password: { value: string };
    };
    
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: target.username.value, password: target.password.value }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Identifiants invalides");

      localStorage.setItem("token", data.token);
      login(data.user);
      navigate("/");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const features = [
    { 
      icon: LayoutDashboard, 
      label: "Suivi des chantiers en temps réel", 
      desc: "Visibilité totale sur l'avancement physique et financier." 
    },
    { 
      icon: CheckCircle2, 
      label: "Gestion des tâches et planning", 
      desc: "Coordination précise des interventions et jalons critiques." 
    },
    { 
      icon: Users, 
      label: "Suivi des équipes et ressources", 
      desc: "Optimisation de l'allocation des effectifs et du matériel." 
    },
    { 
      icon: FileText, 
      label: "Rapports journaliers automatisés", 
      desc: "Génération simplifiée des Daily Logs et Weekly Reports." 
    },
    { 
      icon: AlertTriangle, 
      label: "Gestion des incidents", 
      desc: "Traçabilité et résolution rapide des aléas de chantier." 
    },
    { 
      icon: ShoppingCart, 
      label: "Pilotage des achats", 
      desc: "Contrôle des approvisionnements et des coûts matières." 
    },
  ];

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-gb-app overflow-hidden">
      {/* PARTIE GAUCHE: BRANDING & MÉTIER (Desktop Only) */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-[#0f172a] p-16 flex-col justify-between overflow-hidden">
        {/* Geometric Overlay */}
        <div className="absolute inset-0 opacity-10 pointer-events-none">
          <div className="absolute inset-0" style={{ backgroundImage: `radial-gradient(circle at 2px 2px, #3b82f6 1px, transparent 0)`, backgroundSize: '40px 40px' }}></div>
          <div className="absolute top-[-10%] right-[-10%] w-[60%] h-[60%] border border-blue-500/20 rounded-full blur-3xl"></div>
          <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] border border-blue-400/20 rounded-full blur-3xl"></div>
        </div>

        <div className="relative z-10">
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="flex items-center gap-3 mb-12"
          >
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-600/30">
              <HardHat className="text-white" size={24} />
            </div>
            <span className="text-2xl font-black text-white tracking-tighter uppercase italic">Construction<span className="text-blue-500">Pro</span></span>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="max-w-xl"
          >
            <h1 className="text-5xl font-black text-white leading-tight mb-6 tracking-tight">
              Maîtrisez vos opérations terrain en <span className="text-blue-500 italic">temps réel</span>.
            </h1>
            <p className="text-slate-400 text-lg mb-12 leading-relaxed">
              La plateforme SaaS de référence pour les conducteurs de travaux et chefs de projet BTP qui exigent excellence opérationnelle et traçabilité totale.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {features.map((f, i) => (
              <motion.div
                key={f.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.4 + (i * 0.1) }}
                className="flex gap-4 group"
              >
                <div className="shrink-0 w-10 h-10 rounded-lg bg-slate-800/50 border border-slate-700 flex items-center justify-center text-blue-400 group-hover:bg-blue-600 group-hover:text-white transition-all duration-300">
                  <f.icon size={20} />
                </div>
                <div>
                  <h3 className="text-slate-100 font-bold text-sm mb-1">{f.label}</h3>
                  <p className="text-slate-400 text-xs leading-relaxed">{f.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        <div className="relative z-10 pt-12 flex items-center gap-4 text-slate-500 text-xs font-bold uppercase tracking-widest border-t border-slate-800">
          <ShieldCheck size={16} className="text-blue-500" />
          Sécurité de niveau industriel • Données hébergées en France
        </div>
      </div>

      {/* PARTIE DROITE: FORMULAIRE */}
      <div className="flex-1 flex flex-col justify-center items-center p-8 lg:p-20 relative bg-gb-app">
        {/* Mobile Header (Hidden on Desktop) */}
        <div className="lg:hidden absolute top-12 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2">
          <div className="w-12 h-12 bg-gb-primary rounded-2xl flex items-center justify-center shadow-xl shadow-gb-primary/20">
            <HardHat className="text-white" size={28} />
          </div>
          <span className="text-xl font-black text-gb-text tracking-tighter uppercase italic">Construction<span className="text-gb-primary uppercase">Pro</span></span>
        </div>

        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          <div className="bg-gb-surface-solid border border-gb-border p-10 rounded-[2.5rem] shadow-2xl shadow-black/5">
            <div className="mb-10">
              <h2 className="text-3xl font-black text-gb-text tracking-tight mb-2">Bon retour 👋</h2>
              <p className="text-gb-muted text-sm font-medium italic">Accédez à votre cockpit de gestion chantier</p>
            </div>

            {error && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-600 text-sm font-bold flex items-center gap-3"
              >
                <div className="w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center shrink-0">
                  <AlertTriangle size={12} />
                </div>
                {error}
              </motion.div>
            )}

            <form onSubmit={handleLogin} className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] uppercase font-black tracking-[0.2em] text-gb-muted ml-1">Utilisateur / Email</label>
                <div className="relative group">
                  <input 
                    name="username"
                    type="text" 
                    className="w-full h-14 pl-5 pr-5 bg-gb-app border border-gb-border rounded-2xl text-gb-text font-medium outline-none focus:ring-4 focus:ring-gb-primary/10 focus:border-gb-primary transition-all placeholder:text-gb-muted/40"
                    placeholder="ex: jean.dupont@chantier.com"
                    required 
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center ml-1">
                  <label className="text-[10px] uppercase font-black tracking-[0.2em] text-gb-muted">Mot de passe</label>
                  <Link to="/reset-password" onClick={(e) => {
                    // Logic preserved – routing to reset screen
                  }} className="text-[10px] uppercase font-black tracking-widest text-gb-primary hover:text-gb-primary/80 transition-colors">Perdu ?</Link>
                </div>
                <div className="relative group">
                  <input 
                    name="password"
                    type="password" 
                    className="w-full h-14 pl-5 pr-5 bg-gb-app border border-gb-border rounded-2xl text-gb-text font-bold outline-none focus:ring-4 focus:ring-gb-primary/10 focus:border-gb-primary transition-all placeholder:text-gb-muted/40"
                    placeholder="••••••••"
                    required 
                  />
                </div>
              </div>

              <button 
                type="submit"
                disabled={loading}
                className="group relative w-full h-14 bg-gb-primary text-gb-inverse rounded-2xl font-black text-sm uppercase tracking-[0.2em] hover:bg-gb-primary/90 transition-all active:scale-[0.98] disabled:opacity-50 overflow-hidden shadow-xl shadow-gb-primary/20"
              >
                <span className="relative z-10 flex items-center justify-center gap-2">
                  {loading ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      Authentification...
                    </>
                  ) : (
                    <>
                      Se Connecter
                      <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </span>
                <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
              </button>
            </form>

            <div className="mt-10 pt-10 border-t border-gb-border text-center">
              <p className="text-gb-muted text-sm font-medium italic">
                Nouveau sur la plateforme ?{" "}
                <Link to="/register" className="text-gb-primary font-black not-italic hover:underline underline-offset-4 decoration-2">
                  Créer un compte
                </Link>
              </p>
            </div>
          </div>

          <p className="mt-8 text-center text-gb-muted/50 text-[10px] font-bold uppercase tracking-[0.3em]">
            © 2026 ConstructionPro Enterprise
          </p>
        </motion.div>
      </div>
    </div>
  );
}
