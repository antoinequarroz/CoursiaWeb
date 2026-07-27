import type { OfficialRecipeMutation } from '#shared/validation/course'
import type { CanonicalIngredientInput } from '#shared/validation/ingredient-catalog'
import type { PriceEntryInput, ProductInput, RetailerInput } from '#shared/validation/retail-catalog'

type QueryResult = {
  count: number | null
  data: unknown
  error: { message: string } | null
}

type QueryBuilder = PromiseLike<QueryResult> & {
  select: (columns?: string, options?: { count?: 'exact'; head?: boolean }) => QueryBuilder
  insert: (payload: unknown) => QueryBuilder
  update: (payload: unknown) => QueryBuilder
  delete: () => QueryBuilder
  eq: (column: string, value: unknown) => QueryBuilder
  is: (column: string, value: unknown) => QueryBuilder
  not: (column: string, operator: string, value: unknown) => QueryBuilder
  or: (filters: string) => QueryBuilder
  contains: (column: string, value: unknown) => QueryBuilder
  order: (column: string, options?: { ascending?: boolean }) => QueryBuilder
  limit: (count: number) => QueryBuilder
  single: () => QueryBuilder
  maybeSingle: () => QueryBuilder
}

type UntypedSupabaseClient = {
  from: (table: string) => QueryBuilder
}

export const mobileTable = (supabase: unknown, table: string) =>
  (supabase as unknown as UntypedSupabaseClient).from(table)

const slugify = (value: string) =>
  value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    || 'element'

export const toMobileRecipeStatus = (status: OfficialRecipeMutation['status']) => {
  const statuses = {
    draft: 'brouillon',
    review: 'en_attente',
    published: 'publiee',
    archived: 'archivee',
  } as const

  return statuses[status]
}

export const toAdminRecipeStatus = (status: unknown) => {
  const statuses: Record<string, 'draft' | 'review' | 'published' | 'archived'> = {
    brouillon: 'draft',
    en_attente: 'review',
    publiee: 'published',
    refusee: 'archived',
    archivee: 'archived',
  }

  return statuses[String(status)] ?? 'draft'
}

export const toMobileDifficulty = (difficulty: OfficialRecipeMutation['difficulty']) => {
  if (!difficulty) return null

  const difficulties = {
    easy: 'facile',
    medium: 'moyen',
    hard: 'difficile',
  } as const

  return difficulties[difficulty]
}

export const toAdminDifficulty = (difficulty: unknown) => {
  const difficulties: Record<string, 'easy' | 'medium' | 'hard'> = {
    facile: 'easy',
    moyen: 'medium',
    difficile: 'hard',
  }

  return difficulties[String(difficulty)] ?? 'medium'
}

type MobileRecipeRow = Record<string, unknown>

const numberOrNull = (value: unknown) => {
  const numberValue = Number(value)

  return Number.isFinite(numberValue) ? numberValue : null
}

export const toAdminRecipeRow = (recipe: MobileRecipeRow) => ({
  id: String(recipe.id),
  title: String(recipe.titre ?? ''),
  slug: String(recipe.cle_externe ?? slugify(String(recipe.titre ?? ''))),
  status: toAdminRecipeStatus(recipe.statut_publication),
  portions: numberOrNull(recipe.portions),
  duration_minutes: numberOrNull(recipe.temps_preparation),
  difficulty: recipe.difficulte ? toAdminDifficulty(recipe.difficulte) : null,
  ingredients: [],
  steps: [],
  nutrition: {
    calories: typeof recipe.calories === 'number' ? recipe.calories : undefined,
    proteinGrams: typeof recipe.proteines_g === 'number' ? recipe.proteines_g : undefined,
    carbsGrams: typeof recipe.glucides_g === 'number' ? recipe.glucides_g : undefined,
    fatGrams: typeof recipe.lipides_g === 'number' ? recipe.lipides_g : undefined,
  },
  categories: [],
  source: typeof recipe.source === 'string' ? recipe.source : null,
  created_at: recipe.created_at ?? null,
  updated_at: recipe.updated_at ?? null,
  archived_at: recipe.statut_publication === 'archivee' ? recipe.updated_at : null,
  mobile: {
    table: 'recettes',
    title: recipe.titre,
    imageUrl: recipe.image_url,
    estimatedCost: recipe.cout_estime,
    publicationStatus: recipe.statut_publication,
  },
})

export const toMobileRecipeRow = (input: OfficialRecipeMutation) => ({
  titre: input.title,
  cle_externe: input.slug,
  description: input.source ?? null,
  temps_preparation: input.durationMinutes ?? null,
  difficulte: toMobileDifficulty(input.difficulty),
  cout_estime: null,
  calories: input.nutrition.calories ?? null,
  proteines_g: input.nutrition.proteinGrams ?? null,
  glucides_g: input.nutrition.carbsGrams ?? null,
  lipides_g: input.nutrition.fatGrams ?? null,
  portions: input.portions ?? 4,
  source: input.source ?? null,
  statut_publication: toMobileRecipeStatus(input.status),
  updated_at: new Date().toISOString(),
})

type MobileIngredientRow = Record<string, unknown>

export const toAdminIngredientRow = (ingredient: MobileIngredientRow) => ({
  id: String(ingredient.id),
  name: String(ingredient.nom ?? ''),
  slug: slugify(String(ingredient.nom ?? '')),
  status: ingredient.archived_at ? 'archived' : 'active',
  synonyms: [],
  units: ingredient.unite_defaut ? [ingredient.unite_defaut === 'unite' ? 'piece' : String(ingredient.unite_defaut)] : ['g'],
  categories: ingredient.rayon ? [String(ingredient.rayon)] : [],
  allergens: [],
  diets: [],
  sensitive: false,
  created_at: ingredient.created_at,
  updated_at: ingredient.created_at,
  archived_at: ingredient.archived_at ?? null,
  mobile: {
    table: 'ingredients',
    name: ingredient.nom,
    aisle: ingredient.rayon,
    defaultUnit: ingredient.unite_defaut,
  },
})

export const toMobileIngredientRow = (input: CanonicalIngredientInput) => ({
  nom: input.name,
  rayon: input.categories[0] ?? null,
  unite_defaut: input.units[0] === 'piece' ? 'unite' : input.units[0],
})

type MobileRetailerRow = Record<string, unknown>

export const toAdminRetailerRow = (retailer: MobileRetailerRow) => ({
  id: String(retailer.id),
  name: String(retailer.nom ?? ''),
  slug: String(retailer.code ?? ''),
  status: 'active',
  website_url: null,
  created_at: null,
  updated_at: null,
  archived_at: null,
  mobile: {
    table: 'enseignes',
    code: retailer.code,
    name: retailer.nom,
  },
})

export const toMobileRetailerRow = (input: RetailerInput) => ({
  nom: input.name,
  code: input.slug,
})

type MobileProductRow = Record<string, unknown>

export const toAdminProductRow = (product: MobileProductRow) => ({
  id: String(product.id),
  retailer_id: '',
  name: String(product.nom ?? ''),
  slug: slugify(String(product.nom ?? '')),
  brand: null,
  status: 'active',
  format: {
    label: 'Produit canonique',
    quantity: 1,
    unit: 'piece',
  },
  source: 'admin',
  created_at: product.created_at,
  updated_at: product.created_at,
  archived_at: null,
  mobile: {
    table: 'produits_canoniques',
    name: product.nom,
    aisle: product.rayon,
    ingredientId: product.ingredient_id,
  },
})

export const toMobileProductRow = (input: ProductInput) => ({
  nom: input.name,
  rayon: null,
  ingredient_id: null,
})

export const toMobileOfferRow = (input: ProductInput, productId: string) => ({
  produit_canonique_id: productId,
  enseigne_id: input.retailerId,
  format: input.format.label,
  quantite: input.format.quantity,
  unite: input.format.unit === 'piece' || input.format.unit === 'pack' ? 'unite' : input.format.unit,
  actif: input.status === 'active',
})

type MobilePriceRow = Record<string, unknown>

export const toAdminPriceRow = (price: MobilePriceRow) => ({
  id: String(price.id),
  product_id: String(price.offre_id ?? ''),
  retailer_id: '',
  amount_chf: price.prix ?? 0,
  unit_price_chf: price.prix_unitaire ?? null,
  promotion_label: price.promotion ?? null,
  source: price.source ?? 'saisie_manuelle',
  collected_at: price.collecte_le ?? null,
  quality_status: 'fresh',
  created_at: price.collecte_le,
  updated_at: price.collecte_le,
  mobile: {
    table: 'prix_historique',
    offerId: price.offre_id,
    price: price.prix,
    unitPrice: price.prix_unitaire,
  },
})

export const toMobilePriceRow = (input: PriceEntryInput) => ({
  offre_id: input.productId,
  prix: input.amountChf,
  prix_unitaire: input.unitPriceChf ?? input.amountChf,
  promotion: input.promotionLabel ?? null,
  source: ['scraping', 'api_enseigne', 'saisie_manuelle'].includes(input.source)
    ? input.source
    : 'saisie_manuelle',
  collecte_le: input.collectedAt,
})
