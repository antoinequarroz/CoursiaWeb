import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '#shared/supabase/database.types'
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
import { mobileTable } from './mobile-admin-mapping'

type ProductRow = Record<string, unknown>
type MatchRow = {
  id: string
  ingredient_id: string | null
  product_id: string
  retailer_id: string | null
  confidence: number
  status: 'suggested' | 'confirmed' | 'ambiguous' | 'rejected'
  source: 'automatic' | 'manual'
  unit_comparison: Record<string, unknown>
  notes: string | null
  updated_at: string
}

export const toIngredientProductMatchRow = (
  input: IngredientProductMatchInput,
  _userId: string,
) => ({
  ingredient_id: input.status === 'rejected' ? null : input.ingredientId,
})

export const toIngredientProductMatchUpdateRow = (
  input: IngredientProductMatchUpdate,
  existing: MatchRow,
  _userId: string,
) => ({
  ingredient_id: input.status === 'rejected'
    ? null
    : input.ingredientId ?? existing.ingredient_id,
})

export const toVirtualIngredientProductMatch = (
  product: ProductRow,
  offer?: ProductRow | null,
): MatchRow => ({
  id: String(product.id),
  ingredient_id: product.ingredient_id ? String(product.ingredient_id) : null,
  product_id: String(product.id),
  retailer_id: offer?.enseigne_id ? String(offer.enseigne_id) : null,
  confidence: product.ingredient_id ? 1 : 0,
  status: product.ingredient_id ? 'confirmed' : 'ambiguous',
  source: 'manual',
  unit_comparison: {
    ingredientUnit: offer?.unite === 'unite' ? 'piece' : offer?.unite ?? 'piece',
    productUnit: offer?.unite === 'unite' ? 'piece' : offer?.unite ?? 'piece',
    comparable: true,
  },
  notes: product.ingredient_id
    ? 'Correspondance réelle stockée sur produits_canoniques.ingredient_id.'
    : 'Produit canonique non relié à un ingrédient.',
  updated_at: String(product.created_at ?? new Date().toISOString()),
})

export const buildAutomaticMatchSuggestion = (
  ingredient: { id: string; name: string; units?: string[] },
  product: ProductRow,
) => {
  const productUnit = String(product.unit ?? 'piece')
  const ingredientUnit = ingredient.units?.[0] ?? 'g'
  const unitComparison = buildUnitComparison(ingredientUnit as never, productUnit as never)
  const confidence = estimateMatchConfidence(ingredient.name, String(product.name ?? product.nom ?? ''))

  return {
    ingredientId: ingredient.id,
    productId: String(product.id),
    retailerId: String(product.retailer_id ?? product.enseigne_id ?? ''),
    confidence,
    status: getSuggestedMatchStatus(confidence, unitComparison.comparable),
    source: 'automatic',
    unitComparison,
    notes: unitComparison.comparable
      ? 'Suggestion automatique confirmable manuellement.'
      : 'Cas ambigu: format ou unité non comparable.',
  }
}

export const getMatchById = async (
  client: SupabaseClient<Database>,
  id: string,
) => {
  const { data, error } = await mobileTable(client, 'produits_canoniques')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (error) {
    throwApiError('UPSTREAM_ERROR', 'Impossible de charger la correspondance.')
  }

  if (!data) {
    throwApiError('NOT_FOUND', 'Correspondance introuvable.')
  }

  const { data: offer } = await mobileTable(client, 'offres_magasin')
    .select('*')
    .eq('produit_canonique_id', id)
    .limit(1)
    .maybeSingle()

  return toVirtualIngredientProductMatch(
    data as Record<string, unknown>,
    offer as Record<string, unknown> | null,
  )
}

export const buildIngredientMatchingImpact = async (
  client: SupabaseClient<Database>,
  ingredientId: string,
) => {
  const { data: recipeLinks, error } = await mobileTable(client, 'recette_ingredients')
    .select('recette_id')
    .eq('ingredient_id', ingredientId)
    .limit(500)

  if (error) {
    throwApiError('UPSTREAM_ERROR', 'Impossible de calculer l’impact recettes.')
  }

  const affectedRecipes = Array.isArray(recipeLinks) ? recipeLinks : []

  return {
    recipes: affectedRecipes.map((recipe) => ({
      id: String((recipe as Record<string, unknown>).recette_id),
      title: 'Recette liée',
    })),
    baskets: [],
    summary: estimateMatchingImpact(affectedRecipes.length, 0),
  }
}
