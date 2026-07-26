import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database, Json } from '#shared/supabase/database.types'
import {
  buildRecipeMediaRenditions,
  recipeMediaBucket,
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

export const toRecipeMediaAssetRow = (metadata: RecipeMediaMetadata) => {
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
    updated_at: new Date().toISOString(),
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

