import { prisma } from '../config/prisma.js';
import { TenantContext } from '../config/tenant-context.js';
import { PhotoService } from './photo.service.js';

function dedupeStrings(values: string[]) {
  return Array.from(new Set(values.filter((value) => typeof value === 'string' && value.length > 0)));
}

function dedupePhotoIds(values: any[]) {
  return Array.from(new Set(values.map((value) => Number(value)).filter(Boolean)));
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
    }));

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
            create: data.labor_entries || []
          },
          equipment_entries: {
            create: data.equipment_entries || []
          },
          material_entries: {
            create: data.material_entries || []
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
    }));

    const photoIdsToAttach = taskProgressWithPhotos.flatMap((tp: any) => tp.photo_ids || []);

    return await prisma.$transaction(async (tx: any) => {
      // 1. Delete existing task progress entries
      await tx.dailyLogTaskProgress.deleteMany({ where: { daily_log_id: id } });

      // 2. Update log and create new task progress entries
      const updatedLog = await tx.dailyLog.update({
        where: { id },
        data: {
          date: data.date,
          weather: data.weather,
          temperature: data.temperature,
          notes: data.notes,
          task_progress: {
            create: normalizedTaskProgress
          }
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
