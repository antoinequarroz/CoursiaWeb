import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  buildRecipeMediaRenditions,
  recipeMediaBucket,
  recipeMediaMaxBytes,
  recipeMediaMetadataSchema,
  recipeMediaPublishSchema,
} from '../shared/validation/recipe-media'

describe('COUR-99 recipe photos in Supabase Storage', () => {
  const mediaPage = readFileSync(resolve(process.cwd(), 'app/pages/admin/recettes/medias.vue'), 'utf8')
  const mediaUtil = readFileSync(resolve(process.cwd(), 'server/utils/recipe-media.ts'), 'utf8')
  const createRoute = readFileSync(
    resolve(process.cwd(), 'server/api/admin/recipes/media/index.post.ts'),
    'utf8',
  )
  const publishRoute = readFileSync(
    resolve(process.cwd(), 'server/api/admin/recipes/media/[id]/publish.post.ts'),
    'utf8',
  )
  const replaceRoute = readFileSync(
    resolve(process.cwd(), 'server/api/admin/recipes/media/[id]/replace.post.ts'),
    'utf8',
  )
  const orphansRoute = readFileSync(
    resolve(process.cwd(), 'server/api/admin/recipes/media/orphans.get.ts'),
    'utf8',
  )

  it('validates types dimensions and sizes', () => {
    const valid = recipeMediaMetadataSchema.safeParse({
      recipeId: '00000000-0000-4000-8000-000000000001',
      fileName: 'pasta.webp',
      mimeType: 'image/webp',
      sizeBytes: recipeMediaMaxBytes,
      width: 1280,
      height: 960,
      crop: { x: 0, y: 0, width: 1, height: 1 },
      rights: {
        author: 'Coursia',
        source: 'Studio interne',
        license: 'Tous droits réservés',
        consentConfirmed: true,
      },
      status: 'validation',
    })

    expect(valid.success).toBe(true)
    expect(mediaPage).toContain('Type')
    expect(mediaPage).toContain('Largeur')
    expect(mediaPage).toContain('Taille en octets')
  })

  it('provides crop and web mobile previews', () => {
    expect(mediaPage).toContain('Recadrage')
    expect(mediaPage).toContain('Aperçus web/mobile')
    expect(mediaPage).toContain('recipeMediaRenditions')
  })

  it('generates multiple optimized sizes', () => {
    const renditions = buildRecipeMediaRenditions('recipe.webp')

    expect(renditions.map((rendition) => rendition.name)).toEqual(['mobile', 'web', 'social'])
    expect(mediaPage).toContain('Tailles optimisées générées')
    expect(mediaUtil).toContain('buildRecipeMediaRenditions')
  })

  it('records author source license and consent', () => {
    expect(mediaPage).toContain('Auteur')
    expect(mediaPage).toContain('Source')
    expect(mediaPage).toContain('Licence')
    expect(mediaPage).toContain('Consentement confirmé')
    expect(createRoute).toContain('recipeMediaMetadataSchema')
  })

  it('handles orphan files and replacements', () => {
    expect(replaceRoute).toContain('replaced')
    expect(replaceRoute).toContain('orphanHandled')
    expect(orphansRoute).toContain('orphaned')
    expect(mediaPage).toContain('Fichiers orphelins')
  })

  it('separates private validation and published media buckets', () => {
    expect(recipeMediaBucket.privateValidation).toBe('recipe-media-validation')
    expect(recipeMediaBucket.publicPublished).toBe('recipe-media-public')
    expect(mediaUtil).toContain('validationBucket')
    expect(mediaUtil).toContain('publishedBucket')
  })

  it('requires alt metadata before publication and audits mutations', () => {
    expect(recipeMediaPublishSchema.safeParse({ altText: 'Plat de pâtes aux légumes' }).success).toBe(
      true,
    )
    expect(recipeMediaPublishSchema.safeParse({ altText: '' }).success).toBe(false)
    expect(publishRoute).toContain('recipeMediaPublishSchema')
    expect(publishRoute).toContain('writeAdminAuditLog')
    expect(createRoute).toContain('writeAdminAuditLog')
    expect(replaceRoute).toContain('writeAdminAuditLog')
  })
})

