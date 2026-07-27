import type { Json } from '#shared/supabase/database.types'
import {
  buildRecipeCsvIdempotencyKey,
  parseRecipeCsv,
  parseRecipeCsvIngredients,
  parseRecipeCsvSteps,
  recipeCsvImportRequestSchema,
  type RecipeCsvImportReport,
} from '#shared/validation/recipe-import'
import { mobileTable } from '../../../../utils/mobile-admin-mapping'

type SupabaseRpcClient = {
  rpc: (
    functionName: string,
    args: Record<string, unknown>,
  ) => PromiseLike<{
    data: unknown
    error: { message: string } | null
  }>
}

const toMobileStatus = (status: string | undefined) => {
  const statuses: Record<string, string> = {
    draft: 'brouillon',
    review: 'brouillon',
    published: 'publiee',
    archived: 'archivee',
  }

  return statuses[status ?? ''] ?? status ?? 'brouillon'
}

const normalizeUnit = (unit: string) => unit === 'piece' ? 'unite' : unit

const toReport = (
  dbResult: unknown,
  idempotencyKey: string,
  dryRun: boolean,
  slugs: string[],
): RecipeCsvImportReport => {
  const result = dbResult && typeof dbResult === 'object' && !Array.isArray(dbResult)
    ? dbResult as Record<string, unknown>
    : {}
  const summary = result.resume && typeof result.resume === 'object' && !Array.isArray(result.resume)
    ? result.resume as Record<string, unknown>
    : {}
  const errors = Array.isArray(result.erreurs)
    ? result.erreurs as Array<Record<string, unknown>>
    : []

  return {
    idempotencyKey,
    dryRun,
    creates: Number(summary.a_creer ?? 0),
    updates: Number(summary.a_mettre_a_jour ?? 0),
    duplicates: errors.filter((error) => String(error.message ?? '').includes('doublon')).length,
    errors: errors.length,
    rows: errors.length > 0
      ? errors.map((error) => ({
          rowNumber: Number(error.ligne ?? 1),
          action: String(error.message ?? '').includes('doublon') ? 'duplicate' : 'error',
          field: String(error.champ ?? 'row'),
          message: String(error.message ?? 'Erreur de validation Supabase.'),
        }))
      : slugs.map((slug, index) => ({
          rowNumber: index + 2,
          action: 'create',
          slug,
          message: dryRun ? 'Ligne validée en dry-run Supabase.' : 'Ligne importée dans Supabase.',
        })),
  }
}

const toMobileDifficulty = (difficulty: string | undefined) => {
  const difficulties: Record<string, string> = {
    easy: 'facile',
    medium: 'moyen',
    hard: 'difficile',
  }

  return difficulties[difficulty ?? ''] ?? difficulty ?? ''
}

export default defineEventHandler(async (event) => {
  const admin = await getSensitiveAdminContext(event)
  requireRecipeWriteAccess(admin.role)

  const body = await readBody(event)
  const parsed = recipeCsvImportRequestSchema.safeParse(body)

  if (!parsed.success) {
    throwValidationError(parsed.error)
  }

  const supabase = createSupabaseServiceRoleClient()
  const idempotencyKey = buildRecipeCsvIdempotencyKey(parsed.data.content)
  const { data: previousReport } = await mobileTable(supabase, 'recipe_import_reports')
    .select('*')
    .eq('idempotency_key', idempotencyKey)
    .maybeSingle()

  if (previousReport) {
    return {
      data: (previousReport as Record<string, unknown>).report as RecipeCsvImportReport,
      idempotencyKey,
      idempotentReplay: true,
    }
  }

  const rows = parseRecipeCsv(parsed.data.content)
  const lignes = rows.map((row) => ({
    ligne: row.rowNumber,
    cle_externe: row.slug ?? '',
    titre: row.title ?? '',
    statut_publication: toMobileStatus(row.status),
    portions: row.portions ?? '',
    temps_preparation: row.durationMinutes ?? '',
    difficulte: toMobileDifficulty(row.difficulty),
    source: row.source ?? '',
    ingredients: parseRecipeCsvIngredients(row.ingredients).map((ingredient) => ({
      nom: ingredient.name,
      quantite: ingredient.quantity,
      unite: normalizeUnit(ingredient.unit),
    })),
    etapes: parseRecipeCsvSteps(row.steps).map((step) => step.instruction),
    regimes: row.regimes ? row.regimes.split(';').map((item) => item.trim()).filter(Boolean) : [],
    allergenes: row.allergens ? row.allergens.split(';').map((item) => item.trim()).filter(Boolean) : [],
  }))
  const { data, error } = await (supabase as unknown as SupabaseRpcClient).rpc('fn_importer_recettes_csv', {
    lignes: lignes as unknown as Json,
    dry_run: parsed.data.dryRun,
  })

  if (error) {
    throwApiError('UPSTREAM_ERROR', 'Impossible d’exécuter l’import CSV des recettes.')
  }

  const report = toReport(
    data,
    idempotencyKey,
    parsed.data.dryRun,
    rows.map((row) => row.slug ?? ''),
  )

  const { error: reportError } = await mobileTable(supabase, 'recipe_import_reports').insert({
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
    context: {
      importReport: true,
      dryRun: parsed.data.dryRun,
      fileName: parsed.data.fileName,
      table: 'recettes',
      importer: 'fn_importer_recettes_csv',
    },
  })

  return {
    data: report,
    idempotencyKey,
    idempotentReplay: false,
  }
})
