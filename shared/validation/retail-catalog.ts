import { z } from 'zod'

export const retailerStatusSchema = z.enum(['active', 'archived'])
export const productStatusSchema = z.enum(['active', 'archived'])
export const priceQualityStatusSchema = z.enum(['fresh', 'stale', 'anomaly'])
export const productUnitSchema = z.enum(['g', 'kg', 'ml', 'l', 'piece', 'pack'])

export const retailerSchema = z.object({
  name: z.string().trim().min(1).max(120),
  slug: z.string().trim().min(1).max(140).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  status: retailerStatusSchema.default('active'),
  websiteUrl: z.url().optional(),
})

export const productFormatSchema = z.object({
  label: z.string().trim().min(1).max(120),
  quantity: z.number().positive().max(100000),
  unit: productUnitSchema,
})

export const productSchema = z.object({
  retailerId: z.uuid(),
  name: z.string().trim().min(1).max(180),
  slug: z.string().trim().min(1).max(200).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  brand: z.string().trim().max(120).optional(),
  status: productStatusSchema.default('active'),
  format: productFormatSchema,
  source: z.string().trim().min(1).max(300),
})

export const priceEntrySchema = z.object({
  productId: z.uuid(),
  retailerId: z.uuid(),
  amountChf: z.number().positive().max(99999),
  unitPriceChf: z.number().positive().max(99999).optional(),
  promotionLabel: z.string().trim().max(160).optional(),
  source: z.string().trim().min(1).max(300),
  collectedAt: z.iso.datetime({ offset: true }),
})

export const retailCatalogQuerySchema = z.object({
  search: z.string().trim().max(120).optional(),
  status: z.enum(['active', 'archived']).optional(),
  retailerId: z.uuid().optional(),
  quality: priceQualityStatusSchema.optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
})

export const retailCatalogParamsSchema = z.object({
  id: z.uuid(),
})

export const retailCsvColumns = [
  'retailer_slug',
  'product_slug',
  'product_name',
  'format_quantity',
  'format_unit',
  'price_chf',
  'promotion',
  'source',
  'collected_at',
] as const

export const retailCsvTemplate = `${retailCsvColumns.join(',')}
coop,pates-penne-500g,PÃ¢tes penne,500,g,2.40,Action 20%,coop.ch,2026-07-26T20:00:00+02:00`

export type RetailCsvRow = {
  rowNumber: number
  retailerSlug?: string | undefined
  productSlug?: string | undefined
  productName?: string | undefined
  formatQuantity?: string | undefined
  formatUnit?: string | undefined
  priceChf?: string | undefined
  promotion?: string | undefined
  source?: string | undefined
  collectedAt?: string | undefined
}

export type RetailImportRowResult = {
  rowNumber: number
  action: 'create' | 'update' | 'error'
  productSlug: string
  field?: string
  message: string
}

export type RetailImportPreview = {
  creates: number
  updates: number
  errors: number
  anomalies: number
  rows: RetailImportRowResult[]
  idempotencyKey: string
}

export const parseRetailCsv = (content: string): RetailCsvRow[] => {
  const lines = content.trim().split(/\r?\n/).filter(Boolean)
  const headers = lines.shift()?.split(',').map((header) => header.trim()) ?? []

  return lines.map((line, index) => {
    const values = line.split(',').map((value) => value.trim())
    const row = Object.fromEntries(headers.map((header, headerIndex) => [header, values[headerIndex] ?? '']))

    return {
      rowNumber: index + 2,
      retailerSlug: row.retailer_slug,
      productSlug: row.product_slug,
      productName: row.product_name,
      formatQuantity: row.format_quantity,
      formatUnit: row.format_unit,
      priceChf: row.price_chf,
      promotion: row.promotion,
      source: row.source,
      collectedAt: row.collected_at,
    }
  })
}

export const buildRetailImportIdempotencyKey = (content: string) => {
  let hash = 0x811c9dc5

  for (const character of content.trim()) {
    hash ^= character.charCodeAt(0)
    hash = Math.imul(hash, 0x01000193)
  }

  return Array.from({ length: 8 }, (_, index) =>
    ((hash + index * 0x9e3779b9) >>> 0).toString(16).padStart(8, '0'),
  ).join('')
}

export const isPriceStale = (collectedAt: string, now = new Date(), maxAgeDays = 14) => {
  const collected = new Date(collectedAt).getTime()

  return Number.isNaN(collected) || now.getTime() - collected > maxAgeDays * 24 * 60 * 60 * 1000
}

export const isPriceAnomaly = (currentPrice: number, previousPrice?: number | null, threshold = 0.5) => {
  if (!previousPrice || previousPrice <= 0) {
    return false
  }

  return Math.abs(currentPrice - previousPrice) / previousPrice >= threshold
}

export const validateRetailCsvRows = (
  rows: RetailCsvRow[],
  existingProductSlugs: Set<string>,
): RetailImportPreview => {
  const results = rows.map<RetailImportRowResult>((row) => {
    const productSlug = row.productSlug ?? ''

    if (!row.retailerSlug) {
      return { rowNumber: row.rowNumber, action: 'error', productSlug, field: 'retailer_slug', message: 'Enseigne manquante.' }
    }
    if (!productSlug || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(productSlug)) {
      return { rowNumber: row.rowNumber, action: 'error', productSlug, field: 'product_slug', message: 'Slug produit invalide.' }
    }
    if (!row.productName) {
      return { rowNumber: row.rowNumber, action: 'error', productSlug, field: 'product_name', message: 'Nom produit manquant.' }
    }
    if (!row.formatQuantity || Number(row.formatQuantity) <= 0) {
      return { rowNumber: row.rowNumber, action: 'error', productSlug, field: 'format_quantity', message: 'Format invalide.' }
    }
    if (!productUnitSchema.safeParse(row.formatUnit).success) {
      return { rowNumber: row.rowNumber, action: 'error', productSlug, field: 'format_unit', message: 'UnitÃ© invalide.' }
    }
    if (!row.priceChf || Number(row.priceChf) <= 0) {
      return { rowNumber: row.rowNumber, action: 'error', productSlug, field: 'price_chf', message: 'Prix invalide.' }
    }
    if (!row.source) {
      return { rowNumber: row.rowNumber, action: 'error', productSlug, field: 'source', message: 'Source manquante.' }
    }
    if (!row.collectedAt || Number.isNaN(new Date(row.collectedAt).getTime())) {
      return { rowNumber: row.rowNumber, action: 'error', productSlug, field: 'collected_at', message: 'Date de collecte invalide.' }
    }

    return {
      rowNumber: row.rowNumber,
      action: existingProductSlugs.has(productSlug) ? 'update' : 'create',
      productSlug,
      message: 'Ligne prÃªte pour import manuel ou CSV.',
    }
  })

  return {
    creates: results.filter((row) => row.action === 'create').length,
    updates: results.filter((row) => row.action === 'update').length,
    errors: results.filter((row) => row.action === 'error').length,
    anomalies: rows.filter((row) => row.priceChf && Number(row.priceChf) > 1000).length,
    rows: results,
    idempotencyKey: buildRetailImportIdempotencyKey(JSON.stringify(rows)),
  }
}

export type RetailerInput = z.infer<typeof retailerSchema>
export type ProductInput = z.infer<typeof productSchema>
export type PriceEntryInput = z.infer<typeof priceEntrySchema>
export type RetailCatalogQuery = z.infer<typeof retailCatalogQuerySchema>
