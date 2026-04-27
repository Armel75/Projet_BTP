import React, { useState, useEffect } from "react";
import { 
  Users, 
  Plus, 
  Search, 
  Loader2, 
  AlertCircle, 
  Building2,
  Mail,
  Phone,
  ArrowUpRight,
  ShieldCheck
} from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Badge } from "../ui/badge";
import { motion } from "motion/react";

export default function SupplierModule() {
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const fetchSuppliers = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("/api/procurement/suppliers", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setSuppliers(await res.json());
      } else {
        throw new Error("Erreur lors du chargement des fournisseurs");
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const filteredSuppliers = suppliers.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-96">
           <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gb-muted" size={18} />
           <Input 
             placeholder="Rechercher un fournisseur..." 
             className="pl-10 h-12 bg-gb-surface-solid border-gb-border rounded-xl"
             value={searchTerm}
             onChange={(e) => setSearchTerm(e.target.value)}
           />
        </div>
        <Button className="h-12 px-8 rounded-xl shadow-lg shadow-gb-primary/20 w-full md:w-auto">
          <Plus size={18} className="mr-2" />
          Nouveau Fournisseur
        </Button>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center p-20 space-y-4">
          <Loader2 className="w-10 h-10 text-gb-primary animate-spin" />
          <p className="text-gb-muted font-medium">Chargement du répertoire...</p>
        </div>
      ) : error ? (
        <div className="p-8 text-center bg-gb-danger/5 border border-gb-danger/10 rounded-2xl text-gb-danger font-medium">
          {error}
        </div>
      ) : filteredSuppliers.length === 0 ? (
        <div className="p-20 text-center bg-gb-surface-solid border border-gb-border border-dashed rounded-3xl">
          <Users className="mx-auto text-gb-muted/20 mb-6" size={64} />
          <h3 className="text-xl font-bold text-gb-text mb-2">Aucun fournisseur</h3>
          <p className="text-gb-muted">Commencez par ajouter des fournisseurs à votre annuaire.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredSuppliers.map((supplier) => (
            <motion.div 
              key={supplier.id}
              whileHover={{ y: -4, scale: 1.01 }}
              className="bg-gb-surface-solid border border-gb-border rounded-2xl p-6 shadow-sm hover:shadow-xl hover:border-gb-primary/30 transition-all flex flex-col justify-between group"
            >
              <div>
                <div className="flex justify-between items-start mb-6">
                  <div className="w-12 h-12 rounded-2xl bg-gb-app border border-gb-border flex items-center justify-center text-gb-primary group-hover:bg-gb-primary group-hover:text-gb-inverse transition-colors overflow-hidden">
                    <Building2 size={24} />
                  </div>
                  <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 py-1 flex items-center gap-1">
                    <ShieldCheck size={10} /> Vérifié
                  </Badge>
                </div>
                
                <h4 className="text-xl font-black text-gb-text mb-1 leading-tight">{supplier.name}</h4>
                <p className="text-xs text-gb-muted font-bold uppercase tracking-widest mb-6">Fournisseur BTP</p>

                <div className="space-y-3 mb-8">
                  <div className="flex items-center gap-3 text-sm text-gb-muted">
                    <Mail size={14} />
                    <span>contact@{supplier.name.toLowerCase().replace(/\s+/g, '')}.fr</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-gb-muted">
                    <Phone size={14} />
                    <span>01 45 67 89 00</span>
                  </div>
                </div>
              </div>

              <div className="pt-6 border-t border-gb-border/50 flex items-center justify-between">
                 <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-gb-muted uppercase tracking-tighter">Commandes</span>
                    <span className="text-lg font-black text-gb-text">12</span>
                 </div>
                 <Button variant="ghost" size="icon" className="rounded-xl hover:bg-gb-primary hover:text-white transition-all">
                    <ArrowUpRight size={20} />
                 </Button>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
