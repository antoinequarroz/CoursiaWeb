import { canonicalIngredientListQuerySchema } from '#shared/validation/ingredient-catalog'

export default defineEventHandler(async (event) => {
  const admin = await getSensitiveAdminContext(event)
  requireIngredientWriteAccess(admin.role)

  const query = await getValidatedQuery(event, canonicalIngredientListQuerySchema.parse)
  const supabase = createSupabaseServiceRoleClient()

  let ingredientIdsMatchingAllergen: string[] | null = null

  if (query.allergen) {
    const { data: allergen, error: allergenError } = await mobileTable(supabase, 'allergenes')
      .select('id')
      .eq('code', query.allergen)
      .maybeSingle()

    if (allergenError) {
      throwApiError('UPSTREAM_ERROR', 'Impossible de charger l allergene demande.')
    }

    const allergenId = typeof allergen === 'object' && allergen && 'id' in allergen
      ? String((allergen as Record<string, unknown>).id)
      : ''

    if (!allergenId) {
      return { data: [] }
    }

    const { data: links, error: linksError } = await mobileTable(supabase, 'ingredient_allergenes')
      .select('ingredient_id')
      .eq('allergene_id', allergenId)

    if (linksError) {
      throwApiError('UPSTREAM_ERROR', 'Impossible de filtrer les ingredients par allergene.')
    }

    ingredientIdsMatchingAllergen = Array.isArray(links)
      ? links.map((link) => String((link as Record<string, unknown>).ingredient_id)).filter(Boolean)
      : []

    if (ingredientIdsMatchingAllergen.length === 0) {
      return { data: [] }
    }
  }

  let request = mobileTable(supabase, 'ingredients')
    .select('*')
    .order('nom', { ascending: true })
    .limit(query.limit)

  if (ingredientIdsMatchingAllergen) {
    request = request.in('id', ingredientIdsMatchingAllergen)
  }

  if (query.search) {
    request = request.or(`nom.ilike.%${query.search}%,rayon.ilike.%${query.search}%`)
  }

  if (query.status === 'active') {
    request = request.is('archived_at', null)
  }

  if (query.status === 'archived') {
    request = request.not('archived_at', 'is', null)
  }

  const { data, error } = await request

  if (error) {
    throwApiError('UPSTREAM_ERROR', 'Impossible de lister les ingrédients mobile.')
  }

  const rows = Array.isArray(data) ? data.map(toAdminIngredientRow) : []
  const ingredientIds = rows.map((ingredient) => ingredient.id)

  if (ingredientIds.length === 0) {
    return { data: rows }
  }

  const [usageResult, allergenResult] = await Promise.all([
    mobileTable(supabase, 'recette_ingredients')
      .select('ingredient_id')
      .in('ingredient_id', ingredientIds),
    mobileTable(supabase, 'ingredient_allergenes')
      .select('ingredient_id,certitude,allergenes(code,libelle)')
      .in('ingredient_id', ingredientIds),
  ])

  const usageCounts = new Map<string, number>()
  const usageRows = Array.isArray(usageResult.data)
    ? usageResult.data as Array<Record<string, unknown>>
    : []

  for (const usage of usageRows) {
    const id = String(usage.ingredient_id ?? '')
    usageCounts.set(id, (usageCounts.get(id) ?? 0) + 1)
  }

  const allergensByIngredient = new Map<string, Array<{ code: string, label: string, certainty: string | null }>>()
  const allergenRows = Array.isArray(allergenResult.data)
    ? allergenResult.data as Array<Record<string, unknown>>
    : []

  for (const link of allergenRows) {
    const id = String(link.ingredient_id ?? '')
    const allergen = link.allergenes as Record<string, unknown> | null | undefined
    const current = allergensByIngredient.get(id) ?? []

    if (allergen?.code) {
      current.push({
        code: String(allergen.code),
        label: String(allergen.libelle ?? allergen.code),
        certainty: typeof link.certitude === 'string' ? link.certitude : null,
      })
      allergensByIngredient.set(id, current)
    }
  }

  return {
    data: rows.map((ingredient) => ({
      ...ingredient,
      usage_count: usageCounts.get(ingredient.id) ?? 0,
      linked_allergens: allergensByIngredient.get(ingredient.id) ?? [],
    })),
  }
})
