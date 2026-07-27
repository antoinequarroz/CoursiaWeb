type SupabaseAdminClient = ReturnType<typeof createSupabaseServiceRoleClient>

type DashboardQueryResult = {
  count: number | null
  data: Array<Record<string, unknown>> | null
  error: { message: string } | null
}

type DashboardQuery = PromiseLike<DashboardQueryResult> & {
  eq: (column: string, value: unknown) => DashboardQuery
  is: (column: string, value: unknown) => DashboardQuery
  order: (column: string, options?: { ascending?: boolean }) => DashboardQuery
  limit: (count: number) => DashboardQuery
}

type UntypedSupabaseClient = {
  from: (table: string) => {
    select: (columns: string, options?: { count?: 'exact'; head?: boolean }) => DashboardQuery
  }
}

const fromTable = (supabase: SupabaseAdminClient, table: string) =>
  (supabase as unknown as UntypedSupabaseClient).from(table)

const countRows = async (
  supabase: SupabaseAdminClient,
  table: string,
  apply?: (query: DashboardQuery) => DashboardQuery,
) => {
  let query = fromTable(supabase, table).select('*', { count: 'exact', head: true })

  if (apply) {
    query = apply(query)
  }

  const { count, error } = await query

  if (error) {
    throwApiError('UPSTREAM_ERROR', `Impossible de compter ${table}.`)
  }

  return count ?? 0
}

const latestRows = async (
  supabase: SupabaseAdminClient,
  table: string,
  columns: string,
  orderColumn: string,
  limit = 5,
) => {
  const { data, error } = await fromTable(supabase, table)
    .select(columns)
    .order(orderColumn, { ascending: false })
    .limit(limit)

  if (error) {
    throwApiError('UPSTREAM_ERROR', `Impossible de charger ${table}.`)
  }

  return data ?? []
}

const sumNumeric = (rows: Array<Record<string, unknown>>, key: string) => {
  return rows.reduce((total, row) => total + Number(row[key] ?? 0), 0)
}

export default defineEventHandler(async (event) => {
  await getSensitiveAdminContext(event)

  const supabase = createSupabaseServiceRoleClient()

  const [
    users,
    households,
    recipes,
    publishedRecipes,
    draftRecipes,
    pendingRecipes,
    archivedRecipes,
    ingredients,
    allergens,
    diets,
    retailers,
    canonicalProducts,
    storeOffers,
    priceHistory,
    stalePriceRules,
    mealPlans,
    plannedMeals,
    shoppingLists,
    orders,
    favorites,
    swipes,
    likedSwipes,
    pendingReports,
    waitlist,
    unreadNotifications,
  ] = await Promise.all([
    countRows(supabase, 'profils', (query) => query.is('deleted_at', null)),
    countRows(supabase, 'foyers'),
    countRows(supabase, 'recettes'),
    countRows(supabase, 'recettes', (query) => query.eq('statut_publication', 'publiee')),
    countRows(supabase, 'recettes', (query) => query.eq('statut_publication', 'brouillon')),
    countRows(supabase, 'recettes', (query) => query.eq('statut_publication', 'en_attente')),
    countRows(supabase, 'recettes', (query) => query.eq('statut_publication', 'archivee')),
    countRows(supabase, 'ingredients'),
    countRows(supabase, 'allergenes'),
    countRows(supabase, 'regimes'),
    countRows(supabase, 'enseignes'),
    countRows(supabase, 'produits_canoniques'),
    countRows(supabase, 'offres_magasin'),
    countRows(supabase, 'prix_historique'),
    countRows(supabase, 'regles_fraicheur_prix'),
    countRows(supabase, 'planning_repas'),
    countRows(supabase, 'repas_planifies'),
    countRows(supabase, 'listes_courses'),
    countRows(supabase, 'commandes'),
    countRows(supabase, 'favoris'),
    countRows(supabase, 'swipes'),
    countRows(supabase, 'swipes', (query) => query.eq('aime', true)),
    countRows(supabase, 'signalements', (query) => query.eq('statut', 'en_attente')),
    countRows(supabase, 'waitlist'),
    countRows(supabase, 'notifications', (query) => query.eq('lue', false)),
  ])

  const [recentRecipes, recentWaitlist, recentReports, recentOrders, recentAuditLogs, recipeRows, retailerRows, orderRows] = await Promise.all([
    latestRows(supabase, 'recettes', 'id, titre, statut_publication, updated_at, created_at, cout_estime, portions, difficulte', 'updated_at', 5),
    latestRows(supabase, 'waitlist', 'id, email, source, created_at', 'created_at', 3),
    latestRows(supabase, 'signalements', 'id, raison, statut, created_at', 'created_at', 3),
    latestRows(supabase, 'commandes', 'id, montant_total, economies, statut, created_at', 'created_at', 5),
    latestRows(supabase, 'admin_audit_logs', 'id, action, resource_type, resource_id, occurred_at', 'occurred_at', 5),
    latestRows(supabase, 'recettes', 'id, titre, statut_publication, created_at, cout_estime, portions, difficulte', 'created_at', 5),
    latestRows(supabase, 'enseignes', 'id, code, nom', 'nom', 10),
    latestRows(supabase, 'commandes', 'id, montant_total, economies', 'created_at', 100),
  ])

  const totalSavings = sumNumeric(orderRows, 'economies')
  const totalRevenue = sumNumeric(orderRows, 'montant_total')
  const swipeLikeRate = swipes > 0 ? Math.round((likedSwipes / swipes) * 100) : 0

  return {
    generatedAt: new Date().toISOString(),
    source: {
      label: 'Supabase production',
      tables: [
        'profils',
        'foyers',
        'recettes',
        'ingredients',
        'enseignes',
        'produits_canoniques',
        'offres_magasin',
        'prix_historique',
        'planning_repas',
        'listes_courses',
        'commandes',
        'favoris',
        'swipes',
        'signalements',
        'waitlist',
      ],
    },
    counts: {
      users,
      households,
      recipes,
      publishedRecipes,
      draftRecipes,
      pendingRecipes,
      archivedRecipes,
      ingredients,
      allergens,
      diets,
      retailers,
      canonicalProducts,
      storeOffers,
      priceHistory,
      stalePriceRules,
      mealPlans,
      plannedMeals,
      shoppingLists,
      orders,
      favorites,
      swipes,
      likedSwipes,
      swipeLikeRate,
      pendingReports,
      waitlist,
      unreadNotifications,
    },
    commerce: {
      totalRevenue,
      totalSavings,
    },
    recent: {
      recipes: recentRecipes,
      waitlist: recentWaitlist,
      reports: recentReports,
      orders: recentOrders,
      auditLogs: recentAuditLogs,
    },
    catalog: {
      recipes: recipeRows,
      retailers: retailerRows,
    },
  }
})
