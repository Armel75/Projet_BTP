import { z } from 'zod';

export const deleteWeeklyReportSchema = z.object({
  reason: z.string().trim().min(10).max(500)
});
