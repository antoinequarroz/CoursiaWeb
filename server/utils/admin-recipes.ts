import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '#shared/supabase/database.types'
import type { OfficialRecipeMutation } from '#shared/validation/course'
import {
  mobileTable,
  toAdminRecipeRow,
  toMobileRecipeRow,
} from './mobile-admin-mapping'

export const toOfficialRecipeRow = (input: OfficialRecipeMutation) => ({
  ...toMobileRecipeRow(input),
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
  const { data, error } = await mobileTable(client, 'recettes').select('*').eq('id', id).maybeSingle()

  if (error) {
    throwApiError('UPSTREAM_ERROR', 'Impossible de charger la recette officielle.')
  }

  if (!data) {
    throwApiError('NOT_FOUND', 'Recette officielle introuvable.')
  }

  const [ingredientsResult, stepsResult] = await Promise.all([
    mobileTable(client, 'recette_ingredients')
      .select('id,ingredient_id,quantite,unite,ordre,optionnel,ingredients(nom)')
      .eq('recette_id', id)
      .order('ordre', { ascending: true }),
    mobileTable(client, 'recette_etapes')
      .select('id,numero,instruction')
      .eq('recette_id', id)
      .order('numero', { ascending: true }),
  ])

  const ingredientRows = Array.isArray(ingredientsResult.data)
    ? ingredientsResult.data as Array<Record<string, unknown>>
    : []
  const stepRows = Array.isArray(stepsResult.data)
    ? stepsResult.data as Array<Record<string, unknown>>
    : []

  return {
    ...toAdminRecipeRow(data as Record<string, unknown>),
    ingredients: ingredientRows.map((ingredient) => {
      const linkedIngredient = ingredient.ingredients as Record<string, unknown> | null | undefined

      return {
        ingredientId: String(ingredient.ingredient_id ?? ''),
        name: String(linkedIngredient?.nom ?? ingredient.ingredient_id ?? ''),
        quantity: Number(ingredient.quantite ?? 0),
        unit: ingredient.unite === 'unite' ? 'piece' : String(ingredient.unite ?? 'g'),
        group: 'Principal',
        optional: Boolean(ingredient.optionnel),
      }
    }),
    steps: stepRows.map((step) => ({
      order: Number(step.numero ?? 0),
      instruction: String(step.instruction ?? ''),
    })),
  }
}
