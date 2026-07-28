import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '#shared/supabase/database.types'
import type { OfficialRecipeMutation } from '#shared/validation/course'
import {
  mobileTable,
  toAdminIngredientUnit,
  toAdminRecipeRow,
  toMobileIngredientUnit,
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
        unit: toAdminIngredientUnit(ingredient.unite),
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

export const syncOfficialRecipeRelations = async (
  client: SupabaseClient<Database>,
  recipeId: string,
  input: OfficialRecipeMutation,
) => {
  const { error: deleteIngredientsError } = await mobileTable(client, 'recette_ingredients')
    .delete()
    .eq('recette_id', recipeId)

  if (deleteIngredientsError) {
    throwApiError('UPSTREAM_ERROR', 'Impossible de remplacer les ingrédients de la recette.')
  }

  const { error: deleteStepsError } = await mobileTable(client, 'recette_etapes')
    .delete()
    .eq('recette_id', recipeId)

  if (deleteStepsError) {
    throwApiError('UPSTREAM_ERROR', 'Impossible de remplacer les étapes de la recette.')
  }

  if (input.ingredients.length > 0) {
    const { error: insertIngredientsError } = await mobileTable(client, 'recette_ingredients').insert(
      input.ingredients.map((ingredient, index) => ({
        recette_id: recipeId,
        ingredient_id: ingredient.ingredientId,
        quantite: ingredient.quantity,
        unite: toMobileIngredientUnit(ingredient.unit),
        ordre: index + 1,
        optionnel: ingredient.optional,
      })),
    )

    if (insertIngredientsError) {
      throwApiError('UPSTREAM_ERROR', 'Impossible d’enregistrer les ingrédients de la recette.')
    }
  }

  if (input.steps.length > 0) {
    const { error: insertStepsError } = await mobileTable(client, 'recette_etapes').insert(
      input.steps.map((step, index) => ({
        recette_id: recipeId,
        numero: index + 1,
        instruction: step.instruction,
      })),
    )

    if (insertStepsError) {
      throwApiError('UPSTREAM_ERROR', 'Impossible d’enregistrer les étapes de la recette.')
    }
  }
}

export const duplicateOfficialRecipeRelations = async (
  client: SupabaseClient<Database>,
  sourceRecipeId: string,
  targetRecipeId: string,
) => {
  const [ingredientsResult, stepsResult] = await Promise.all([
    mobileTable(client, 'recette_ingredients')
      .select('ingredient_id,quantite,unite,ordre,optionnel')
      .eq('recette_id', sourceRecipeId)
      .order('ordre', { ascending: true }),
    mobileTable(client, 'recette_etapes')
      .select('numero,instruction')
      .eq('recette_id', sourceRecipeId)
      .order('numero', { ascending: true }),
  ])

  if (ingredientsResult.error || stepsResult.error) {
    throwApiError('UPSTREAM_ERROR', 'Impossible de charger les lignes liées à dupliquer.')
  }

  const ingredientRows = Array.isArray(ingredientsResult.data)
    ? ingredientsResult.data as Array<Record<string, unknown>>
    : []
  const stepRows = Array.isArray(stepsResult.data)
    ? stepsResult.data as Array<Record<string, unknown>>
    : []

  if (ingredientRows.length > 0) {
    const { error } = await mobileTable(client, 'recette_ingredients').insert(
      ingredientRows.map((ingredient, index) => ({
        recette_id: targetRecipeId,
        ingredient_id: ingredient.ingredient_id,
        quantite: ingredient.quantite,
        unite: ingredient.unite,
        ordre: index + 1,
        optionnel: Boolean(ingredient.optionnel),
      })),
    )

    if (error) {
      throwApiError('UPSTREAM_ERROR', 'Impossible de dupliquer les ingrédients de la recette.')
    }
  }

  if (stepRows.length > 0) {
    const { error } = await mobileTable(client, 'recette_etapes').insert(
      stepRows.map((step, index) => ({
        recette_id: targetRecipeId,
        numero: index + 1,
        instruction: step.instruction,
      })),
    )

    if (error) {
      throwApiError('UPSTREAM_ERROR', 'Impossible de dupliquer les étapes de la recette.')
    }
  }
}
