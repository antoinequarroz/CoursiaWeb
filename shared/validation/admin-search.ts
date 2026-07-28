import { z } from 'zod'

export const adminSearchQuerySchema = z.object({
  q: z.string().trim().min(2).max(80),
  limit: z.coerce.number().int().min(1).max(10).default(5),
})

