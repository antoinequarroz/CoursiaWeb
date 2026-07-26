import { priceEntrySchema } from '#shared/validation/retail-catalog'

export default defineEventHandler(async (event) => {
  const admin = await getSensitiveAdminContext(event)
  requireRetailCatalogAccess(admin.role)

  const body = await readBody(event)
  const parsed = priceEntrySchema.safeParse(body)

  if (!parsed.success) {
    throwValidationError(parsed.error)
  }

  const supabase = createSupabaseServiceRoleClient()
  const previousPrice = await getLatestPriceForProduct(supabase, parsed.data.productId)
  const { data, error } = await supabase
    .from('price_entries')
    .insert(toPriceEntryRow(parsed.data, previousPrice))
    .select('*')
    .single()

  if (error) {
    throwApiError('UPSTREAM_ERROR', 'Impossible dâ€™enregistrer le prix.')
  }

  await writePriceHistory(supabase, { priceEntry: data, previousPrice, userId: admin.userId })

  await writeAdminAuditLog(supabase, {
    actorUserId: admin.userId,
    action: 'create',
    resourceType: 'price_entry',
    resourceId: data.id,
    context: {
      productId: data.product_id,
      retailerId: data.retailer_id,
      amountChf: data.amount_chf,
      qualityStatus: data.quality_status,
    },
  })

  return { data, previousPrice }
})
