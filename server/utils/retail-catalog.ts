import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database, Json } from '#shared/supabase/database.types'
import type { PriceEntryInput, ProductInput, RetailerInput } from '#shared/validation/retail-catalog'
import { isPriceAnomaly, isPriceStale } from '#shared/validation/retail-catalog'

type PriceEntryRow = Database['public']['Tables']['price_entries']['Row']
type PriceQualityStatus = PriceEntryRow['quality_status']

export const requireRetailCatalogAccess = (role: string) => {
  if (!['editor', 'administrator', 'super_administrator'].includes(role)) {
    throwApiError('FORBIDDEN', 'Permission insuffisante pour administrer le comparateur.')
  }
}

export const toRetailerRow = (input: RetailerInput) => ({
  name: input.name,
  slug: input.slug,
  status: input.status,
  website_url: input.websiteUrl ?? null,
  updated_at: new Date().toISOString(),
  archived_at: input.status === 'archived' ? new Date().toISOString() : null,
})

export const toProductRow = (input: ProductInput) => ({
  retailer_id: input.retailerId,
  name: input.name,
  slug: input.slug,
  brand: input.brand ?? null,
  status: input.status,
  format: input.format as unknown as Json,
  source: input.source,
  updated_at: new Date().toISOString(),
  archived_at: input.status === 'archived' ? new Date().toISOString() : null,
})

export const getPriceQualityStatus = (
  input: PriceEntryInput,
  previousPrice?: PriceEntryRow | null,
): PriceQualityStatus => {
  if (isPriceAnomaly(input.amountChf, previousPrice?.amount_chf)) {
    return 'anomaly'
  }

  if (isPriceStale(input.collectedAt)) {
    return 'stale'
  }

  return 'fresh'
}

export const toPriceEntryRow = (input: PriceEntryInput, previousPrice?: PriceEntryRow | null) => ({
  product_id: input.productId,
  retailer_id: input.retailerId,
  amount_chf: input.amountChf,
  unit_price_chf: input.unitPriceChf ?? null,
  promotion_label: input.promotionLabel ?? null,
  source: input.source,
  collected_at: input.collectedAt,
  quality_status: getPriceQualityStatus(input, previousPrice),
  updated_at: new Date().toISOString(),
})

export const getLatestPriceForProduct = async (
  client: SupabaseClient<Database>,
  productId: string,
) => {
  const { data, error } = await client
    .from('price_entries')
    .select('*')
    .eq('product_id', productId)
    .order('collected_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    throwApiError('UPSTREAM_ERROR', 'Impossible de charger le dernier prix.')
  }

  return data
}

export const writePriceHistory = async (
  client: SupabaseClient<Database>,
  input: {
    priceEntry: PriceEntryRow
    previousPrice?: PriceEntryRow | null
    userId: string
  },
) => {
  const { error } = await client.from('price_history').insert({
    price_entry_id: input.priceEntry.id,
    product_id: input.priceEntry.product_id,
    retailer_id: input.priceEntry.retailer_id,
    previous_amount_chf: input.previousPrice?.amount_chf ?? null,
    amount_chf: input.priceEntry.amount_chf,
    promotion_label: input.priceEntry.promotion_label,
    source: input.priceEntry.source,
    collected_at: input.priceEntry.collected_at,
    changed_by: input.userId,
  })

  if (error) {
    throwApiError('UPSTREAM_ERROR', 'Impossible dâ€™historiser le prix.')
  }
}
