import { officialRecipeMutationSchema, officialRecipeParamsSchema } from '#shared/validation/course'

export default defineEventHandler(async (event) => {
  const admin = await getSensitiveAdminContext(event)
  requireRecipeWriteAccess(admin.role)

  const params = await getValidatedRouterParams(event, officialRecipeParamsSchema.parse)
  const body = await readBody(event)
  const parsed = officialRecipeMutationSchema.safeParse(body)

  if (!parsed.success) {
    throwValidationError(parsed.error)
  }

  const supabase = createSupabaseServiceRoleClient()
  const { data, error } = await mobileTable(supabase, 'recettes')
    .update(toMobileRecipeRow(parsed.data))
    .eq('id', params.id)
    .select('*')
    .single()

  if (error) {
    throwApiError('UPSTREAM_ERROR', 'Impossible de modifier la recette mobile.')
  }

  const recipe = toAdminRecipeRow(data as never)

  await writeAdminAuditLog(supabase, {
    actorUserId: admin.userId,
    action: parsed.data.status === 'published' ? 'publish' : 'update',
    resourceType: 'course',
    resourceId: String(recipe.id),
    context: { slug: recipe.slug, status: recipe.status, table: 'recettes' },
  })

  return { data: recipe }
})
