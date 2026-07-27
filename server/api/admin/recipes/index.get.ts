import { officialRecipeListQuerySchema } from '#shared/validation/course'

export default defineEventHandler(async (event) => {
  const admin = await getSensitiveAdminContext(event)
  requireRecipeWriteAccess(admin.role)

  const query = await getValidatedQuery(event, officialRecipeListQuerySchema.parse)
  const supabase = createSupabaseServiceRoleClient()
  let request = mobileTable(supabase, 'recettes')
    .select('*')
    .order('updated_at', { ascending: false })
    .limit(query.limit)

  if (query.search) {
    request = request.or(`titre.ilike.%${query.search}%,cle_externe.ilike.%${query.search}%`)
  }

  if (query.status) {
    request = request.eq('statut_publication', toMobileRecipeStatus(query.status))
  }

  if (query.difficulty) {
    request = request.eq('difficulte', toMobileDifficulty(query.difficulty))
  }

  // La table mobile `recettes` n'a pas encore de colonne catégories directe.
  // Le filtre est conservé côté contrat API, mais ignoré jusqu'au rattachement via `recette_regimes`/tags.

  const { data, error } = await request

  if (error) {
    throwApiError('UPSTREAM_ERROR', 'Impossible de lister les recettes mobile.')
  }

  return { data: Array.isArray(data) ? data.map(toAdminRecipeRow) : [] }
})
