import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database, Json } from '#shared/supabase/database.types'
import type {
  IngredientProductMatchInput,
  IngredientProductMatchUpdate,
} from '#shared/validation/ingredient-product-matching'
import {
  buildUnitComparison,
  estimateMatchConfidence,
  estimateMatchingImpact,
  getSuggestedMatchStatus,
} from '#shared/validation/ingredient-product-matching'

type MatchRow = Database['public']['Tables']['ingredient_product_matches']['Row']
type ProductRow = Database['public']['Tables']['products']['Row']

export const toIngredientProductMatchRow = (
  input: IngredientProductMatchInput,
  userId: string,
) => ({
  ingredient_id: input.ingredientId,
  product_id: input.productId,
  retailer_id: input.retailerId,
  confidence: input.confidence,
  status: input.status,
  source: input.source,
  unit_comparison: input.unitComparison as unknown as Json,
  notes: input.notes ?? null,
  updated_at: new Date().toISOString(),
  confirmed_at: input.status === 'confirmed' ? new Date().toISOString() : null,
  confirmed_by: input.status === 'confirmed' ? userId : null,
})

export const toIngredientProductMatchUpdateRow = (
  input: IngredientProductMatchUpdate,
  existing: MatchRow,
  userId: string,
) => ({
  ingredient_id: input.ingredientId ?? existing.ingredient_id,
  product_id: input.productId ?? existing.product_id,
  retailer_id: input.retailerId ?? existing.retailer_id,
  confidence: input.confidence ?? existing.confidence,
  status: input.status,
  source: input.source ?? existing.source,
  unit_comparison: (input.unitComparison ?? existing.unit_comparison) as unknown as Json,
  notes: input.notes ?? existing.notes,
  updated_at: new Date().toISOString(),
  confirmed_at: input.status === 'confirmed' ? new Date().toISOString() : existing.confirmed_at,
  confirmed_by: input.status === 'confirmed' ? userId : existing.confirmed_by,
})

export const buildAutomaticMatchSuggestion = (
  ingredient: { id: string; name: string; units?: string[] },
  product: ProductRow,
) => {
  const format = product.format && typeof product.format === 'object' && !Array.isArray(product.format)
    ? product.format
    : {}
  const productUnit = typeof format.unit === 'string' ? format.unit : 'pack'
  const ingredientUnit = ingredient.units?.[0] ?? 'g'
  const unitComparison = buildUnitComparison(ingredientUnit as never, productUnit as never)
  const confidence = estimateMatchConfidence(ingredient.name, product.name)

  return {
    ingredientId: ingredient.id,
    productId: product.id,
    retailerId: product.retailer_id,
    confidence,
    status: getSuggestedMatchStatus(confidence, unitComparison.comparable),
    source: 'automatic',
    unitComparison,
    notes: unitComparison.comparable
      ? 'Suggestion automatique confirmable manuellement.'
      : 'Cas ambigu: format ou unitÃ© non comparable.',
  }
}

export const getMatchById = async (
  client: SupabaseClient<Database>,
  id: string,
) => {
  const { data, error } = await client
    .from('ingredient_product_matches')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (error) {
    throwApiError('UPSTREAM_ERROR', 'Impossible de charger la correspondance.')
  }

  if (!data) {
    throwApiError('NOT_FOUND', 'Correspondance introuvable.')
  }

  return data
}

export const buildIngredientMatchingImpact = async (
  client: SupabaseClient<Database>,
  ingredientId: string,
) => {
  const { data: recipes, error } = await client
    .from('official_recipes')
    .select('id,title,ingredients')
    .limit(500)

  if (error) {
    throwApiError('UPSTREAM_ERROR', 'Impossible de calculer lâ€™impact recettes.')
  }

  const affectedRecipes = (recipes ?? []).filter((recipe) =>
    Array.isArray(recipe.ingredients)
      ? recipe.ingredients.some((ingredient) =>
          Boolean(
            ingredient
            && typeof ingredient === 'object'
            && !Array.isArray(ingredient)
            && ingredient.ingredientId === ingredientId,
          ),
        )
      : false,
  )

  return {
    recipes: affectedRecipes.map((recipe) => ({ id: recipe.id, title: recipe.title })),
    baskets: [],
    summary: estimateMatchingImpact(affectedRecipes.length, 0),
  }
}
