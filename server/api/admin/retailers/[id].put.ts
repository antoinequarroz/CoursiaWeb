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
  const { data, error } = await mobileTable(supabase, 'enseignes')
    .update(toMobileRetailerRow(parsed.data))
    .eq('id', params.id)
    .select('*')
    .single()

  if (error) {
    throwApiError('UPSTREAM_ERROR', 'Impossible de modifier l’enseigne mobile.')
  }

  const retailer = toAdminRetailerRow(data as never)

  await writeAdminAuditLog(supabase, {
    actorUserId: admin.userId,
    action: 'update',
    resourceType: 'course',
    resourceId: String(retailer.id),
    context: { slug: retailer.slug, table: 'enseignes' },
  })

  return { data: retailer }
})
