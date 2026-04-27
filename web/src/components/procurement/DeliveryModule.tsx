import React, { useState, useEffect } from "react";
import { 
  Truck, 
  PackageCheck, 
  Search, 
  Loader2, 
  AlertCircle, 
  Plus,
  ArrowRight,
  ClipboardCheck,
  Building2,
  Calendar,
  Layers,
  MapPin
} from "lucide-react";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { motion, AnimatePresence } from "motion/react";
import CreateGoodsReceiptDialog from "./CreateGoodsReceiptDialog";

export default function DeliveryModule() {
  const [deliveries, setDeliveries] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedDelivery, setSelectedDelivery] = useState<any>(null);
  const [isReceiptDialogOpen, setIsReceiptDialogOpen] = useState(false);

  const fetchProjects = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("/api/project-management/projects", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setProjects(data);
        if (data.length > 0 && !selectedProjectId) setSelectedProjectId(data[0].id.toString());
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchDeliveries = async (projectId: string) => {
    if (!projectId) return;
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`/api/procurement/deliveries?projectId=${projectId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setDeliveries(await res.json());
      } else {
        throw new Error("Erreur de chargement des livraisons");
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  useEffect(() => {
    if (selectedProjectId) fetchDeliveries(selectedProjectId);
  }, [selectedProjectId]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row gap-4 items-end justify-between bg-gb-surface-solid p-6 rounded-2xl border border-gb-border shadow-sm">
        <div className="space-y-2 w-full md:w-64">
          <label className="text-xs font-bold text-gb-muted uppercase tracking-wider">Chantier de livraison</label>
          <select 
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
            className="w-full bg-gb-app border border-gb-border rounded-xl h-11 px-4 text-sm font-medium focus:ring-2 focus:ring-gb-primary transition-all outline-none"
          >
            <option value="">Choisir un chantier...</option>
            {projects.map(p => (
              <option key={p.id} value={p.id}>{p.title}</option>
            ))}
          </select>
        </div>

        <Button className="h-11 px-6 rounded-xl shadow-lg shadow-gb-primary/20 w-full md:w-auto">
          <Plus size={18} className="mr-2" />
          Annoncer une Livraison
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
         {loading ? (
            <div className="col-span-full py-20 flex flex-col items-center justify-center space-y-4">
              <Loader2 className="w-10 h-10 text-purple-500 animate-spin" />
              <p className="text-gb-muted font-medium italic">Chargement du planning de livraison...</p>
            </div>
         ) : error ? (
           <div className="col-span-full p-8 text-center bg-gb-danger/5 border border-gb-danger/10 rounded-2xl text-gb-danger font-medium">
             {error}
           </div>
         ) : deliveries.length === 0 ? (
           <div className="col-span-full p-20 text-center bg-gb-surface-solid border border-gb-border border-dashed rounded-3xl">
             <Truck className="mx-auto text-gb-muted/20 mb-6" size={64} />
             <h3 className="text-xl font-bold text-gb-text mb-2">Aucune livraison prévue</h3>
             <p className="text-gb-muted">Les livraisons attendues sur le chantier s'afficheront ici.</p>
           </div>
         ) : (
           deliveries.map((delivery) => (
             <motion.div 
               key={delivery.id}
               whileHover={{ y: -4 }}
               className="bg-gb-surface-solid border border-gb-border rounded-2xl p-6 shadow-sm hover:shadow-xl hover:border-purple-500/30 transition-all flex flex-col justify-between"
             >
                <div className="flex justify-between items-start mb-6">
                   <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-purple-500/5 border border-purple-500/20 flex items-center justify-center text-purple-600">
                        <Truck size={24} />
                      </div>
                      <div>
                        <h4 className="font-extrabold text-lg text-gb-text leading-tight">{delivery.supplier?.name}</h4>
                        <p className="text-[10px] font-bold text-gb-muted uppercase tracking-widest mt-0.5">Livraison #{delivery.id}</p>
                      </div>
                   </div>
                   <Badge className="bg-purple-100 text-purple-700 border-0 uppercase text-[9px] font-black px-2.5 py-1">
                     {delivery.status}
                   </Badge>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-8">
                   <div className="p-3 bg-gb-app/50 border border-gb-border rounded-xl">
                      <div className="flex items-center gap-2 text-gb-muted mb-1">
                         <Layers size={14} />
                         <span className="text-[10px] font-bold uppercase tracking-tight">Type</span>
                      </div>
                      <p className="font-bold text-sm">{delivery.type || 'Standard'}</p>
                   </div>
                   <div className="p-3 bg-gb-app/50 border border-gb-border rounded-xl">
                      <div className="flex items-center gap-2 text-gb-muted mb-1">
                         <Calendar size={14} />
                         <span className="text-[10px] font-bold uppercase tracking-tight">Date attendue</span>
                      </div>
                      <p className="font-bold text-sm">Aujourd'hui</p>
                   </div>
                </div>

                <div className="pt-6 border-t border-gb-border/50 flex gap-2">
                   <Button 
                     onClick={() => { setSelectedDelivery(delivery); setIsReceiptDialogOpen(true); }}
                     className="flex-1 rounded-xl bg-purple-600 hover:bg-purple-700 shadow-lg shadow-purple-600/20 font-bold"
                   >
                     <PackageCheck size={18} className="mr-2" />
                     Réceptionner
                   </Button>
                   <Button variant="ghost" className="rounded-xl font-bold text-gb-muted">Details</Button>
                </div>
             </motion.div>
           ))
         )}
      </div>

      <AnimatePresence>
        {isReceiptDialogOpen && selectedDelivery && (
          <CreateGoodsReceiptDialog 
            open={isReceiptDialogOpen}
            onOpenChange={setIsReceiptDialogOpen}
            delivery={selectedDelivery}
            onSuccess={() => fetchDeliveries(selectedProjectId)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
