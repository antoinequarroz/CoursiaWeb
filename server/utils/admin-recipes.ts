import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database, Json } from '#shared/supabase/database.types'
import type { OfficialRecipeMutation } from '#shared/validation/course'

export const toOfficialRecipeRow = (input: OfficialRecipeMutation) => ({
  title: input.title,
  slug: input.slug,
  status: input.status,
  portions: input.portions ?? null,
  duration_minutes: input.durationMinutes ?? null,
  difficulty: input.difficulty ?? null,
  ingredients: input.ingredients as unknown as Json,
  steps: input.steps as unknown as Json,
  nutrition: input.nutrition as unknown as Json,
  categories: input.categories,
  source: input.source ?? null,
  updated_at: new Date().toISOString(),
  archived_at: input.status === 'archived' ? new Date().toISOString() : null,
})

export const requireRecipeWriteAccess = (role: string) => {
  if (!['editor', 'administrator', 'super_administrator'].includes(role)) {
    throwApiError('FORBIDDEN', 'Permission insuffisante pour modifier les recettes.')
  }
}

export const requireRecipeDeleteAccess = (role: string) => {
  if (!['administrator', 'super_administrator'].includes(role)) {
    throwApiError('FORBIDDEN', 'La suppression définitive est réservée au rôle approprié.')
  }
}

export const getOfficialRecipeById = async (
  client: SupabaseClient<Database>,
  id: string,
) => {
  const { data, error } = await client.from('official_recipes').select('*').eq('id', id).maybeSingle()

  if (error) {
    throwApiError('UPSTREAM_ERROR', 'Impossible de charger la recette officielle.')
  }

  if (!data) {
    throwApiError('NOT_FOUND', 'Recette officielle introuvable.')
  }

  return data
}
