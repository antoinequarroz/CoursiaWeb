import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  officialRecipeMutationSchema,
  officialRecipePublishSchema,
} from '../shared/validation/course'

describe('COUR-96 official recipes admin CRUD', () => {
  const adminRecipesPage = readFileSync(resolve(process.cwd(), 'app/pages/admin/recettes.vue'), 'utf8')
  const adminRecipesList = readFileSync(
    resolve(process.cwd(), 'server/api/admin/recipes/index.get.ts'),
    'utf8',
  )
  const adminRecipesCreate = readFileSync(
    resolve(process.cwd(), 'server/api/admin/recipes/index.post.ts'),
    'utf8',
  )
  const adminRecipesUpdate = readFileSync(
    resolve(process.cwd(), 'server/api/admin/recipes/[id].put.ts'),
    'utf8',
  )
  const adminRecipesDuplicate = readFileSync(
    resolve(process.cwd(), 'server/api/admin/recipes/[id]/duplicate.post.ts'),
    'utf8',
  )
  const adminRecipesArchive = readFileSync(
    resolve(process.cwd(), 'server/api/admin/recipes/[id]/archive.post.ts'),
    'utf8',
  )
  const adminRecipesDelete = readFileSync(
    resolve(process.cwd(), 'server/api/admin/recipes/[id].delete.ts'),
    'utf8',
  )

  it('provides list search filters create duplicate update archive and delete actions', () => {
    expect(adminRecipesPage).toContain('Recherche')
    expect(adminRecipesPage).toContain('Tous statuts')
    expect(adminRecipesPage).toContain('Toutes difficultés')
    expect(adminRecipesPage).toContain('Créer ou modifier')
    expect(adminRecipesPage).toContain('Dupliquer')
    expect(adminRecipesPage).toContain('Archiver')
    expect(adminRecipesPage).toContain('Supprimer définitivement')
    expect(adminRecipesList).toContain('search')
    expect(adminRecipesList).toContain('category')
    expect(adminRecipesDuplicate).toContain('duplicatedFrom')
  })

  it('validates portions duration difficulty steps nutrition categories and source', () => {
    const draft = officialRecipeMutationSchema.safeParse({
      title: 'Pasta',
      slug: 'pasta',
      status: 'draft',
      categories: ['Famille'],
      source: 'Cuisine interne',
      steps: [],
      nutrition: {},
    })

    const publish = officialRecipePublishSchema.safeParse({
      title: 'Pasta',
      slug: 'pasta',
      status: 'published',
      portions: 4,
      durationMinutes: 25,
      difficulty: 'easy',
      ingredients: [
        {
          ingredientId: 'pasta',
          name: 'Pâtes',
          quantity: 300,
          unit: 'g',
          group: 'Principal',
          optional: false,
        },
      ],
      categories: ['Famille'],
      source: 'Cuisine interne',
      steps: [{ order: 1, instruction: 'Cuire les pâtes.' }],
      nutrition: { calories: 540, proteinGrams: 18 },
    })

    expect(draft.success).toBe(true)
    expect(publish.success).toBe(true)
  })

  it('uses shared validation and secured server mutations', () => {
    for (const route of [adminRecipesCreate, adminRecipesUpdate]) {
      expect(route).toContain('officialRecipeMutationSchema')
      expect(route).toContain('getSensitiveAdminContext')
      expect(route).toContain('requireRecipeWriteAccess')
      expect(route).toContain('createSupabaseServiceRoleClient')
    }
  })

  it('allows incomplete drafts but requires complete published recipes', () => {
    expect(
      officialRecipeMutationSchema.safeParse({
        title: 'Draft',
        slug: 'draft',
        status: 'draft',
        categories: [],
        steps: [],
        nutrition: {},
      }).success,
    ).toBe(true)

    expect(
      officialRecipeMutationSchema.safeParse({
        title: 'Published',
        slug: 'published',
        status: 'published',
        categories: [],
        steps: [],
        nutrition: {},
      }).success,
    ).toBe(false)
  })

  it('reserves permanent deletion and writes audit logs for important actions', () => {
    expect(adminRecipesDelete).toContain('requireRecipeDeleteAccess')
    expect(adminRecipesCreate).toContain('writeAdminAuditLog')
    expect(adminRecipesUpdate).toContain('writeAdminAuditLog')
    expect(adminRecipesDuplicate).toContain('writeAdminAuditLog')
    expect(adminRecipesArchive).toContain('writeAdminAuditLog')
    expect(adminRecipesDelete).toContain('permanentDelete')
  })
})
