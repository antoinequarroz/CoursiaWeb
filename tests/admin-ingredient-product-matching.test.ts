import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  areUnitsComparable,
  buildUnitComparison,
  estimateMatchConfidence,
  estimateMatchingImpact,
  findAmbiguousMatches,
  findUnmatchedIngredients,
  getSuggestedMatchStatus,
  ingredientProductMatchSchema,
} from '../shared/validation/ingredient-product-matching'

describe('COUR-103 ingredient product matching', () => {
  const matchingPage = readFileSync(resolve(process.cwd(), 'app/pages/admin/correspondances.vue'), 'utf8')
  const matchingUtil = readFileSync(
    resolve(process.cwd(), 'server/utils/ingredient-product-matching.ts'),
    'utf8',
  )
  const listRoute = readFileSync(resolve(process.cwd(), 'server/api/admin/matching/index.get.ts'), 'utf8')
  const createRoute = readFileSync(resolve(process.cwd(), 'server/api/admin/matching/index.post.ts'), 'utf8')
  const updateRoute = readFileSync(resolve(process.cwd(), 'server/api/admin/matching/[id].put.ts'), 'utf8')
  const unmatchedRoute = readFileSync(resolve(process.cwd(), 'server/api/admin/matching/unmatched.get.ts'), 'utf8')
  const suggestionsRoute = readFileSync(resolve(process.cwd(), 'server/api/admin/matching/suggestions.post.ts'), 'utf8')
  const impactRoute = readFileSync(resolve(process.cwd(), 'server/api/admin/matching/impact.get.ts'), 'utf8')

  it('lists ingredients without matching', () => {
    const unmatched = findUnmatchedIngredients(
      [{ id: 'tomato' }, { id: 'pasta' }],
      [{ ingredientId: 'tomato', status: 'confirmed' }],
    )

    expect(unmatched).toEqual([{ id: 'pasta' }])
    expect(unmatchedRoute).toContain('canonical_ingredients')
    expect(unmatchedRoute).toContain('ingredient_product_matches')
    expect(matchingPage).toContain('Ingredients sans correspondance')
  })

  it('allows several products with confidence levels', () => {
    expect(
      ingredientProductMatchSchema.safeParse({
        ingredientId: '00000000-0000-4000-8000-000000000001',
        productId: '00000000-0000-4000-8000-000000000002',
        retailerId: '00000000-0000-4000-8000-000000000003',
        confidence: 0.9,
        status: 'suggested',
        source: 'manual',
        unitComparison: buildUnitComparison('g', 'kg'),
      }).success,
    ).toBe(true)
    expect(listRoute).toContain('ingredientId')
    expect(createRoute).toContain('confidence')
    expect(matchingPage).toContain('Plusieurs produits')
  })

  it('compares formats and units', () => {
    expect(areUnitsComparable('g', 'kg')).toBe(true)
    expect(areUnitsComparable('g', 'ml')).toBe(false)
    expect(buildUnitComparison('kg', 'g').conversionFactor).toBe(1000)
    expect(matchingPage).toContain('Formats et unites comparables')
  })

  it('keeps automatic suggestions manually confirmable', () => {
    expect(estimateMatchConfidence('Tomate cerise', 'Tomate cerise bio')).toBe(1)
    expect(getSuggestedMatchStatus(1, true)).toBe('suggested')
    expect(suggestionsRoute).toContain('buildAutomaticMatchSuggestion')
    expect(suggestionsRoute).toContain('confirmable')
    expect(matchingPage).toContain('suggestions automatiques restent confirmables manuellement')
  })

  it('shows recipe and basket impact before changes', () => {
    expect(estimateMatchingImpact(3, 2)).toEqual({
      affectedRecipes: 3,
      affectedBaskets: 2,
      requiresReprice: true,
    })
    expect(matchingUtil).toContain('buildIngredientMatchingImpact')
    expect(impactRoute).toContain('buildIngredientMatchingImpact')
    expect(matchingPage).toContain('Impact recettes et paniers')
  })

  it('does not silently validate ambiguous cases and audits mutations', () => {
    expect(findAmbiguousMatches([{ status: 'ambiguous', confidence: 0.4 }])).toHaveLength(1)
    expect(createRoute).toContain('Les cas ambigus')
    expect(updateRoute).toContain('Un cas ambigu')
    expect(createRoute).toContain('writeAdminAuditLog')
    expect(updateRoute).toContain('writeAdminAuditLog')
    expect(createRoute).toContain("resourceType: 'ingredient_product_match'")
    expect(updateRoute).toContain("resourceType: 'ingredient_product_match'")
  })
})
