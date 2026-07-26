import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  findDuplicateRecipeIngredients,
  findIncompatibleIngredientUnits,
  officialRecipeMutationSchema,
  scaleRecipeQuantity,
} from '../shared/validation/course'

describe('COUR-97 structured ingredient quantity and step editor', () => {
  const adminRecipesPage = readFileSync(resolve(process.cwd(), 'app/pages/admin/recettes.vue'), 'utf8')

  it('supports canonical ingredient search and selection', () => {
    expect(adminRecipesPage).toContain('canonicalIngredients')
    expect(adminRecipesPage).toContain('Ingrédient canonique')
    expect(adminRecipesPage).toContain('Ajouter un ingrédient')
  })

  it('edits quantity unit group and optional flag', () => {
    const parsed = officialRecipeMutationSchema.safeParse({
      title: 'Poulet',
      slug: 'poulet',
      status: 'draft',
      ingredients: [
        {
          ingredientId: 'chicken',
          name: 'Poulet',
          quantity: 400,
          unit: 'g',
          group: 'Principal',
          optional: false,
        },
      ],
      categories: [],
      steps: [],
      nutrition: {},
    })

    expect(parsed.success).toBe(true)
    expect(adminRecipesPage).toContain('Quantité')
    expect(adminRecipesPage).toContain('Unité')
    expect(adminRecipesPage).toContain('Groupe')
    expect(adminRecipesPage).toContain('Optionnel')
  })

  it('adds sorts and removes steps', () => {
    expect(adminRecipesPage).toContain('Ajouter une étape')
    expect(adminRecipesPage).toContain('Monter')
    expect(adminRecipesPage).toContain('Descendre')
    expect(adminRecipesPage).toContain('Supprimer l’étape')
    expect(adminRecipesPage).toContain('moveStep')
    expect(adminRecipesPage).toContain('removeStep')
  })

  it('previews portion changes', () => {
    expect(scaleRecipeQuantity(200, 2, 4)).toBe(400)
    expect(scaleRecipeQuantity(150, 3, 2)).toBe(100)
    expect(adminRecipesPage).toContain('Aperçu portions')
    expect(adminRecipesPage).toContain('portionPreview')
  })

  it('flags duplicates and incompatible units', () => {
    const ingredients = [
      {
        ingredientId: 'pasta',
        name: 'Pâtes',
        quantity: 300,
        unit: 'g' as const,
        group: 'Principal',
        optional: false,
      },
      {
        ingredientId: 'pasta',
        name: 'Pâtes',
        quantity: 1,
        unit: 'l' as const,
        group: 'Principal',
        optional: true,
      },
    ]

    expect(findDuplicateRecipeIngredients(ingredients)).toEqual(['pasta'])
    expect(findIncompatibleIngredientUnits(ingredients).map((item) => item.ingredientId)).toEqual([
      'pasta',
    ])
    expect(adminRecipesPage).toContain('unités incompatibles')
  })

  it('keeps keyboard navigation and form errors explicit', () => {
    expect(adminRecipesPage).toContain('<label')
    expect(adminRecipesPage).toContain('<select')
    expect(adminRecipesPage).toContain('BaseButton')
    expect(adminRecipesPage).toContain('Corrigez les doublons')
    expect(adminRecipesPage).toContain('formErrors')
  })
})
