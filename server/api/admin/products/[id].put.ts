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

  await writeAdminAuditLog(supabase, {
    actorUserId: admin.userId,
    action: parsed.data.status === 'archived' ? 'archive' : 'update',
    resourceType: 'course',
    resourceId: String(product.id),
    context: { table: 'produits_canoniques', retailerId: parsed.data.retailerId },
  })

  return { data: { ...product, retailer_id: parsed.data.retailerId } }
})
