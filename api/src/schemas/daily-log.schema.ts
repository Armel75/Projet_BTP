import { z } from 'zod';

const dateLike = z.union([z.string().min(1), z.date()]);
const numberLike = z.union([z.number(), z.string().min(1)]);

const laborItemSchema = z.object({
  worker_name: z.string().max(255).nullable().optional(),
  trade: z.string().max(255).nullable().optional(),
  hours: numberLike.optional(),
}).passthrough();

const equipmentItemSchema = z.object({
  equipment_name: z.string().max(255).nullable().optional(),
  hours_used: numberLike.optional(),
}).passthrough();

const materialItemSchema = z.object({
  material_name: z.string().max(255).nullable().optional(),
  quantity: numberLike.optional(),
  unit: z.string().max(120).nullable().optional(),
}).passthrough();

const taskProgressItemSchema = z.object({
  task_type: z.enum(['planned', 'unplanned']).optional(),
  task_id: numberLike.nullable().optional(),
  task_title_custom: z.string().max(500).nullable().optional(),
  progress_percentage: numberLike.nullable().optional(),
  comment: z.string().max(20000).nullable().optional(),
  photo_ids: z.array(numberLike).optional(),
  photos_url: z.union([z.string().max(2000), z.array(z.string().max(2000))]).nullable().optional(),
  labor_data: z.array(laborItemSchema).nullable().optional(),
  equipment_data: z.array(equipmentItemSchema).nullable().optional(),
  material_data: z.array(materialItemSchema).nullable().optional(),
  // Écart (gap) tracking: planned vs actual
  planned_quantity: numberLike.nullable().optional(),
  actual_quantity: numberLike.nullable().optional(),
  planned_date: dateLike.nullable().optional(),
  actual_date: dateLike.nullable().optional(),
  cause_code: z.string().max(100).nullable().optional(),
  impact_type: z.string().max(50).nullable().optional(),
  corrective_action: z.string().max(20000).nullable().optional(),
  owner_id: numberLike.nullable().optional(),
  target_correction_date: dateLike.nullable().optional(),
  // Contractual proof metadata
  proof_timestamp: dateLike.nullable().optional(),
  proof_location: z.string().max(500).nullable().optional(),
  proof_author_id: numberLike.nullable().optional(),
  related_anomaly_id: numberLike.nullable().optional(),
}).passthrough();

export const createDailyLogSchema = z.object({
  project_id: numberLike,
  date: dateLike,
  weather: z.string().max(120).nullable().optional(),
  temperature: numberLike.nullable().optional(),
  notes: z.string().max(20000).nullable().optional(),
  labor_entries: z.array(z.record(z.string(), z.unknown())).optional(),
  equipment_entries: z.array(z.record(z.string(), z.unknown())).optional(),
  material_entries: z.array(z.record(z.string(), z.unknown())).optional(),
  task_progress: z.array(taskProgressItemSchema).optional(),
}).passthrough();

export const updateDailyLogSchema = z.object({
  project_id: numberLike.optional(),
  date: dateLike.optional(),
  weather: z.string().max(120).nullable().optional(),
  temperature: numberLike.nullable().optional(),
  notes: z.string().max(20000).nullable().optional(),
  labor_entries: z.array(z.record(z.string(), z.unknown())).optional(),
  equipment_entries: z.array(z.record(z.string(), z.unknown())).optional(),
  material_entries: z.array(z.record(z.string(), z.unknown())).optional(),
  task_progress: z.array(taskProgressItemSchema).optional(),
}).passthrough();

export const archiveDailyLogSchema = z.object({
  archived: z.boolean().optional(),
}).passthrough();