import { retailerSchema } from '#shared/validation/retail-catalog'

export default defineEventHandler(async (event) => {
  const admin = await getSensitiveAdminContext(event)
  requireRetailCatalogAccess(admin.role)

  const body = await readBody(event)
  const parsed = retailerSchema.safeParse(body)

  if (!parsed.success) {
    throwValidationError(parsed.error)
  }

  const supabase = createSupabaseServiceRoleClient()
  const { data, error } = await mobileTable(supabase, 'enseignes')
    .insert(toMobileRetailerRow(parsed.data))
    .select('*')
    .single()

  if (error) {
    throwApiError('UPSTREAM_ERROR', 'Impossible de créer l’enseigne mobile.')
  }

  const retailer = toAdminRetailerRow(data as never)

  await writeAdminAuditLog(supabase, {
    actorUserId: admin.userId,
    action: 'create',
    resourceType: 'course',
    resourceId: String(retailer.id),
    context: { slug: retailer.slug, table: 'enseignes' },
  })

  return { data: retailer }
})
