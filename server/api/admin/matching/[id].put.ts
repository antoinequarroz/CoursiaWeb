import {
  ingredientProductMatchParamsSchema,
  ingredientProductMatchUpdateSchema,
} from '#shared/validation/ingredient-product-matching'

export default defineEventHandler(async (event) => {
  const admin = await getSensitiveAdminContext(event)
  requireRetailCatalogAccess(admin.role)

  const params = await getValidatedRouterParams(event, ingredientProductMatchParamsSchema.parse)
  const body = await readBody(event)
  const parsed = ingredientProductMatchUpdateSchema.safeParse(body)

  if (!parsed.success) {
    throwValidationError(parsed.error)
  }

  const supabase = createSupabaseServiceRoleClient()
  const existing = await getMatchById(supabase, params.id)
  const unitComparison = parsed.data.unitComparison ?? existing.unit_comparison
  const comparable = Boolean(
    unitComparison
    && typeof unitComparison === 'object'
    && !Array.isArray(unitComparison)
    && unitComparison.comparable,
  )

  if (parsed.data.status === 'confirmed' && !comparable) {
    throwApiError('INVALID_REQUEST', 'Les formats et unitÃ©s doivent Ãªtre comparables avant confirmation.')
  }

  if (parsed.data.status === 'confirmed' && (parsed.data.confidence ?? existing.confidence) < 0.85) {
    throwApiError('INVALID_REQUEST', 'Un cas ambigu ne doit pas Ãªtre validÃ© silencieusement.')
  }

  const { data, error } = await supabase
    .from('ingredient_product_matches')
    .update(toIngredientProductMatchUpdateRow(parsed.data, existing, admin.userId))
    .eq('id', params.id)
    .select('*')
    .single()

  if (error) {
    throwApiError('UPSTREAM_ERROR', 'Impossible de modifier la correspondance.')
  }

  await writeAdminAuditLog(supabase, {
    actorUserId: admin.userId,
    action: 'update',
    resourceType: 'ingredient_product_match',
    resourceId: data.id,
    context: {
      fromStatus: existing.status,
      toStatus: data.status,
      confidence: data.confidence,
    },
  })

  return { data }
})
