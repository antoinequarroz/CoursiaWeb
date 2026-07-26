import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  getOfficialRecipeBlockingFields,
  getUnpublishBehaviorMessage,
  officialRecipeStatusSchema,
} from '../shared/validation/course'

describe('COUR-101 recipe preview and publication workflow', () => {
  const publicationPage = readFileSync(
    resolve(process.cwd(), 'app/pages/admin/recettes/publication.vue'),
    'utf8',
  )
  const publicationUtil = readFileSync(resolve(process.cwd(), 'server/utils/recipe-publication.ts'), 'utf8')
  const previewRoute = readFileSync(
    resolve(process.cwd(), 'server/api/admin/recipes/[id]/preview.get.ts'),
    'utf8',
  )
  const submitReviewRoute = readFileSync(
    resolve(process.cwd(), 'server/api/admin/recipes/[id]/submit-review.post.ts'),
    'utf8',
  )
  const publishRoute = readFileSync(
    resolve(process.cwd(), 'server/api/admin/recipes/[id]/publish.post.ts'),
    'utf8',
  )
  const unpublishRoute = readFileSync(
    resolve(process.cwd(), 'server/api/admin/recipes/[id]/unpublish.post.ts'),
    'utf8',
  )

  it('supports draft review published and archived states', () => {
    expect(officialRecipeStatusSchema.options).toEqual(['draft', 'review', 'published', 'archived'])
    expect(publicationPage).toContain('Brouillon')
    expect(publicationPage).toContain('En validation')
    expect(publicationPage).toContain('Publi')
    expect(publicationPage).toContain('Archiv')
  })

  it('builds mobile and web previews', () => {
    expect(previewRoute).toContain('buildRecipePreview')
    expect(publicationUtil).toContain('mobile')
    expect(publicationUtil).toContain('web')
    expect(publicationPage).toContain('Aper')
    expect(publicationPage).toContain('fiche mobile')
    expect(publicationPage).toContain('fiche web')
  })

  it('lists blocking fields before publication', () => {
    const fields = getOfficialRecipeBlockingFields({
      title: 'Pasta',
      slug: 'pasta',
      ingredients: [],
      steps: [],
    })

    expect(fields).toEqual(['portions', 'durationMinutes', 'difficulty', 'ingredients', 'steps', 'source'])
    expect(publicationUtil).toContain('getRecipePublicationBlockingFields')
    expect(submitReviewRoute).toContain('blockingFields.length > 0')
    expect(publishRoute).toContain('blockingFields.length > 0')
  })

  it('requires publication rights for publish and unpublish', () => {
    expect(publicationUtil).toContain('requireRecipePublicationAccess')
    expect(publicationUtil).toContain('administrator')
    expect(publicationUtil).toContain('super_administrator')
    expect(publishRoute).toContain('requireRecipePublicationAccess')
    expect(unpublishRoute).toContain('requireRecipePublicationAccess')
  })

  it('histories important workflow changes and audits actions', () => {
    expect(publicationUtil).toContain('recipe_publication_history')
    expect(submitReviewRoute).toContain('writeRecipePublicationHistory')
    expect(publishRoute).toContain('writeRecipePublicationHistory')
    expect(unpublishRoute).toContain('writeRecipePublicationHistory')
    expect(submitReviewRoute).toContain('writeAdminAuditLog')
    expect(publishRoute).toContain('writeAdminAuditLog')
    expect(unpublishRoute).toContain('writeAdminAuditLog')
    expect(publicationPage).toContain('Historique des modifications importantes')
  })

  it('makes unpublish behavior explicit', () => {
    expect(getUnpublishBehaviorMessage()).toContain('brouillon')
    expect(unpublishRoute).toContain("status: 'draft'")
    expect(publicationPage).toContain('D')
    expect(publicationPage).toContain('retour en brouillon')
  })
})
