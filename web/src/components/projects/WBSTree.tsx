import React, { useState } from "react";
import { ChevronRight, ChevronDown, ListChecks, Calendar, Info } from "lucide-react";
import { Badge } from "../ui/badge";

interface WBSNode {
  id: number;
  code: string;
  name: string;
  level: number;
  children?: WBSNode[];
  tasks?: any[];
}

interface WBSTreeProps {
  nodes: WBSNode[];
  onTaskSelect: (task: any) => void;
}

export function WBSTree({ nodes, onTaskSelect }: WBSTreeProps) {
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});

  const toggle = (id: number) => {
    setExpanded(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const renderNode = (node: WBSNode) => {
    const isExpanded = expanded[node.id];
    const hasChildren = (node.children && node.children.length > 0) || (node.tasks && node.tasks.length > 0);

    return (
      <div key={node.id} className="ml-2 sm:ml-4 border-l border-gb-border pl-2 sm:pl-4 my-2">
        <div 
          className="flex items-center space-x-2 py-1.5 sm:py-1 px-2 hover:bg-gb-surface-hover/50 rounded cursor-pointer group"
          onClick={() => toggle(node.id)}
        >
          {hasChildren ? (
            isExpanded ? <ChevronDown size={14} className="text-gb-muted" /> : <ChevronRight size={14} className="text-gb-muted" />
          ) : (
            <div className="w-[14px]" />
          )}
          <span className="font-mono text-xs text-gb-primary bg-gb-primary/10 px-1 rounded">{node.code}</span>
          <span className="font-medium text-gb-text text-sm">{node.name}</span>
        </div>

        {isExpanded && (
          <div className="space-y-1 mt-1">
            {node.children?.map(child => renderNode(child))}
            {node.tasks?.map(task => (
              <div 
                key={task.id} 
                className="ml-4 sm:ml-8 py-2 px-3 bg-gb-surface-solid border border-gb-border rounded-md hover:border-gb-primary transition-all cursor-pointer group"
                onClick={(e) => { e.stopPropagation(); onTaskSelect(task); }}
              >
                <div className="flex justify-between items-start">
                  <div className="flex items-center space-x-2">
                    <ListChecks size={14} className="text-emerald-500" />
                    <span className="text-sm font-medium">{task.title}</span>
                  </div>
                  <Badge variant={task.status === "DONE" ? "default" : "secondary"}>
                    {task.status}
                  </Badge>
                </div>
                <div className="mt-2 flex items-center space-x-4">
                  <div className="w-full bg-gb-surface-hover h-1.5 rounded-full overflow-hidden">
                    <div 
                      className="bg-emerald-500 h-full transition-all duration-500" 
                      style={{ width: `${task.progress}%` }} 
                    />
                  </div>
                  <span className="text-[10px] text-gb-muted font-bold">{task.progress}%</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="bg-gb-app/50 rounded-xl p-4 border border-gb-border">
      {nodes.length > 0 ? (
        nodes.map(node => renderNode(node))
      ) : (
        <div className="text-center py-10">
          <Info className="mx-auto text-gb-muted mb-2" />
          <p className="text-gb-muted text-sm italic">Aucun noeud WBS défini pour ce projet.</p>
        </div>
      )}
    </div>
  );
}
