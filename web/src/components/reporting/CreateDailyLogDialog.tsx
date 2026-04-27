import React, { useState } from "react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter 
} from "../ui/dialog";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import { 
  Loader2, 
  Calendar as CalendarIcon, 
  CloudSun, 
  Thermometer, 
  Info, 
  Plus, 
  Trash2,
  HardHat,
  Truck,
  Package
} from "lucide-react";
import { format } from "date-fns";

interface CreateDailyLogDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: number;
  onSuccess: () => void;
}

export default function CreateDailyLogDialog({ open, onOpenChange, projectId, onSuccess }: CreateDailyLogDialogProps) {
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [weather, setWeather] = useState("Soleil");
  const [temperature, setTemperature] = useState("20");
  const [notes, setNotes] = useState("");
  const [laborEntries, setLaborEntries] = useState<{worker_name: string, hours: number, trade: string}[]>([]);
  const [equipmentEntries, setEquipmentEntries] = useState<{equipment_id: string, hours_used: number}[]>([]);
  const [materialEntries, setMaterialEntries] = useState<{material_id: string, quantity: number, unit: string}[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const addLabor = () => setLaborEntries([...laborEntries, { worker_name: "", hours: 8, trade: "" }]);
  const removeLabor = (index: number) => setLaborEntries(laborEntries.filter((_, i) => i !== index));

  const addEquipment = () => setEquipmentEntries([...equipmentEntries, { equipment_id: "", hours_used: 0 }]);
  const removeEquipment = (index: number) => setEquipmentEntries(equipmentEntries.filter((_, i) => i !== index));

  const addMaterial = () => setMaterialEntries([...materialEntries, { material_id: "", quantity: 0, unit: "" }]);
  const removeMaterial = (index: number) => setMaterialEntries(materialEntries.filter((_, i) => i !== index));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("/api/daily-logs", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          project_id: projectId,
          date: new Date(date).toISOString(),
          weather,
          temperature: parseFloat(temperature),
          notes,
          labor_entries: laborEntries.map(e => ({ ...e, hours: parseFloat(e.hours.toString()) })),
          equipment_entries: equipmentEntries.map(e => ({ ...e, hours_used: parseFloat(e.hours_used.toString()) })),
          material_entries: materialEntries.map(e => ({ ...e, quantity: parseFloat(e.quantity.toString()) }))
        })
      });
      if (res.ok) {
        onSuccess();
        onOpenChange(false);
      } else {
        const err = await res.json();
        alert(err.error || "Erreur de création");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl bg-gb-surface-solid border-gb-border p-0 overflow-hidden flex flex-col max-h-[90vh]">
        <DialogHeader className="p-6 border-b border-gb-border bg-gb-app/30 shrink-0">
          <DialogTitle className="text-2xl font-black tracking-tight">Nouveau Rapport Journalier</DialogTitle>
          <p className="text-xs text-gb-muted font-bold uppercase tracking-widest mt-1">Saisie complète de l'activité chantier</p>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-8">
          {/* Header Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-1.5">
              <Label className="text-[10px] font-black text-gb-muted uppercase flex items-center gap-1.5 focus:text-gb-primary">
                <CalendarIcon size={12} /> Date
              </Label>
              <Input 
                type="date" 
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="h-10 bg-gb-app/50 border-gb-border rounded-xl font-bold"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px] font-black text-gb-muted uppercase flex items-center gap-1.5">
                <Thermometer size={12} /> Temp (°C)
              </Label>
              <Input 
                type="number" 
                value={temperature}
                onChange={(e) => setTemperature(e.target.value)}
                className="h-10 bg-gb-app/50 border-gb-border rounded-xl font-bold"
              />
            </div>
            <div className="space-y-1.5 lg:col-span-2">
              <Label className="text-[10px] font-black text-gb-muted uppercase flex items-center gap-1.5">
                <CloudSun size={12} /> Météo
              </Label>
              <Input 
                value={weather}
                onChange={(e) => setWeather(e.target.value)}
                placeholder="Ex: Ensoleillé"
                className="h-10 bg-gb-app/50 border-gb-border rounded-xl"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-[10px] font-black text-gb-muted uppercase flex items-center gap-1.5">
              <Info size={12} /> Résumé de la journée
            </Label>
            <Textarea 
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Travaux réalisés, incidents, livraisons..."
              className="min-h-[80px] bg-gb-app/50 border-gb-border rounded-xl resize-none"
            />
          </div>

          <div className="grid grid-cols-1 gap-8">
            {/* Labor Entries */}
            <div className="space-y-4">
              <div className="flex justify-between items-center bg-blue-500/5 p-3 rounded-xl border border-blue-500/10">
                <h4 className="text-[10px] font-black uppercase text-blue-600 flex items-center gap-2 tracking-widest">
                  <HardHat size={14} /> Main d'œuvre
                </h4>
                <Button type="button" size="sm" variant="ghost" onClick={addLabor} className="h-7 text-[10px] font-bold bg-white dark:bg-gb-surface-solid shadow-sm">
                  <Plus size={14} className="mr-1" /> Ajouter
                </Button>
              </div>
              <div className="space-y-2">
                {laborEntries.map((entry, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-2 bg-gb-app/30 p-2 rounded-xl border border-gb-border items-center">
                    <div className="col-span-5">
                      <Input 
                        placeholder="Nom / Équipe" 
                        value={entry.worker_name}
                        onChange={(e) => {
                          const newEntries = [...laborEntries];
                          newEntries[idx].worker_name = e.target.value;
                          setLaborEntries(newEntries);
                        }}
                        className="h-9 bg-gb-surface-solid border-gb-border text-xs"
                      />
                    </div>
                    <div className="col-span-4">
                      <Input 
                        placeholder="Corps d'état" 
                        value={entry.trade}
                        onChange={(e) => {
                          const newEntries = [...laborEntries];
                          newEntries[idx].trade = e.target.value;
                          setLaborEntries(newEntries);
                        }}
                        className="h-9 bg-gb-surface-solid border-gb-border text-xs"
                      />
                    </div>
                    <div className="col-span-2">
                      <Input 
                        type="number"
                        placeholder="H" 
                        value={entry.hours}
                        onChange={(e) => {
                          const newEntries = [...laborEntries];
                          newEntries[idx].hours = parseFloat(e.target.value);
                          setLaborEntries(newEntries);
                        }}
                        className="h-9 bg-gb-surface-solid border-gb-border text-xs text-center font-bold"
                      />
                    </div>
                    <div className="col-span-1 flex justify-center">
                      <button type="button" onClick={() => removeLabor(idx)} className="text-gb-danger hover:scale-110 transition-transform">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
               {/* Equipment */}
              <div className="space-y-4">
                <div className="flex justify-between items-center bg-amber-500/5 p-3 rounded-xl border border-amber-500/10">
                  <h4 className="text-[10px] font-black uppercase text-amber-600 flex items-center gap-2 tracking-widest">
                    <Truck size={14} /> Équipement
                  </h4>
                  <Button type="button" size="sm" variant="ghost" onClick={addEquipment} className="h-7 text-[10px] font-bold bg-white dark:bg-gb-surface-solid shadow-sm">
                    <Plus size={14} className="mr-1" /> Ajouter
                  </Button>
                </div>
                <div className="space-y-2">
                  {equipmentEntries.map((entry, idx) => (
                    <div key={idx} className="flex gap-2 bg-gb-app/30 p-2 rounded-xl border border-gb-border items-center">
                      <Input 
                        placeholder="ID Engin" 
                        value={entry.equipment_id}
                        onChange={(e) => {
                          const newEntries = [...equipmentEntries];
                          newEntries[idx].equipment_id = e.target.value;
                          setEquipmentEntries(newEntries);
                        }}
                        className="h-9 bg-gb-surface-solid border-gb-border text-xs flex-1"
                      />
                      <Input 
                        type="number"
                        placeholder="Heures" 
                        value={entry.hours_used}
                        onChange={(e) => {
                          const newEntries = [...equipmentEntries];
                          newEntries[idx].hours_used = parseFloat(e.target.value);
                          setEquipmentEntries(newEntries);
                        }}
                        className="h-9 bg-gb-surface-solid border-gb-border text-xs w-20 text-center font-bold"
                      />
                      <button type="button" onClick={() => removeEquipment(idx)} className="text-gb-danger px-1">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

               {/* Materials */}
              <div className="space-y-4">
                <div className="flex justify-between items-center bg-emerald-500/5 p-3 rounded-xl border border-emerald-500/10">
                  <h4 className="text-[10px] font-black uppercase text-emerald-600 flex items-center gap-2 tracking-widest">
                    <Package size={14} /> Matériaux
                  </h4>
                  <Button type="button" size="sm" variant="ghost" onClick={addMaterial} className="h-7 text-[10px] font-bold bg-white dark:bg-gb-surface-solid shadow-sm">
                    <Plus size={14} className="mr-1" /> Ajouter
                  </Button>
                </div>
                <div className="space-y-2">
                  {materialEntries.map((entry, idx) => (
                    <div key={idx} className="flex gap-2 bg-gb-app/30 p-2 rounded-xl border border-gb-border items-center">
                      <Input 
                        placeholder="Matériau" 
                        value={entry.material_id}
                        onChange={(e) => {
                          const newEntries = [...materialEntries];
                          newEntries[idx].material_id = e.target.value;
                          setMaterialEntries(newEntries);
                        }}
                        className="h-9 bg-gb-surface-solid border-gb-border text-xs flex-1"
                      />
                      <Input 
                        type="number"
                        placeholder="Qté" 
                        value={entry.quantity}
                        onChange={(e) => {
                          const newEntries = [...materialEntries];
                          newEntries[idx].quantity = parseFloat(e.target.value);
                          setMaterialEntries(newEntries);
                        }}
                        className="h-9 bg-gb-surface-solid border-gb-border text-xs w-16 text-center font-bold"
                      />
                       <Input 
                        placeholder="Unité" 
                        value={entry.unit}
                        onChange={(e) => {
                          const newEntries = [...materialEntries];
                          newEntries[idx].unit = e.target.value;
                          setMaterialEntries(newEntries);
                        }}
                        className="h-9 bg-gb-surface-solid border-gb-border text-[10px] w-14"
                      />
                      <button type="button" onClick={() => removeMaterial(idx)} className="text-gb-danger px-1">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </form>

        <DialogFooter className="p-6 border-t border-gb-border bg-gb-app/30 gap-3 shrink-0">
           <Button type="button" variant="ghost" className="rounded-xl h-11 px-8 font-bold" onClick={() => onOpenChange(false)}>
             Fermer
           </Button>
           <Button type="submit" disabled={submitting} onClick={handleSubmit} className="rounded-xl h-11 px-10 bg-gb-primary hover:bg-gb-primary-dark shadow-xl shadow-gb-primary/20 font-black">
             {submitting ? <Loader2 className="animate-spin mr-2" /> : "Enregistrer le Journal"}
           </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

