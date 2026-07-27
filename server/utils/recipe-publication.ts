import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database, Json } from '#shared/supabase/database.types'
import { getOfficialRecipeBlockingFields } from '#shared/validation/course'

type OfficialRecipeRow = {
  id: string
  title: string
  slug: string
  status: 'draft' | 'review' | 'published' | 'archived'
  portions: number | null
  duration_minutes: number | null
  difficulty: string | null
  ingredients: unknown[]
  steps: unknown[]
  nutrition: Json
  categories: string[]
  source: string | null
}

type OfficialRecipeStatus = OfficialRecipeRow['status']

const safeArray = (value: unknown) => (Array.isArray(value) ? value : [])

export const requireRecipePublicationAccess = (role: string) => {
  if (!['administrator', 'super_administrator'].includes(role)) {
    throwApiError('FORBIDDEN', 'La publication des recettes est réservée aux administrateurs.')
  }
}

export const toPublicationBlockingInput = (recipe: OfficialRecipeRow) => ({
  title: recipe.title,
  slug: recipe.slug,
  portions: recipe.portions ?? undefined,
  durationMinutes: recipe.duration_minutes ?? undefined,
  difficulty: recipe.difficulty ?? undefined,
  ingredients: safeArray(recipe.ingredients),
  steps: safeArray(recipe.steps),
  source: recipe.source ?? undefined,
})

export const getRecipePublicationBlockingFields = (recipe: OfficialRecipeRow) =>
  getOfficialRecipeBlockingFields(toPublicationBlockingInput(recipe))

export const buildRecipePreview = (recipe: OfficialRecipeRow) => {
  const ingredients = safeArray(recipe.ingredients)
  const steps = safeArray(recipe.steps)

  return {
    blockingFields: getRecipePublicationBlockingFields(recipe),
    states: ['draft', 'review', 'published', 'archived'] as const,
    mobile: {
      title: recipe.title,
      subtitle: recipe.categories.join(' · '),
      meta: {
        portions: recipe.portions,
        durationMinutes: recipe.duration_minutes,
        difficulty: recipe.difficulty,
      },
      ingredients,
      steps,
      status: recipe.status,
    },
    web: {
      title: recipe.title,
      slug: recipe.slug,
      source: recipe.source,
      categories: recipe.categories,
      nutrition: recipe.nutrition,
      ingredients,
      steps,
      status: recipe.status,
    },
  }
}

export const writeRecipePublicationHistory = async (
  _client: SupabaseClient<Database>,
  input: {
    recipe: OfficialRecipeRow
    fromStatus: OfficialRecipeStatus | null
    toStatus: OfficialRecipeStatus
    userId: string
    reason?: string | undefined
  },
) => ({
  recipeId: input.recipe.id,
  fromStatus: input.fromStatus,
  toStatus: input.toStatus,
  changedBy: input.userId,
  reason: input.reason ?? null,
})
