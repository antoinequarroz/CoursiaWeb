import { ingredientProductMatchSchema } from '#shared/validation/ingredient-product-matching'
import { mobileTable } from '../../../utils/mobile-admin-mapping'
import { toVirtualIngredientProductMatch } from '../../../utils/ingredient-product-matching'

export default defineEventHandler(async (event) => {
  const admin = await getSensitiveAdminContext(event)
  requireRetailCatalogAccess(admin.role)

  const body = await readBody(event)
  const parsed = ingredientProductMatchSchema.safeParse(body)

  if (!parsed.success) {
    throwValidationError(parsed.error)
  }

  if (parsed.data.status === 'confirmed' && !parsed.data.unitComparison.comparable) {
    throwApiError('INVALID_REQUEST', 'Une correspondance aux unités non comparables ne peut pas être confirmée.')
  }

  if (parsed.data.status === 'confirmed' && parsed.data.confidence < 0.85) {
    throwApiError('INVALID_REQUEST', 'Les cas ambigus doivent rester signalés avant confirmation.')
  }

  const supabase = createSupabaseServiceRoleClient()
  const { data, error } = await mobileTable(supabase, 'produits_canoniques')
    .update({ ingredient_id: parsed.data.status === 'rejected' ? null : parsed.data.ingredientId })
    .eq('id', parsed.data.productId)
    .select('*')
    .single()

  if (error) {
    throwApiError('UPSTREAM_ERROR', 'Impossible de créer la correspondance ingrédient-produit.')
  }

  const match = toVirtualIngredientProductMatch(data as Record<string, unknown>, {
    enseigne_id: parsed.data.retailerId,
    unite: parsed.data.unitComparison.productUnit,
  })

  await writeAdminAuditLog(supabase, {
    actorUserId: admin.userId,
    action: 'create',
    resourceType: 'ingredient_product_match',
    resourceId: match.id,
    context: {
      ingredientId: match.ingredient_id,
      productId: match.product_id,
      confidence: parsed.data.confidence,
      status: parsed.data.status,
      table: 'produits_canoniques',
    },
  })

  return { data: match }
})
