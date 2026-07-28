import { z } from 'zod'
import { recipeMediaMetadataSchema } from '#shared/validation/recipe-media'

const replaceSchema = z.object({
  replaceOfId: z.uuid().optional(),
})

const readMultipartText = (part: { data: Buffer }) => part.data.toString('utf8')

export default defineEventHandler(async (event) => {
  const admin = await getSensitiveAdminContext(event)
  requireRecipeMediaAccess(admin.role)

  const parts = await readMultipartFormData(event)
  const file = parts?.find((part) => part.name === 'file' && part.filename)
  const metadataPart = parts?.find((part) => part.name === 'metadata')
  const replacePart = parts?.find((part) => part.name === 'replaceOfId')

  if (!file?.data || !metadataPart?.data) {
    throwApiError('INVALID_REQUEST', 'Fichier image et métadonnées requis.')
  }

  assertRecipeMediaUploadFile({
    filename: file.filename,
    type: file.type,
    data: file.data,
  })

  const rawMetadata = JSON.parse(readMultipartText(metadataPart)) as unknown
  if (!rawMetadata || typeof rawMetadata !== 'object' || Array.isArray(rawMetadata)) {
    throwApiError('INVALID_REQUEST', 'Métadonnées média invalides.')
  }

  const replaceInput = replacePart?.data
    ? replaceSchema.parse({ replaceOfId: readMultipartText(replacePart).trim() || undefined })
    : { replaceOfId: undefined }

  const parsed = recipeMediaMetadataSchema.safeParse({
    ...rawMetadata,
    fileName: file.filename,
    mimeType: file.type,
    sizeBytes: file.data.byteLength,
    status: 'validation',
  })

  if (!parsed.success) {
    throwValidationError(parsed.error)
  }

  const supabase = createSupabaseServiceRoleClient()
  const row = toRecipeMediaAssetRow(parsed.data, admin.userId)

  await uploadRecipeMediaObject(supabase, row.private_path, {
    type: parsed.data.mimeType,
    data: file.data,
  })

  const { data, error } = await supabase
    .from('recipe_media_assets')
    .insert(row)
    .select('*')
    .single()

  if (error) {
    await supabase.storage.from('recipe-media-validation').remove([row.private_path])
    throwApiError('UPSTREAM_ERROR', 'Impossible d’enregistrer le média après import Storage.')
  }

  if (replaceInput.replaceOfId) {
    await supabase
      .from('recipe_media_assets')
      .update({ status: 'replaced', updated_at: new Date().toISOString() })
      .eq('id', replaceInput.replaceOfId)
  }

  await writeAdminAuditLog(supabase, {
    actorUserId: admin.userId,
    action: replaceInput.replaceOfId ? 'update' : 'create',
    resourceType: 'recipe_media_asset',
    resourceId: data.id,
    context: {
      recipeId: data.recipe_id,
      privatePath: data.private_path,
      storageBucket: 'recipe-media-validation',
      replacedAssetId: replaceInput.replaceOfId ?? null,
    },
  })

  return { data }
})
