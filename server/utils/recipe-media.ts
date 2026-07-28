import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database, Json } from '#shared/supabase/database.types'
import {
  buildRecipeMediaRenditions,
  recipeMediaBucket,
  recipeMediaAllowedTypes,
  recipeMediaMaxBytes,
  type RecipeMediaMetadata,
} from '#shared/validation/recipe-media'

export const requireRecipeMediaAccess = (role: string) => {
  if (!['editor', 'administrator', 'super_administrator'].includes(role)) {
    throwApiError('FORBIDDEN', 'Permission insuffisante pour gérer les médias de recettes.')
  }
}

export const buildPrivateRecipeMediaPath = (recipeId: string, fileName: string) => {
  const safeName = fileName.toLowerCase().replace(/[^a-z0-9.-]+/g, '-')

  return `${recipeId}/${Date.now()}-${safeName}`
}

export const toRecipeMediaAssetRow = (metadata: RecipeMediaMetadata, createdBy?: string) => {
  const privatePath = buildPrivateRecipeMediaPath(metadata.recipeId, metadata.fileName)

  return {
    recipe_id: metadata.recipeId,
    status: metadata.status,
    private_path: privatePath,
    public_path: null,
    mime_type: metadata.mimeType,
    size_bytes: metadata.sizeBytes,
    width: metadata.width,
    height: metadata.height,
    crop: metadata.crop as unknown as Json,
    renditions: buildRecipeMediaRenditions(privatePath) as unknown as Json,
    alt_text: metadata.altText ?? null,
    author: metadata.rights.author,
    source: metadata.rights.source,
    license: metadata.rights.license,
    consent_confirmed: metadata.rights.consentConfirmed,
    created_by: createdBy ?? null,
    metadata: {
      originalFileName: metadata.fileName,
      storageBucket: recipeMediaBucket.privateValidation,
    } as unknown as Json,
    updated_at: new Date().toISOString(),
  }
}

export const assertRecipeMediaUploadFile = (
  file: { filename?: string | undefined; type?: string | undefined; data: Buffer },
) => {
  const mimeType = file.type ?? ''

  if (!recipeMediaAllowedTypes.includes(mimeType as (typeof recipeMediaAllowedTypes)[number])) {
    throwApiError('INVALID_REQUEST', 'Type de fichier image non autorisé.')
  }

  if (file.data.byteLength <= 0) {
    throwApiError('INVALID_REQUEST', 'Le fichier image est vide.')
  }

  if (file.data.byteLength > recipeMediaMaxBytes) {
    throwApiError('INVALID_REQUEST', 'Le fichier image dépasse la taille maximale autorisée.')
  }
}

export const uploadRecipeMediaObject = async (
  client: SupabaseClient<Database>,
  path: string,
  file: { type?: string; data: Buffer },
) => {
  const options = {
    cacheControl: '31536000',
    upsert: false,
    ...(file.type ? { contentType: file.type } : {}),
  }

  const { error } = await client.storage
    .from(recipeMediaBucket.privateValidation)
    .upload(path, file.data, options)

  if (error) {
    throwApiError('UPSTREAM_ERROR', 'Impossible d’importer le fichier dans Supabase Storage.')
  }
}

export const publishRecipeMediaObject = async (
  client: SupabaseClient<Database>,
  privatePath: string,
  publicPath: string,
  contentType?: string | null,
) => {
  const { data: privateObject, error: downloadError } = await client.storage
    .from(recipeMediaBucket.privateValidation)
    .download(privatePath)

  if (downloadError || !privateObject) {
    throwApiError('UPSTREAM_ERROR', 'Impossible de lire le fichier privé à publier.')
  }

  const options = {
    cacheControl: '31536000',
    upsert: true,
    ...(contentType ? { contentType } : {}),
  }

  const { error: uploadError } = await client.storage
    .from(recipeMediaBucket.publicPublished)
    .upload(publicPath, privateObject, options)

  if (uploadError) {
    throwApiError('UPSTREAM_ERROR', 'Impossible de publier le fichier dans le bucket public.')
  }
}

export const getRecipeMediaAssetById = async (
  client: SupabaseClient<Database>,
  id: string,
) => {
  const { data, error } = await client
    .from('recipe_media_assets')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (error) {
    throwApiError('UPSTREAM_ERROR', 'Impossible de charger le média de recette.')
  }

  if (!data) {
    throwApiError('NOT_FOUND', 'Média de recette introuvable.')
  }

  return data
}

export const storagePolicyNotes = {
  validationBucket: `${recipeMediaBucket.privateValidation} reste privé pour les médias en validation.`,
  publishedBucket: `${recipeMediaBucket.publicPublished} expose uniquement les médias publiés.`,
  replacement:
    'Un remplacement marque l’ancien média comme replaced et conserve son audit au lieu de l’écraser silencieusement.',
} as const
