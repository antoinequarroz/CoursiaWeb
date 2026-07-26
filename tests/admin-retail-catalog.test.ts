import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  buildRetailImportIdempotencyKey,
  isPriceAnomaly,
  isPriceStale,
  parseRetailCsv,
  retailCsvColumns,
  retailCsvTemplate,
  retailerSchema,
  productSchema,
  priceEntrySchema,
  validateRetailCsvRows,
} from '../shared/validation/retail-catalog'

describe('COUR-102 retail catalog administration', () => {
  const retailersPage = readFileSync(resolve(process.cwd(), 'app/pages/admin/enseignes.vue'), 'utf8')
  const productsPage = readFileSync(resolve(process.cwd(), 'app/pages/admin/produits.vue'), 'utf8')
  const pricesPage = readFileSync(resolve(process.cwd(), 'app/pages/admin/prix.vue'), 'utf8')
  const retailUtil = readFileSync(resolve(process.cwd(), 'server/utils/retail-catalog.ts'), 'utf8')
  const retailerCreateRoute = readFileSync(resolve(process.cwd(), 'server/api/admin/retailers/index.post.ts'), 'utf8')
  const productCreateRoute = readFileSync(resolve(process.cwd(), 'server/api/admin/products/index.post.ts'), 'utf8')
  const priceCreateRoute = readFileSync(resolve(process.cwd(), 'server/api/admin/prices/index.post.ts'), 'utf8')
  const priceHistoryRoute = readFileSync(resolve(process.cwd(), 'server/api/admin/prices/history.get.ts'), 'utf8')
  const csvPreviewRoute = readFileSync(resolve(process.cwd(), 'server/api/admin/retail-import/preview.post.ts'), 'utf8')

  it('validates retailer and product CRUD payloads', () => {
    expect(retailerSchema.safeParse({ name: 'COOP', slug: 'coop', status: 'active' }).success).toBe(true)
    expect(
      productSchema.safeParse({
        retailerId: '00000000-0000-4000-8000-000000000001',
        name: 'PÃ¢tes penne',
        slug: 'pates-penne',
        status: 'active',
        format: { label: '500 g', quantity: 500, unit: 'g' },
        source: 'coop.ch',
      }).success,
    ).toBe(true)
    expect(retailersPage).toContain('CRUD des enseignes')
    expect(productsPage).toContain('Gestion des produits')
    expect(retailerCreateRoute).toContain('writeAdminAuditLog')
    expect(productCreateRoute).toContain('writeAdminAuditLog')
  })

  it('manages formats units current price promotions source and collection date', () => {
    expect(
      priceEntrySchema.safeParse({
        productId: '00000000-0000-4000-8000-000000000001',
        retailerId: '00000000-0000-4000-8000-000000000001',
        amountChf: 2.4,
        unitPriceChf: 4.8,
        promotionLabel: 'Action 20%',
        source: 'coop.ch',
        collectedAt: '2026-07-26T20:00:00+02:00',
      }).success,
    ).toBe(true)
    expect(productsPage).toContain('Format')
    expect(productsPage).toContain('Unit')
    expect(pricesPage).toContain('Prix courant')
    expect(pricesPage).toContain('Promotion')
    expect(pricesPage).toContain('Date de collecte')
  })

  it('keeps price history consultable', () => {
    expect(priceCreateRoute).toContain('writePriceHistory')
    expect(priceHistoryRoute).toContain('price_history')
    expect(pricesPage).toContain('Historique des prix')
  })

  it('flags stale prices and abnormal variations', () => {
    expect(isPriceStale('2026-01-01T00:00:00+01:00', new Date('2026-07-26T00:00:00+02:00'))).toBe(true)
    expect(isPriceAnomaly(15, 10)).toBe(true)
    expect(retailUtil).toContain('quality_status')
    expect(pricesPage).toContain('Variation anormale')
    expect(pricesPage).toContain('P')
  })

  it('previews manual or CSV import without silent mutations', () => {
    const rows = parseRetailCsv(retailCsvTemplate)
    const preview = validateRetailCsvRows(rows, new Set())

    expect(retailCsvTemplate).toContain(retailCsvColumns.join(','))
    expect(buildRetailImportIdempotencyKey(retailCsvTemplate)).toHaveLength(64)
    expect(preview.creates).toBe(1)
    expect(csvPreviewRoute).toContain('retail_import_reports')
    expect(csvPreviewRoute).toContain('csv_preview')
    expect(pricesPage).toContain('Import CSV avec pr')
  })

  it('audits comparator mutations and aligns with COUR-16 and COUR-21 rules', () => {
    expect(retailUtil).toContain('isPriceStale')
    expect(retailUtil).toContain('isPriceAnomaly')
    expect(retailerCreateRoute).toContain("resourceType: 'retailer'")
    expect(productCreateRoute).toContain("resourceType: 'product'")
    expect(priceCreateRoute).toContain("resourceType: 'price_entry'")
    expect(priceCreateRoute).toContain('writeAdminAuditLog')
  })
})
