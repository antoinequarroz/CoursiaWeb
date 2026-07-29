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
  { label: 'Dépôt', href: runtimeConfig.public.docsRepositoryUrl },
  { label: 'Supabase', href: runtimeConfig.public.docsSupabaseUrl },
  { label: 'Sentry', href: runtimeConfig.public.docsSentryUrl },
  { label: 'PostHog', href: runtimeConfig.public.docsPosthogUrl },
].filter((link) => Boolean(link.href)))

const visibleArticles = computed(() => filterDocumentationArticles(search.value))
const validatedCount = computed(() => adminDocumentationArticles.filter((article) => article.status === 'validé').length)
const reviewCount = computed(() => adminDocumentationArticles.filter((article) => article.status === 'à vérifier').length)
const draftCount = computed(() => adminDocumentationArticles.filter((article) => article.status === 'brouillon').length)
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
    <AdminPageHeader
      eyebrow="COUR-113"
      title="Documentation interne"
      description="Centre protégé pour les procédures produit, exploitation, sécurité et publication. Les contenus restent séparés du site public et ne doivent contenir aucun secret."
    >
      <template #actions>
        <BaseBadge tone="neutral">{{ articleCountLabel }}</BaseBadge>
        <BaseButton type="button" variant="secondary" @click="markReloaded">Recharger</BaseButton>
      </template>
    </AdminPageHeader>

    <div class="grid gap-4 md:grid-cols-4">
      <article class="rounded-2xl border border-coursia-border bg-coursia-surface p-5 shadow-coursia-sm">
        <p class="text-xs font-semibold uppercase tracking-[0.16em] text-coursia-muted">Articles</p>
        <p class="mt-3 text-2xl font-semibold text-coursia-text">{{ adminDocumentationArticles.length }}</p>
        <p class="mt-1 text-xs text-coursia-muted">Procédures internes</p>
      </article>
      <article class="rounded-2xl border border-coursia-border bg-coursia-surface p-5 shadow-coursia-sm">
        <p class="text-xs font-semibold uppercase tracking-[0.16em] text-coursia-muted">Validés</p>
        <p class="mt-3 text-2xl font-semibold text-coursia-text">{{ validatedCount }}</p>
        <p class="mt-1 text-xs text-coursia-muted">À jour</p>
      </article>
      <article class="rounded-2xl border border-coursia-border bg-coursia-surface p-5 shadow-coursia-sm">
        <p class="text-xs font-semibold uppercase tracking-[0.16em] text-coursia-muted">À vérifier</p>
        <p class="mt-3 text-2xl font-semibold text-coursia-text">{{ reviewCount }}</p>
        <p class="mt-1 text-xs text-coursia-muted">Revue requise</p>
      </article>
      <article class="rounded-2xl border border-coursia-border bg-coursia-surface p-5 shadow-coursia-sm">
        <p class="text-xs font-semibold uppercase tracking-[0.16em] text-coursia-muted">Brouillons</p>
        <p class="mt-3 text-2xl font-semibold text-coursia-text">{{ draftCount }}</p>
        <p class="mt-1 text-xs text-coursia-muted">À compléter</p>
      </article>
    </div>

    <div class="admin-toolbar grid gap-3 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <label class="grid gap-1.5 text-xs font-semibold text-coursia-text">
        Recherche procédure
        <input
          v-model="search"
          type="search"
          placeholder="RLS, rollback, RevenueCat, publication..."
          autocomplete="off"
        >
      </label>

      <div class="rounded-2xl border border-coursia-border bg-coursia-surface p-4 shadow-coursia-sm">
        <div class="flex items-center justify-between gap-3">
          <p class="text-xs font-semibold uppercase tracking-[0.16em] text-coursia-muted">Liens contrôlés</p>
          <BaseBadge tone="neutral">{{ externalLinks.length }}</BaseBadge>
        </div>
        <div class="mt-3 flex flex-wrap gap-2">
          <a
            v-for="link in externalLinks"
            :key="link.label"
            :href="link.href"
            target="_blank"
            rel="noreferrer"
            class="inline-flex cursor-pointer items-center rounded-full border border-coursia-border bg-coursia-background px-3 py-1.5 text-xs font-semibold text-coursia-muted transition hover:border-coursia-primary/40 hover:text-coursia-text"
          >
            {{ link.label }}
          </a>
          <span v-if="externalLinks.length === 0" class="text-sm text-coursia-muted">
            Aucun lien configuré dans l’environnement.
          </span>
        </div>
      </div>
    </div>

    <div v-if="loadState === 'loading'" class="rounded-2xl border border-coursia-border bg-coursia-surface p-5 text-sm text-coursia-muted">
      Chargement de la documentation...
    </div>
    <div v-else-if="loadState === 'denied'" class="rounded-2xl border border-coursia-danger/20 bg-coursia-danger/10 p-5 text-sm font-medium text-coursia-danger">
      Accès refusé. Cette documentation exige une authentification et un rôle autorisé.
    </div>
    <div v-else-if="loadState === 'error'" class="rounded-2xl border border-coursia-danger/20 bg-coursia-danger/10 p-5 text-sm font-medium text-coursia-danger">
      Impossible de charger la documentation. Réessaie plus tard.
    </div>
    <AdminEmptyState
      v-else-if="loadState === 'empty' || visibleArticles.length === 0"
      icon="content"
      title="Aucune procédure trouvée"
      description="Aucune procédure ne correspond à cette recherche."
    />

    <div v-else class="grid gap-6 xl:grid-cols-[17rem_minmax(0,1fr)]">
      <aside class="rounded-2xl border border-coursia-border bg-coursia-surface p-4 shadow-coursia-sm xl:sticky xl:top-6 xl:self-start">
        <p class="text-xs font-semibold uppercase tracking-[0.18em] text-coursia-muted">Table des matières</p>
        <nav class="mt-4 grid gap-1" aria-label="Table des matières documentation">
          <a
            v-for="article in visibleArticles"
            :key="article.id"
            :href="`#${article.id}`"
            class="group inline-flex cursor-pointer items-center justify-between gap-3 rounded-xl px-3 py-2 text-sm font-medium text-coursia-muted transition hover:bg-coursia-background hover:text-coursia-text"
          >
            <span class="truncate">{{ article.title }}</span>
            <span class="h-1.5 w-1.5 rounded-full bg-coursia-border transition group-hover:bg-coursia-primary" aria-hidden="true" />
          </a>
        </nav>
      </aside>

      <div class="grid gap-5">
        <article
          v-for="article in visibleArticles"
          :id="article.id"
          :key="article.id"
          class="scroll-mt-6 rounded-2xl border border-coursia-border bg-coursia-surface p-5 shadow-coursia-sm"
        >
          <div class="flex flex-wrap items-start justify-between gap-4">
            <div class="min-w-0">
              <div class="flex flex-wrap items-center gap-2">
                <h2 class="text-lg font-semibold text-coursia-text">{{ article.title }}</h2>
                <BaseBadge :tone="statusTone[article.status]">
                  {{ documentationStatusLabels[article.status] }}
                </BaseBadge>
              </div>
              <p class="mt-2 max-w-3xl text-sm leading-6 text-coursia-muted">{{ article.summary }}</p>
            </div>
          </div>

          <dl class="mt-5 grid gap-3 rounded-2xl border border-coursia-border bg-coursia-background p-4 text-sm md:grid-cols-3">
            <div>
              <dt class="text-xs font-semibold uppercase tracking-[0.12em] text-coursia-muted">Propriétaire</dt>
              <dd class="mt-1 font-medium text-coursia-text">{{ article.owner }}</dd>
            </div>
            <div>
              <dt class="text-xs font-semibold uppercase tracking-[0.12em] text-coursia-muted">Dernière vérification</dt>
              <dd class="mt-1 font-medium text-coursia-text">{{ article.lastVerifiedAt }}</dd>
            </div>
            <div>
              <dt class="text-xs font-semibold uppercase tracking-[0.12em] text-coursia-muted">Tags</dt>
              <dd class="mt-1 flex flex-wrap gap-1.5">
                <span
                  v-for="tag in article.tags"
                  :key="tag"
                  class="rounded-full border border-coursia-border bg-coursia-surface px-2 py-0.5 text-xs font-medium text-coursia-muted"
                >
                  {{ tag }}
                </span>
              </dd>
            </div>
          </dl>

          <div class="mt-5 grid gap-3">
            <section
              v-for="section in article.sections"
              :key="section.title"
              class="rounded-2xl border border-coursia-border bg-coursia-background p-4"
            >
              <h3 class="text-sm font-semibold text-coursia-text">{{ section.title }}</h3>
              <p class="mt-2 text-sm leading-6 text-coursia-muted">{{ section.body }}</p>
              <ul v-if="section.checklist" class="mt-3 grid gap-2 text-sm text-coursia-muted">
                <li v-for="item in section.checklist" :key="item" class="flex gap-2">
                  <span class="mt-0.5 text-coursia-success" aria-hidden="true">✓</span>
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
