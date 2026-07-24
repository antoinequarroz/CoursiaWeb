import { z } from 'zod'

export const courseListQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(12),
})

export const authenticatedEnrollmentsQuerySchema = z.object({
  status: z.enum(['active', 'completed', 'cancelled']).optional(),
})

export type CourseListQuery = z.infer<typeof courseListQuerySchema>
export type AuthenticatedEnrollmentsQuery = z.infer<typeof authenticatedEnrollmentsQuerySchema>
