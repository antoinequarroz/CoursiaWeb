<script setup lang="ts">
import {
  adminDocumentationArticles,
  documentationStatusLabels,
  filterDocumentationArticles,
  type DocumentationStatus,
} from '#shared/admin/documentation'

definePageMeta({
  layout: 'admin',
})

const runtimeConfig = useRuntimeConfig()
const search = ref('')
const loadState = ref<'loading' | 'ready' | 'empty' | 'error' | 'denied'>('ready')

const statusTone: Record<DocumentationStatus, 'success' | 'warning' | 'neutral'> = {
  validé: 'success',
  'à vérifier': 'warning',
  brouillon: 'neutral',
}

const externalLinks = computed(() => [
  { label: 'Jira', href: runtimeConfig.public.docsJiraUrl },
  { label: 'Dépôt de code', href: runtimeConfig.public.docsRepositoryUrl },
  { label: 'Supabase', href: runtimeConfig.public.docsSupabaseUrl },
  { label: 'Sentry', href: runtimeConfig.public.docsSentryUrl },
  { label: 'PostHog', href: runtimeConfig.public.docsPosthogUrl },
].filter((link) => Boolean(link.href)))

const visibleArticles = computed(() => filterDocumentationArticles(search.value))
const validatedCount = computed(() => adminDocumentationArticles.filter((article) => article.status === 'validé').length)
const reviewCount = computed(() => adminDocumentationArticles.filter((article) => article.status === 'à vérifier').length)
const articleCountLabel = computed(() => {
  const count = visibleArticles.value.length
  return count > 1 ? `${count} procédures trouvées` : `${count} procédure trouvée`
})

const markReloaded = () => {
  loadState.value = 'loading'
  window.setTimeout(() => {
    loadState.value = adminDocumentationArticles.length > 0 ? 'ready' : 'empty'
  }, 150)
}
</script>

<template>
  <section class="admin-page">
    <div class="flex flex-wrap items-end justify-between gap-4">
      <div>
        <p class="text-xs font-semibold uppercase tracking-[0.24em] text-coursia-primary">COUR-113</p>
        <h1 class="mt-2 text-2xl font-semibold tracking-[-0.03em] text-[#101828]">
          Documentation interne
        </h1>
        <p class="mt-2 max-w-3xl text-sm text-[#667085]">
          Procédures protégées pour développement, exploitation et administration. Le contenu reste
          isolé de la landing page publique.
        </p>
      </div>

      <BaseButton type="button" variant="secondary" @click="markReloaded">Recharger</BaseButton>
    </div>

    <div class="mt-6 grid gap-4 md:grid-cols-4">
      <article class="admin-stat-card rounded-2xl border border-[#e6e1d8] bg-white p-5">
        <p class="text-xs font-semibold uppercase tracking-[0.16em] text-[#667085]">Articles</p>
        <p class="mt-3 text-3xl font-semibold text-[#101828]">{{ adminDocumentationArticles.length }}</p>
        <p class="mt-1 text-xs text-[#667085]">procédures internes</p>
      </article>
      <article class="admin-stat-card rounded-2xl border border-[#e6e1d8] bg-white p-5">
        <p class="text-xs font-semibold uppercase tracking-[0.16em] text-[#667085]">Validés</p>
        <p class="mt-3 text-3xl font-semibold text-[#101828]">{{ validatedCount }}</p>
        <p class="mt-1 text-xs text-[#667085]">à jour</p>
      </article>
      <article class="admin-stat-card rounded-2xl border border-[#e6e1d8] bg-white p-5">
        <p class="text-xs font-semibold uppercase tracking-[0.16em] text-[#667085]">À vérifier</p>
        <p class="mt-3 text-3xl font-semibold text-[#101828]">{{ reviewCount }}</p>
        <p class="mt-1 text-xs text-[#667085]">revue requise</p>
      </article>
      <article class="admin-stat-card rounded-2xl border border-[#e6e1d8] bg-white p-5">
        <p class="text-xs font-semibold uppercase tracking-[0.16em] text-[#667085]">Liens</p>
        <p class="mt-3 text-3xl font-semibold text-[#101828]">{{ externalLinks.length }}</p>
        <p class="mt-1 text-xs text-[#667085]">configurés</p>
      </article>
    </div>

    <div class="admin-toolbar mt-6 grid gap-3 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <label class="grid gap-1.5 text-xs font-semibold text-[#344054]">
        Recherche procédure
        <input
          v-model="search"
          type="search"
          placeholder="RLS, rollback, RevenueCat, publication..."
          class="rounded-xl border border-[#e6e1d8] bg-white px-4 py-2.5 text-sm outline-none transition focus:border-coursia-primary"
        >
      </label>

      <div class="rounded-2xl border border-[#e6e1d8] bg-white p-4">
        <p class="text-xs font-semibold uppercase tracking-[0.16em] text-[#667085]">Liens contrôlés</p>
        <div class="mt-3 flex flex-wrap gap-2">
          <a
            v-for="link in externalLinks"
            :key="link.label"
            :href="link.href"
            target="_blank"
            rel="noreferrer"
            class="rounded-full border border-[#e6e1d8] px-3 py-1.5 text-xs font-semibold text-[#667085] transition hover:border-coursia-primary/40 hover:text-[#101828]"
          >
            {{ link.label }}
          </a>
        </div>
      </div>
    </div>

    <div v-if="loadState === 'loading'" class="mt-6 rounded-2xl border border-[#e6e1d8] bg-white p-5 text-sm text-[#667085]">
      Chargement de la documentation...
    </div>
    <div v-else-if="loadState === 'denied'" class="mt-6 rounded-2xl border border-coursia-danger/20 bg-coursia-danger/10 p-5 text-sm text-coursia-danger">
      Accès refusé. Cette documentation exige une authentification et un rôle autorisé.
    </div>
    <div v-else-if="loadState === 'error'" class="mt-6 rounded-2xl border border-coursia-danger/20 bg-coursia-danger/10 p-5 text-sm text-coursia-danger">
      Impossible de charger la documentation. Réessaie plus tard.
    </div>
    <div v-else-if="loadState === 'empty' || visibleArticles.length === 0" class="mt-6 rounded-2xl border border-[#e6e1d8] bg-white p-5 text-sm text-[#667085]">
      Aucune procédure ne correspond à cette recherche.
    </div>

    <div v-else class="mt-6 grid gap-6 xl:grid-cols-[280px_minmax(0,1fr)]">
      <aside class="rounded-2xl border border-[#e6e1d8] bg-white p-5 shadow-[0_16px_40px_rgba(15,45,39,0.06)] xl:sticky xl:top-6 xl:self-start">
        <p class="text-xs font-semibold uppercase tracking-[0.18em] text-[#667085]">Table des matières</p>
        <p class="mt-2 text-sm text-[#667085]">{{ articleCountLabel }}</p>
        <nav class="mt-5 grid gap-1" aria-label="Table des matières documentation">
          <a
            v-for="article in visibleArticles"
            :key="article.id"
            :href="`#${article.id}`"
            class="rounded-xl px-3 py-2 text-sm font-medium text-[#667085] transition hover:bg-[#fbfaf7] hover:text-[#101828]"
          >
            {{ article.title }}
          </a>
        </nav>
      </aside>

      <div class="grid gap-5">
        <article
          v-for="article in visibleArticles"
          :id="article.id"
          :key="article.id"
          class="rounded-2xl border border-[#e6e1d8] bg-white p-5 shadow-[0_16px_40px_rgba(15,45,39,0.06)]"
        >
          <div class="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 class="text-lg font-semibold text-[#101828]">{{ article.title }}</h2>
              <p class="mt-2 text-sm text-[#667085]">{{ article.summary }}</p>
            </div>
            <BaseBadge :tone="statusTone[article.status]">
              {{ documentationStatusLabels[article.status] }}
            </BaseBadge>
          </div>

          <dl class="mt-5 grid gap-3 rounded-2xl bg-[#fbfaf7] p-4 text-sm md:grid-cols-3">
            <div>
              <dt class="text-xs font-semibold uppercase tracking-[0.12em] text-[#667085]">Propriétaire</dt>
              <dd class="mt-1 font-medium text-[#101828]">{{ article.owner }}</dd>
            </div>
            <div>
              <dt class="text-xs font-semibold uppercase tracking-[0.12em] text-[#667085]">Dernière vérification</dt>
              <dd class="mt-1 font-medium text-[#101828]">{{ article.lastVerifiedAt }}</dd>
            </div>
            <div>
              <dt class="text-xs font-semibold uppercase tracking-[0.12em] text-[#667085]">Tags</dt>
              <dd class="mt-1 text-[#667085]">{{ article.tags.join(', ') }}</dd>
            </div>
          </dl>

          <div class="mt-5 grid gap-4">
            <section v-for="section in article.sections" :key="section.title" class="rounded-2xl border border-[#eee8df] p-4">
              <h3 class="text-sm font-semibold text-[#101828]">{{ section.title }}</h3>
              <p class="mt-2 text-sm leading-6 text-[#667085]">{{ section.body }}</p>
              <ul v-if="section.checklist" class="mt-3 grid gap-2 text-sm text-[#667085]">
                <li v-for="item in section.checklist" :key="item" class="flex gap-2">
                  <span aria-hidden="true">✓</span>
                  <span>{{ item }}</span>
                </li>
              </ul>
            </section>
          </div>
        </article>
      </div>
    </div>
  </section>
</template>
