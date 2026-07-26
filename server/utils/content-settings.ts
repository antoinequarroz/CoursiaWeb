import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database, Json } from '#shared/supabase/database.types'
import type { ContentEntryInput, FeatureFlagInput } from '#shared/validation/content-settings'
import { assertNonTechnicalSettingKey, buildContentPreview } from '#shared/validation/content-settings'

type ContentEntryRow = Database['public']['Tables']['content_entries']['Row']

export const requireContentSettingsAccess = (role: string) => {
  if (!['editor', 'administrator', 'super_administrator'].includes(role)) {
    throwApiError('FORBIDDEN', 'Permission insuffisante pour administrer les contenus.')
  }
}

export const requireFeatureFlagAccess = (role: string, critical = false) => {
  if (critical) {
    if (!['administrator', 'super_administrator'].includes(role)) {
      throwApiError('FORBIDDEN', 'Les feature flags critiques sont reserves aux administrateurs.')
    }
    return
  }

  requireContentSettingsAccess(role)
}

export const toContentEntryRow = (input: ContentEntryInput) => {
  assertNonTechnicalSettingKey(input.key)

  return {
    key: input.key,
    kind: input.kind,
    title: input.title,
    body: input.body ?? null,
    url: input.url ?? null,
    locale: input.locale,
    status: input.status,
    publish_at: input.publishAt ?? null,
    archive_at: input.archiveAt ?? null,
    metadata: input.metadata as unknown as Json,
    updated_at: new Date().toISOString(),
    archived_at: input.status === 'archived' ? new Date().toISOString() : null,
  }
}

export const toFeatureFlagRow = (input: FeatureFlagInput) => {
  assertNonTechnicalSettingKey(input.key)

  return {
    key: input.key,
    name: input.name,
    description: input.description ?? null,
    enabled: input.enabled,
    critical: input.critical,
    rollout_percentage: input.rolloutPercentage,
    updated_at: new Date().toISOString(),
  }
}

export const createContentRevision = async (
  client: SupabaseClient<Database>,
  input: {
    entry: ContentEntryRow
    authorUserId: string
    changeSummary: string
  },
) => {
  const { error } = await client.from('content_entry_revisions').insert({
    content_entry_id: input.entry.id,
    author_user_id: input.authorUserId,
    snapshot: input.entry as unknown as Json,
    change_summary: input.changeSummary,
  })

  if (error) {
    throwApiError('UPSTREAM_ERROR', 'Impossible d historiser la modification du contenu.')
  }
}

export const getContentEntryById = async (
  client: SupabaseClient<Database>,
  id: string,
) => {
  const { data, error } = await client
    .from('content_entries')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (error) {
    throwApiError('UPSTREAM_ERROR', 'Impossible de charger le contenu.')
  }

  if (!data) {
    throwApiError('NOT_FOUND', 'Contenu introuvable.')
  }

  return data
}

export const previewContentEntry = (entry: ContentEntryRow) => buildContentPreview(entry)
