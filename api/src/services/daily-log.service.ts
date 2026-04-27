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
  }) {
    const tenantId = TenantContext.getTenantId();
    if (!tenantId) throw new Error("Tenant session required");

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
        }
      },
      include: {
        labor_entries: true,
        equipment_entries: true,
        material_entries: true,
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
        createdBy: true
      },
      orderBy: { date: 'desc' }
    });
  }

  static async getDailyLogById(id: number) {
    return await prisma.dailyLog.findUnique({
      where: { id },
      include: {
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
    labor_entries?: any[];
    equipment_entries?: any[];
    material_entries?: any[];
  }) {
    // Note: This approach replaces child entries by deleting and re-creating
    // In a production app, we might want more fine-grained updates

    return await prisma.$transaction(async (tx: any) => {
      // 1. Delete existing related entries
      await tx.dailyLogLabor.deleteMany({ where: { daily_log_id: id } });
      await tx.dailyLogEquipment.deleteMany({ where: { daily_log_id: id } });
      await tx.dailyLogMaterial.deleteMany({ where: { daily_log_id: id } });

      // 2. Update log and create new entries
      return await tx.dailyLog.update({
        where: { id },
        data: {
          weather: data.weather,
          temperature: data.temperature,
          notes: data.notes,
          labor_entries: {
            create: data.labor_entries || []
          },
          equipment_entries: {
            create: data.equipment_entries || []
          },
          material_entries: {
            create: data.material_entries || []
          }
        },
        include: {
          labor_entries: true,
          equipment_entries: true,
          material_entries: true
        }
      });
    });
  }

  static async deleteDailyLog(id: number) {
    return await prisma.$transaction(async (tx: any) => {
      await tx.dailyLogLabor.deleteMany({ where: { daily_log_id: id } });
      await tx.dailyLogEquipment.deleteMany({ where: { daily_log_id: id } });
      await tx.dailyLogMaterial.deleteMany({ where: { daily_log_id: id } });
      return await tx.dailyLog.delete({ where: { id } });
    });
  }
}
