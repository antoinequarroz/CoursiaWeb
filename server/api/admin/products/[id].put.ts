import { productSchema, retailCatalogParamsSchema } from '#shared/validation/retail-catalog'

export default defineEventHandler(async (event) => {
  const admin = await getSensitiveAdminContext(event)
  requireRetailCatalogAccess(admin.role)

  const params = await getValidatedRouterParams(event, retailCatalogParamsSchema.parse)
  const body = await readBody(event)
  const parsed = productSchema.safeParse(body)

  if (!parsed.success) {
    throwValidationError(parsed.error)
  }

  const supabase = createSupabaseServiceRoleClient()
  const { data, error } = await mobileTable(supabase, 'produits_canoniques')
    .update(toMobileProductRow(parsed.data))
    .eq('id', params.id)
    .select('*')
    .single()

  if (error) {
    throwApiError('UPSTREAM_ERROR', 'Impossible de modifier le produit mobile.')
  }

  const product = toAdminProductRow(data as never)
  const offerPayload = toMobileOfferRow(parsed.data, product.id)
  const { data: existingOffer, error: existingOfferError } = await mobileTable(supabase, 'offres_magasin')
    .select('id')
    .eq('produit_canonique_id', product.id)
    .eq('enseigne_id', parsed.data.retailerId)
    .maybeSingle()

  if (existingOfferError) {
    throwApiError('UPSTREAM_ERROR', 'Produit modifié, mais impossible de consulter son offre magasin.')
  }

  if (existingOffer && typeof existingOffer === 'object' && 'id' in existingOffer) {
    const { error: offerUpdateError } = await mobileTable(supabase, 'offres_magasin')
      .update(offerPayload)
      .eq('id', String((existingOffer as Record<string, unknown>).id))

    if (offerUpdateError) {
      throwApiError('UPSTREAM_ERROR', 'Produit modifié, mais impossible de modifier son offre magasin.')
    }
  } else {
    const { error: offerInsertError } = await mobileTable(supabase, 'offres_magasin')
      .insert(offerPayload)

    if (offerInsertError) {
      throwApiError('UPSTREAM_ERROR', 'Produit modifié, mais impossible de créer son offre magasin.')
    }
  }

  await writeAdminAuditLog(supabase, {
    actorUserId: admin.userId,
    action: parsed.data.status === 'archived' ? 'archive' : 'update',
    resourceType: 'course',
    resourceId: String(product.id),
    context: { table: 'produits_canoniques', retailerId: parsed.data.retailerId },
  })

  return { data: { ...product, retailer_id: parsed.data.retailerId } }
})
