import { adminSearchQuerySchema } from '#shared/validation/admin-search'

type SearchResult = {
  id: string
  type: 'recipe' | 'ingredient' | 'product' | 'retailer' | 'user' | 'content'
  label: string
  description: string
  href: string
}

type SupabaseAdminClient = ReturnType<typeof createSupabaseServiceRoleClient>

const escapeSearchValue = (value: string) =>
  value
    .replaceAll('%', '\\%')
    .replaceAll('_', '\\_')
    .replace(/[(),]/g, ' ')

const searchRecipes = async (supabase: SupabaseAdminClient, query: string, limit: number): Promise<SearchResult[]> => {
  const { data, error } = await supabase
    .from('recettes')
    .select('id, titre, statut_publication, difficulte')
    .or(`titre.ilike.%${query}%,description.ilike.%${query}%`)
    .order('updated_at', { ascending: false })
    .limit(limit)

  if (error) {
    throwApiError('UPSTREAM_ERROR', 'Impossible de rechercher les recettes.')
  }

  return (data ?? []).map((recipe) => ({
    id: recipe.id,
    type: 'recipe',
    label: recipe.titre,
    description: `Recette · ${recipe.statut_publication}${recipe.difficulte ? ` · ${recipe.difficulte}` : ''}`,
    href: `/admin/recettes?selected=${recipe.id}`,
  }))
}

const searchIngredients = async (supabase: SupabaseAdminClient, query: string, limit: number): Promise<SearchResult[]> => {
  const { data, error } = await supabase
    .from('ingredients')
    .select('id, nom, rayon, archived_at')
    .or(`nom.ilike.%${query}%,rayon.ilike.%${query}%`)
    .order('nom', { ascending: true })
    .limit(limit)

  if (error) {
    throwApiError('UPSTREAM_ERROR', 'Impossible de rechercher les ingrédients.')
  }

  return (data ?? []).map((ingredient) => ({
    id: ingredient.id,
    type: 'ingredient',
    label: ingredient.nom,
    description: `Ingrédient${ingredient.rayon ? ` · ${ingredient.rayon}` : ''}${ingredient.archived_at ? ' · archivé' : ''}`,
    href: `/admin/ingredients?selected=${ingredient.id}`,
  }))
}

const searchProducts = async (supabase: SupabaseAdminClient, query: string, limit: number): Promise<SearchResult[]> => {
  const { data, error } = await supabase
    .from('produits_canoniques')
    .select('id, nom, rayon')
    .or(`nom.ilike.%${query}%,rayon.ilike.%${query}%`)
    .order('nom', { ascending: true })
    .limit(limit)

  if (error) {
    throwApiError('UPSTREAM_ERROR', 'Impossible de rechercher les produits.')
  }

  return (data ?? []).map((product) => ({
    id: product.id,
    type: 'product',
    label: product.nom,
    description: `Produit${product.rayon ? ` · ${product.rayon}` : ''}`,
    href: `/admin/produits?selected=${product.id}`,
  }))
}

const searchRetailers = async (supabase: SupabaseAdminClient, query: string, limit: number): Promise<SearchResult[]> => {
  const { data, error } = await supabase
    .from('enseignes')
    .select('id, code, nom')
    .or(`nom.ilike.%${query}%,code.ilike.%${query}%`)
    .order('nom', { ascending: true })
    .limit(limit)

  if (error) {
    throwApiError('UPSTREAM_ERROR', 'Impossible de rechercher les enseignes.')
  }

  return (data ?? []).map((retailer) => ({
    id: retailer.id,
    type: 'retailer',
    label: retailer.nom,
    description: `Enseigne · ${retailer.code}`,
    href: `/admin/enseignes?selected=${retailer.id}`,
  }))
}

const searchUsers = async (supabase: SupabaseAdminClient, query: string, limit: number): Promise<SearchResult[]> => {
  const { data, error } = await supabase
    .from('profils')
    .select('id, prenom, abonnement, est_admin, deleted_at')
    .or(`prenom.ilike.%${query}%,abonnement.ilike.%${query}%`)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    throwApiError('UPSTREAM_ERROR', 'Impossible de rechercher les utilisateurs.')
  }

  return (data ?? []).map((profile) => ({
    id: profile.id,
    type: 'user',
    label: profile.prenom ?? `Profil ${profile.id.slice(0, 8)}`,
    description: `Utilisateur${profile.abonnement ? ` · ${profile.abonnement}` : ''}${profile.est_admin ? ' · admin' : ''}`,
    href: `/admin/utilisateurs?selected=${profile.id}`,
  }))
}

const searchContent = async (supabase: SupabaseAdminClient, query: string, limit: number): Promise<SearchResult[]> => {
  const { data, error } = await supabase
    .from('content_entries')
    .select('id, title, key, kind, status')
    .or(`title.ilike.%${query}%,key.ilike.%${query}%,kind.ilike.%${query}%`)
    .order('updated_at', { ascending: false })
    .limit(limit)

  if (error) {
    throwApiError('UPSTREAM_ERROR', 'Impossible de rechercher les contenus.')
  }

  return (data ?? []).map((content) => ({
    id: content.id,
    type: 'content',
    label: content.title,
    description: `Contenu · ${content.kind} · ${content.status}`,
    href: `/admin/contenus?selected=${content.id}`,
  }))
}

export default defineEventHandler(async (event) => {
  await getSensitiveAdminContext(event)

  const parsed = adminSearchQuerySchema.safeParse(getQuery(event))
  if (!parsed.success) {
    throwValidationError(parsed.error)
  }

  const supabase = createSupabaseServiceRoleClient()
  const query = escapeSearchValue(parsed.data.q)
  const limit = parsed.data.limit

  const resultGroups = await Promise.all([
    searchRecipes(supabase, query, limit),
    searchIngredients(supabase, query, limit),
    searchProducts(supabase, query, limit),
    searchRetailers(supabase, query, limit),
    searchUsers(supabase, query, limit),
    searchContent(supabase, query, limit),
  ])

  return {
    data: resultGroups.flat().slice(0, 24),
  }
})
