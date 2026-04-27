import React from "react";
import { X, Calendar, Clock, Briefcase, User, Info, MoreHorizontal } from "lucide-react";
import { Badge } from "../ui/badge";
import { motion, AnimatePresence } from "motion/react";

interface ResourceDetailDrawerProps {
  open: boolean;
  onClose: () => void;
  resource: any;
  onUnassign: (taskId: number) => Promise<void>;
}

export function ResourceDetailDrawer({ open, onClose, resource, onUnassign }: ResourceDetailDrawerProps) {
  if (!resource) return null;

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100]"
          />
          <motion.div 
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed top-0 right-0 h-full w-full max-w-md bg-gb-surface-solid border-l border-gb-border z-[101] shadow-2xl flex flex-col"
          >
            <div className="p-6 border-b border-gb-border flex items-center justify-between">
              <div>
                <h3 className="text-xl font-extrabold tracking-tight text-gb-text">{resource.name}</h3>
                <p className="text-xs text-gb-muted font-mono uppercase mt-0.5 tracking-wider">RES-{resource.id}</p>
              </div>
              <button 
                onClick={onClose}
                className="p-2 hover:bg-gb-surface-hover rounded-full transition-colors"
              >
                <X size={20} className="text-gb-muted" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-8">
              {/* Stats / Info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-gb-app border border-gb-border rounded-xl">
                  <p className="text-[10px] font-bold text-gb-muted uppercase tracking-widest mb-1">Type</p>
                  <p className="font-bold text-gb-primary">{resource.type.code}</p>
                </div>
                <div className="p-4 bg-gb-app border border-gb-border rounded-xl">
                  <p className="text-[10px] font-bold text-gb-muted uppercase tracking-widest mb-1">Coût Horaire</p>
                  <p className="font-bold text-gb-text">{resource.cost_rate} €/h</p>
                </div>
              </div>

              {/* Assignments Section */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold uppercase tracking-wider flex items-center gap-2">
                    <Briefcase size={16} className="text-gb-primary" />
                    Affectations Actuelles
                  </h4>
                  <Badge variant="secondary" className="px-2">{resource.assignments?.length || 0}</Badge>
                </div>

                <div className="space-y-3">
                  {resource.assignments?.length > 0 ? (
                    resource.assignments.map((assignment: any) => (
                      <div 
                        key={assignment.id} 
                        className="group p-4 bg-gb-surface-solid border border-gb-border rounded-xl hover:border-gb-primary/50 transition-all shadow-sm"
                      >
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <h5 className="font-bold text-sm text-gb-text group-hover:text-gb-primary transition-colors">
                              {assignment.task.title}
                            </h5>
                            <p className="text-[10px] text-gb-muted mt-0.5">PROJET: {assignment.task.project.code}</p>
                          </div>
                          <button 
                            onClick={() => onUnassign(assignment.task_id)}
                            className="text-[10px] font-bold text-gb-danger hover:underline opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            Retirer
                          </button>
                        </div>

                        <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-gb-border/50">
                          <div className="flex items-center gap-2">
                            <Clock size={14} className="text-gb-muted" />
                            <div className="text-[10px]">
                              <p className="text-gb-muted font-bold uppercase">Heures Prévues</p>
                              <p className="font-bold">{assignment.planned_hours}h</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Calendar size={14} className="text-gb-muted" />
                            <div className="text-[10px]">
                              <p className="text-gb-muted font-bold uppercase">Début Prévu</p>
                              <p className="font-bold">
                                {assignment.start_date ? new Date(assignment.start_date).toLocaleDateString() : 'N/A'}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-10 bg-gb-app/50 border border-gb-border border-dashed rounded-xl">
                      <Info className="mx-auto text-gb-muted mb-2 opacity-30" />
                      <p className="text-sm text-gb-muted italic">Aucune affectation en cours.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-gb-border bg-gb-app/30">
              <button 
                onClick={onClose}
                className="w-full py-3 rounded-xl bg-gb-surface-solid border border-gb-border font-bold text-sm hover:bg-gb-surface-hover transition-colors"
              >
                Fermer
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
