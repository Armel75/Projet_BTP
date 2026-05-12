import { prisma } from '../config/prisma.js';
import { TenantContext } from '../config/tenant-context.js';

function clampPercentage(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, value));
}

function average(values: number[]) {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function normalizeKey(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

function toDate(input: Date | string) {
  const date = input instanceof Date ? input : new Date(input);
  return Number.isNaN(date.getTime()) ? new Date(0) : date;
}

function parseJsonArray(value: unknown) {
  if (!value) return [] as any[];
  if (Array.isArray(value)) return value;

  try {
    const parsed = JSON.parse(String(value));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function sumTaskProgressLaborHours(taskProgressEntries: any[]) {
  return taskProgressEntries.reduce((sum: number, entry: any) => {
    const laborData = parseJsonArray(entry.labor_data);
    return sum + laborData.reduce((entrySum: number, labor: any) => entrySum + (Number(labor?.hours) || 0), 0);
  }, 0);
}

function countTaskProgressResources(taskProgressEntries: any[], field: 'equipment_data' | 'material_data') {
  return taskProgressEntries.reduce((sum: number, entry: any) => sum + parseJsonArray(entry[field]).length, 0);
}

function buildWeeklyDelta(progressPoints: number[]) {
  if (progressPoints.length < 2) return 0;
  return clampPercentage(progressPoints[progressPoints.length - 1] - progressPoints[0]);
}

export class WeeklyReportService {
  static async generateWeeklyReport(data: {
    project_id: number;
    week_start: Date;
    week_end: Date;
    prepared_by: number;
  }) {
    const tenantId = TenantContext.getTenantId();
    if (!tenantId) throw new Error("Tenant session required");

    // 1) Consolidate daily logs for the selected week and project.
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
        material_entries: true,
        task_progress: {
          include: {
            task: {
              select: {
                id: true,
                title: true,
                progress: true,
              },
            },
          },
        },
      }
    });

    // 2) Load project tasks (current source of planned progress).
    const tasks = await prisma.task.findMany({
      where: { project_id: data.project_id, tenant_id: tenantId },
      select: {
        id: true,
        title: true,
        progress: true,
      },
    });

    // 3) Build weekly metrics from daily logs.
    const totalLaborHours = dailyLogs.reduce((sum: number, log: any) => {
      const laborHours = log.labor_entries.length > 0
        ? log.labor_entries.reduce((entrySum: number, entry: any) => entrySum + (Number(entry.hours) || 0), 0)
        : sumTaskProgressLaborHours(log.task_progress);
      return sum + laborHours;
    }, 0);
    const totalEquipmentEntries = dailyLogs.reduce((sum: number, log: any) => {
      const equipmentCount = log.equipment_entries.length > 0
        ? log.equipment_entries.length
        : countTaskProgressResources(log.task_progress, 'equipment_data');
      return sum + equipmentCount;
    }, 0);
    const totalMaterialEntries = dailyLogs.reduce((sum: number, log: any) => {
      const materialCount = log.material_entries.length > 0
        ? log.material_entries.length
        : countTaskProgressResources(log.task_progress, 'material_data');
      return sum + materialCount;
    }, 0);
    const totalTaskProgressEntries = dailyLogs.reduce((sum: number, log: any) => sum + log.task_progress.length, 0);

    const linkedTaskUpdates = dailyLogs.reduce((sum: number, log: any) => {
      return sum + log.task_progress.filter((progress: any) => progress.task_id != null).length;
    }, 0);
    const unplannedTaskUpdates = Math.max(0, totalTaskProgressEntries - linkedTaskUpdates);

    const summary = [
      `Rapport genere pour la semaine du ${data.week_start.toDateString()} au ${data.week_end.toDateString()}.`,
      `Journaux quotidiens consolides : ${dailyLogs.length}.`,
      `Heures de main-d'oeuvre declarees dans les journaux : ${totalLaborHours.toFixed(2)}.`,
      `Entrees d'utilisation des equipements : ${totalEquipmentEntries}.`,
      `Entrees d'utilisation des materiaux : ${totalMaterialEntries}.`,
      `Mises a jour de progression terrain : ${totalTaskProgressEntries} (${linkedTaskUpdates} taches liees, ${unplannedTaskUpdates} activites non planifiees).`,
    ].join(' ');

    // 4) Build a hybrid progress index combining planned tasks and field updates.
    type AggregatedProgress = {
      taskId: number | null;
      description: string;
      progressPoints: number[];
      comments: string[];
      latestDate: Date;
      latestLogId: number;
    };

    const progressBuckets = new Map<string, AggregatedProgress>();
    const taskById = new Map<number, { id: number; title: string; progress: number }>();
    for (const task of tasks) {
      taskById.set(task.id, {
        id: task.id,
        title: task.title,
        progress: clampPercentage(Number(task.progress) || 0),
      });
    }

    for (const dailyLog of dailyLogs) {
      const logDate = toDate(dailyLog.date);
      for (const update of dailyLog.task_progress) {
        const taskId = update.task_id != null ? Number(update.task_id) : null;
        const taskTitle = taskId != null
          ? (taskById.get(taskId)?.title || update.task?.title || `Task #${taskId}`)
          : null;
        const customTitle = typeof update.task_title_custom === 'string' ? update.task_title_custom.trim() : '';
        const description = taskTitle || customTitle || `Field activity #${update.id}`;
        const bucketKey = taskId != null
          ? `task:${taskId}`
          : `activity:${normalizeKey(description)}`;

        if (!progressBuckets.has(bucketKey)) {
          progressBuckets.set(bucketKey, {
            taskId,
            description,
            progressPoints: [],
            comments: [],
            latestDate: logDate,
            latestLogId: dailyLog.id,
          });
        }

        const bucket = progressBuckets.get(bucketKey)!;
        if (update.progress_percentage != null) {
          bucket.progressPoints.push(clampPercentage(Number(update.progress_percentage)));
        }

        const comment = typeof update.comment === 'string' ? update.comment.trim() : '';
        if (comment.length > 0) {
          bucket.comments.push(comment);
        }

        const isMoreRecent = logDate.getTime() > bucket.latestDate.getTime()
          || (logDate.getTime() === bucket.latestDate.getTime() && dailyLog.id > bucket.latestLogId);
        if (isMoreRecent) {
          bucket.latestDate = logDate;
          bucket.latestLogId = dailyLog.id;
        }
      }
    }

    // 5) Compute global progress with deterministic fallback when no project tasks exist.
    const fieldLatestProgress = Array.from(progressBuckets.values())
      .map((bucket) => bucket.progressPoints.length > 0 ? bucket.progressPoints[bucket.progressPoints.length - 1] : null)
      .filter((value): value is number => value != null);

    const avgProgress = tasks.length > 0
      ? average(tasks.map((task: { progress: number | null }) => clampPercentage(Number(task.progress) || 0)))
      : average(fieldLatestProgress);

    // 5b) Calculate premium KPI metrics
    const productivityScore = clampPercentage(
      (totalLaborHours > 0 ? clampPercentage(avgProgress) * (Math.min(totalLaborHours / 40, 1) * 100) / 100 : 0)
    );

    // Count overdue actions (if any exist in the project)
    let overdueActionsCount = 0;
    try {
      const now = new Date();
      const overdueActions = await prisma.meetingActionItem.findMany({
        where: {
          project_id: data.project_id,
          tenant_id: tenantId,
          status: { not: 'COMPLETED' },
          due_date: { lt: now }
        }
      });
      overdueActionsCount = overdueActions.length;
    } catch {
      // Silently ignore if MeetingActionItem doesn't exist
    }

    // 6) Create the report header with KPI layer.
    const report = await prisma.weeklyReport.create({
      data: {
        project_id: data.project_id,
        tenant_id: tenantId,
        week_start: data.week_start,
        week_end: data.week_end,
        overall_progress: clampPercentage(avgProgress),
        summary: summary,
        prepared_by: data.prepared_by,
        status: 'DRAFT',
        created_by: data.prepared_by,
        // Premium KPI layer
        productivity_score: productivityScore,
        planning_variance_pct: 0,
        cost_variance_pct: 0,
        overdue_actions_count: overdueActionsCount,
        incident_trend: 'stable',
        forecast_2weeks: 'À confirmer selon l\'avancement en cours'
      }
    });

    // 7) Generate weekly items from planned tasks first, enriched by field updates.
    const consumedBuckets = new Set<string>();
    const generatedItems: Array<{
      report_id: number;
      task_id: number | null;
      description: string;
      weekly_progress: number;
      cumulative_progress: number;
      comment: string;
    }> = [];

    for (const task of tasks) {
      const bucketKey = `task:${task.id}`;
      const bucket = progressBuckets.get(bucketKey);
      if (bucket) consumedBuckets.add(bucketKey);

      const progressPoints = bucket?.progressPoints ?? [];
      const weeklyProgress = buildWeeklyDelta(progressPoints);
      const cumulativeProgress = progressPoints.length > 0
        ? progressPoints[progressPoints.length - 1]
        : clampPercentage(Number(task.progress) || 0);

      const latestComment = bucket?.comments[bucket.comments.length - 1] || '';
      const comment = latestComment.length > 0
        ? `Mise a jour terrain synchronisee. ${latestComment}`
        : (bucket
          ? 'Mise a jour terrain synchronisee depuis les journaux quotidiens.'
          : 'Entree automatisee a partir du statut de la tache.');

      generatedItems.push({
        report_id: report.id,
        task_id: Number(task.id),
        description: `Statut de la tache : ${task.title}`,
        weekly_progress: clampPercentage(weeklyProgress),
        cumulative_progress: clampPercentage(cumulativeProgress),
        comment,
      });
    }

    // 8) Add field-only activities (including unplanned work) not represented by project tasks.
    for (const [bucketKey, bucket] of progressBuckets.entries()) {
      if (consumedBuckets.has(bucketKey)) continue;

      const progressPoints = bucket.progressPoints;
      const weeklyProgress = buildWeeklyDelta(progressPoints);
      const cumulativeProgress = progressPoints.length > 0
        ? progressPoints[progressPoints.length - 1]
        : 0;
      const latestComment = bucket.comments[bucket.comments.length - 1] || '';

      generatedItems.push({
        report_id: report.id,
        task_id: bucket.taskId,
        description: `Activite terrain : ${bucket.description}`,
        weekly_progress: clampPercentage(weeklyProgress),
        cumulative_progress: clampPercentage(cumulativeProgress),
        comment: latestComment.length > 0
          ? `Derive des journaux quotidiens. ${latestComment}`
          : 'Derive de la progression des taches du journal quotidien.',
      });
    }

    // Keep output bounded and deterministic for UI/PDF readability.
    const rankedItems = generatedItems
      .sort((a, b) => {
        if ((a.task_id == null) !== (b.task_id == null)) {
          return a.task_id == null ? 1 : -1;
        }
        if (b.cumulative_progress !== a.cumulative_progress) {
          return b.cumulative_progress - a.cumulative_progress;
        }
        return b.weekly_progress - a.weekly_progress;
      })
      .slice(0, 10);

    if (rankedItems.length > 0) {
      await prisma.weeklyReportItem.createMany({
        data: rankedItems
      });
    }

    return await this.getWeeklyReportById(report.id);
  }

  static async getWeeklyReports(project_id: number, prepared_by?: number) {
    const tenantId = TenantContext.getTenantId();
    if (!tenantId) throw new Error("Tenant session required");

    return await prisma.weeklyReport.findMany({
      where: {
        project_id,
        tenant_id: tenantId,
        status: {
          not: 'DELETED'
        },
        ...(prepared_by !== undefined && { prepared_by }),
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
    const tenantId = TenantContext.getTenantId();
    if (!tenantId) throw new Error("Tenant session required");

    return await prisma.weeklyReport.findFirst({
      where: {
        id,
        tenant_id: tenantId,
        status: {
          not: 'DELETED'
        }
      },
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

  static async getWeeklyReportByIdForTenantScoped(id: number, prepared_by?: number) {
    const tenantId = TenantContext.getTenantId();
    if (!tenantId) throw new Error("Tenant session required");

    return await prisma.weeklyReport.findFirst({
      where: {
        id,
        tenant_id: tenantId,
        status: {
          not: 'DELETED'
        },
        ...(prepared_by !== undefined && { prepared_by }),
      },
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
    const tenantId = TenantContext.getTenantId();
    if (!tenantId) throw new Error("Tenant session required");

    return await prisma.$transaction(async (tx: any) => {
      const existing = await tx.weeklyReport.findFirst({
        where: {
          id,
          tenant_id: tenantId,
          status: { not: 'DELETED' }
        },
        select: { id: true, status: true }
      });
      if (!existing) {
        throw new Error('Weekly report not found');
      }

      // Edit-lock: Prevent modifications to SUBMITTED or APPROVED reports
      const currentStatus = (existing.status || 'DRAFT').toUpperCase();
      if (currentStatus === 'SUBMITTED' || currentStatus === 'APPROVED') {
        throw new Error(`Cannot modify a ${currentStatus.toLowerCase()} weekly report. Please reopen it first if authorized.`);
      }

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

  static async transitionWeeklyReportStatus(id: number, data: {
    to_status: 'DRAFT' | 'SUBMITTED' | 'APPROVED';
    actor_id: number;
    reason?: string;
  }) {
    const tenantId = TenantContext.getTenantId();
    if (!tenantId) throw new Error("Tenant session required");

    return await prisma.$transaction(async (tx: any) => {
      const existing = await tx.weeklyReport.findFirst({
        where: {
          id,
          tenant_id: tenantId,
          status: { not: 'DELETED' }
        },
        select: {
          id: true,
          status: true,
          validated_by: true,
          week_start: true,
          week_end: true,
          project_id: true,
          prepared_by: true,
        }
      });

      if (!existing) {
        throw new Error('Weekly report not found');
      }

      const fromStatus = (existing.status || 'DRAFT').toUpperCase();
      const toStatus = data.to_status;

      if (fromStatus === toStatus) {
        return await tx.weeklyReport.findFirst({
          where: { id, tenant_id: tenantId },
          include: { items: true }
        });
      }

      const allowedTransitions: Record<string, string[]> = {
        DRAFT: ['SUBMITTED'],
        SUBMITTED: ['APPROVED', 'DRAFT'],
        APPROVED: [],
      };

      if (!allowedTransitions[fromStatus]?.includes(toStatus)) {
        throw new Error(`Invalid weekly report status transition: ${fromStatus} -> ${toStatus}`);
      }

      // Fetch full report for mandatory field validation
      const fullReport = await tx.weeklyReport.findFirst({
        where: { id, tenant_id: tenantId },
        include: { items: true }
      });

      if (!fullReport) {
        throw new Error('Weekly report not found');
      }

      // Validate mandatory fields based on target status
      if (toStatus === 'SUBMITTED') {
        const hasSummary = fullReport.summary && fullReport.summary.trim().length > 0;
        const hasItems = Array.isArray(fullReport.items) && fullReport.items.length > 0;
        if (!hasSummary && !hasItems) {
          throw new Error('Weekly report must have either a summary or at least one item before submission');
        }
      }

      if (toStatus === 'APPROVED') {
        const hasSummary = fullReport.summary && fullReport.summary.trim().length > 0;
        if (!hasSummary) {
          throw new Error('Weekly report must have a summary before approval');
        }
      }

      const updated = await tx.weeklyReport.update({
        where: { id },
        data: {
          status: toStatus,
          validated_by: toStatus === 'APPROVED' ? data.actor_id : null,
        },
        include: {
          items: true,
          preparedBy: true,
          validatedBy: true,
          project: true,
        }
      });

      await tx.auditLog.create({
        data: {
          user_id: data.actor_id,
          tenant_id: tenantId,
          action: 'WEEKLY_REPORT_STATUS_TRANSITION',
          entity_type: 'WeeklyReport',
          entity_id: String(id),
          old_value: JSON.stringify({
            status: fromStatus,
            validated_by: existing.validated_by,
          }),
          new_value: JSON.stringify({
            status: toStatus,
            validated_by: updated.validated_by,
            reason: data.reason || null,
          })
        }
      });

      return updated;
    });
  }

  static async deleteWeeklyReport(id: number, data: {
    reason: string;
    deleted_by: number;
  }) {
    const tenantId = TenantContext.getTenantId();
    if (!tenantId) throw new Error("Tenant session required");

    return await prisma.$transaction(async (tx: any) => {
      const existing = await tx.weeklyReport.findFirst({
        where: {
          id,
          tenant_id: tenantId
        },
        include: {
          items: true
        }
      });

      if (!existing) {
        throw new Error('Weekly report not found');
      }

      if (existing.status === 'DELETED') {
        throw new Error('Weekly report already deleted');
      }

      if (existing.status !== 'DRAFT') {
        throw new Error('Only draft weekly reports can be deleted');
      }

      await tx.weeklyReportItem.deleteMany({
        where: {
          report_id: id
        }
      });

      const deletedReport = await tx.weeklyReport.update({
        where: { id },
        data: {
          status: 'DELETED'
        },
        include: {
          items: true
        }
      });

      await tx.auditLog.create({
        data: {
          user_id: data.deleted_by,
          tenant_id: tenantId,
          action: 'DELETE_WEEKLY_REPORT',
          entity_type: 'WeeklyReport',
          entity_id: String(id),
          old_value: JSON.stringify({
            id: existing.id,
            status: existing.status,
            week_start: existing.week_start,
            week_end: existing.week_end,
            project_id: existing.project_id,
            item_count: existing.items.length
          }),
          new_value: JSON.stringify({
            id,
            status: 'DELETED',
            reason: data.reason
          })
        }
      });

      return deletedReport;
    });
  }
}
