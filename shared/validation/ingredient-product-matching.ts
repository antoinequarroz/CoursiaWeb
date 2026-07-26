import { z } from 'zod'
import { productUnitSchema } from './retail-catalog'

export const ingredientProductMatchStatusSchema = z.enum([
  'suggested',
  'confirmed',
  'ambiguous',
  'rejected',
])

export const ingredientProductMatchSourceSchema = z.enum(['automatic', 'manual'])

export const unitComparisonSchema = z.object({
  ingredientUnit: productUnitSchema,
  productUnit: productUnitSchema,
  comparable: z.boolean(),
  conversionFactor: z.number().positive().max(100000).optional(),
})

export const ingredientProductMatchSchema = z.object({
  ingredientId: z.uuid(),
  productId: z.uuid(),
  retailerId: z.uuid(),
  confidence: z.number().min(0).max(1),
  status: ingredientProductMatchStatusSchema.default('suggested'),
  source: ingredientProductMatchSourceSchema.default('manual'),
  unitComparison: unitComparisonSchema,
  notes: z.string().trim().max(500).optional(),
})

export const ingredientProductMatchUpdateSchema = ingredientProductMatchSchema.partial().extend({
  status: ingredientProductMatchStatusSchema,
  notes: z.string().trim().max(500).optional(),
})

export const ingredientProductMatchQuerySchema = z.object({
  ingredientId: z.uuid().optional(),
  productId: z.uuid().optional(),
  retailerId: z.uuid().optional(),
  status: ingredientProductMatchStatusSchema.optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
})

export const ingredientProductMatchParamsSchema = z.object({
  id: z.uuid(),
})

export const matchingSuggestionSchema = z.object({
  ingredientId: z.uuid(),
  ingredientName: z.string().trim().min(1).max(160),
  products: z.array(
    z.object({
      productId: z.uuid(),
      retailerId: z.uuid(),
      productName: z.string().trim().min(1).max(180),
      productUnit: productUnitSchema,
    }),
  ),
})

const compatibleUnits = new Set([
  'g:g',
  'g:kg',
  'kg:g',
  'kg:kg',
  'ml:ml',
  'ml:l',
  'l:ml',
  'l:l',
  'piece:piece',
  'pack:pack',
])

export const areUnitsComparable = (ingredientUnit: string, productUnit: string) =>
  compatibleUnits.has(`${ingredientUnit}:${productUnit}`)

export const buildUnitComparison = (
  ingredientUnit: z.infer<typeof productUnitSchema>,
  productUnit: z.infer<typeof productUnitSchema>,
) => ({
  ingredientUnit,
  productUnit,
  comparable: areUnitsComparable(ingredientUnit, productUnit),
  conversionFactor:
    ingredientUnit === 'kg' && productUnit === 'g'
      ? 1000
      : ingredientUnit === 'g' && productUnit === 'kg'
        ? 0.001
        : ingredientUnit === 'l' && productUnit === 'ml'
          ? 1000
          : ingredientUnit === 'ml' && productUnit === 'l'
            ? 0.001
            : undefined,
})

export const estimateMatchConfidence = (ingredientName: string, productName: string) => {
  const ingredientTokens = new Set(ingredientName.toLowerCase().split(/\s+/).filter(Boolean))
  const productTokens = new Set(productName.toLowerCase().split(/\s+/).filter(Boolean))
  const overlap = [...ingredientTokens].filter((token) => productTokens.has(token)).length

  return ingredientTokens.size === 0 ? 0 : Number((overlap / ingredientTokens.size).toFixed(2))
}

export const getSuggestedMatchStatus = (confidence: number, comparable: boolean) => {
  if (!comparable || confidence < 0.35) {
    return 'ambiguous'
  }

  return confidence >= 0.85 ? 'suggested' : 'ambiguous'
}

export const findUnmatchedIngredients = (
  ingredients: Array<{ id: string }>,
  matches: Array<{ ingredientId: string; status: z.infer<typeof ingredientProductMatchStatusSchema> }>,
) => {
  const matched = new Set(
    matches
      .filter((match) => match.status === 'confirmed' || match.status === 'suggested')
      .map((match) => match.ingredientId),
  )

  return ingredients.filter((ingredient) => !matched.has(ingredient.id))
}

export const findAmbiguousMatches = (
  matches: Array<{ status: z.infer<typeof ingredientProductMatchStatusSchema>; confidence: number }>,
) => matches.filter((match) => match.status === 'ambiguous' || match.confidence < 0.85)

export const estimateMatchingImpact = (recipeCount: number, basketCount: number) => ({
  affectedRecipes: recipeCount,
  affectedBaskets: basketCount,
  requiresReprice: basketCount > 0,
})

export type IngredientProductMatchInput = z.infer<typeof ingredientProductMatchSchema>
export type IngredientProductMatchUpdate = z.infer<typeof ingredientProductMatchUpdateSchema>
