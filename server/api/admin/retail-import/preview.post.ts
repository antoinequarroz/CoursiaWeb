import { parseRetailCsv, retailCsvColumns, validateRetailCsvRows } from '#shared/validation/retail-catalog'
import type { Json } from '#shared/supabase/database.types'

export default defineEventHandler(async (event) => {
  const admin = await getSensitiveAdminContext(event)
  requireRetailCatalogAccess(admin.role)

  const body = await readBody<{ fileName?: string; content?: string }>(event)

  if (!body?.content) {
    throwApiError('INVALID_REQUEST', 'Contenu CSV manquant.')
  }

  const supabase = createSupabaseServiceRoleClient()
  const { data: products, error } = await supabase.from('products').select('slug').limit(5000)

  if (error) {
    throwApiError('UPSTREAM_ERROR', 'Impossible de prÃ©parer lâ€™import comparateur.')
  }

  const rows = parseRetailCsv(body.content)
  const preview = validateRetailCsvRows(rows, new Set((products ?? []).map((product) => product.slug)))

  const { data: report, error: reportError } = await supabase
    .from('retail_import_reports')
    .insert({
      idempotency_key: preview.idempotencyKey,
      file_name: body.fileName ?? 'retail-import.csv',
      preview: preview as unknown as Json,
      created_by: admin.userId,
    })
    .select('*')
    .single()

  if (reportError) {
    throwApiError('UPSTREAM_ERROR', 'Impossible de conserver la prÃ©visualisation dâ€™import.')
  }

  await writeAdminAuditLog(supabase, {
    actorUserId: admin.userId,
    action: 'create',
    resourceType: 'price_entry',
    resourceId: report.id,
    context: { mode: 'csv_preview', columns: [...retailCsvColumns], errors: preview.errors },
  })

  return { data: preview, reportId: report.id }
})
