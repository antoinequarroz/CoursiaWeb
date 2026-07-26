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
  const { data, error } = await supabase.from('products').insert(toProductRow(parsed.data)).select('*').single()

  if (error) {
    throwApiError('UPSTREAM_ERROR', 'Impossible de crÃ©er le produit.')
  }

  await writeAdminAuditLog(supabase, {
    actorUserId: admin.userId,
    action: 'create',
    resourceType: 'product',
    resourceId: data.id,
    context: { slug: data.slug, retailerId: data.retailer_id, format: data.format },
  })

  return { data }
})
