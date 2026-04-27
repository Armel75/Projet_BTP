import React from "react";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "../ui/table";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { User, Truck, HardHat, MoreHorizontal, Settings2 } from "lucide-react";

interface Resource {
  id: number;
  name: string;
  cost_rate: number;
  type: {
    code: string;
  };
}

interface ResourceListProps {
  resources: Resource[];
  onSelect: (resource: Resource) => void;
  onEdit: (resource: Resource) => void;
}

export function ResourceList({ resources, onSelect, onEdit }: ResourceListProps) {
  const getIcon = (code: string) => {
    switch (code) {
      case "LABOR": return <HardHat className="text-amber-500" size={18} />;
      case "EQUIPMENT": return <Truck className="text-blue-500" size={18} />;
      default: return <User className="text-gb-muted" size={18} />;
    }
  };

  return (
    <div className="bg-gb-surface-solid border border-gb-border rounded-xl overflow-hidden overflow-x-auto no-scrollbar">
      <Table className="min-w-[600px] md:min-w-full">
        <TableHeader>
          <TableRow className="bg-gb-surface-hover/50">
            <TableHead className="w-[50px]"></TableHead>
            <TableHead>Désignation</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Taux Horaire</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {resources.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="text-center py-12 text-gb-muted italic">
                Aucune ressource trouvée.
              </TableCell>
            </TableRow>
          ) : (
            resources.map((r) => (
              <TableRow 
                key={r.id} 
                className="group cursor-pointer hover:bg-gb-surface-hover/30 transition-colors"
                onClick={() => onSelect(r)}
              >
                <TableCell onClick={(e) => e.stopPropagation()}>
                  {getIcon(r.type.code)}
                </TableCell>
                <TableCell>
                  <div className="font-bold text-gb-text">{r.name}</div>
                  <div className="text-[10px] text-gb-muted font-mono uppercase">ID: RES-{r.id}</div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className={`${
                    r.type.code === 'LABOR' ? 'border-amber-500/30 text-amber-600 bg-amber-500/5' :
                    r.type.code === 'EQUIPMENT' ? 'border-blue-500/30 text-blue-600 bg-blue-500/5' :
                    'border-gb-border text-gb-muted'
                  }`}>
                    {r.type.code}
                  </Badge>
                </TableCell>
                <TableCell className="font-mono text-sm font-semibold">
                  {r.cost_rate} €/h
                </TableCell>
                <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                  <div className="flex justify-end gap-2">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => onEdit(r)}
                    >
                      <Settings2 size={14} />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreHorizontal size={14} />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
