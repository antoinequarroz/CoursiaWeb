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
  <section class="admin-page grid gap-8">
    <div class="rounded-[2rem] border border-coursia-border bg-coursia-surface p-6 shadow-coursia-sm">
      <div class="flex flex-wrap items-start justify-between gap-5">
        <div class="max-w-3xl">
          <BaseBadge tone="primary">Documentation interne</BaseBadge>
          <h1 class="mt-4 text-3xl font-black tracking-tight md:text-4xl">
            Centre de documentation Coursia
          </h1>
          <p class="mt-3 text-coursia-muted">
            Procédures protégées pour le développement, l’exploitation et l’administration.
            Le contenu est isolé de la landing page publique et reste versionné côté admin.
          </p>
        </div>
        <BaseButton type="button" variant="secondary" @click="markReloaded">
          Recharger
        </BaseButton>
      </div>

      <div class="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <label>
          <span class="text-sm font-bold text-coursia-muted">Recherche procédure</span>
          <input
            v-model="search"
            type="search"
            placeholder="Rechercher RLS, rollback, RevenueCat, publication..."
            class="mt-2 w-full rounded-coursia-md border border-coursia-border bg-coursia-background px-4 py-3 text-sm"
          />
        </label>

        <div class="rounded-coursia-lg border border-coursia-border bg-coursia-background p-4">
          <p class="text-xs font-black uppercase tracking-[0.16em] text-coursia-muted">
            Liens contrôlés
          </p>
          <div class="mt-3 flex flex-wrap gap-2">
            <a
              v-for="link in externalLinks"
              :key="link.label"
              :href="link.href"
              target="_blank"
              rel="noreferrer"
              class="ds-focus-ring rounded-full border border-coursia-border px-3 py-1.5 text-xs font-bold text-coursia-muted hover:text-coursia-foreground"
            >
              {{ link.label }}
            </a>
          </div>
        </div>
      </div>
    </div>

    <div v-if="loadState === 'loading'" class="rounded-coursia-xl bg-coursia-surface p-6">
      Chargement de la documentation...
    </div>
    <div v-else-if="loadState === 'denied'" class="rounded-coursia-xl bg-coursia-surface p-6 text-coursia-danger">
      Accès refusé. Cette documentation exige une authentification et un rôle autorisé.
    </div>
    <div v-else-if="loadState === 'error'" class="rounded-coursia-xl bg-coursia-surface p-6 text-coursia-danger">
      Impossible de charger la documentation. Réessayez plus tard.
    </div>
    <div v-else-if="loadState === 'empty' || visibleArticles.length === 0" class="rounded-coursia-xl bg-coursia-surface p-6">
      Aucune procédure ne correspond à cette recherche.
    </div>

    <div v-else class="grid gap-6 xl:grid-cols-[20rem_minmax(0,1fr)]">
      <aside class="content-auto rounded-[1.5rem] border border-coursia-border bg-coursia-surface p-5 shadow-coursia-sm xl:sticky xl:top-6 xl:self-start">
        <p class="text-xs font-black uppercase tracking-[0.18em] text-coursia-muted">
          Table des matières
        </p>
        <p class="mt-2 text-sm text-coursia-muted">{{ articleCountLabel }}</p>
        <nav class="mt-5 grid gap-2" aria-label="Table des matières documentation">
          <a
            v-for="article in visibleArticles"
            :key="article.id"
            :href="`#${article.id}`"
            class="ds-focus-ring rounded-xl px-3 py-2 text-sm font-semibold text-coursia-muted hover:bg-coursia-surface-muted hover:text-coursia-foreground"
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
          class="content-auto rounded-[1.5rem] border border-coursia-border bg-coursia-surface p-6 shadow-coursia-sm"
        >
          <div class="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 class="text-2xl font-black tracking-tight">{{ article.title }}</h2>
              <p class="mt-2 text-coursia-muted">{{ article.summary }}</p>
            </div>
            <BaseBadge :tone="statusTone[article.status]">
              {{ documentationStatusLabels[article.status] }}
            </BaseBadge>
          </div>

          <dl class="mt-5 grid gap-3 rounded-coursia-lg bg-coursia-background p-4 text-sm md:grid-cols-3">
            <div>
              <dt class="font-black text-coursia-muted">Propriétaire</dt>
              <dd class="mt-1">{{ article.owner }}</dd>
            </div>
            <div>
              <dt class="font-black text-coursia-muted">Dernière vérification</dt>
              <dd class="mt-1">{{ article.lastVerifiedAt }}</dd>
            </div>
            <div>
              <dt class="font-black text-coursia-muted">Tags</dt>
              <dd class="mt-1">{{ article.tags.join(', ') }}</dd>
            </div>
          </dl>

          <div class="mt-6 grid gap-5">
            <section v-for="section in article.sections" :key="section.title">
              <h3 class="text-lg font-black">{{ section.title }}</h3>
              <p class="mt-2 text-coursia-muted">{{ section.body }}</p>
              <ul v-if="section.checklist" class="mt-3 grid gap-2 text-sm text-coursia-muted">
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
