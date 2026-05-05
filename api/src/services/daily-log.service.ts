import { prisma } from '../config/prisma.js';
import { TenantContext } from '../config/tenant-context.js';

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

    // Normalize task_progress: convert array fields to JSON strings for DB storage
    const normalizedTaskProgress = (data.task_progress || []).map((tp: any) => ({
      task_id: tp.task_id || null,
      task_type: tp.task_type || "planned",
      task_title_custom: tp.task_title_custom || null,
      progress_percentage: tp.progress_percentage != null ? Math.max(0, Math.min(100, parseInt(tp.progress_percentage))) : null,
      comment: tp.comment || null,
      photos_url: Array.isArray(tp.photos_url) ? JSON.stringify(tp.photos_url) : (tp.photos_url || null),
      labor_data: tp.labor_data && tp.labor_data.length > 0 ? JSON.stringify(tp.labor_data) : null,
      equipment_data: tp.equipment_data && tp.equipment_data.length > 0 ? JSON.stringify(tp.equipment_data) : null,
      material_data: tp.material_data && tp.material_data.length > 0 ? JSON.stringify(tp.material_data) : null,
    }));

    return await prisma.dailyLog.create({
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
  }

  static async getDailyLogs(filters: {
    project_id?: number;
    date?: Date;
    created_by?: number;
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
    return await prisma.dailyLog.findUnique({
      where: { id },
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
    weather?: string;
    temperature?: number;
    notes?: string;
    task_progress?: any[];
  }) {
    // Note: Delete all existing task_progress and recreate with new data

    // Normalize task_progress: convert array fields to JSON strings for DB storage
    const normalizedTaskProgress = (data.task_progress || []).map((tp: any) => ({
      task_id: tp.task_id || null,
      task_type: tp.task_type || "planned",
      task_title_custom: tp.task_title_custom || null,
      progress_percentage: tp.progress_percentage != null ? Math.max(0, Math.min(100, parseInt(tp.progress_percentage))) : null,
      comment: tp.comment || null,
      photos_url: Array.isArray(tp.photos_url) ? JSON.stringify(tp.photos_url) : (tp.photos_url || null),
      labor_data: tp.labor_data && tp.labor_data.length > 0 ? JSON.stringify(tp.labor_data) : null,
      equipment_data: tp.equipment_data && tp.equipment_data.length > 0 ? JSON.stringify(tp.equipment_data) : null,
      material_data: tp.material_data && tp.material_data.length > 0 ? JSON.stringify(tp.material_data) : null,
    }));

    return await prisma.$transaction(async (tx: any) => {
      // 1. Delete existing task progress entries
      await tx.dailyLogTaskProgress.deleteMany({ where: { daily_log_id: id } });

      // 2. Update log and create new task progress entries
      return await tx.dailyLog.update({
        where: { id },
        data: {
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
    });
  }

  static async deleteDailyLog(id: number) {
    return await prisma.$transaction(async (tx: any) => {
      await tx.dailyLogLabor.deleteMany({ where: { daily_log_id: id } });
      await tx.dailyLogEquipment.deleteMany({ where: { daily_log_id: id } });
      await tx.dailyLogMaterial.deleteMany({ where: { daily_log_id: id } });
      await tx.dailyLogTaskProgress.deleteMany({ where: { daily_log_id: id } });
      return await tx.dailyLog.delete({ where: { id } });
    });
  }
}
