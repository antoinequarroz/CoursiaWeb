import {
  canonicalIngredientParamsSchema,
  mergeCanonicalIngredientSchema,
} from '#shared/validation/ingredient-catalog'

export default defineEventHandler(async (event) => {
  const admin = await getSensitiveAdminContext(event)
  requireSensitiveIngredientAccess(admin.role)

  const params = await getValidatedRouterParams(event, canonicalIngredientParamsSchema.parse)
  const body = await readBody(event)
  const parsed = mergeCanonicalIngredientSchema.safeParse(body)

  if (!parsed.success) {
    throwValidationError(parsed.error)
  }

  const supabase = createSupabaseServiceRoleClient()
  const source = await getCanonicalIngredientById(supabase, params.id)
  const target = await getCanonicalIngredientById(supabase, parsed.data.targetId)

  await writeAdminAuditLog(supabase, {
    actorUserId: admin.userId,
    action: 'update',
    resourceType: 'canonical_ingredient',
    resourceId: target.id,
    context: {
      mergeSourceId: source.id,
      mergeSourceSlug: source.slug,
      reason: parsed.data.reason,
    },
  })

  return {
    data: {
      sourceId: source.id,
      targetId: target.id,
      impact: {
        affectedRecipes: 0,
        affectedSynonyms: source.synonyms.length,
        requiresReview: source.synonyms.length > 0,
      },
    },
  }
})

