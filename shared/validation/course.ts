import { z } from 'zod'

export const courseListQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(12),
})

export const authenticatedEnrollmentsQuerySchema = z.object({
  status: z.enum(['active', 'completed', 'cancelled']).optional(),
})

export const officialRecipeDifficultySchema = z.enum(['easy', 'medium', 'hard'])
export const officialRecipeStatusSchema = z.enum(['draft', 'review', 'published', 'archived'])

export const officialRecipeStepSchema = z.object({
  order: z.number().int().min(1),
  instruction: z.string().trim().min(1).max(1200),
})

export const officialRecipeNutritionSchema = z.object({
  calories: z.number().int().min(0).max(4000).optional(),
  proteinGrams: z.number().min(0).max(500).optional(),
  carbsGrams: z.number().min(0).max(800).optional(),
  fatGrams: z.number().min(0).max(500).optional(),
})

export const canonicalIngredientUnitSchema = z.enum([
  'g',
  'kg',
  'ml',
  'l',
  'piece',
  'tbsp',
  'tsp',
])

export type CanonicalIngredientUnit = z.infer<typeof canonicalIngredientUnitSchema>

export const canonicalIngredients = [
  { id: 'tomato', name: 'Tomate', compatibleUnits: ['g', 'kg', 'piece'] },
  { id: 'pasta', name: 'Pâtes', compatibleUnits: ['g', 'kg'] },
  { id: 'olive-oil', name: 'Huile d’olive', compatibleUnits: ['ml', 'l', 'tbsp', 'tsp'] },
  { id: 'chicken', name: 'Poulet', compatibleUnits: ['g', 'kg', 'piece'] },
  { id: 'broccoli', name: 'Brocoli', compatibleUnits: ['g', 'kg', 'piece'] },
] as const satisfies ReadonlyArray<{
  id: string
  name: string
  compatibleUnits: ReadonlyArray<CanonicalIngredientUnit>
}>

export const officialRecipeIngredientSchema = z.object({
  ingredientId: z.string().trim().min(1).max(120),
  name: z.string().trim().min(1).max(160),
  quantity: z.number().positive().max(10000),
  unit: canonicalIngredientUnitSchema,
  group: z.string().trim().min(1).max(80).default('Principal'),
  optional: z.boolean().default(false),
})

const optionalQueryString = <Schema extends z.ZodTypeAny>(schema: Schema) =>
  z.preprocess((value) => (value === '' ? undefined : value), schema.optional())

export const officialRecipeListQuerySchema = z.object({
  search: optionalQueryString(z.string().trim().max(120)),
  status: optionalQueryString(officialRecipeStatusSchema),
  difficulty: optionalQueryString(officialRecipeDifficultySchema),
  category: optionalQueryString(z.string().trim().max(80)),
  limit: z.coerce.number().int().min(1).max(100).default(25),
})

export const officialRecipeDraftSchema = z.object({
  title: z.string().trim().min(1).max(160),
  slug: z.string().trim().min(1).max(180).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  status: officialRecipeStatusSchema.default('draft'),
  portions: z.number().int().min(1).max(24).optional(),
  durationMinutes: z.number().int().min(1).max(1440).optional(),
  difficulty: officialRecipeDifficultySchema.optional(),
  categories: z.array(z.string().trim().min(1).max(80)).max(12).default([]),
  source: z.string().trim().max(300).optional(),
  ingredients: z.array(officialRecipeIngredientSchema).max(80).default([]),
  steps: z.array(officialRecipeStepSchema).max(30).default([]),
  nutrition: officialRecipeNutritionSchema.default({}),
})

export const officialRecipePublishSchema = officialRecipeDraftSchema.extend({
  portions: z.number().int().min(1).max(24),
  durationMinutes: z.number().int().min(1).max(1440),
  difficulty: officialRecipeDifficultySchema,
  ingredients: z.array(officialRecipeIngredientSchema).min(1).max(80),
  steps: z.array(officialRecipeStepSchema).min(1).max(30),
})

export const officialRecipeMutationSchema = z.union([
  officialRecipeDraftSchema.extend({ status: z.literal('draft') }),
  officialRecipePublishSchema.extend({ status: z.literal('review') }),
  officialRecipePublishSchema.extend({ status: z.literal('published') }),
  officialRecipeDraftSchema.extend({ status: z.literal('archived') }),
])

export const officialRecipeParamsSchema = z.object({
  id: z.uuid(),
})

export const recipePublicationActionSchema = z.object({
  reason: z.string().trim().min(3).max(500).optional(),
})

export type CourseListQuery = z.infer<typeof courseListQuerySchema>
export type AuthenticatedEnrollmentsQuery = z.infer<typeof authenticatedEnrollmentsQuerySchema>
export type OfficialRecipeListQuery = z.infer<typeof officialRecipeListQuerySchema>
export type OfficialRecipeMutation = z.infer<typeof officialRecipeMutationSchema>
export type OfficialRecipeIngredient = z.infer<typeof officialRecipeIngredientSchema>
export type RecipePublicationAction = z.infer<typeof recipePublicationActionSchema>

export const findDuplicateRecipeIngredients = (ingredients: OfficialRecipeIngredient[]) => {
  const seen = new Set<string>()
  const duplicates = new Set<string>()

  for (const ingredient of ingredients) {
    if (seen.has(ingredient.ingredientId)) {
      duplicates.add(ingredient.ingredientId)
    }
    seen.add(ingredient.ingredientId)
  }

  return [...duplicates]
}

export const findIncompatibleIngredientUnits = (ingredients: OfficialRecipeIngredient[]) => {
  return ingredients.filter((ingredient) => {
    const canonical = canonicalIngredients.find((item) => item.id === ingredient.ingredientId)

    return canonical
      ? !(canonical.compatibleUnits as ReadonlyArray<CanonicalIngredientUnit>).includes(ingredient.unit)
      : false
  })
}

export const scaleRecipeQuantity = (
  quantity: number,
  fromPortions: number,
  toPortions: number,
) => {
  if (fromPortions <= 0 || toPortions <= 0) {
    return quantity
  }

  return Number(((quantity / fromPortions) * toPortions).toFixed(2))
}

type OfficialRecipeBlockingCandidate = {
  title?: string | null | undefined
  slug?: string | null | undefined
  portions?: number | null | undefined
  durationMinutes?: number | null | undefined
  difficulty?: string | null | undefined
  ingredients?: unknown[] | null | undefined
  steps?: unknown[] | null | undefined
  source?: string | null | undefined
}

export const getOfficialRecipeBlockingFields = (recipe: OfficialRecipeBlockingCandidate) => {
  const missing: string[] = []

  if (!recipe.title) missing.push('title')
  if (!recipe.slug) missing.push('slug')
  if (!recipe.portions) missing.push('portions')
  if (!recipe.durationMinutes) missing.push('durationMinutes')
  if (!recipe.difficulty) missing.push('difficulty')
  if (!recipe.ingredients || recipe.ingredients.length === 0) missing.push('ingredients')
  if (!recipe.steps || recipe.steps.length === 0) missing.push('steps')
  if (!recipe.source) missing.push('source')

  return missing
}

export const getUnpublishBehaviorMessage = () =>
  'La recette dépubliée disparaît des listes publiques et reste disponible dans l’administration en brouillon.'
