import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database, Json } from '#shared/supabase/database.types'
import { getOfficialRecipeBlockingFields } from '#shared/validation/course'

type OfficialRecipeRow = Database['public']['Tables']['official_recipes']['Row']
type OfficialRecipeStatus = OfficialRecipeRow['status']

const safeArray = (value: Json) => (Array.isArray(value) ? value : [])

export const requireRecipePublicationAccess = (role: string) => {
  if (!['administrator', 'super_administrator'].includes(role)) {
    throwApiError('FORBIDDEN', 'La publication des recettes est rÃ©servÃ©e aux administrateurs.')
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
  client: SupabaseClient<Database>,
  input: {
    recipe: OfficialRecipeRow
    fromStatus: OfficialRecipeStatus | null
    toStatus: OfficialRecipeStatus
    userId: string
    reason?: string | undefined
  },
) => {
  const { error } = await client.from('recipe_publication_history').insert({
    recipe_id: input.recipe.id,
    from_status: input.fromStatus,
    to_status: input.toStatus,
    changed_by: input.userId,
    reason: input.reason ?? null,
    snapshot: input.recipe as unknown as Json,
  })

  if (error) {
    throwApiError('UPSTREAM_ERROR', 'Impossible dâ€™historiser le changement de publication.')
  }
}
