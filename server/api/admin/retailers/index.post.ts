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
  const { data, error } = await supabase.from('retailers').insert(toRetailerRow(parsed.data)).select('*').single()

  if (error) {
    throwApiError('UPSTREAM_ERROR', 'Impossible de crÃ©er lâ€™enseigne.')
  }

  await writeAdminAuditLog(supabase, {
    actorUserId: admin.userId,
    action: 'create',
    resourceType: 'retailer',
    resourceId: data.id,
    context: { slug: data.slug, status: data.status },
  })

  return { data }
})
