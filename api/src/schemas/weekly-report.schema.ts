import { z } from 'zod';

const dateLike = z.union([z.string().min(1), z.date()]);
const numberLike = z.union([z.number(), z.string().min(1)]);

const weeklyReportItemSchema = z.object({
  task_id: numberLike.nullable().optional(),
  description: z.string().max(1000),
  weekly_progress: numberLike.optional(),
  cumulative_progress: numberLike.optional(),
  comment: z.string().max(20000).nullable().optional(),
}).passthrough();

export const generateWeeklyReportSchema = z.object({
  project_id: numberLike,
  week_start: dateLike,
  week_end: dateLike,
}).passthrough();

export const updateWeeklyReportSchema = z.object({
  summary: z.string().max(20000).optional(),
  overall_progress: numberLike.optional(),
  status: z.string().max(50).optional(),
  validated_by: numberLike.nullable().optional(),
  items: z.array(weeklyReportItemSchema).optional(),
}).passthrough();

export const submitWeeklyReportSchema = z.object({}).passthrough();

export const approveWeeklyReportSchema = z.object({
  reason: z.string().trim().min(1).max(5000).optional(),
}).passthrough();

export const rejectWeeklyReportSchema = z.object({
  reason: z.string().trim().min(5).max(5000),
}).passthrough();

export const deleteWeeklyReportSchema = z.object({
  reason: z.string().trim().min(10).max(500)
});
