import { z } from 'zod'

export const contentEntryKindSchema = z.enum(['faq', 'marketing_text', 'link', 'announcement'])
export const contentEntryStatusSchema = z.enum(['draft', 'scheduled', 'published', 'archived'])

export const contentEntrySchema = z
  .object({
    key: z.string().trim().min(2).max(120).regex(/^[a-z0-9]+(?:[-_.][a-z0-9]+)*$/),
    kind: contentEntryKindSchema,
    title: z.string().trim().min(1).max(180),
    body: z.string().trim().max(10000).optional(),
    url: z.url().optional(),
    locale: z.string().trim().min(2).max(12).default('fr-CH'),
    status: contentEntryStatusSchema.default('draft'),
    publishAt: z.iso.datetime({ offset: true }).optional(),
    archiveAt: z.iso.datetime({ offset: true }).optional(),
    metadata: z.record(z.string(), z.string()).default({}),
  })
  .refine(
    (value) => !value.archiveAt || !value.publishAt || new Date(value.publishAt) < new Date(value.archiveAt),
    {
      message: 'La date d archivage doit etre apres la publication.',
      path: ['archiveAt'],
    },
  )
  .refine(
    (value) => value.kind !== 'link' || Boolean(value.url),
    {
      message: 'Un lien administrable exige une URL.',
      path: ['url'],
    },
  )

export const contentEntryQuerySchema = z.object({
  kind: contentEntryKindSchema.optional(),
  status: contentEntryStatusSchema.optional(),
  search: z.string().trim().max(120).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
})

export const contentEntryParamsSchema = z.object({
  id: z.uuid(),
})

export const featureFlagSchema = z
  .object({
    key: z.string().trim().min(2).max(120).regex(/^[a-z0-9]+(?:[-_.][a-z0-9]+)*$/),
    name: z.string().trim().min(1).max(160),
    description: z.string().trim().max(500).optional(),
    enabled: z.boolean(),
    critical: z.boolean().default(false),
    rolloutPercentage: z.number().int().min(0).max(100).default(0),
    reason: z.string().trim().max(500).optional(),
  })
  .refine(
    (value) => !value.critical || Boolean(value.reason && value.reason.length >= 10),
    {
      message: 'Les feature flags critiques exigent une raison auditable.',
      path: ['reason'],
    },
  )

const forbiddenSettingKeyPattern = /(secret|token|password|private|service[_-]?role|api[_-]?key|dsn|credential)/i

export const assertNonTechnicalSettingKey = (key: string) => {
  if (forbiddenSettingKeyPattern.test(key)) {
    throw new Error('Les parametres techniques et secrets restent hors de ce module.')
  }
}

export const buildContentPreview = (entry: {
  title: string
  body: string | null
  url: string | null
  kind: z.infer<typeof contentEntryKindSchema>
  status: z.infer<typeof contentEntryStatusSchema>
  publish_at: string | null
  archive_at: string | null
}) => ({
  title: entry.title,
  body: entry.body ?? '',
  url: entry.url,
  kind: entry.kind,
  status: entry.status,
  visibility: entry.status === 'published' ? 'visible' : 'preview_only',
  schedule: {
    publishAt: entry.publish_at,
    archiveAt: entry.archive_at,
  },
})

export type ContentEntryInput = z.infer<typeof contentEntrySchema>
export type ContentEntryQuery = z.infer<typeof contentEntryQuerySchema>
export type FeatureFlagInput = z.infer<typeof featureFlagSchema>
