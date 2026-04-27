import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../ui/dialog";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Search, Loader2 } from "lucide-react";

interface TaskAssignmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  resource: any;
  onAssign: (taskId: number, data: any) => Promise<void>;
}

export function TaskAssignmentDialog({ open, onOpenChange, resource, onAssign }: TaskAssignmentDialogProps) {
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [tasks, setTasks] = useState<any[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string>("");
  const [plannedHours, setPlannedHours] = useState<string>("0");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      fetchProjects();
    }
  }, [open]);

  useEffect(() => {
    if (selectedProjectId) {
      fetchTasks(parseInt(selectedProjectId));
    } else {
      setTasks([]);
    }
    setSelectedTaskId("");
  }, [selectedProjectId]);

  const fetchProjects = async () => {
    setLoadingProjects(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("/api/projects", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setProjects(await res.json());
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingProjects(false);
    }
  };

  const fetchTasks = async (projectId: number) => {
    setLoadingTasks(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`/api/projects/${projectId}/tasks`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setTasks(await res.json());
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingTasks(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTaskId) return;
    setSubmitting(true);
    try {
      await onAssign(parseInt(selectedTaskId), {
        resourceId: resource.id,
        plannedHours: parseFloat(plannedHours)
      });
      onOpenChange(false);
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] bg-gb-surface-solid border-gb-border">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold tracking-tight">Affecter une tâche</DialogTitle>
          <p className="text-sm text-gb-muted">Affecter {resource?.name} à une tâche du projet.</p>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6 py-4">
          <div className="space-y-2">
            <Label className="text-sm font-bold text-gb-muted uppercase tracking-wider">Sélectionner le Projet</Label>
            <Select 
              value={selectedProjectId} 
              onValueChange={setSelectedProjectId}
            >
              <SelectTrigger className="bg-gb-app border-gb-border h-11">
                <SelectValue placeholder={loadingProjects ? "Chargement des projets..." : "Choisir un projet..."} />
              </SelectTrigger>
              <SelectContent className="bg-gb-surface-solid border-gb-border">
                {projects.map((p) => (
                  <SelectItem key={p.id} value={p.id.toString()}>{p.title} ({p.code})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-bold text-gb-muted uppercase tracking-wider">Sélectionner la Tâche</Label>
            <Select 
              value={selectedTaskId} 
              onValueChange={setSelectedTaskId}
              disabled={!selectedProjectId}
            >
              <SelectTrigger className="bg-gb-app border-gb-border h-11">
                <SelectValue placeholder={loadingTasks ? "Chargement des tâches..." : "Choisir une tâche..."} />
              </SelectTrigger>
              <SelectContent className="bg-gb-surface-solid border-gb-border max-h-[300px]">
                {tasks.map((task) => (
                  <SelectItem key={task.id} value={task.id.toString()}>{task.title}</SelectItem>
                ))}
                {tasks.length === 0 && !loadingTasks && selectedProjectId && (
                  <div className="py-2 px-4 text-xs text-gb-muted italic">Aucune tâche disponible</div>
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="plannedHours" className="text-sm font-bold text-gb-muted uppercase tracking-wider">Heures Prévues</Label>
            <Input 
              id="plannedHours"
              type="number"
              value={plannedHours}
              onChange={(e) => setPlannedHours(e.target.value)}
              className="bg-gb-app border-gb-border h-11"
              required
            />
          </div>

          <DialogFooter className="pt-4 gap-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Annuler</Button>
            <Button type="submit" disabled={submitting || !selectedTaskId} className="px-8 shadow-lg shadow-gb-primary/20">
              {submitting ? "Affectation..." : "Confirmer l'affectation"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
