import { z } from 'zod'
import { canonicalIngredientUnitSchema } from '#shared/validation/course'

export const dietCodeSchema = z.enum([
  'vegetarian',
  'vegan',
  'gluten_free',
  'lactose_free',
  'low_fodmap',
])

export const allergenCodeSchema = z.enum([
  'gluten',
  'milk',
  'eggs',
  'peanuts',
  'nuts',
  'soy',
  'fish',
  'shellfish',
  'sesame',
])

export const canonicalIngredientStatusSchema = z.enum(['active', 'archived'])

export const canonicalIngredientSchema = z.object({
  name: z.string().trim().min(1).max(160),
  slug: z.string().trim().min(1).max(180).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  status: canonicalIngredientStatusSchema.default('active'),
  synonyms: z.array(z.string().trim().min(1).max(120)).max(50).default([]),
  units: z.array(canonicalIngredientUnitSchema).min(1).max(12),
  categories: z.array(z.string().trim().min(1).max(80)).max(12).default([]),
  allergens: z.array(allergenCodeSchema).max(12).default([]),
  diets: z.array(dietCodeSchema).max(12).default([]),
  sensitive: z.boolean().default(false),
})

export const canonicalIngredientListQuerySchema = z.object({
  search: z.string().trim().max(120).optional(),
  allergen: allergenCodeSchema.optional(),
  diet: dietCodeSchema.optional(),
  status: canonicalIngredientStatusSchema.optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
})

export const canonicalIngredientParamsSchema = z.object({
  id: z.uuid(),
})

export const mergeCanonicalIngredientSchema = z.object({
  targetId: z.uuid(),
  reason: z.string().trim().min(3).max(500),
})

export type CanonicalIngredientInput = z.infer<typeof canonicalIngredientSchema>

export const findIngredientCatalogConflicts = (
  ingredients: Array<Pick<CanonicalIngredientInput, 'name' | 'slug' | 'synonyms'>>,
) => {
  const seen = new Map<string, string>()
  const conflicts: Array<{ value: string; first: string; second: string }> = []

  for (const ingredient of ingredients) {
    const values = [ingredient.slug, ingredient.name, ...ingredient.synonyms].map((value) =>
      value.trim().toLowerCase(),
    )

    for (const value of values) {
      const existing = seen.get(value)

      if (existing && existing !== ingredient.slug) {
        conflicts.push({ value, first: existing, second: ingredient.slug })
      } else {
        seen.set(value, ingredient.slug)
      }
    }
  }

  return conflicts
}

export const estimateIngredientCatalogImpact = (usageCount: number, synonymCount: number) => ({
  affectedRecipes: usageCount,
  affectedSynonyms: synonymCount,
  requiresReview: usageCount > 0 || synonymCount > 0,
})

