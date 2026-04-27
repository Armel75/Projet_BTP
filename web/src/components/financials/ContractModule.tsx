import React, { useState, useEffect } from "react";
import { 
  FileSignature, 
  Plus, 
  Search, 
  Loader2, 
  AlertCircle, 
  ChevronRight,
  Building2,
  Calendar,
  Layers,
  Banknote,
  MoreVertical,
  Target
} from "lucide-react";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { motion, AnimatePresence } from "motion/react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

import ContractDetailDrawer from "./ContractDetailDrawer";

export default function ContractModule() {
  const [contracts, setContracts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [selectedContractId, setSelectedContractId] = useState<number | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  useEffect(() => {
    fetchContracts();
  }, []);

  const openContractDetail = (id: number) => {
    setSelectedContractId(id);
    setIsDrawerOpen(true);
  };

  const fetchContracts = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("/api/contracts", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setContracts(await res.json());
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "EXECUTED": return "bg-emerald-500/10 text-emerald-600 border-emerald-500/20";
      case "APPROVED": return "bg-blue-500/10 text-blue-600 border-blue-500/20";
      case "DRAFT": return "bg-amber-500/10 text-amber-600 border-amber-500/20";
      case "CLOSED": return "bg-gb-muted/10 text-gb-muted border-gb-muted/20";
      default: return "bg-gb-app text-gb-text border-gb-border";
    }
  };

  const filteredContracts = contracts.filter(c => 
    c.reference.toLowerCase().includes(filter.toLowerCase()) ||
    c.project?.title?.toLowerCase().includes(filter.toLowerCase()) ||
    c.supplier?.name?.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-gb-surface-solid p-4 rounded-2xl border border-gb-border">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gb-muted" size={18} />
          <input 
            type="text"
            placeholder="Rechercher un contrat, projet ou fournisseur..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="w-full pl-10 pr-4 h-11 bg-gb-app border border-gb-border rounded-xl text-sm focus:ring-2 focus:ring-gb-primary outline-none transition-all"
          />
        </div>
        <Button className="rounded-xl h-11 px-6 shadow-lg shadow-gb-primary/20 font-bold">
          <Plus size={18} className="mr-2" />
          Nouveau Contrat
        </Button>
      </div>

      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center space-y-4">
          <Loader2 className="w-10 h-10 text-gb-primary animate-spin" />
          <p className="text-gb-muted font-medium italic">Chargement des registres contractuels...</p>
        </div>
      ) : filteredContracts.length === 0 ? (
        <div className="p-20 text-center bg-gb-surface-solid border border-gb-border border-dashed rounded-3xl">
          <FileSignature className="mx-auto text-gb-muted/20 mb-6" size={64} />
          <h3 className="text-xl font-bold text-gb-text mb-2">Aucun contrat trouvé</h3>
          <p className="text-gb-muted italic">Commencez par enregistrer un contrat client ou sous-traitant.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredContracts.map((contract) => (
            <motion.div 
              key={contract.id}
              whileHover={{ y: -5 }}
              onClick={() => openContractDetail(contract.id)}
              className="bg-gb-surface-solid border border-gb-border rounded-2xl p-6 shadow-sm hover:shadow-2xl hover:border-gb-primary/30 transition-all group relative overflow-hidden cursor-pointer"
            >
              <div className="absolute top-0 right-0 p-4">
                <Badge className={getStatusColor(contract.status)}>
                  {contract.status}
                </Badge>
              </div>

              <div className="flex items-start gap-4 mb-6">
                <div className="w-12 h-12 rounded-xl bg-gb-app flex items-center justify-center text-gb-primary border border-gb-border group-hover:bg-gb-primary group-hover:text-gb-inverse transition-colors">
                  <FileSignature size={24} />
                </div>
                <div>
                  <h4 className="font-extrabold text-lg text-gb-text tracking-tight group-hover:text-gb-primary transition-colors">
                    {contract.reference}
                  </h4>
                  <p className="text-xs font-bold text-gb-muted uppercase tracking-widest flex items-center gap-1 mt-1">
                    <Layers size={12} /> {contract.type === "OWNER" ? "Client" : "Sous-traitance"}
                  </p>
                </div>
              </div>

              <div className="space-y-4 mb-8">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-gb-app flex items-center justify-center text-gb-muted border border-gb-border">
                    <Building2 size={16} />
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase text-gb-muted leading-tight">Projet</p>
                    <p className="text-sm font-bold text-gb-text truncate max-w-[200px]">{contract.project?.title}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-gb-app flex items-center justify-center text-gb-muted border border-gb-border">
                    <Target size={16} />
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase text-gb-muted leading-tight">Tiers</p>
                    <p className="text-sm font-bold text-gb-text truncate max-w-[200px]">{contract.supplier?.name}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-gb-app flex items-center justify-center text-gb-muted border border-gb-border">
                    <Calendar size={16} />
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase text-gb-muted leading-tight">Exécuté le</p>
                    <p className="text-sm font-bold text-gb-text">
                      {contract.executed_at ? format(new Date(contract.executed_at), 'dd MMMM yyyy', { locale: fr }) : "En attente"}
                    </p>
                  </div>
                </div>
              </div>

              <div className="pt-5 border-t border-gb-border/50 flex items-center justify-between">
                <div>
                   <p className="text-[10px] font-black uppercase text-gb-muted tracking-widest mb-0.5">Valeur Totale</p>
                   <p className="text-xl font-black text-gb-text">
                     {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: contract.currency || 'EUR' }).format(
                       contract.line_items?.reduce((sum: number, item: any) => sum + item.total_price, 0) || 0
                     )}
                   </p>
                </div>
                <button className="w-10 h-10 rounded-full bg-gb-app hover:bg-gb-primary hover:text-gb-inverse transition-all flex items-center justify-center border border-gb-border">
                  <ChevronRight size={20} />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {selectedContractId && (
        <ContractDetailDrawer 
          open={isDrawerOpen}
          onOpenChange={setIsDrawerOpen}
          contractId={selectedContractId}
        />
      )}
    </div>
  );
}
