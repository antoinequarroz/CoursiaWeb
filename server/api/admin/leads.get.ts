const parseLeadLimit = (value: unknown) => {
  const limit = Number(value ?? 50)

  if (!Number.isFinite(limit)) {
    return 50
  }

  return Math.min(Math.max(Math.trunc(limit), 1), 100)
}

const parseLeadSearch = (value: unknown) => {
  if (typeof value !== 'string') {
    return ''
  }

  return value
    .trim()
    .replace(/[^\p{L}\p{N}\s@._-]/gu, '')
    .slice(0, 120)
}

const parseLeadStatus = (value: unknown) => {
  if (value === 'new' || value === 'reviewed' || value === 'archived') {
    return value
  }

  return ''
}

export default defineEventHandler(async (event) => {
  const admin = await getSensitiveAdminContext(event)
  requireSupportUserReadAccess(admin.role)

  const query = getQuery(event)
  const limit = parseLeadLimit(query.limit)
  const search = parseLeadSearch(query.search)
  const status = parseLeadStatus(query.status)
  const supabase = createSupabaseServiceRoleClient()

  let contactsQuery = supabase
    .from('contact_submissions')
    .select('id,name,email,reason,message,source,status,internal_note,created_at,updated_at,consented_at')
    .order('created_at', { ascending: false })
    .limit(limit)

  let waitlistQuery = supabase
    .from('waitlist')
    .select('id,email,source,household_size,interests,created_at,updated_at,consented_at')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (search) {
    contactsQuery = contactsQuery.or(`name.ilike.%${search}%,email.ilike.%${search}%,reason.ilike.%${search}%`)
    waitlistQuery = waitlistQuery.or(`email.ilike.%${search}%,source.ilike.%${search}%`)
  }

  if (status) {
    contactsQuery = contactsQuery.eq('status', status)
  }

  const [
    { data: contacts, error: contactsError },
    { data: waitlist, error: waitlistError },
  ] = await Promise.all([
    contactsQuery,
    waitlistQuery,
  ])

  if (contactsError || waitlistError) {
    throwApiError('UPSTREAM_ERROR', 'Impossible de charger les leads publics.')
  }

  return {
    data: {
      contacts: contacts ?? [],
      waitlist: waitlist ?? [],
      counts: {
        contacts: contacts?.length ?? 0,
        waitlist: waitlist?.length ?? 0,
      },
    },
  }
})
