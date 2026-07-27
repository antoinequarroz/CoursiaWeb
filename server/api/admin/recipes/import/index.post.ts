import type { Json } from '#shared/supabase/database.types'
import {
  buildRecipeCsvIdempotencyKey,
  parseRecipeCsv,
  recipeCsvImportRequestSchema,
} from '#shared/validation/recipe-import'

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
    review: 'en_attente',
    published: 'publiee',
    archived: 'archivee',
  }

  return statuses[status ?? ''] ?? status ?? 'brouillon'
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

  const idempotencyKey = buildRecipeCsvIdempotencyKey(parsed.data.content)
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
    ingredients: [],
    etapes: [],
    regimes: row.categories ? row.categories.split(';').map((item) => item.trim()).filter(Boolean) : [],
    allergenes: [],
  }))

  const supabase = createSupabaseServiceRoleClient()
  const { data, error } = await (supabase as unknown as SupabaseRpcClient).rpc('fn_importer_recettes_csv', {
    lignes: lignes as unknown as Json,
    dry_run: parsed.data.dryRun,
  })

  if (error) {
    throwApiError('UPSTREAM_ERROR', 'Impossible d’exécuter l’import CSV des recettes.')
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
    data,
    idempotencyKey,
    idempotentReplay: false,
  }
})
