import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database, Json } from '#shared/supabase/database.types'
import type { SupportControlledProcedure, SupportUserSearch } from '#shared/validation/support-users'
import {
  impersonationDisabledMessage,
  maskSupportUser,
  supportProcedureDescriptions,
} from '#shared/validation/support-users'

type SupportProfileRow = Database['public']['Tables']['support_user_profiles']['Row']

export const requireSupportUserReadAccess = (role: string) => {
  if (!['support', 'administrator', 'super_administrator'].includes(role)) {
    throwApiError('FORBIDDEN', 'Permission support insuffisante.')
  }
}

export const requireSupportProcedureAccess = (role: string) => {
  if (!['administrator', 'super_administrator'].includes(role)) {
    throwApiError('FORBIDDEN', 'Les procedures export suppression blocage sont reservees aux administrateurs.')
  }
}

export const sanitizeSupportProfile = (profile: SupportProfileRow) =>
  maskSupportUser({
    id: profile.user_id,
    email: profile.email,
    accountStatus: profile.account_status,
    appVersion: profile.app_version,
    subscriptionTier: profile.subscription_tier,
  })

export const findSupportUserProfile = async (
  client: SupabaseClient<Database>,
  search: SupportUserSearch,
) => {
  let request = client.from('support_user_profiles').select('*').limit(1)

  if (search.userId) {
    request = request.eq('user_id', search.userId)
  } else if (search.email) {
    request = request.eq('email', search.email)
  }

  const { data, error } = await request.maybeSingle()

  if (error) {
    throwApiError('UPSTREAM_ERROR', 'Impossible de rechercher le profil support.')
  }

  if (!data) {
    throwApiError('NOT_FOUND', 'Utilisateur introuvable dans la vue support.')
  }

  return data
}

export const getRevenueCatEventsForSupport = async (
  client: SupabaseClient<Database>,
  userId: string,
) => {
  const { data, error } = await client
    .from('revenuecat_events')
    .select('id,user_id,type,entitlement,product_id,purchased_at,expires_at,received_at,payload_redacted')
    .eq('user_id', userId)
    .order('received_at', { ascending: false })
    .limit(25)

  if (error) {
    throwApiError('UPSTREAM_ERROR', 'Impossible de charger les evenements RevenueCat.')
  }

  return data ?? []
}

export const createSupportControlledProcedure = async (
  client: SupabaseClient<Database>,
  input: SupportControlledProcedure & { requestedBy: string },
) => {
  if (!input.confirmed) {
    throwApiError('INVALID_REQUEST', 'La procedure controlee doit etre confirmee.')
  }

  const { data, error } = await client
    .from('support_user_procedures')
    .insert({
      user_id: input.userId,
      action: input.action,
      reason: input.reason,
      ticket_reference: input.ticketReference,
      requested_by: input.requestedBy,
      status: 'requested',
    })
    .select('*')
    .single()

  if (error) {
    throwApiError('UPSTREAM_ERROR', 'Impossible de creer la procedure support.')
  }

  return {
    ...data,
    description: supportProcedureDescriptions[input.action],
    impersonation: impersonationDisabledMessage,
  }
}

export const redactSupportAuditContext = (profile: SupportProfileRow): Record<string, Json> => ({
  userId: profile.user_id,
  emailMasked: sanitizeSupportProfile(profile).emailMasked,
  accountStatus: profile.account_status,
  subscriptionTier: profile.subscription_tier,
})
