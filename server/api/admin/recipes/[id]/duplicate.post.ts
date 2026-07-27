import { officialRecipeParamsSchema } from '#shared/validation/course'

export default defineEventHandler(async (event) => {
  const admin = await getSensitiveAdminContext(event)
  requireRecipeWriteAccess(admin.role)

  const params = await getValidatedRouterParams(event, officialRecipeParamsSchema.parse)
  const supabase = createSupabaseServiceRoleClient()
  const { data: existing, error: loadError } = await mobileTable(supabase, 'recettes')
    .select('*')
    .eq('id', params.id)
    .maybeSingle()

  if (loadError) {
    throwApiError('UPSTREAM_ERROR', 'Impossible de charger la recette mobile.')
  }

  if (!existing || typeof existing !== 'object') {
    throwApiError('NOT_FOUND', 'Recette mobile introuvable.')
  }

  const source = existing as Record<string, unknown>
  const { data, error } = await mobileTable(supabase, 'recettes')
    .insert({
      titre: `${String(source.titre ?? 'Recette')} — copie`,
      description: source.description ?? null,
      image_url: source.image_url ?? null,
      blurhash: source.blurhash ?? null,
      temps_preparation: source.temps_preparation ?? null,
      difficulte: source.difficulte ?? null,
      cout_estime: source.cout_estime ?? null,
      calories: source.calories ?? null,
      portions: source.portions ?? 4,
      source: source.source ?? null,
      statut_publication: 'brouillon',
      proteines_g: source.proteines_g ?? null,
      glucides_g: source.glucides_g ?? null,
      lipides_g: source.lipides_g ?? null,
      cle_externe: `${String(source.cle_externe ?? source.titre ?? 'recette')}-copie-${Date.now()}`,
      droits_image: source.droits_image ?? null,
    })
    .select('*')
    .single()

  if (error) {
    throwApiError('UPSTREAM_ERROR', 'Impossible de dupliquer la recette mobile.')
  }

  const recipe = toAdminRecipeRow(data as never)

  await writeAdminAuditLog(supabase, {
    actorUserId: admin.userId,
    action: 'create',
    resourceType: 'course',
    resourceId: String(recipe.id),
    context: { duplicatedFrom: params.id, slug: recipe.slug, table: 'recettes' },
  })

  return { data: recipe }
})
