import {
  ingredientProductMatchParamsSchema,
  ingredientProductMatchUpdateSchema,
} from '#shared/validation/ingredient-product-matching'
import { mobileTable } from '../../../utils/mobile-admin-mapping'
import { getMatchById, toVirtualIngredientProductMatch } from '../../../utils/ingredient-product-matching'

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
    throwApiError('INVALID_REQUEST', 'Les formats et unités doivent être comparables avant confirmation.')
  }

  if (parsed.data.status === 'confirmed' && (parsed.data.confidence ?? existing.confidence) < 0.85) {
    throwApiError('INVALID_REQUEST', 'Un cas ambigu ne doit pas être validé silencieusement.')
  }

  const { data, error } = await mobileTable(supabase, 'produits_canoniques')
    .update({
      ingredient_id: parsed.data.status === 'rejected'
        ? null
        : parsed.data.ingredientId ?? existing.ingredient_id,
    })
    .eq('id', params.id)
    .select('*')
    .single()

  if (error) {
    throwApiError('UPSTREAM_ERROR', 'Impossible de modifier la correspondance.')
  }

  const match = toVirtualIngredientProductMatch(data as Record<string, unknown>, {
    enseigne_id: parsed.data.retailerId ?? existing.retailer_id,
    unite: typeof unitComparison.productUnit === 'string' ? unitComparison.productUnit : 'unite',
  })

  await writeAdminAuditLog(supabase, {
    actorUserId: admin.userId,
    action: 'update',
    resourceType: 'ingredient_product_match',
    resourceId: match.id,
    context: {
      fromStatus: existing.status,
      toStatus: parsed.data.status,
      confidence: parsed.data.confidence ?? existing.confidence,
      table: 'produits_canoniques',
    },
  })

  return { data: match }
})
