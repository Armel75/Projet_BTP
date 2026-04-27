import React, { useState, useEffect } from "react";
import { Badge } from "../ui/badge";
import { Clock, User, Link as LinkIcon, AlertCircle, Plus, HardHat, Truck, Trash2 } from "lucide-react";
import { Button } from "../ui/button";
import { ResourceAssignmentDialog } from "./ResourceAssignmentDialog";

interface TaskDetailProps {
  task: any;
  onClose: () => void;
}

export function TaskDetail({ task, onClose }: TaskDetailProps) {
  const [assignments, setAssignments] = useState<any[]>([]);
  const [loadingAssignments, setLoadingAssignments] = useState(false);
  const [isAssignOpen, setIsAssignOpen] = useState(false);

  const fetchAssignments = async () => {
    setLoadingAssignments(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`/api/resources/tasks/${task.id}/assignments`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setAssignments(await res.json());
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingAssignments(false);
    }
  };

  useEffect(() => {
    fetchAssignments();
  }, [task.id]);

  const handleAssign = async (resourceId: number, data: any) => {
    const token = localStorage.getItem("token");
    const res = await fetch(`/api/resources/tasks/${task.id}/assign`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(data)
    });

    if (res.ok) {
      await fetchAssignments();
    }
  };

  const handleUnassign = async (resourceId: number) => {
    const token = localStorage.getItem("token");
    const res = await fetch(`/api/resources/tasks/${task.id}/assign/${resourceId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` }
    });

    if (res.ok) {
      await fetchAssignments();
    }
  };

  const getIcon = (code: string) => {
    switch (code) {
      case "LABOR": return <HardHat size={14} className="text-amber-500" />;
      case "EQUIPMENT": return <Truck size={14} className="text-blue-500" />;
      default: return <User size={14} className="text-gb-muted" />;
    }
  };

  return (
    <div className="bg-gb-surface-solid border border-gb-border rounded-xl p-6 shadow-xl space-y-6 max-h-[calc(100vh-100px)] overflow-y-auto">
      <div className="flex justify-between items-start border-b border-gb-border pb-4">
        <div>
          <h3 className="text-xl font-bold text-gb-text tracking-tight">{task.title}</h3>
          <p className="text-gb-muted text-xs mt-1 font-mono uppercase tracking-widest">ID: TASK-{task.id}</p>
        </div>
        <button 
          onClick={onClose}
          className="text-gb-muted hover:text-gb-text text-xl font-bold"
        >
          ×
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6">
        <div className="space-y-6">
          <div className="flex items-center space-x-3">
            <Badge className="px-3" variant={task.status === "DONE" ? "default" : "secondary"}>
              {task.status}
            </Badge>
            <span className="text-sm font-semibold text-gb-text/80">{task.progress}% achevé</span>
          </div>

          <div className="grid grid-cols-2 gap-4">
             <div className="flex items-center space-x-2 text-gb-muted bg-gb-app/50 p-3 rounded-lg border border-gb-border/50">
                <Clock size={16} />
                <div className="text-[10px]">
                  <p className="uppercase font-bold tracking-wider">Début</p>
                  <p className="text-gb-text font-medium">{task.planned_start ? new Date(task.planned_start).toLocaleDateString() : 'N/A'}</p>
                </div>
              </div>
              <div className="flex items-center space-x-2 text-gb-muted bg-gb-app/50 p-3 rounded-lg border border-gb-border/50">
                <Clock size={16} />
                <div className="text-[10px]">
                  <p className="uppercase font-bold tracking-wider">Fin</p>
                  <p className="text-gb-text font-medium">{task.planned_end ? new Date(task.planned_end).toLocaleDateString() : 'N/A'}</p>
                </div>
              </div>
          </div>

          {/* Resources Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-gb-muted">Ressources Affectées</h4>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-7 text-[10px] uppercase font-bold text-gb-primary hover:bg-gb-primary/5"
                onClick={() => setIsAssignOpen(true)}
              >
                <Plus size={12} className="mr-1" />
                Affecter
              </Button>
            </div>
            
            <div className="space-y-2">
              {assignments.map((as) => (
                <div key={as.id} className="flex items-center justify-between p-3 bg-gb-app/50 border border-gb-border rounded-lg group">
                  <div className="flex items-center gap-3">
                    <div className="p-1.5 bg-gb-surface-solid rounded-md border border-gb-border">
                      {getIcon(as.resource.type.code)}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gb-text">{as.resource.name}</p>
                      <p className="text-[10px] text-gb-muted">{as.planned_hours}h prévues</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => handleUnassign(as.resource.id)}
                    className="p-1.5 text-gb-danger hover:bg-gb-danger/10 rounded-md opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
              {assignments.length === 0 && (
                <p className="text-xs text-gb-muted italic py-4 text-center border border-dashed border-gb-border rounded-lg">Aucune ressource assignée</p>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-4 pt-4 border-t border-gb-border">
          <h4 className="text-xs font-bold uppercase tracking-wider text-gb-muted flex items-center gap-2">
            <LinkIcon size={14} className="text-gb-primary" />
            Dépendances
          </h4>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <p className="text-[10px] font-bold text-gb-muted uppercase tracking-wider mb-1">Prédécesseurs</p>
              {task.dependencies && task.dependencies.length > 0 ? (
                task.dependencies.map((dep: any) => (
                  <div key={dep.id} className="p-2 bg-gb-app/50 border border-gb-border rounded text-[10px] flex items-center gap-2">
                    <AlertCircle size={12} className="text-amber-500 shrink-0" />
                    <span className="truncate">{dep.dependsOn?.title}</span>
                  </div>
                ))
              ) : (
                <p className="text-[10px] text-gb-muted italic">Aucun</p>
              )}
            </div>

            <div className="space-y-2">
              <p className="text-[10px] font-bold text-gb-muted uppercase tracking-wider mb-1">Successeurs</p>
              {task.dependents && task.dependents.length > 0 ? (
                task.dependents.map((dep: any) => (
                  <div key={dep.id} className="p-2 bg-gb-app/50 border border-gb-border rounded text-[10px] flex items-center gap-2">
                    <LinkIcon size={12} className="text-gb-primary/50 shrink-0" />
                    <span className="truncate">{dep.task?.title}</span>
                  </div>
                ))
              ) : (
                <p className="text-[10px] text-gb-muted italic">Aucun</p>
              )}
            </div>
          </div>
        </div>
      </div>

      <ResourceAssignmentDialog 
        open={isAssignOpen}
        onOpenChange={setIsAssignOpen}
        task={task}
        onAssign={handleAssign}
      />
    </div>
  );
}

