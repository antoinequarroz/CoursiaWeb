import { ingredientProductMatchSchema } from '#shared/validation/ingredient-product-matching'

export default defineEventHandler(async (event) => {
  const admin = await getSensitiveAdminContext(event)
  requireRetailCatalogAccess(admin.role)

  const body = await readBody(event)
  const parsed = ingredientProductMatchSchema.safeParse(body)

  if (!parsed.success) {
    throwValidationError(parsed.error)
  }

  if (parsed.data.status === 'confirmed' && !parsed.data.unitComparison.comparable) {
    throwApiError('INVALID_REQUEST', 'Une correspondance aux unitÃ©s non comparables ne peut pas Ãªtre confirmÃ©e.')
  }

  if (parsed.data.status === 'confirmed' && parsed.data.confidence < 0.85) {
    throwApiError('INVALID_REQUEST', 'Les cas ambigus doivent rester signalÃ©s avant confirmation.')
  }

  const supabase = createSupabaseServiceRoleClient()
  const { data, error } = await supabase
    .from('ingredient_product_matches')
    .insert(toIngredientProductMatchRow(parsed.data, admin.userId))
    .select('*')
    .single()

  if (error) {
    throwApiError('UPSTREAM_ERROR', 'Impossible de crÃ©er la correspondance ingrÃ©dient-produit.')
  }

  await writeAdminAuditLog(supabase, {
    actorUserId: admin.userId,
    action: 'create',
    resourceType: 'ingredient_product_match',
    resourceId: data.id,
    context: {
      ingredientId: data.ingredient_id,
      productId: data.product_id,
      confidence: data.confidence,
      status: data.status,
    },
  })

  return { data }
})
