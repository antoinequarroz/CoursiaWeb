import { z } from 'zod'

export const recipeMediaBucket = {
  privateValidation: 'recipe-media-validation',
  publicPublished: 'recipe-media-public',
} as const

export const recipeMediaAllowedTypes = ['image/jpeg', 'image/png', 'image/webp'] as const
export const recipeMediaMaxBytes = 5 * 1024 * 1024
export const recipeMediaDimensions = {
  minWidth: 800,
  minHeight: 600,
  maxWidth: 6000,
  maxHeight: 6000,
} as const

export const recipeMediaRenditions = [
  { name: 'mobile', width: 640, height: 480, format: 'webp' },
  { name: 'web', width: 1280, height: 960, format: 'webp' },
  { name: 'social', width: 1200, height: 630, format: 'webp' },
] as const

export const recipeMediaCropSchema = z.object({
  x: z.number().min(0).max(1),
  y: z.number().min(0).max(1),
  width: z.number().positive().max(1),
  height: z.number().positive().max(1),
})

export const recipeMediaRightsSchema = z.object({
  author: z.string().trim().min(2).max(160),
  source: z.string().trim().min(2).max(300),
  license: z.string().trim().min(2).max(160),
  consentConfirmed: z.literal(true),
})

export const recipeMediaMetadataSchema = z.object({
  recipeId: z.uuid(),
  fileName: z.string().trim().min(1).max(220),
  mimeType: z.enum(recipeMediaAllowedTypes),
  sizeBytes: z.number().int().positive().max(recipeMediaMaxBytes),
  width: z.number().int().min(recipeMediaDimensions.minWidth).max(recipeMediaDimensions.maxWidth),
  height: z.number().int().min(recipeMediaDimensions.minHeight).max(recipeMediaDimensions.maxHeight),
  crop: recipeMediaCropSchema,
  rights: recipeMediaRightsSchema,
  altText: z.string().trim().max(220).optional(),
  status: z.enum(['validation', 'published', 'replaced', 'orphaned']).default('validation'),
})

export const recipeMediaPublishSchema = z.object({
  altText: z.string().trim().min(8).max(220),
})

export const recipeMediaParamsSchema = z.object({
  id: z.uuid(),
})

export type RecipeMediaMetadata = z.infer<typeof recipeMediaMetadataSchema>

export const buildRecipeMediaRenditions = (path: string) => {
  return recipeMediaRenditions.map((rendition) => ({
    ...rendition,
    path: path.replace(/(\.[a-z0-9]+)$/i, `-${rendition.name}.webp`),
  }))
}

export const isRecipeMediaOrphan = (recipeId: string | null | undefined) => !recipeId

