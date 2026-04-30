import { z } from 'zod';

export const loginSchema = z.object({
  username: z.string().min(3).max(1000),
  password: z.string().min(8).max(1000),
});
