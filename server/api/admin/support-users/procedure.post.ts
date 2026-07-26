import { supportControlledProcedureSchema } from '#shared/validation/support-users'

export default defineEventHandler(async (event) => {
  const admin = await getSensitiveAdminContext(event)
  requireSupportProcedureAccess(admin.role)

  const body = await readBody(event)
  const parsed = supportControlledProcedureSchema.safeParse(body)

  if (!parsed.success) {
    throwValidationError(parsed.error)
  }

  const supabase = createSupabaseServiceRoleClient()
  const procedure = await createSupportControlledProcedure(supabase, {
    ...parsed.data,
    requestedBy: admin.userId,
  })

  await writeAdminAuditLog(supabase, {
    actorUserId: admin.userId,
    action: 'update',
    resourceType: 'support_user_procedure',
    resourceId: procedure.id,
    context: {
      userId: procedure.user_id,
      action: procedure.action,
      ticketReference: procedure.ticket_reference,
    },
  })

  return { data: procedure }
})
