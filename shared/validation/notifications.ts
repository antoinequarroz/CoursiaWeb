import { z } from 'zod'

export const adminNotificationQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(10),
  unreadOnly: z.coerce.boolean().default(false),
})

export const adminNotificationParamsSchema = z.object({
  id: z.string().uuid(),
})

