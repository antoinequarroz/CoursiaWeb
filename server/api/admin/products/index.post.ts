import { productSchema } from '#shared/validation/retail-catalog'

export default defineEventHandler(async (event) => {
  const admin = await getSensitiveAdminContext(event)
  requireRetailCatalogAccess(admin.role)

  const body = await readBody(event)
  const parsed = productSchema.safeParse(body)

  if (!parsed.success) {
    throwValidationError(parsed.error)
  }

  const supabase = createSupabaseServiceRoleClient()
  const { data: productData, error: productError } = await mobileTable(supabase, 'produits_canoniques')
    .insert(toMobileProductRow(parsed.data))
    .select('*')
    .single()

  if (productError) {
    throwApiError('UPSTREAM_ERROR', 'Impossible de créer le produit mobile.')
  }

  const product = toAdminProductRow(productData as never)
  const { data: offerData, error: offerError } = await mobileTable(supabase, 'offres_magasin')
    .insert(toMobileOfferRow(parsed.data, String(product.id)))
    .select('*')
    .single()

  if (offerError) {
    throwApiError('UPSTREAM_ERROR', 'Produit créé, mais impossible de créer son offre magasin.')
  }

  await writeAdminAuditLog(supabase, {
    actorUserId: admin.userId,
    action: 'create',
    resourceType: 'course',
    resourceId: String(product.id),
    context: {
      table: 'produits_canoniques',
      offerTable: 'offres_magasin',
      offerId: String((offerData as Record<string, unknown>).id ?? ''),
      retailerId: parsed.data.retailerId,
    },
  })

  return { data: { ...product, retailer_id: parsed.data.retailerId, offer: offerData } }
})
