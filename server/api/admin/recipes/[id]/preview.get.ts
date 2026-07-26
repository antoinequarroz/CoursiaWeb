import { officialRecipeParamsSchema } from '#shared/validation/course'

export default defineEventHandler(async (event) => {
  const admin = await getSensitiveAdminContext(event)
  requireRecipeWriteAccess(admin.role)

  const params = await getValidatedRouterParams(event, officialRecipeParamsSchema.parse)
  const supabase = createSupabaseServiceRoleClient()
  const recipe = await getOfficialRecipeById(supabase, params.id)

  return {
    data: recipe,
    preview: buildRecipePreview(recipe),
  }
})
