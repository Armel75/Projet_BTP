import React, { useState, useEffect, useRef } from "react";
import { apiFetch } from "../../lib/api";
const API_BASE = import.meta.env.VITE_API_URL;
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
  Package,
  CheckCircle,
  Image as ImageIcon,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  ClipboardList
} from "lucide-react";
import { format } from "date-fns";

//  Types 

interface ActivityLabor     { worker_name: string; trade: string; hours: string; }
interface ActivityEquipment { equipment_name: string; hours_used: string; }
interface ActivityMaterial  { material_name: string; quantity: string; unit: string; }

interface UploadedPhoto {
  id: number;
  url: string;
  preview_url: string;
  filename?: string;
  size?: number;
  persisted?: boolean;
}

interface Activity {
  task_type:          "planned" | "unplanned";
  task_id:            number;        // 0 = non sélectionné (cas planned)
  task_title_custom:  string;        // titre libre si unplanned
  progress_percentage: string;       // 0-100
  comment:            string;
  photos:             UploadedPhoto[];
  labor:              ActivityLabor[];
  equipment:          ActivityEquipment[];
  materials:          ActivityMaterial[];
  collapsed:          boolean;       // état UI uniquement
}

interface CreateDailyLogDialogProps {
  open:         boolean;
  onOpenChange: (open: boolean) => void;
  projectId:    number;
  onSuccess:    () => void;
  initialData?: any | null;
}

//  Helpers 

const WEATHER_OPTIONS = ["Soleil", "Nuageux", "Pluie fine", "Pluie forte", "Orage", "Vent fort", "Brouillard", "Neige"];

function resolveFileUrl(url: string) {
  if (url.startsWith("/api/v1/")) {
    return `${API_BASE}/${url.slice("/api/v1/".length)}`;
  }

  return url;
}

function revokePreviewUrl(url?: string) {
  if (url && url.startsWith("blob:")) {
    URL.revokeObjectURL(url);
  }
}

function emptyActivity(): Activity {
  return {
    task_type: "planned", task_id: 0, task_title_custom: "",
    progress_percentage: "", comment: "", photos: [],
    labor: [], equipment: [], materials: [], collapsed: false,
  };
}

function buildPhotoKey(photo: Pick<UploadedPhoto, "id" | "url" | "filename" | "size">) {
  if (photo.id > 0) {
    return `id:${photo.id}`;
  }

  const normalizedUrl = photo.url || "";
  const normalizedName = photo.filename || "";
  const normalizedSize = photo.size != null ? String(photo.size) : "";
  return `file:${normalizedUrl}|${normalizedName}|${normalizedSize}`;
}

function dedupePhotos(photos: UploadedPhoto[]) {
  const seen = new Set<string>();
  return photos.filter((photo) => {
    const key = buildPhotoKey(photo);
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

//  Component 

export default function CreateDailyLogDialog({ open, onOpenChange, projectId, onSuccess, initialData = null }: CreateDailyLogDialogProps) {
  const [date,        setDate]        = useState(format(new Date(), "yyyy-MM-dd"));
  const [weather,     setWeather]     = useState("Soleil");
  const [temperature, setTemperature] = useState("20");
  const [notes,       setNotes]       = useState("");
  const [activities,  setActivities]  = useState<Activity[]>([]);
  const [tasks,       setTasks]       = useState<{ id: number; title: string }[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [submitting,  setSubmitting]  = useState(false);
  const [uploadingPhotos, setUploadingPhotos] = useState(0);
  const [resolvedPhotoUrls, setResolvedPhotoUrls] = useState<Record<string, string>>({});
  const skipCleanupRef = useRef(false);
  const isEditMode = Boolean(initialData?.id);

  const getDisplayPhotoUrl = (photo: UploadedPhoto) => {
    if (photo.preview_url.startsWith("blob:") || photo.preview_url.startsWith("data:")) {
      return photo.preview_url;
    }

    if (photo.persisted) {
      return resolvedPhotoUrls[photo.preview_url] ?? resolvedPhotoUrls[photo.url] ?? null;
    }

    return photo.preview_url || photo.url || null;
  };

  // Fetch tasks on open
  useEffect(() => {
    if (!open || !projectId) return;
    const fetchTasks = async () => {
      setLoadingTasks(true);
      try {
        const res = await apiFetch(`${API_BASE}/projects/${projectId}/tasks`);
        if (res.ok) {
          const data = await res.json();
          const list = Array.isArray(data) ? data : (data.data ?? []);
          setTasks(list.map((t: any) => ({ id: t.id, title: t.title })));
        }
      } catch (err) { console.error(err); }
      finally { setLoadingTasks(false); }
    };
    fetchTasks();
  }, [open, projectId]);

  useEffect(() => {
    if (!open) return;

    if (!initialData) {
      setDate(format(new Date(), "yyyy-MM-dd"));
      setWeather("Soleil");
      setTemperature("20");
      setNotes("");
      setActivities([]);
      return;
    }

    const availablePhotosByUrl = new Map<string, any>(
      Array.isArray(initialData.photos)
        ? initialData.photos.map((photo: any) => [photo.file_url, photo])
        : []
    );

    const initialActivities: Activity[] = Array.isArray(initialData.task_progress)
      ? initialData.task_progress.map((entry: any) => {
          const laborData = (() => { try { return entry.labor_data ? JSON.parse(entry.labor_data) : []; } catch { return []; } })();
          const equipmentData = (() => { try { return entry.equipment_data ? JSON.parse(entry.equipment_data) : []; } catch { return []; } })();
          const materialData = (() => { try { return entry.material_data ? JSON.parse(entry.material_data) : []; } catch { return []; } })();
          const photoUrls = (() => { try { return entry.photos_url ? JSON.parse(entry.photos_url) : []; } catch { return typeof entry.photos_url === "string" ? [entry.photos_url] : []; } })();

          return {
            task_type: entry.task_type === "unplanned" ? "unplanned" : "planned",
            task_id: entry.task_id ?? 0,
            task_title_custom: entry.task_title_custom ?? "",
            progress_percentage: entry.progress_percentage != null ? String(entry.progress_percentage) : "",
            comment: entry.comment ?? "",
            photos: Array.isArray(photoUrls)
              ? dedupePhotos(photoUrls.map((rawUrl: string) => {
                  const storedPhoto = availablePhotosByUrl.get(rawUrl);
                  return {
                    id: storedPhoto?.id ?? 0,
                    url: resolveFileUrl(rawUrl),
                    preview_url: resolveFileUrl(rawUrl),
                    filename: storedPhoto?.caption ?? undefined,
                    persisted: true,
                  };
                }).filter((photo: UploadedPhoto) => Boolean(photo.url)))
              : [],
            labor: Array.isArray(laborData)
              ? laborData.map((item: any) => ({ worker_name: item.worker_name ?? "", trade: item.trade ?? "", hours: String(item.hours ?? "") }))
              : [],
            equipment: Array.isArray(equipmentData)
              ? equipmentData.map((item: any) => ({ equipment_name: item.equipment_name ?? "", hours_used: String(item.hours_used ?? "") }))
              : [],
            materials: Array.isArray(materialData)
              ? materialData.map((item: any) => ({ material_name: item.material_name ?? "", quantity: String(item.quantity ?? ""), unit: item.unit ?? "" }))
              : [],
            collapsed: false,
          } satisfies Activity;
        })
      : [];

    setDate(initialData.date ? format(new Date(initialData.date), "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd"));
    setWeather(initialData.weather ?? "Soleil");
    setTemperature(initialData.temperature != null ? String(initialData.temperature) : "20");
    setNotes(initialData.notes ?? "");
    setActivities(initialActivities);
  }, [open, initialData]);

  useEffect(() => {
    const securedUrls = Array.from(new Set(
      activities.flatMap((activity) =>
        activity.photos
          .filter((photo) => photo.persisted)
          .flatMap((photo) => [photo.preview_url, photo.url])
          .filter((url): url is string => Boolean(url) && (url.startsWith("/api/") || url.startsWith(`${API_BASE}/`)))
      )
    ));

    if (!open || securedUrls.length === 0) {
      setResolvedPhotoUrls({});
      return;
    }

    let disposed = false;
    const objectUrls: string[] = [];

    const resolveProtectedPhotos = async () => {
      const entries = await Promise.all(
        securedUrls.map(async (url) => {
          try {
            const response = await apiFetch(url);
            if (!response.ok) {
              return null;
            }

            const blob = await response.blob();
            const objectUrl = URL.createObjectURL(blob);
            objectUrls.push(objectUrl);
            return [url, objectUrl] as const;
          } catch {
            return null;
          }
        })
      );

      if (disposed) {
        objectUrls.forEach((url) => URL.revokeObjectURL(url));
        return;
      }

      setResolvedPhotoUrls(Object.fromEntries(entries.filter(Boolean) as Array<readonly [string, string]>));
    };

    void resolveProtectedPhotos();

    return () => {
      disposed = true;
      objectUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [open, activities]);

  //  Activity helpers 

  const addActivity    = () => setActivities([...activities, emptyActivity()]);
  const removeActivity = (i: number) => setActivities(activities.filter((_, idx) => idx !== i));
  const toggleCollapse = (i: number) => {
    const a = [...activities]; a[i].collapsed = !a[i].collapsed; setActivities(a);
  };
  const updateActivity = (i: number, field: keyof Activity, value: any) => {
    const a = [...activities]; (a[i] as any)[field] = value; setActivities(a);
  };

  // Labor
  const addLabor    = (ai: number) => { const a = [...activities]; a[ai].labor = [...a[ai].labor, { worker_name: "", trade: "", hours: "8" }]; setActivities(a); };
  const removeLabor = (ai: number, li: number) => { const a = [...activities]; a[ai].labor = a[ai].labor.filter((_, i) => i !== li); setActivities(a); };
  const updateLabor = (ai: number, li: number, f: keyof ActivityLabor, v: string) => { const a = [...activities]; a[ai].labor[li][f] = v; setActivities(a); };

  // Equipment
  const addEquipment    = (ai: number) => { const a = [...activities]; a[ai].equipment = [...a[ai].equipment, { equipment_name: "", hours_used: "0" }]; setActivities(a); };
  const removeEquipment = (ai: number, ei: number) => { const a = [...activities]; a[ai].equipment = a[ai].equipment.filter((_, i) => i !== ei); setActivities(a); };
  const updateEquipment = (ai: number, ei: number, f: keyof ActivityEquipment, v: string) => { const a = [...activities]; a[ai].equipment[ei][f] = v; setActivities(a); };

  // Materials
  const addMaterial    = (ai: number) => { const a = [...activities]; a[ai].materials = [...a[ai].materials, { material_name: "", quantity: "0", unit: "" }]; setActivities(a); };
  const removeMaterial = (ai: number, mi: number) => { const a = [...activities]; a[ai].materials = a[ai].materials.filter((_, i) => i !== mi); setActivities(a); };
  const updateMaterial = (ai: number, mi: number, f: keyof ActivityMaterial, v: string) => { const a = [...activities]; a[ai].materials[mi][f] = v; setActivities(a); };

  // Photos
  const compressImageFile = async (file: File) => {
    if (!file.type.startsWith("image/") || file.type === "image/gif" || file.type === "image/svg+xml") {
      return file;
    }

    const imageUrl = URL.createObjectURL(file);

    try {
      const image = await new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error("Impossible de charger l'image."));
        img.src = imageUrl;
      });

      const maxDimension = 1600;
      const scale = Math.min(1, maxDimension / Math.max(image.width, image.height));
      const width = Math.max(1, Math.round(image.width * scale));
      const height = Math.max(1, Math.round(image.height * scale));

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;

      const context = canvas.getContext("2d");
      if (!context) {
        return file;
      }

      context.drawImage(image, 0, 0, width, height);

      const targetType = file.type === "image/png"
        ? "image/png"
        : file.type === "image/webp"
          ? "image/webp"
          : "image/jpeg";
      const quality = targetType === "image/png" ? undefined : 0.82;

      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob(resolve, targetType, quality);
      });

      if (!blob || blob.size >= file.size) {
        return file;
      }

      const baseName = file.name.replace(/\.[^.]+$/, "");
      const extension = targetType === "image/png" ? ".png" : targetType === "image/webp" ? ".webp" : ".jpg";

      return new File([blob], `${baseName}${extension}`, {
        type: targetType,
        lastModified: file.lastModified,
      });
    } finally {
      URL.revokeObjectURL(imageUrl);
    }
  };

  const revokeActivityPreviewUrls = (snapshot: Activity[]) => {
    snapshot.forEach((activity) => {
      activity.photos.forEach((photo) => revokePreviewUrl(photo.preview_url));
    });
  };

  const cleanupTemporaryPhotos = async (snapshot: Activity[]) => {
    const photoIds = snapshot.flatMap((activity) => activity.photos.filter((photo) => !photo.persisted).map((photo) => photo.id));
    if (photoIds.length === 0) return;

    await Promise.allSettled(
      photoIds.map((photoId) =>
        apiFetch(`${API_BASE}/photos/${photoId}`, {
          method: "DELETE",
        })
      )
    );
  };

  const addPhotos = async (ai: number, files?: FileList | null) => {
    if (!files?.length || !projectId) return;

    const selectedFiles = Array.from(files);
    setUploadingPhotos((current) => current + selectedFiles.length);
    let preparedFiles: Array<{ file: File; previewUrl: string }> = [];

    try {
      preparedFiles = await Promise.all(
        selectedFiles.map(async (file) => {
          const optimizedFile = await compressImageFile(file);
          return {
            file: optimizedFile,
            previewUrl: URL.createObjectURL(optimizedFile),
          };
        })
      );

      const formData = new FormData();
      formData.append("project_id", String(projectId));
      preparedFiles.forEach(({ file }) => {
        formData.append("files", file, file.name);
      });

      const res = await apiFetch(`${API_BASE}/photos/uploads`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const errorPayload = await res.json().catch(() => null);
        preparedFiles.forEach(({ previewUrl }) => revokePreviewUrl(previewUrl));
        alert(errorPayload?.error || "Erreur lors de l'upload des photos.");
        return;
      }

      const payload = await res.json();
      const uploadedFiles = Array.isArray(payload.files) ? payload.files : [];
      if (uploadedFiles.length !== preparedFiles.length) {
        throw new Error("Le nombre de photos televersees ne correspond pas a la selection.");
      }

      const uploadedPhotos: UploadedPhoto[] = uploadedFiles.map((uploadedFile: any, index: number) => ({
        id: uploadedFile.id,
        url: resolveFileUrl(uploadedFile.url),
        preview_url: preparedFiles[index]?.previewUrl || resolveFileUrl(uploadedFile.url),
        filename: uploadedFile.filename,
        size: uploadedFile.size,
        persisted: false,
      }));

      setActivities((currentActivities) => {
        const nextActivities = [...currentActivities];
        nextActivities[ai].photos = dedupePhotos([...nextActivities[ai].photos, ...uploadedPhotos]);
        return nextActivities;
      });
    } catch (err) {
      preparedFiles.forEach(({ previewUrl }) => revokePreviewUrl(previewUrl));
      console.error(err);
      alert("Impossible de televerser les photos selectionnees.");
    } finally {
      setUploadingPhotos((current) => Math.max(0, current - selectedFiles.length));
    }
  };

  const removePhoto = async (ai: number, pi: number) => {
    const photo = activities[ai]?.photos[pi];
    if (!photo) return;

    if (photo.persisted) {
      setActivities((currentActivities) => {
        const nextActivities = [...currentActivities];
        nextActivities[ai].photos = nextActivities[ai].photos.filter((_, index) => index !== pi);
        return nextActivities;
      });
      return;
    }

    try {
      const res = await apiFetch(`${API_BASE}/photos/${photo.id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const errorPayload = await res.json().catch(() => null);
        alert(errorPayload?.error || "Impossible de supprimer cette photo.");
        return;
      }

      revokePreviewUrl(photo.preview_url);
      setActivities((currentActivities) => {
        const nextActivities = [...currentActivities];
        nextActivities[ai].photos = nextActivities[ai].photos.filter((_, index) => index !== pi);
        return nextActivities;
      });
    } catch (err) {
      console.error(err);
      alert("Impossible de supprimer cette photo.");
    }
  };

  const handleOpenStateChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      if (uploadingPhotos > 0 || submitting) {
        return;
      }

      const snapshot = activities;
      if (!skipCleanupRef.current) {
        void cleanupTemporaryPhotos(snapshot);
      }

      skipCleanupRef.current = false;
      revokeActivityPreviewUrls(snapshot);
      setDate(format(new Date(), "yyyy-MM-dd"));
      setWeather("Soleil");
      setTemperature("20");
      setNotes("");
      setActivities([]);
      onOpenChange(false);
      return;
    }

    onOpenChange(true);
  };

  //  Submit 

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (uploadingPhotos > 0) {
      alert("Patientez jusqu'a la fin du televersement des photos avant d'enregistrer le journal.");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        date:        new Date(date).toISOString(),
        weather,
        temperature: temperature ? parseFloat(temperature) : null,
        notes,
        task_progress: activities.map(act => ({
          task_type:           act.task_type,
          task_id:             act.task_type === "planned" && act.task_id > 0 ? act.task_id : null,
          task_title_custom:   act.task_type === "unplanned" ? act.task_title_custom : null,
          progress_percentage: act.progress_percentage ? parseInt(act.progress_percentage) : null,
          comment:             act.comment || null,
          photo_ids:           Array.from(new Set(act.photos.filter(photo => photo.id > 0).map(photo => photo.id))),
          labor_data:          act.labor.length > 0 ? act.labor.map(l => ({ worker_name: l.worker_name, trade: l.trade, hours: parseFloat(l.hours) || 0 })) : null,
          equipment_data:      act.equipment.length > 0 ? act.equipment.map(eq => ({ equipment_name: eq.equipment_name, hours_used: parseFloat(eq.hours_used) || 0 })) : null,
          material_data:       act.materials.length > 0 ? act.materials.map(m => ({ material_name: m.material_name, quantity: parseFloat(m.quantity) || 0, unit: m.unit })) : null,
        }))
      };

      const res = await apiFetch(isEditMode ? `${API_BASE}/daily-logs/${initialData.id}` : `${API_BASE}/daily-logs`, {
        method: isEditMode ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(isEditMode ? payload : { ...payload, project_id: projectId })
      });
      if (res.ok) {
        skipCleanupRef.current = true;
        onSuccess();
        handleOpenStateChange(false);
      }
      else { const err = await res.json(); alert(err.error || (isEditMode ? "Erreur de modification" : "Erreur de création")); }
    } catch (err) { console.error(err); }
    finally { setSubmitting(false); }
  };

  //  Render 

  return (
    <Dialog open={open} onOpenChange={handleOpenStateChange}>
      <DialogContent className="sm:max-w-3xl bg-gb-surface-solid border-gb-border p-0 overflow-hidden flex flex-col max-h-[90vh]">
        <DialogHeader className="p-6 border-b border-gb-border bg-gb-app/30 shrink-0">
          <DialogTitle className="text-2xl font-black tracking-tight">{isEditMode ? "Modifier le Rapport Journalier" : "Nouveau Rapport Journalier"}</DialogTitle>
          <p className="text-xs text-gb-muted font-bold uppercase tracking-widest mt-1">{isEditMode ? "Mise a jour complete de l'activite chantier" : "Saisie complète de l'activité chantier"}</p>
        </DialogHeader>

        <form id="daily-log-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-8">

          {/*  En-tête journée  */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-1.5">
              <Label className="text-[10px] font-black text-gb-muted uppercase flex items-center gap-1.5"><CalendarIcon size={12} /> Date</Label>
              <Input type="date" value={date} onChange={e => setDate(e.target.value)} className="h-10 bg-gb-app/50 border-gb-border rounded-xl font-bold" required />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px] font-black text-gb-muted uppercase flex items-center gap-1.5"><Thermometer size={12} /> Temp (°C)</Label>
              <Input type="number" value={temperature} onChange={e => setTemperature(e.target.value)} className="h-10 bg-gb-app/50 border-gb-border rounded-xl font-bold" />
            </div>
            <div className="space-y-1.5 col-span-2">
              <Label className="text-[10px] font-black text-gb-muted uppercase flex items-center gap-1.5"><CloudSun size={12} /> Météo</Label>
              <select value={weather} onChange={e => setWeather(e.target.value)} className="w-full h-10 bg-gb-app/50 border border-gb-border rounded-xl px-3 text-sm font-bold">
                {WEATHER_OPTIONS.map(w => <option key={w}>{w}</option>)}
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-[10px] font-black text-gb-muted uppercase flex items-center gap-1.5"><Info size={12} /> Notes générales de la journée</Label>
            <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Résumé global, incidents, livraisons, visiteurs..." className="min-h-[68px] bg-gb-app/50 border-gb-border rounded-xl resize-none" />
          </div>

          {/*  Activités du jour  */}
          <div className="space-y-4">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-sm font-black text-gb-text uppercase tracking-widest flex items-center gap-2"><ClipboardList size={16} className="text-gb-primary" /> Activités du jour</h3>
                <p className="text-[10px] text-gb-muted mt-0.5">Chaque activité = une tâche + ses ouvriers, engins et matériaux associés</p>
              </div>
              <Button type="button" onClick={addActivity} className="h-9 bg-gb-primary text-white font-bold text-xs shadow-md shrink-0">
                <Plus size={14} className="mr-1.5" /> Ajouter une activité
              </Button>
            </div>

            {activities.length === 0 && (
              <div className="border-2 border-dashed border-gb-border rounded-2xl p-10 text-center">
                <CheckCircle size={28} className="text-gb-muted/40 mx-auto mb-3" />
                <p className="text-sm font-bold text-gb-muted">Aucune activité renseignée</p>
                <p className="text-[11px] text-gb-muted/60 mt-1">Ajoutez les tâches réalisées ce jour — planifiées ou imprévues</p>
              </div>
            )}

            <div className="space-y-3">
              {activities.map((act, ai) => {
                const label = act.task_type === "planned"
                  ? (tasks.find(t => t.id === act.task_id)?.title || "— Sélectionner une tâche —")
                  : (act.task_title_custom || "— Activité imprévue —");
                const totalH = act.labor.reduce((s, l) => s + (parseFloat(l.hours) || 0), 0);

                return (
                  <div key={ai} className="border border-gb-border rounded-2xl overflow-hidden">

                    {/*  Card header  */}
                    <div className="flex items-center justify-between p-4 bg-gb-surface-solid cursor-pointer select-none" onClick={() => toggleCollapse(ai)}>
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-1.5 h-10 rounded-full shrink-0 ${act.task_type === "unplanned" ? "bg-amber-400" : "bg-gb-primary"}`} />
                        <div className="min-w-0">
                          <p className="text-sm font-black text-gb-text truncate leading-none mb-1">{label}</p>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className={`text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded ${act.task_type === "unplanned" ? "bg-amber-500/15 text-amber-600" : "bg-gb-primary/10 text-gb-primary"}`}>
                              {act.task_type === "unplanned" ? "⚡ Imprévue" : "✓ Planifiée"}
                            </span>
                            {act.progress_percentage && <span className="text-[10px] font-bold text-gb-muted">{act.progress_percentage}%</span>}
                            {act.labor.length > 0 && <span className="text-[10px] font-bold text-blue-500">{act.labor.length} ouvrier{act.labor.length > 1 ? "s" : ""} · {totalH}h</span>}
                            {act.equipment.length > 0 && <span className="text-[10px] font-bold text-amber-500">{act.equipment.length} engin{act.equipment.length > 1 ? "s" : ""}</span>}
                            {act.materials.length > 0 && <span className="text-[10px] font-bold text-emerald-500">{act.materials.length} mat.</span>}
                            {act.photos.length > 0 && <span className="text-[10px] font-bold text-purple-500">{act.photos.length} photo{act.photos.length > 1 ? "s" : ""}</span>}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button type="button" onClick={e => { e.stopPropagation(); removeActivity(ai); }} className="w-8 h-8 rounded-lg bg-gb-danger/10 text-gb-danger hover:bg-gb-danger/20 flex items-center justify-center transition-colors">
                          <Trash2 size={14} />
                        </button>
                        {act.collapsed ? <ChevronDown size={16} className="text-gb-muted" /> : <ChevronUp size={16} className="text-gb-muted" />}
                      </div>
                    </div>

                    {/*  Card body  */}
                    {!act.collapsed && (
                      <div className="p-5 space-y-5 border-t border-gb-border bg-gb-app/10">

                        {/* Type + Tâche + Avancement */}
                        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                          <div className="md:col-span-3">
                            <Label className="text-[10px] font-black text-gb-muted uppercase mb-2 block">Type d'activité</Label>
                            <div className="flex rounded-xl border border-gb-border overflow-hidden h-9">
                              <button type="button" onClick={() => updateActivity(ai, "task_type", "planned")} className={`flex-1 text-[11px] font-bold transition-all ${act.task_type === "planned" ? "bg-gb-primary text-white" : "bg-gb-surface-solid text-gb-muted hover:bg-gb-app"}`}>
                                Planifiée
                              </button>
                              <button type="button" onClick={() => updateActivity(ai, "task_type", "unplanned")} className={`flex-1 text-[11px] font-bold transition-all border-l border-gb-border ${act.task_type === "unplanned" ? "bg-amber-500 text-white" : "bg-gb-surface-solid text-gb-muted hover:bg-gb-app"}`}>
                                Imprévue
                              </button>
                            </div>
                          </div>

                          <div className="md:col-span-6">
                            <Label className="text-[10px] font-black text-gb-muted uppercase mb-2 block">
                              {act.task_type === "planned" ? "Tâche du projet" : "Intitulé de l'activité"}{" "}
                              <span className="text-gb-danger">*</span>
                              {act.task_type === "unplanned" && <span className="text-amber-500 ml-1 font-normal normal-case">· saisie libre</span>}
                            </Label>
                            {act.task_type === "planned" ? (
                              <select value={act.task_id} onChange={e => updateActivity(ai, "task_id", parseInt(e.target.value))} className="w-full h-9 bg-gb-surface-solid border border-gb-border rounded-xl px-3 text-xs font-bold">
                                <option value={0}>— Sélectionner une tâche —</option>
                                {tasks.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
                              </select>
                            ) : (
                              <Input placeholder="Ex: Réparation fuite canalisation, Sondage géotechnique..." value={act.task_title_custom} onChange={e => updateActivity(ai, "task_title_custom", e.target.value)} className="h-9 bg-gb-surface-solid border-gb-border rounded-xl text-xs font-bold" />
                            )}
                          </div>

                          <div className="md:col-span-3">
                            <Label className="text-[10px] font-black text-gb-muted uppercase mb-2 block">Avancement (%)</Label>
                            <Input type="number" min="0" max="100" placeholder="0 - 100" value={act.progress_percentage} onChange={e => updateActivity(ai, "progress_percentage", e.target.value)} className="h-9 bg-gb-surface-solid border-gb-border rounded-xl text-center text-sm font-black" />
                          </div>
                        </div>

                        {/*  Main d'œuvre  */}
                        <div className="space-y-2">
                          <div className="flex justify-between items-center pb-1 border-b border-blue-500/10">
                            <span className="text-[10px] font-black uppercase text-blue-600 flex items-center gap-1.5 tracking-widest"><HardHat size={12} /> Main d'œuvre</span>
                            <button type="button" onClick={() => addLabor(ai)} className="text-[10px] font-bold text-blue-600 hover:text-blue-700 flex items-center gap-0.5 transition-colors"><Plus size={12} /> Ajouter</button>
                          </div>
                          {act.labor.map((l, li) => (
                            <div key={li} className="grid grid-cols-12 gap-2 items-center">
                              <Input placeholder="Nom / Équipe" value={l.worker_name} onChange={e => updateLabor(ai, li, "worker_name", e.target.value)} className="col-span-5 h-8 text-xs bg-gb-surface-solid border-gb-border" />
                              <Input placeholder="Corps d'état" value={l.trade}       onChange={e => updateLabor(ai, li, "trade",       e.target.value)} className="col-span-4 h-8 text-xs bg-gb-surface-solid border-gb-border" />
                              <Input type="number" placeholder="h" value={l.hours}   onChange={e => updateLabor(ai, li, "hours",       e.target.value)} className="col-span-2 h-8 text-xs text-center font-black bg-gb-surface-solid border-gb-border" />
                              <button type="button" onClick={() => removeLabor(ai, li)} className="col-span-1 text-gb-danger flex justify-center hover:scale-110 transition-transform"><Trash2 size={14} /></button>
                            </div>
                          ))}
                          {act.labor.length === 0 && <p className="text-[11px] text-gb-muted/50 italic pl-1">Aucun ouvrier affecté à cette activité</p>}
                        </div>

                        {/*  Équipement  */}
                        <div className="space-y-2">
                          <div className="flex justify-between items-center pb-1 border-b border-amber-500/10">
                            <span className="text-[10px] font-black uppercase text-amber-600 flex items-center gap-1.5 tracking-widest"><Truck size={12} /> Équipement & Engins</span>
                            <button type="button" onClick={() => addEquipment(ai)} className="text-[10px] font-bold text-amber-600 hover:text-amber-700 flex items-center gap-0.5 transition-colors"><Plus size={12} /> Ajouter</button>
                          </div>
                          {act.equipment.map((eq, ei) => (
                            <div key={ei} className="grid grid-cols-12 gap-2 items-center">
                              <Input placeholder="Désignation engin" value={eq.equipment_name} onChange={e => updateEquipment(ai, ei, "equipment_name", e.target.value)} className="col-span-9 h-8 text-xs bg-gb-surface-solid border-gb-border" />
                              <Input type="number" placeholder="h" value={eq.hours_used} onChange={e => updateEquipment(ai, ei, "hours_used", e.target.value)} className="col-span-2 h-8 text-xs text-center font-black bg-gb-surface-solid border-gb-border" />
                              <button type="button" onClick={() => removeEquipment(ai, ei)} className="col-span-1 text-gb-danger flex justify-center hover:scale-110 transition-transform"><Trash2 size={14} /></button>
                            </div>
                          ))}
                          {act.equipment.length === 0 && <p className="text-[11px] text-gb-muted/50 italic pl-1">Aucun engin affecté</p>}
                        </div>

                        {/*  Matériaux  */}
                        <div className="space-y-2">
                          <div className="flex justify-between items-center pb-1 border-b border-emerald-500/10">
                            <span className="text-[10px] font-black uppercase text-emerald-600 flex items-center gap-1.5 tracking-widest"><Package size={12} /> Matériaux utilisés</span>
                            <button type="button" onClick={() => addMaterial(ai)} className="text-[10px] font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-0.5 transition-colors"><Plus size={12} /> Ajouter</button>
                          </div>
                          {act.materials.map((m, mi) => (
                            <div key={mi} className="grid grid-cols-12 gap-2 items-center">
                              <Input placeholder="Désignation matériau" value={m.material_name} onChange={e => updateMaterial(ai, mi, "material_name", e.target.value)} className="col-span-7 h-8 text-xs bg-gb-surface-solid border-gb-border" />
                              <Input type="number" placeholder="Qté" value={m.quantity} onChange={e => updateMaterial(ai, mi, "quantity", e.target.value)} className="col-span-2 h-8 text-xs text-center font-black bg-gb-surface-solid border-gb-border" />
                              <Input placeholder="Unité" value={m.unit} onChange={e => updateMaterial(ai, mi, "unit", e.target.value)} className="col-span-2 h-8 text-xs bg-gb-surface-solid border-gb-border" />
                              <button type="button" onClick={() => removeMaterial(ai, mi)} className="col-span-1 text-gb-danger flex justify-center hover:scale-110 transition-transform"><Trash2 size={14} /></button>
                            </div>
                          ))}
                          {act.materials.length === 0 && <p className="text-[11px] text-gb-muted/50 italic pl-1">Aucun matériau utilisé</p>}
                        </div>

                        {/*  Observations  */}
                        <div>
                          <Label className="text-[10px] font-black text-gb-muted uppercase mb-2 block">Observations terrain</Label>
                          <textarea value={act.comment} onChange={e => updateActivity(ai, "comment", e.target.value)} placeholder="Difficultés rencontrées, points de vigilance, réserves, non-conformités..." className="w-full h-16 bg-gb-surface-solid border border-gb-border rounded-xl px-3 py-2 text-xs resize-none text-gb-text placeholder:text-gb-muted/50" />
                        </div>

                        {/*  Photos  */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between pb-1 border-b border-purple-500/10">
                            <span className="text-[10px] font-black uppercase text-purple-600 flex items-center gap-1.5 tracking-widest"><ImageIcon size={12} /> Photos ({act.photos.length})</span>
                            <label className="text-[10px] font-bold text-purple-600 hover:text-purple-700 cursor-pointer flex items-center gap-0.5 transition-colors">
                              <Plus size={12} /> Ajouter des photos
                              <input type="file" accept="image/*" multiple className="hidden" onChange={e => { void addPhotos(ai, e.target.files); e.target.value = ""; }} />
                            </label>
                          </div>
                          {uploadingPhotos > 0 && (
                            <p className="text-[11px] text-gb-muted italic">Televersement des photos en cours...</p>
                          )}
                          {act.photos.length > 0 && (
                            <div className="grid grid-cols-5 gap-2">
                              {act.photos.map((photo, pi) => (
                                <div key={pi} className="relative group">
                                  {getDisplayPhotoUrl(photo) ? (
                                    <img src={getDisplayPhotoUrl(photo) || undefined} alt="" className="h-14 w-full object-cover rounded-lg border border-gb-border" />
                                  ) : (
                                    <div className="h-14 w-full rounded-lg border border-gb-border bg-gb-app/40 animate-pulse" />
                                  )}
                                  <button type="button" onClick={() => removePhoto(ai, pi)} className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-gb-danger text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Trash2 size={10} />
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </form>

        <DialogFooter className="p-6 border-t border-gb-border bg-gb-app/30 gap-3 shrink-0">
          <Button type="button" variant="ghost" className="rounded-xl h-11 px-8 font-bold" onClick={() => handleOpenStateChange(false)}>
            Fermer
          </Button>
          <Button form="daily-log-form" type="submit" disabled={submitting || uploadingPhotos > 0} className="rounded-xl h-11 px-10 bg-gb-primary hover:bg-gb-primary-dark shadow-xl shadow-gb-primary/20 font-black min-w-[200px]">
            {submitting ? <><Loader2 size={16} className="mr-2 animate-spin" /> {isEditMode ? "Mise a jour..." : "Enregistrement..."}</> : uploadingPhotos > 0 ? "Televersement des photos..." : isEditMode ? "Mettre a jour le Journal" : "Enregistrer le Journal"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

