import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '#shared/supabase/database.types'
import type { CanonicalIngredientInput } from '#shared/validation/ingredient-catalog'

export const toCanonicalIngredientRow = (input: CanonicalIngredientInput) => ({
  name: input.name,
  slug: input.slug,
  status: input.status,
  synonyms: input.synonyms,
  units: input.units,
  categories: input.categories,
  allergens: input.allergens,
  diets: input.diets,
  sensitive: input.sensitive,
  updated_at: new Date().toISOString(),
  archived_at: input.status === 'archived' ? new Date().toISOString() : null,
})

export const requireIngredientWriteAccess = (role: string) => {
  if (!['editor', 'administrator', 'super_administrator'].includes(role)) {
    throwApiError('FORBIDDEN', 'Permission insuffisante pour modifier les ingrédients.')
  }
}

export const requireSensitiveIngredientAccess = (role: string) => {
  if (!['administrator', 'super_administrator'].includes(role)) {
    throwApiError(
      'FORBIDDEN',
      'Les données sensibles du référentiel alimentaire exigent un rôle adéquat.',
    )
  }
}

export const getCanonicalIngredientById = async (
  client: SupabaseClient<Database>,
  id: string,
) => {
  const { data, error } = await client
    .from('canonical_ingredients')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (error) {
    throwApiError('UPSTREAM_ERROR', 'Impossible de charger l’ingrédient canonique.')
  }

  if (!data) {
    throwApiError('NOT_FOUND', 'Ingrédient canonique introuvable.')
  }

  return data
}

