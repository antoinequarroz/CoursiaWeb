import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '#shared/supabase/database.types'
import type { CanonicalIngredientInput } from '#shared/validation/ingredient-catalog'
import { mobileTable, toAdminIngredientRow, toMobileIngredientRow } from './mobile-admin-mapping'

export const toCanonicalIngredientRow = (input: CanonicalIngredientInput) => ({
  ...toMobileIngredientRow(input),
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
  const { data, error } = await mobileTable(client, 'ingredients')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (error) {
    throwApiError('UPSTREAM_ERROR', 'Impossible de charger l’ingrédient canonique.')
  }

  if (!data) {
    throwApiError('NOT_FOUND', 'Ingrédient canonique introuvable.')
  }

  return toAdminIngredientRow(data as Record<string, unknown>)
}
