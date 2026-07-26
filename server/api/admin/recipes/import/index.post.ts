import type { Json } from '#shared/supabase/database.types'
import {
  buildRecipeCsvIdempotencyKey,
  parseRecipeCsv,
  recipeCsvImportRequestSchema,
  summarizeRecipeCsvImport,
  validateRecipeCsvRows,
} from '#shared/validation/recipe-import'

export default defineEventHandler(async (event) => {
  const admin = await getSensitiveAdminContext(event)
  requireRecipeWriteAccess(admin.role)

  const body = await readBody(event)
  const parsed = recipeCsvImportRequestSchema.safeParse(body)

  if (!parsed.success) {
    throwValidationError(parsed.error)
  }

  const idempotencyKey = buildRecipeCsvIdempotencyKey(parsed.data.content)
  const supabase = createSupabaseServiceRoleClient()
  const { data: previousReport } = await supabase
    .from('recipe_import_reports')
    .select('*')
    .eq('idempotency_key', idempotencyKey)
    .maybeSingle()

  if (previousReport) {
    return { data: previousReport.report, idempotentReplay: true }
  }

  const rows = parseRecipeCsv(parsed.data.content)
  const { data: existingRecipes, error: existingError } = await supabase
    .from('official_recipes')
    .select('slug')

  if (existingError) {
    throwApiError('UPSTREAM_ERROR', 'Impossible de vérifier les recettes existantes.')
  }

  const existingSlugs = new Set((existingRecipes ?? []).map((recipe) => recipe.slug))
  const reportRows = validateRecipeCsvRows(rows, existingSlugs)
  const report = summarizeRecipeCsvImport(reportRows, idempotencyKey, parsed.data.dryRun)

  if (!parsed.data.dryRun && (report.errors > 0 || report.duplicates > 0)) {
    throwApiError(
      'INVALID_REQUEST',
      'Import refusé : corrigez les erreurs et doublons pour éviter un import partiel silencieux.',
      report,
    )
  }

  const { error: reportError } = await supabase.from('recipe_import_reports').insert({
    idempotency_key: idempotencyKey,
    file_name: parsed.data.fileName,
    dry_run: parsed.data.dryRun,
    report: report as unknown as Json,
    created_by: admin.userId,
  })

  if (reportError) {
    throwApiError('UPSTREAM_ERROR', 'Impossible de conserver le rapport d’import.')
  }

  await writeAdminAuditLog(supabase, {
    actorUserId: admin.userId,
    action: 'create',
    resourceType: 'official_recipe',
    resourceId: idempotencyKey,
    context: { importReport: true, dryRun: parsed.data.dryRun, fileName: parsed.data.fileName },
  })

  return { data: report, idempotentReplay: false }
})

