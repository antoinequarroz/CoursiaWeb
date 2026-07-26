import { matchingSuggestionSchema } from '#shared/validation/ingredient-product-matching'

export default defineEventHandler(async (event) => {
  const admin = await getSensitiveAdminContext(event)
  requireRetailCatalogAccess(admin.role)

  const body = await readBody(event)
  const parsed = matchingSuggestionSchema.safeParse(body)

  if (!parsed.success) {
    throwValidationError(parsed.error)
  }

  const suggestions = parsed.data.products.map((product) =>
    buildAutomaticMatchSuggestion(
      {
        id: parsed.data.ingredientId,
        name: parsed.data.ingredientName,
        units: ['g'],
      },
      {
        id: product.productId,
        retailer_id: product.retailerId,
        name: product.productName,
        slug: product.productName.toLowerCase().replaceAll(' ', '-'),
        brand: null,
        status: 'active',
        format: { unit: product.productUnit },
        source: 'suggestion',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        archived_at: null,
      },
    ),
  )

  return {
    data: suggestions,
    confirmable: suggestions.filter((suggestion) => suggestion.status === 'suggested'),
    ambiguous: suggestions.filter((suggestion) => suggestion.status === 'ambiguous'),
  }
})
