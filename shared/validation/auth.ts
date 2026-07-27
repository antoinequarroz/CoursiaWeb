import { z } from 'zod'
import { sanitizeAdminRedirect } from '#shared/auth/redirect'

export const adminLoginSchema = z.object({
  email: z.email().max(254),
  password: z.string().min(8).max(128),
  redirect: z.preprocess(sanitizeAdminRedirect, z.string()),
})

export const passwordRecoverySchema = z.object({
  email: z.email().max(254),
})

export const passwordResetSchema = z
  .object({
    password: z.string().min(8).max(128),
    confirmPassword: z.string().min(8).max(128),
  })
  .refine((value) => value.password === value.confirmPassword, {
    message: 'Les mots de passe ne correspondent pas.',
    path: ['confirmPassword'],
  })

export type AdminLoginInput = z.infer<typeof adminLoginSchema>
export type PasswordRecoveryInput = z.infer<typeof passwordRecoverySchema>
export type PasswordResetInput = z.infer<typeof passwordResetSchema>
