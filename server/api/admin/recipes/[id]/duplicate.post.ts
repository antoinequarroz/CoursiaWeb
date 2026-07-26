import { officialRecipeParamsSchema } from '#shared/validation/course'

export default defineEventHandler(async (event) => {
  const admin = await getSensitiveAdminContext(event)
  requireRecipeWriteAccess(admin.role)

  const params = await getValidatedRouterParams(event, officialRecipeParamsSchema.parse)
  const supabase = createSupabaseServiceRoleClient()
  const recipe = await getOfficialRecipeById(supabase, params.id)

  const { data, error } = await supabase
    .from('official_recipes')
    .insert({
      title: `${recipe.title} — copie`,
      slug: `${recipe.slug}-copie-${Date.now()}`,
      status: 'draft',
      portions: recipe.portions,
      duration_minutes: recipe.duration_minutes,
      difficulty: recipe.difficulty,
      ingredients: recipe.ingredients,
      steps: recipe.steps,
      nutrition: recipe.nutrition,
      categories: recipe.categories,
      source: recipe.source,
    })
    .select('*')
    .single()

  if (error) {
    throwApiError('UPSTREAM_ERROR', 'Impossible de dupliquer la recette officielle.')
  }

  await writeAdminAuditLog(supabase, {
    actorUserId: admin.userId,
    action: 'create',
    resourceType: 'official_recipe',
    resourceId: data.id,
    context: { duplicatedFrom: recipe.id, slug: data.slug },
  })

  return { data }
})
