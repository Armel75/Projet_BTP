import { prisma } from '../config/prisma.js';
import { TenantContext } from '../config/tenant-context.js';
import { PhotoService } from './photo.service.js';

function dedupeStrings(values: string[]) {
  return Array.from(new Set(values.filter((value) => typeof value === 'string' && value.length > 0)));
}

function dedupePhotoIds(values: any[]) {
  return Array.from(new Set(values.map((value) => Number(value)).filter(Boolean)));
}

function deriveResourceEntriesFromTaskProgress(taskProgress: any[] | undefined) {
  const laborEntries = (taskProgress || []).flatMap((entry: any) => {
    const laborData = Array.isArray(entry?.labor_data) ? entry.labor_data : [];
    return laborData.map((labor: any) => ({
      worker_name: labor?.worker_name || null,
      trade: labor?.trade || null,
      hours: Number(labor?.hours) || 0,
    }));
  });

  const equipmentEntries = (taskProgress || []).flatMap((entry: any) => {
    const equipmentData = Array.isArray(entry?.equipment_data) ? entry.equipment_data : [];
    return equipmentData.map((equipment: any) => ({
      equipment_id: equipment?.equipment_id || equipment?.equipment_name || null,
      hours_used: Number(equipment?.hours_used) || 0,
    }));
  });

  const materialEntries = (taskProgress || []).flatMap((entry: any) => {
    const materialData = Array.isArray(entry?.material_data) ? entry.material_data : [];
    return materialData.map((material: any) => ({
      material_id: material?.material_id || material?.material_name || null,
      quantity: Number(material?.quantity) || 0,
      unit: material?.unit || null,
    }));
  });

  return {
    laborEntries,
    equipmentEntries,
    materialEntries,
  };
}

export class DailyLogService {
  static async createDailyLog(data: {
    project_id: number;
    date: Date;
    weather?: string;
    temperature?: number;
    notes?: string;
    created_by: number;
    labor_entries?: any[];
    equipment_entries?: any[];
    material_entries?: any[];
    task_progress?: any[];
  }) {
    const tenantId = TenantContext.getTenantId();
    if (!tenantId) throw new Error("Tenant session required");

    const taskProgressWithPhotos = await Promise.all((data.task_progress || []).map(async (tp: any) => {
      const photoIds = Array.isArray(tp.photo_ids) ? dedupePhotoIds(tp.photo_ids) : [];
      const photoUrls = photoIds.length > 0
        ? await PhotoService.resolvePhotoUrls(photoIds)
        : dedupeStrings(Array.isArray(tp.photos_url) ? tp.photos_url : (tp.photos_url ? [tp.photos_url] : []));

      return {
        ...tp,
        photo_ids: photoIds,
        photo_urls_resolved: photoUrls,
      };
    }));

    // Normalize task_progress: convert array fields to JSON strings for DB storage
    const normalizedTaskProgress = taskProgressWithPhotos.map((tp: any) => ({
      task_id: tp.task_id || null,
      task_type: tp.task_type || "planned",
      task_title_custom: tp.task_title_custom || null,
      progress_percentage: tp.progress_percentage != null ? Math.max(0, Math.min(100, parseInt(tp.progress_percentage))) : null,
      comment: tp.comment || null,
      photos_url: tp.photo_urls_resolved.length > 0 ? JSON.stringify(tp.photo_urls_resolved) : null,
      labor_data: tp.labor_data && tp.labor_data.length > 0 ? JSON.stringify(tp.labor_data) : null,
      equipment_data: tp.equipment_data && tp.equipment_data.length > 0 ? JSON.stringify(tp.equipment_data) : null,
      material_data: tp.material_data && tp.material_data.length > 0 ? JSON.stringify(tp.material_data) : null,
      // Écart (gap) tracking fields
      planned_quantity: tp.planned_quantity != null ? parseInt(tp.planned_quantity) : null,
      actual_quantity: tp.actual_quantity != null ? parseInt(tp.actual_quantity) : null,
      planned_date: tp.planned_date || null,
      actual_date: tp.actual_date || null,
      cause_code: tp.cause_code || null,
      impact_type: tp.impact_type || null,
      corrective_action: tp.corrective_action || null,
      owner_id: tp.owner_id != null ? parseInt(tp.owner_id) : null,
      target_correction_date: tp.target_correction_date || null,
      // Contractual proof metadata
      proof_timestamp: tp.proof_timestamp || null,
      proof_location: tp.proof_location || null,
      proof_author_id: tp.proof_author_id != null ? parseInt(tp.proof_author_id) : null,
      related_anomaly_id: tp.related_anomaly_id != null ? parseInt(tp.related_anomaly_id) : null,
    }));

    const derivedResources = deriveResourceEntriesFromTaskProgress(data.task_progress);
    const laborEntries = Array.isArray(data.labor_entries) && data.labor_entries.length > 0
      ? data.labor_entries
      : derivedResources.laborEntries;
    const equipmentEntries = Array.isArray(data.equipment_entries) && data.equipment_entries.length > 0
      ? data.equipment_entries
      : derivedResources.equipmentEntries;
    const materialEntries = Array.isArray(data.material_entries) && data.material_entries.length > 0
      ? data.material_entries
      : derivedResources.materialEntries;
    const photoIdsToAttach = taskProgressWithPhotos.flatMap((tp: any) => tp.photo_ids || []);
    return await prisma.$transaction(async (tx: any) => {
      const createdLog = await tx.dailyLog.create({
        data: {
          project_id: data.project_id,
          date: data.date,
          weather: data.weather,
          temperature: data.temperature,
          notes: data.notes,
          created_by: data.created_by,
          tenant_id: tenantId,
          labor_entries: {
            create: laborEntries
          },
          equipment_entries: {
            create: equipmentEntries
          },
          material_entries: {
            create: materialEntries
          },
          task_progress: {
            create: normalizedTaskProgress
          }
        },
        include: {
          labor_entries: true,
          equipment_entries: true,
          material_entries: true,
          task_progress: true,
          createdBy: true,
          project: true
        }
      });

      await PhotoService.attachPhotosToDailyLog(photoIdsToAttach, createdLog.id, tx);
      return createdLog;
    });
  }

  static async getDailyLogs(filters: {
    project_id?: number;
    date?: Date;
    created_by?: number;
    is_archived?: boolean;
  }) {
    const tenantId = TenantContext.getTenantId();
    if (!tenantId) throw new Error("Tenant session required");

    return await prisma.dailyLog.findMany({
      where: {
        ...filters,
        tenant_id: tenantId
      },
      include: {
        labor_entries: true,
        equipment_entries: true,
        material_entries: true,
        task_progress: {
          include: { task: true }
        },
        createdBy: true
      },
      orderBy: { date: 'desc' }
    });
  }

  static async getDailyLogById(id: number) {
    const tenantId = TenantContext.getTenantId();
    if (!tenantId) throw new Error("Tenant session required");

    return await prisma.dailyLog.findFirst({
      where: { id, tenant_id: tenantId },
      include: {
        task_progress: {
          include: { task: true }
        },
        labor_entries: true,
        equipment_entries: true,
        material_entries: true,
        createdBy: true,
        photos: true
      }
    });
  }

  static async getDailyLogByIdForTenantScoped(id: number, created_by?: number) {
    const tenantId = TenantContext.getTenantId();
    if (!tenantId) throw new Error("Tenant session required");

    return await prisma.dailyLog.findFirst({
      where: {
        id,
        tenant_id: tenantId,
        ...(created_by !== undefined && { created_by }),
      },
      include: {
        task_progress: {
          include: { task: true }
        },
        labor_entries: true,
        equipment_entries: true,
        material_entries: true,
        createdBy: true,
        photos: true
      }
    });
  }

  static async updateDailyLog(id: number, data: {
    date?: Date;
    weather?: string;
    temperature?: number;
    notes?: string;
    labor_entries?: any[];
    equipment_entries?: any[];
    material_entries?: any[];
    task_progress?: any[];
  }) {
    // Note: Delete all existing task_progress and recreate with new data

    const taskProgressWithPhotos = await Promise.all((data.task_progress || []).map(async (tp: any) => {
      const photoIds = Array.isArray(tp.photo_ids) ? dedupePhotoIds(tp.photo_ids) : [];
      const photoUrls = photoIds.length > 0
        ? await PhotoService.resolvePhotoUrls(photoIds)
        : dedupeStrings(Array.isArray(tp.photos_url) ? tp.photos_url : (tp.photos_url ? [tp.photos_url] : []));

      return {
        ...tp,
        photo_ids: photoIds,
        photo_urls_resolved: photoUrls,
      };
    }));

    // Normalize task_progress: convert array fields to JSON strings for DB storage
    const normalizedTaskProgress = taskProgressWithPhotos.map((tp: any) => ({
      task_id: tp.task_id || null,
      task_type: tp.task_type || "planned",
      task_title_custom: tp.task_title_custom || null,
      progress_percentage: tp.progress_percentage != null ? Math.max(0, Math.min(100, parseInt(tp.progress_percentage))) : null,
      comment: tp.comment || null,
      photos_url: tp.photo_urls_resolved.length > 0 ? JSON.stringify(tp.photo_urls_resolved) : null,
      labor_data: tp.labor_data && tp.labor_data.length > 0 ? JSON.stringify(tp.labor_data) : null,
      equipment_data: tp.equipment_data && tp.equipment_data.length > 0 ? JSON.stringify(tp.equipment_data) : null,
      material_data: tp.material_data && tp.material_data.length > 0 ? JSON.stringify(tp.material_data) : null,
      // Écart (gap) tracking fields
      planned_quantity: tp.planned_quantity != null ? parseInt(tp.planned_quantity) : null,
      actual_quantity: tp.actual_quantity != null ? parseInt(tp.actual_quantity) : null,
      planned_date: tp.planned_date || null,
      actual_date: tp.actual_date || null,
      cause_code: tp.cause_code || null,
      impact_type: tp.impact_type || null,
      corrective_action: tp.corrective_action || null,
      owner_id: tp.owner_id != null ? parseInt(tp.owner_id) : null,
      target_correction_date: tp.target_correction_date || null,
      // Contractual proof metadata
      proof_timestamp: tp.proof_timestamp || null,
      proof_location: tp.proof_location || null,
      proof_author_id: tp.proof_author_id != null ? parseInt(tp.proof_author_id) : null,
      related_anomaly_id: tp.related_anomaly_id != null ? parseInt(tp.related_anomaly_id) : null,
    }));

    const shouldSyncResources = data.labor_entries !== undefined
      || data.equipment_entries !== undefined
      || data.material_entries !== undefined
      || data.task_progress !== undefined;
    const derivedResources = deriveResourceEntriesFromTaskProgress(data.task_progress);
    const laborEntries = Array.isArray(data.labor_entries) && data.labor_entries.length > 0
      ? data.labor_entries
      : derivedResources.laborEntries;
    const equipmentEntries = Array.isArray(data.equipment_entries) && data.equipment_entries.length > 0
      ? data.equipment_entries
      : derivedResources.equipmentEntries;
    const materialEntries = Array.isArray(data.material_entries) && data.material_entries.length > 0
      ? data.material_entries
      : derivedResources.materialEntries;
    const photoIdsToAttach = taskProgressWithPhotos.flatMap((tp: any) => tp.photo_ids || []);

    return await prisma.$transaction(async (tx: any) => {
      // 1. Delete existing task progress entries
      if (data.task_progress !== undefined) {
        await tx.dailyLogTaskProgress.deleteMany({ where: { daily_log_id: id } });
      }

      if (shouldSyncResources) {
        await Promise.all([
          tx.dailyLogLabor.deleteMany({ where: { daily_log_id: id } }),
          tx.dailyLogEquipment.deleteMany({ where: { daily_log_id: id } }),
          tx.dailyLogMaterial.deleteMany({ where: { daily_log_id: id } }),
        ]);
      }

      // 2. Update log and create new task progress entries
      const updatedLog = await tx.dailyLog.update({
        where: { id },
        data: {
          date: data.date,
          weather: data.weather,
          temperature: data.temperature,
          notes: data.notes,
          ...(shouldSyncResources && {
            labor_entries: {
              create: laborEntries
            },
            equipment_entries: {
              create: equipmentEntries
            },
            material_entries: {
              create: materialEntries
            },
          }),
          ...(data.task_progress !== undefined && {
            task_progress: {
              create: normalizedTaskProgress
            }
          })
        },
        include: {
          labor_entries: true,
          equipment_entries: true,
          material_entries: true,
          task_progress: {
            include: { task: true }
          }
        }
      });

      await PhotoService.syncDailyLogPhotos(photoIdsToAttach, id, tx);
      return updatedLog;
    });
  }

  static async deleteDailyLog(id: number) {
    const tenantId = TenantContext.getTenantId();
    if (!tenantId) throw new Error("Tenant session required");

    const result = await prisma.dailyLog.updateMany({
      where: { id, tenant_id: tenantId },
      data: {
        is_archived: true,
        archived_at: new Date(),
      },
    });

    if (result.count === 0) {
      throw new Error("Daily log not found");
    }

    return await this.getDailyLogById(id);
  }

  static async restoreDailyLog(id: number) {
    const tenantId = TenantContext.getTenantId();
    if (!tenantId) throw new Error("Tenant session required");

    const result = await prisma.dailyLog.updateMany({
      where: { id, tenant_id: tenantId },
      data: {
        is_archived: false,
        archived_at: null,
      },
    });

    if (result.count === 0) {
      throw new Error("Daily log not found");
    }

    return await this.getDailyLogById(id);
  }
}
