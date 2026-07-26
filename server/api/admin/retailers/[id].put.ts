import { retailerSchema, retailCatalogParamsSchema } from '#shared/validation/retail-catalog'

export default defineEventHandler(async (event) => {
  const admin = await getSensitiveAdminContext(event)
  requireRetailCatalogAccess(admin.role)

  const params = await getValidatedRouterParams(event, retailCatalogParamsSchema.parse)
  const body = await readBody(event)
  const parsed = retailerSchema.safeParse(body)

  if (!parsed.success) {
    throwValidationError(parsed.error)
  }

  const supabase = createSupabaseServiceRoleClient()
  const { data, error } = await supabase
    .from('retailers')
    .update(toRetailerRow(parsed.data))
    .eq('id', params.id)
    .select('*')
    .single()

  if (error) {
    throwApiError('UPSTREAM_ERROR', 'Impossible de modifier lâ€™enseigne.')
  }

  await writeAdminAuditLog(supabase, {
    actorUserId: admin.userId,
    action: data.status === 'archived' ? 'archive' : 'update',
    resourceType: 'retailer',
    resourceId: data.id,
    context: { slug: data.slug, status: data.status },
  })

  return { data }
})
