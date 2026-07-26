import { describe, expect, it } from 'vitest'
import { toOfficialRecipeRow } from '../server/utils/admin-recipes'
import { toRecipeMediaAssetRow } from '../server/utils/recipe-media'
import { getPriceQualityStatus, toPriceEntryRow } from '../server/utils/retail-catalog'
import { summarizeRecipeCsvImport, validateRecipeCsvRows } from '../shared/validation/recipe-import'
import { validateRetailCsvRows } from '../shared/validation/retail-catalog'

describe('COUR-107 isolated integration scenarios for recipe media and price CRUD', () => {
  it('maps a recipe draft then a publish-ready recipe through shared server rows', () => {
    const draft = toOfficialRecipeRow({
      title: 'Risotto',
      slug: 'risotto',
      status: 'draft',
      categories: [],
      ingredients: [],
      steps: [],
      nutrition: {},
    })

    const publishReady = toOfficialRecipeRow({
      title: 'Risotto',
      slug: 'risotto',
      status: 'published',
      portions: 4,
      durationMinutes: 35,
      difficulty: 'medium',
      categories: ['Famille'],
      source: 'Cuisine Coursia',
      ingredients: [{ ingredientId: 'rice', name: 'Riz', quantity: 320, unit: 'g', optional: false }],
      steps: [{ order: 1, instruction: 'Cuire doucement.' }],
      nutrition: { calories: 610 },
    })

    expect(draft).toMatchObject({ title: 'Risotto', status: 'draft', portions: null })
    expect(publishReady).toMatchObject({
      status: 'published',
      portions: 4,
      duration_minutes: 35,
      difficulty: 'medium',
      source: 'Cuisine Coursia',
    })
  })

  it('validates media metadata and creates private storage row with generated renditions', () => {
    const row = toRecipeMediaAssetRow({
      recipeId: '00000000-0000-4000-8000-000000000011',
      fileName: 'Photo Plat.JPG',
      mimeType: 'image/jpeg',
      sizeBytes: 450000,
      width: 1400,
      height: 1000,
      crop: { x: 0, y: 0, width: 1000, height: 1000 },
      status: 'validation',
      rights: {
        author: 'Coursia',
        source: 'Studio interne',
        license: 'Owned',
        consentConfirmed: true,
      },
      altText: 'Assiette de risotto',
    })

    expect(row.private_path).toContain('photo-plat.jpg')
    expect(row.public_path).toBeNull()
    expect(row.alt_text).toBe('Assiette de risotto')
    expect(JSON.stringify(row.renditions)).toContain('web')
    expect(JSON.stringify(row.renditions)).toContain('mobile')
  })

  it('checks CSV recipe import dry-run and report stability without database access', () => {
    const rows = [
      {
        rowNumber: 2,
        slug: 'risotto',
        title: 'Risotto',
        categories: 'Famille',
        source: 'Coursia',
      },
      {
        rowNumber: 3,
        slug: '',
        title: 'Invalide',
      },
    ]

    const previewRows = validateRecipeCsvRows(rows, new Set(['risotto']))
    const report = summarizeRecipeCsvImport(previewRows, '0'.repeat(64), true)

    expect(report).toMatchObject({ creates: 0, updates: 1, errors: 1 })
    expect(report.idempotencyKey).toHaveLength(64)
    expect(report.dryRun).toBe(true)
  })

  it('checks price creation freshness and retail CSV dry-run in isolation', () => {
    const freshPrice = {
      productId: '00000000-0000-4000-8000-000000000021',
      retailerId: '00000000-0000-4000-8000-000000000022',
      amountChf: 4.5,
      source: 'coop.ch',
      collectedAt: new Date().toISOString(),
    }

    const row = toPriceEntryRow(freshPrice)
    const preview = validateRetailCsvRows([
      {
        rowNumber: 2,
        retailerSlug: 'coop',
        productSlug: 'riz-1kg',
        productName: 'Riz',
        formatQuantity: '1',
        formatUnit: 'kg',
        priceChf: '4.50',
        source: 'coop.ch',
        collectedAt: new Date().toISOString(),
      },
    ], new Set())

    expect(getPriceQualityStatus(freshPrice)).toBe('fresh')
    expect(row).toMatchObject({ amount_chf: 4.5, quality_status: 'fresh' })
    expect(preview).toMatchObject({ creates: 1, updates: 0, errors: 0 })
  })
})
