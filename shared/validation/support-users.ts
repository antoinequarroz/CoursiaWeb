import { z } from 'zod'

export const supportUserSearchSchema = z
  .object({
    userId: z.uuid().optional(),
    email: z.email().optional(),
  })
  .refine((value) => Boolean(value.userId || value.email), {
    message: 'Recherche par identifiant ou email requise.',
  })

export const supportAccountStatusSchema = z.enum(['active', 'blocked', 'deleted', 'pending'])
export const supportSubscriptionTierSchema = z.enum(['free', 'standard', 'premium', 'family'])

export const supportControlledProcedureSchema = z.object({
  action: z.enum(['export', 'delete', 'block']),
  userId: z.uuid(),
  reason: z.string().trim().min(10).max(1000),
  ticketReference: z.string().trim().min(3).max(80),
  confirmed: z.boolean(),
})

export const revenueCatEventSchema = z.object({
  id: z.string().trim().min(1).max(160),
  userId: z.uuid(),
  type: z.string().trim().min(1).max(120),
  entitlement: z.string().trim().max(120).optional(),
  productId: z.string().trim().max(180).optional(),
  purchasedAt: z.iso.datetime({ offset: true }).optional(),
  expiresAt: z.iso.datetime({ offset: true }).optional(),
  receivedAt: z.iso.datetime({ offset: true }),
})

export const maskEmail = (email: string) => {
  const [local = '', domain = ''] = email.split('@')

  if (!local || !domain) {
    return 'email-masque'
  }

  return `${local.slice(0, 2)}***@${domain}`
}

export const maskSupportUser = (user: {
  id: string
  email: string
  accountStatus: z.infer<typeof supportAccountStatusSchema>
  appVersion: string | null
  subscriptionTier: z.infer<typeof supportSubscriptionTierSchema>
}) => ({
  id: user.id,
  emailMasked: maskEmail(user.email),
  accountStatus: user.accountStatus,
  appVersion: user.appVersion,
  subscriptionTier: user.subscriptionTier,
})

export const supportProcedureDescriptions = {
  export: 'Exporter les donnees suit une procedure controlee avec ticket, raison et confirmation.',
  delete: 'Supprimer un compte suit une procedure controlee et ne supprime rien silencieusement.',
  block: 'Bloquer un compte exige une raison support et une reference de ticket.',
} as const

export const impersonationDisabledMessage =
  'Aucune fonction d impersonation n est ajoutee par defaut.'

export type SupportUserSearch = z.infer<typeof supportUserSearchSchema>
export type SupportControlledProcedure = z.infer<typeof supportControlledProcedureSchema>
