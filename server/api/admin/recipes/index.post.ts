import { officialRecipeMutationSchema } from '#shared/validation/course'

export default defineEventHandler(async (event) => {
  const admin = await getSensitiveAdminContext(event)
  requireRecipeWriteAccess(admin.role)

  const body = await readBody(event)
  const parsed = officialRecipeMutationSchema.safeParse(body)

  if (!parsed.success) {
    throwValidationError(parsed.error)
  }

  const supabase = createSupabaseServiceRoleClient()
  const { data, error } = await mobileTable(supabase, 'recettes')
    .insert(toMobileRecipeRow(parsed.data))
    .select('*')
    .single()

  if (error) {
    throwApiError('UPSTREAM_ERROR', 'Impossible de créer la recette mobile.')
  }

  const recipe = toAdminRecipeRow(data as never)

  await writeAdminAuditLog(supabase, {
    actorUserId: admin.userId,
    action: parsed.data.status === 'published' ? 'publish' : 'create',
    resourceType: 'course',
    resourceId: String(recipe.id),
    context: { slug: recipe.slug, status: recipe.status, table: 'recettes' },
  })

  return { data: recipe }
})
