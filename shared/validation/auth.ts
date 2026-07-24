import { z } from 'zod'
import { sanitizeAdminRedirect } from '#shared/auth/redirect'

export const adminLoginSchema = z.object({
  email: z.email().max(254),
  password: z.string().min(8).max(128),
  redirect: z.preprocess(sanitizeAdminRedirect, z.string()),
})

export type AdminLoginInput = z.infer<typeof adminLoginSchema>
