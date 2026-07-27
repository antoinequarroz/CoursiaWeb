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
  const { data, error } = await mobileTable(supabase, 'prix_historique')
    .insert(toMobilePriceRow(parsed.data))
    .select('*')
    .single()

  if (error) {
    throwApiError('UPSTREAM_ERROR', 'Impossible d’enregistrer le prix mobile.')
  }

  const price = toAdminPriceRow(data as never)

  await writeAdminAuditLog(supabase, {
    actorUserId: admin.userId,
    action: 'create',
    resourceType: 'course',
    resourceId: String(price.id),
    context: {
      table: 'prix_historique',
      offerId: price.product_id,
      amountChf: Number(price.amount_chf),
    },
  })

  return { data: price, previousPrice: null }
})
