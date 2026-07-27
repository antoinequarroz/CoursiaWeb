import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '#shared/supabase/database.types'
import type { PriceEntryInput, ProductInput, RetailerInput } from '#shared/validation/retail-catalog'
import { isPriceAnomaly, isPriceStale } from '#shared/validation/retail-catalog'
import {
  mobileTable,
  toMobileOfferRow,
  toMobilePriceRow,
  toMobileProductRow,
  toMobileRetailerRow,
} from './mobile-admin-mapping'

type MobilePriceEntryRow = {
  id: string
  offre_id: string
  prix: number
  prix_unitaire: number
  promotion: string | null
  source: string
  collecte_le: string
}

type PriceQualityStatus = 'fresh' | 'stale' | 'anomaly'

export const requireRetailCatalogAccess = (role: string) => {
  if (!['editor', 'administrator', 'super_administrator'].includes(role)) {
    throwApiError('FORBIDDEN', 'Permission insuffisante pour administrer le comparateur.')
  }
}

export const toRetailerRow = (input: RetailerInput) => toMobileRetailerRow(input)

export const toProductRow = (input: ProductInput) => ({
  product: toMobileProductRow(input),
  offer: toMobileOfferRow(input, ''),
})

export const getPriceQualityStatus = (
  input: PriceEntryInput,
  previousPrice?: MobilePriceEntryRow | null,
): PriceQualityStatus => {
  if (isPriceAnomaly(input.amountChf, previousPrice?.prix)) {
    return 'anomaly'
  }

  if (isPriceStale(input.collectedAt)) {
    return 'stale'
  }

  return 'fresh'
}

export const toPriceEntryRow = (input: PriceEntryInput) => toMobilePriceRow(input)

export const getLatestPriceForProduct = async (
  client: SupabaseClient<Database>,
  productId: string,
) => {
  const { data, error } = await mobileTable(client, 'prix_historique')
    .select('*')
    .eq('offre_id', productId)
    .order('collecte_le', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    throwApiError('UPSTREAM_ERROR', 'Impossible de charger le dernier prix.')
  }

  return data as MobilePriceEntryRow | null
}

export const writePriceHistory = async (
  _client: SupabaseClient<Database>,
  _input: {
    priceEntry: MobilePriceEntryRow
    previousPrice?: MobilePriceEntryRow | null
    userId: string
  },
) => {
  return { storedIn: 'prix_historique' }
}
