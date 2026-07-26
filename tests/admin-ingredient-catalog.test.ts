import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  canonicalIngredientSchema,
  estimateIngredientCatalogImpact,
  findIngredientCatalogConflicts,
} from '../shared/validation/ingredient-catalog'

describe('COUR-98 canonical ingredients allergens and diets administration', () => {
  const adminIngredientsPage = readFileSync(
    resolve(process.cwd(), 'app/pages/admin/ingredients.vue'),
    'utf8',
  )
  const createRoute = readFileSync(
    resolve(process.cwd(), 'server/api/admin/ingredients/index.post.ts'),
    'utf8',
  )
  const updateRoute = readFileSync(
    resolve(process.cwd(), 'server/api/admin/ingredients/[id].put.ts'),
    'utf8',
  )
  const archiveRoute = readFileSync(
    resolve(process.cwd(), 'server/api/admin/ingredients/[id]/archive.post.ts'),
    'utf8',
  )
  const mergeRoute = readFileSync(
    resolve(process.cwd(), 'server/api/admin/ingredients/[id]/merge.post.ts'),
    'utf8',
  )

  it('supports CRUD for canonical ingredients', () => {
    expect(adminIngredientsPage).toContain('Créer ou modifier un ingrédient canonique')
    expect(createRoute).toContain('canonicalIngredientSchema')
    expect(updateRoute).toContain('canonicalIngredientSchema')
    expect(archiveRoute).toContain('canonicalIngredientParamsSchema')
  })

  it('manages synonyms units categories allergens and diets', () => {
    const parsed = canonicalIngredientSchema.safeParse({
      name: 'Tomate',
      slug: 'tomate',
      status: 'active',
      synonyms: ['tomates', 'tomato'],
      units: ['g', 'kg', 'piece'],
      categories: ['Légume'],
      allergens: [],
      diets: ['vegetarian', 'vegan', 'gluten_free'],
      sensitive: false,
    })

    expect(parsed.success).toBe(true)
    expect(adminIngredientsPage).toContain('Synonymes')
    expect(adminIngredientsPage).toContain('Unités compatibles')
    expect(adminIngredientsPage).toContain('Catégories')
    expect(adminIngredientsPage).toContain('Allergènes')
    expect(adminIngredientsPage).toContain('Régimes compatibles')
  })

  it('signals conflicts and duplicates', () => {
    const conflicts = findIngredientCatalogConflicts([
      { name: 'Tomate', slug: 'tomate', synonyms: ['tomato'] },
      { name: 'Tomato', slug: 'tomato', synonyms: ['tomate'] },
    ])

    expect(conflicts.length).toBeGreaterThan(0)
    expect(adminIngredientsPage).toContain('Conflits et doublons')
  })

  it('shows impact before merge or archive', () => {
    expect(estimateIngredientCatalogImpact(3, 2)).toEqual({
      affectedRecipes: 3,
      affectedSynonyms: 2,
      requiresReview: true,
    })
    expect(adminIngredientsPage).toContain('Impact avant fusion ou archivage')
    expect(mergeRoute).toContain('impact')
  })

  it('protects sensitive food safety data with adequate role and audits changes', () => {
    for (const route of [createRoute, updateRoute, archiveRoute, mergeRoute]) {
      expect(route).toContain('getSensitiveAdminContext')
      expect(route).toContain('writeAdminAuditLog')
    }

    expect(createRoute).toContain('requireSensitiveIngredientAccess')
    expect(updateRoute).toContain('requireSensitiveIngredientAccess')
    expect(archiveRoute).toContain('requireSensitiveIngredientAccess')
    expect(mergeRoute).toContain('requireSensitiveIngredientAccess')
    expect(adminIngredientsPage).toContain('Donnée sensible sécurité alimentaire')
  })
})

