import { prisma } from '../config/prisma.js';
import { TenantContext } from '../config/tenant-context.js';

export class WeeklyReportService {
  static async generateWeeklyReport(data: {
    project_id: number;
    week_start: Date;
    week_end: Date;
    prepared_by: number;
  }) {
    const tenantId = TenantContext.getTenantId();
    if (!tenantId) throw new Error("Tenant session required");

    // 1. Get Daily Logs for the week
    const dailyLogs = await prisma.dailyLog.findMany({
      where: {
        project_id: data.project_id,
        tenant_id: tenantId,
        date: {
          gte: data.week_start,
          lte: data.week_end
        }
      },
      include: {
        labor_entries: true,
        equipment_entries: true,
        material_entries: true
      }
    });

    // 2. Aggregate some stats for the summary (example logic)
    const totalLaborHours = dailyLogs.reduce((sum: number, log: any) => 
      sum + log.labor_entries.reduce((lSum: number, l: any) => lSum + l.hours, 0), 0);
    
    const summary = `Generated report for week ${data.week_start.toDateString()} to ${data.week_end.toDateString()}. Total labor hours reported in daily logs: ${totalLaborHours}. Number of daily logs found: ${dailyLogs.length}.`;

    // 3. Get Project Progress (example: average of task progress)
    const tasks = await prisma.task.findMany({
      where: { project_id: data.project_id, tenant_id: tenantId }
    });
    const avgProgress = tasks.length > 0 ? tasks.reduce((s: number, t: any) => s + t.progress, 0) / tasks.length : 0;

    // 4. Create Weekly Report
    const report = await prisma.weeklyReport.create({
      data: {
        project_id: data.project_id,
        tenant_id: tenantId,
        week_start: data.week_start,
        week_end: data.week_end,
        overall_progress: avgProgress,
        summary: summary,
        prepared_by: data.prepared_by,
        status: 'DRAFT',
        created_by: data.prepared_by
      }
    });

    // 5. Create basic items from tasks to allow manual adjustment later
    // In a real app, this would be more complex
    if (tasks.length > 0) {
      const items = tasks.slice(0, 10).map((task: any) => ({
        report_id: report.id,
        task_id: task.id,
        description: `Status for task: ${task.title}`,
        weekly_progress: 0, // To be filled manually or calculated
        cumulative_progress: task.progress,
        comment: `Automated entry from task status`
      }));

      await prisma.weeklyReportItem.createMany({
        data: items
      });
    }

    return await this.getWeeklyReportById(report.id);
  }

  static async getWeeklyReports(project_id: number) {
    const tenantId = TenantContext.getTenantId();
    if (!tenantId) throw new Error("Tenant session required");

    return await prisma.weeklyReport.findMany({
      where: {
        project_id,
        tenant_id: tenantId
      },
      include: {
        preparedBy: true,
        validatedBy: true,
        items: true
      },
      orderBy: { week_start: 'desc' }
    });
  }

  static async getWeeklyReportById(id: number) {
    return await prisma.weeklyReport.findUnique({
      where: { id },
      include: {
        preparedBy: true,
        validatedBy: true,
        items: {
          include: {
            task: true
          }
        },
        project: true
      }
    });
  }

  static async updateWeeklyReport(id: number, data: {
    summary?: string;
    overall_progress?: number;
    status?: string;
    validated_by?: number;
    items?: any[];
  }) {
    return await prisma.$transaction(async (tx: any) => {
        if (data.items) {
            // Update items - simple replace for now
            await tx.weeklyReportItem.deleteMany({ where: { report_id: id }});
            await tx.weeklyReportItem.createMany({
                data: data.items.map((it: any) => ({ ...it, report_id: id }))
            });
        }

        return await tx.weeklyReport.update({
            where: { id },
            data: {
                summary: data.summary,
                overall_progress: data.overall_progress,
                status: data.status,
                validated_by: data.validated_by
            },
            include: {
                items: true
            }
        });
    });
  }
}
