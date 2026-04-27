import React, { useState, useEffect } from "react";
import { ResourceList } from "../components/resources/ResourceList";
import { ResourceFormDialog } from "../components/resources/ResourceFormDialog";
import { ResourceDetailDrawer } from "../components/resources/ResourceDetailDrawer";
import { TaskAssignmentDialog } from "../components/resources/TaskAssignmentDialog";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Plus, Search, Filter, Loader2, AlertCircle, RefreshCw, Briefcase } from "lucide-react";
import { motion } from "motion/react";

export default function ResourcesView() {
  const [resources, setResources] = useState<any[]>([]);
  const [types, setTypes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  
  // Modals state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingResource, setEditingResource] = useState<any>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedResource, setSelectedResource] = useState<any>(null);
  const [isAssignOpen, setIsAssignOpen] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem("token");
      const [resData, typeData] = await Promise.all([
        fetch("/api/resources", { headers: { Authorization: `Bearer ${token}` } }),
        fetch("/api/resources/types", { headers: { Authorization: `Bearer ${token}` } })
      ]);

      if (!resData.ok || !typeData.ok) throw new Error("Erreur lors de la récupération des ressources");

      setResources(await resData.json());
      setTypes(await typeData.json());
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateOrUpdate = async (data: any) => {
    const token = localStorage.getItem("token");
    const url = editingResource ? `/api/resources/${editingResource.id}` : "/api/resources";
    const method = editingResource ? "PUT" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(data)
    });

    if (res.ok) {
      await fetchData();
      setIsFormOpen(false);
    } else {
      const err = await res.json();
      alert(err.error || "Erreur lors de l'enregistrement");
    }
  };

  const handleAssignTask = async (taskId: number, data: any) => {
    const token = localStorage.getItem("token");
    const res = await fetch(`/api/resources/tasks/${taskId}/assign`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(data)
    });

    if (res.ok) {
      await fetchData();
      if (selectedResource) {
        // Refresh selected resource detail
        const updated = await fetch(`/api/resources/${selectedResource.id}`, { headers: { Authorization: `Bearer ${token}` } });
        if (updated.ok) setSelectedResource(await updated.json());
      }
    } else {
      const err = await res.json();
      alert(err.error || "Erreur lors de l'affectation");
    }
  };

  const handleUnassignTask = async (taskId: number) => {
    if (!selectedResource) return;
    const token = localStorage.getItem("token");
    const res = await fetch(`/api/resources/tasks/${taskId}/assign/${selectedResource.id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` }
    });

    if (res.ok) {
      await fetchData();
      // Refresh selected resource detail
      const updated = await fetch(`/api/resources/${selectedResource.id}`, { headers: { Authorization: `Bearer ${token}` } });
      if (updated.ok) setSelectedResource(await updated.json());
    }
  };

  const filteredResources = resources.filter(r => 
    r.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.type.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8 pb-10"
    >
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight text-gb-text">Gestion des Ressources</h2>
          <p className="text-gb-muted mt-1">Gérez vos équipes, matériels et sous-traitants.</p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <Button 
            onClick={() => { setEditingResource(null); setIsFormOpen(true); }}
            className="flex-1 sm:flex-none shadow-lg shadow-gb-primary/20 rounded-full px-6"
          >
            <Plus size={18} className="mr-2" />
            Nouvelle Ressource
          </Button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4 items-center">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gb-muted" size={18} />
          <Input 
            placeholder="Rechercher une ressource par nom ou type..." 
            className="pl-10 bg-gb-surface-solid border-gb-border h-12 rounded-xl"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex gap-2 shrink-0">
          <Button variant="outline" className="h-12 border-gb-border bg-gb-surface-solid rounded-xl hover:bg-gb-surface-hover">
            <Filter size={18} className="mr-2" />
            Filtres
          </Button>
          <Button 
            variant="ghost" 
            className="h-12 text-gb-muted hover:text-gb-primary"
            onClick={fetchData}
          >
            <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
          </Button>
        </div>
      </div>

      {error && (
        <div className="bg-gb-danger/10 border border-gb-danger/20 p-4 rounded-xl flex items-center gap-3 text-gb-danger">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <p className="text-sm font-medium">{error}</p>
        </div>
      )}

      {loading && resources.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-20 space-y-4">
          <Loader2 className="w-10 h-10 text-gb-primary animate-spin" />
          <p className="text-gb-muted font-medium text-sm">Chargement de l'inventaire...</p>
        </div>
      ) : (
        <ResourceList 
          resources={filteredResources} 
          onSelect={(r) => { setSelectedResource(r); setIsDrawerOpen(true); }}
          onEdit={(r) => { setEditingResource(r); setIsFormOpen(true); }}
        />
      )}

      {selectedResource && (
        <div className="mt-8 flex justify-end">
           <Button 
            onClick={() => setIsAssignOpen(true)}
            variant="secondary"
            className="bg-gb-primary/10 text-gb-primary border border-gb-primary/20 hover:bg-gb-primary/20 font-bold"
           >
             <Briefcase size={18} className="mr-2" />
             Affecter une tâche à {selectedResource.name}
           </Button>
        </div>
      )}

      <ResourceFormDialog 
        open={isFormOpen} 
        onOpenChange={setIsFormOpen} 
        onSubmit={handleCreateOrUpdate}
        initialData={editingResource}
        types={types}
      />

      <ResourceDetailDrawer 
        open={isDrawerOpen} 
        onClose={() => setIsDrawerOpen(false)}
        resource={selectedResource}
        onUnassign={handleUnassignTask}
      />

      <TaskAssignmentDialog 
        open={isAssignOpen}
        onOpenChange={setIsAssignOpen}
        resource={selectedResource}
        onAssign={handleAssignTask}
      />
    </motion.div>
  );
}
