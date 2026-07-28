import { z } from 'zod'
import type { Database } from '#shared/supabase/database.types'

const leadParamsSchema = z.object({
  id: z.uuid(),
})

const leadPatchSchema = z.object({
  status: z.enum(['new', 'reviewed', 'archived']).optional(),
  internalNote: z.string().trim().max(2000).optional(),
})

export default defineEventHandler(async (event) => {
  const admin = await getSensitiveAdminContext(event)
  requireSupportUserReadAccess(admin.role)

  const params = leadParamsSchema.safeParse(getRouterParams(event))
  if (!params.success) {
    throwValidationError(params.error)
  }

  const body = await readBody(event)
  const parsed = leadPatchSchema.safeParse(body)
  if (!parsed.success) {
    throwValidationError(parsed.error)
  }

  if (!parsed.data.status && parsed.data.internalNote === undefined) {
    throwApiError('INVALID_REQUEST', 'Aucune modification de lead à enregistrer.')
  }

  const supabase = createSupabaseServiceRoleClient()
  const updatePayload: Database['public']['Tables']['contact_submissions']['Update'] = {
    updated_at: new Date().toISOString(),
  }

  if (parsed.data.status) {
    updatePayload.status = parsed.data.status
  }

  if (parsed.data.internalNote !== undefined) {
    updatePayload.internal_note = parsed.data.internalNote || null
  }

  const { data, error } = await supabase
    .from('contact_submissions')
    .update(updatePayload)
    .eq('id', params.data.id)
    .select('id,name,email,reason,message,source,status,internal_note,created_at,updated_at,consented_at')
    .single()

  if (error || !data) {
    throwApiError('UPSTREAM_ERROR', 'Impossible de mettre à jour ce lead.')
  }

  await writeAdminAuditLog(supabase, {
    actorUserId: admin.userId,
    action: 'update',
    resourceType: 'contact_submission',
    resourceId: data.id,
    context: {
      status: data.status,
      hasInternalNote: Boolean(data.internal_note),
    },
  })

  return { data }
})
