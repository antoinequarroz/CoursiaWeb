import { parseRetailCsv, retailCsvColumns, validateRetailCsvRows } from '#shared/validation/retail-catalog'
import { mobileTable } from '../../../utils/mobile-admin-mapping'

const slugify = (value: string) =>
  value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

export default defineEventHandler(async (event) => {
  const admin = await getSensitiveAdminContext(event)
  requireRetailCatalogAccess(admin.role)

  const body = await readBody<{ fileName?: string; content?: string }>(event)

  if (!body?.content) {
    throwApiError('INVALID_REQUEST', 'Contenu CSV manquant.')
  }

  const supabase = createSupabaseServiceRoleClient()
  const { data: products, error } = await mobileTable(supabase, 'produits_canoniques')
    .select('nom')
    .limit(5000)

  if (error) {
    throwApiError('UPSTREAM_ERROR', 'Impossible de préparer l’import comparateur.')
  }

  const rows = parseRetailCsv(body.content)
  const existingProductSlugs = new Set(
    Array.isArray(products)
      ? products.map((product) => slugify(String((product as Record<string, unknown>).nom ?? '')))
      : [],
  )
  const preview = validateRetailCsvRows(rows, existingProductSlugs)

  await writeAdminAuditLog(supabase, {
    actorUserId: admin.userId,
    action: 'create',
    resourceType: 'price_entry',
    resourceId: preview.idempotencyKey,
    context: {
      mode: 'csv_preview',
      columns: [...retailCsvColumns],
      errors: preview.errors,
      fileName: body.fileName ?? 'retail-import.csv',
      table: 'produits_canoniques',
    },
  })

  return { data: preview, reportId: preview.idempotencyKey }
})
