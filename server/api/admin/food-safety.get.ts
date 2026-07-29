type SafetyReferenceRow = {
  id?: string
  code?: string
  libelle?: string
}

function buildUsageCounts(rows: unknown, key: string): Record<string, number> {
  const counts: Record<string, number> = {}
  const items = Array.isArray(rows) ? rows as Array<Record<string, unknown>> : []

  for (const item of items) {
    const id = String(item[key] ?? '')
    if (id) {
      counts[id] = (counts[id] ?? 0) + 1
    }
  }

  return counts
}

function mapReference(row: SafetyReferenceRow, usageCounts: Record<string, number>) {
  const id = String(row.id ?? '')

  return {
    id,
    code: String(row.code ?? ''),
    label: String(row.libelle ?? row.code ?? ''),
    usageCount: usageCounts[id] ?? 0,
  }
}

export default defineEventHandler(async (event) => {
  const admin = await getSensitiveAdminContext(event)
  requireIngredientWriteAccess(admin.role)

  const supabase = createSupabaseServiceRoleClient()
  const [
    allergensResult,
    dietsResult,
    ingredientAllergensResult,
    recipeDietsResult,
  ] = await Promise.all([
    mobileTable(supabase, 'allergenes').select('id,code,libelle').order('libelle', { ascending: true }),
    mobileTable(supabase, 'regimes').select('id,code,libelle').order('libelle', { ascending: true }),
    mobileTable(supabase, 'ingredient_allergenes').select('allergene_id'),
    mobileTable(supabase, 'recette_regimes').select('regime_id'),
  ])

  if (allergensResult.error || dietsResult.error || ingredientAllergensResult.error || recipeDietsResult.error) {
    throwApiError('UPSTREAM_ERROR', 'Impossible de charger le référentiel alimentaire.')
  }

  const allergenUsageCounts = buildUsageCounts(ingredientAllergensResult.data, 'allergene_id')
  const dietUsageCounts = buildUsageCounts(recipeDietsResult.data, 'regime_id')
  const allergens = Array.isArray(allergensResult.data)
    ? (allergensResult.data as SafetyReferenceRow[]).map((row) => mapReference(row, allergenUsageCounts))
    : []
  const diets = Array.isArray(dietsResult.data)
    ? (dietsResult.data as SafetyReferenceRow[]).map((row) => mapReference(row, dietUsageCounts))
    : []

  return {
    data: {
      allergens,
      diets,
      counts: {
        allergens: allergens.length,
        diets: diets.length,
        linkedIngredients: Object.values(allergenUsageCounts).reduce((sum, count) => sum + count, 0),
        linkedRecipes: Object.values(dietUsageCounts).reduce((sum, count) => sum + count, 0),
      },
    },
  }
})
