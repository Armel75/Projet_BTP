import React, { useState, useEffect } from "react";
import { 
  FileText, 
  Plus, 
  Search, 
  Filter, 
  Loader2, 
  AlertCircle, 
  ExternalLink,
  ClipboardList,
  Target
} from "lucide-react";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "../ui/table";
import { motion, AnimatePresence } from "motion/react";
import BidListDialog from "./BidListDialog";
import SubmitBidDialog from "./SubmitBidDialog";

export default function TenderModule() {
  const [tenders, setTenders] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedTender, setSelectedTender] = useState<any>(null);
  const [isBidListOpen, setIsBidListOpen] = useState(false);
  const [isSubmitBidOpen, setIsSubmitBidOpen] = useState(false);

  const fetchProjects = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("/api/project-management/projects", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setProjects(data);
        if (data.length > 0 && !selectedProjectId) {
          setSelectedProjectId(data[0].id.toString());
        }
      }
    } catch (err) {
      console.error("Failed to fetch projects", err);
    }
  };

  const fetchTenders = async (projectId: string) => {
    if (!projectId) return;
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`/api/procurement/tenders?projectId=${projectId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setTenders(await res.json());
      } else {
        throw new Error("Erreur lors du chargement des appels d'offres");
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
    if (selectedProjectId) {
      fetchTenders(selectedProjectId);
    }
  }, [selectedProjectId]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "OPEN": return <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20">Ouvert</Badge>;
      case "PUBLISHED": return <Badge className="bg-blue-500/10 text-blue-500 border-blue-500/20">Publié</Badge>;
      case "AWARDED": return <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/20">Attribué</Badge>;
      case "CLOSED": return <Badge className="bg-gb-surface-hover text-gb-muted">Fermé</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row gap-4 items-end justify-between bg-gb-surface-solid p-6 rounded-2xl border border-gb-border shadow-sm">
        <div className="space-y-2 w-full md:w-64">
          <label className="text-xs font-bold text-gb-muted uppercase tracking-wider">Filtrer par Projet</label>
          <select 
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
            className="w-full bg-gb-app border border-gb-border rounded-xl h-11 px-4 text-sm font-medium focus:ring-2 focus:ring-gb-primary transition-all outline-none"
          >
            <option value="">Sélectionner un projet...</option>
            {projects.map(p => (
              <option key={p.id} value={p.id}>{p.title}</option>
            ))}
          </select>
        </div>

        <div className="flex gap-2 w-full md:w-auto">
          <Button className="flex-1 md:flex-none shadow-lg shadow-gb-primary/20 rounded-xl px-6 h-11">
            <Plus size={18} className="mr-2" />
            Nouvel Appel d'Offres
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center p-20 space-y-4">
          <Loader2 className="w-10 h-10 text-gb-primary animate-spin" />
          <p className="text-gb-muted font-medium italic">Recherche des appels d'offres...</p>
        </div>
      ) : error ? (
        <div className="p-8 text-center bg-gb-danger/5 border border-gb-danger/10 rounded-2xl">
          <AlertCircle className="mx-auto text-gb-danger mb-4" size={32} />
          <p className="text-gb-danger font-medium">{error}</p>
        </div>
      ) : tenders.length === 0 ? (
        <div className="p-20 text-center bg-gb-surface-solid border border-gb-border border-dashed rounded-3xl">
          <ClipboardList className="mx-auto text-gb-muted/20 mb-6" size={64} />
          <h3 className="text-xl font-bold text-gb-text mb-2">Aucun appel d'offres</h3>
          <p className="text-gb-muted px-10">Il n'y a pas encore d'appels d'offres pour ce projet. Centralisez vos demandes d'achats ici.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {tenders.map((tender) => (
            <motion.div 
              key={tender.id}
              whileHover={{ y: -2 }}
              className="bg-gb-surface-solid border border-gb-border rounded-2xl p-6 hover:shadow-xl hover:border-gb-primary/30 transition-all flex flex-col md:flex-row md:items-center justify-between gap-6"
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-gb-app border border-gb-border flex items-center justify-center text-gb-primary shrink-0">
                  <FileText size={20} />
                </div>
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <h4 className="font-extrabold text-xl text-gb-text leading-tight">{tender.title}</h4>
                    {getStatusBadge(tender.status)}
                  </div>
                  <div className="flex items-center gap-4 text-xs font-medium text-gb-muted">
                    <span className="flex items-center gap-1.5 uppercase tracking-tighter">
                      <Target size={12} /> {tender.bids?.length || 0} Offres reçues
                    </span>
                    <span>•</span>
                    <span>Créé par {tender.createdBy?.firstname}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                 <Button 
                   variant="outline" 
                   className="h-11 rounded-xl border-gb-border hover:bg-gb-surface-hover hover:text-gb-primary transition-colors"
                   onClick={() => { setSelectedTender(tender); setIsBidListOpen(true); }}
                 >
                   <ClipboardList size={16} className="mr-2" />
                   Voir les Offres ({tender.bids?.length || 0})
                 </Button>
                 <Button 
                   className="h-11 rounded-xl shadow-lg shadow-gb-primary/10"
                   onClick={() => { setSelectedTender(tender); setIsSubmitBidOpen(true); }}
                 >
                   Soumettre une Offre
                 </Button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {selectedTender && (
        <>
          <BidListDialog 
            open={isBidListOpen} 
            onOpenChange={setIsBidListOpen} 
            tender={selectedTender}
            onBidAwarded={() => fetchTenders(selectedProjectId)}
          />
          <SubmitBidDialog 
            open={isSubmitBidOpen} 
            onOpenChange={setIsSubmitBidOpen} 
            tender={selectedTender}
            onSuccess={() => fetchTenders(selectedProjectId)}
          />
        </>
      )}
    </div>
  );
}
