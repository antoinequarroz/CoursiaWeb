import { z } from 'zod'
import { officialRecipeDraftSchema } from '#shared/validation/course'

export const recipeCsvColumns = [
  'slug',
  'title',
  'status',
  'portions',
  'durationMinutes',
  'difficulty',
  'categories',
  'source',
] as const

export const recipeCsvTemplate = `${recipeCsvColumns.join(',')}\none-pot-pasta,One pot pasta,draft,4,25,easy,"Famille;Rapide",Cuisine interne\n`

export const recipeCsvImportRequestSchema = z.object({
  fileName: z.string().trim().min(1).max(220),
  content: z.string().min(1).max(1024 * 1024),
  dryRun: z.boolean().default(true),
})

export const recipeCsvImportReportSchema = z.object({
  idempotencyKey: z.string().min(32),
  dryRun: z.boolean(),
  creates: z.number().int().min(0),
  updates: z.number().int().min(0),
  duplicates: z.number().int().min(0),
  errors: z.number().int().min(0),
  rows: z.array(
    z.object({
      rowNumber: z.number().int().min(1),
      action: z.enum(['create', 'update', 'duplicate', 'error']),
      slug: z.string().optional(),
      field: z.string().optional(),
      message: z.string().optional(),
    }),
  ),
})

export type RecipeCsvImportReport = z.infer<typeof recipeCsvImportReportSchema>
export type RecipeCsvRow = {
  rowNumber: number
  slug?: string
  title?: string
  status?: string
  portions?: string
  durationMinutes?: string
  difficulty?: string
  categories?: string
  source?: string
}

export const buildRecipeCsvIdempotencyKey = (content: string) => {
  let hash = 0x811c9dc5

  for (const character of content.trim()) {
    hash ^= character.charCodeAt(0)
    hash = Math.imul(hash, 0x01000193)
  }

  return Array.from({ length: 8 }, (_, index) =>
    ((hash + index * 0x9e3779b9) >>> 0).toString(16).padStart(8, '0'),
  ).join('')
}

export const parseRecipeCsv = (content: string) => {
  const lines = content.trim().split(/\r?\n/)
  const headers = lines[0]?.split(',').map((header) => header.trim()) ?? []

  return lines.slice(1).map((line, lineIndex): RecipeCsvRow => {
    const values =
      line.match(/(".*?"|[^",]+)(?=\s*,|\s*$)/g)?.map((value) =>
        value.replace(/^"|"$/g, '').trim(),
      ) ?? []
    const row = Object.fromEntries(
      headers.map((header, headerIndex) => [header, values[headerIndex] ?? '']),
    ) as Omit<RecipeCsvRow, 'rowNumber'>

    return {
      ...row,
      rowNumber: lineIndex + 2,
    }
  })
}

export const validateRecipeCsvRows = (
  rows: RecipeCsvRow[],
  existingSlugs: Set<string>,
) => {
  const seen = new Set<string>()
  const reportRows: RecipeCsvImportReport['rows'] = []

  for (const row of rows) {
    const slug = row.slug ?? ''

    if (seen.has(slug)) {
      reportRows.push({
        rowNumber: row.rowNumber,
        action: 'duplicate',
        slug,
        field: 'slug',
        message: 'Doublon dans le fichier CSV.',
      })
      continue
    }

    seen.add(slug)

    const parsed = officialRecipeDraftSchema.safeParse({
      slug,
      title: row.title ?? '',
      status: row.status || 'draft',
      portions: row.portions ? Number(row.portions) : undefined,
      durationMinutes: row.durationMinutes ? Number(row.durationMinutes) : undefined,
      difficulty: row.difficulty || undefined,
      categories: row.categories ? row.categories.split(';').map((item) => item.trim()) : [],
      source: row.source || undefined,
      ingredients: [],
      steps: [],
      nutrition: {},
    })

    if (!parsed.success) {
      reportRows.push({
        rowNumber: row.rowNumber,
        action: 'error',
        slug,
        field: Object.keys(parsed.error.flatten().fieldErrors)[0] ?? 'row',
        message: 'Validation de ligne invalide.',
      })
      continue
    }

    reportRows.push({
      rowNumber: row.rowNumber,
      action: existingSlugs.has(slug) ? 'update' : 'create',
      slug,
    })
  }

  return reportRows
}

export const summarizeRecipeCsvImport = (
  rows: RecipeCsvImportReport['rows'],
  idempotencyKey: string,
  dryRun: boolean,
): RecipeCsvImportReport => ({
  idempotencyKey,
  dryRun,
  creates: rows.filter((row) => row.action === 'create').length,
  updates: rows.filter((row) => row.action === 'update').length,
  duplicates: rows.filter((row) => row.action === 'duplicate').length,
  errors: rows.filter((row) => row.action === 'error').length,
  rows,
})
