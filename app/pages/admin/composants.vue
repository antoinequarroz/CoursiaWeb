<script setup lang="ts">
import {
  componentCatalogItems,
  componentCatalogQualityChecklist,
  componentCatalogTokens,
  responsivePreviewModes,
} from '#shared/admin/component-catalog'
import type { CoursiaThemeName } from '#shared/design-system/tokens'

definePageMeta({
  layout: 'admin',
})

const tones = ['primary', 'success', 'warning', 'danger', 'neutral'] as const
const activeTheme = ref<CoursiaThemeName>('light')
const activePreview = ref<(typeof responsivePreviewModes)[number]['id']>('desktop')
const loadingButton = ref(false)

const activePreviewClass = computed(() => {
  return responsivePreviewModes.find((mode) => mode.id === activePreview.value)?.widthClass ?? 'max-w-full'
})

const colorEntries = computed(() => Object.entries(componentCatalogTokens.colors[activeTheme.value]))
const spacingEntries = computed(() => Object.entries(componentCatalogTokens.spacing))
const radiusEntries = computed(() => Object.entries(componentCatalogTokens.radius))
const shadowEntries = computed(() => Object.entries(componentCatalogTokens.shadow))
const productionCount = computed(() => componentCatalogItems.filter((item) => item.productionComponent).length)
const navIconExamples = ['dashboard', 'recipes', 'ingredients', 'users', 'subscriptions', 'settings', 'notifications'] as const

const simulateLoading = () => {
  loadingButton.value = true
  window.setTimeout(() => {
    loadingButton.value = false
  }, 700)
}
</script>

<template>
  <section class="admin-page">
    <AdminPageHeader
      eyebrow="COUR-114 · Design system"
      title="Catalogue composants"
      description="Référence interne des tokens, composants, états et comportements responsive réellement utilisés par Coursia."
    >
      <template #actions>
        <BaseButton
          v-for="theme in ['light', 'dark']"
          :key="theme"
          type="button"
          :variant="activeTheme === theme ? 'primary' : 'secondary'"
          size="sm"
          @click="activeTheme = theme"
        >
          {{ theme === 'light' ? 'Clair' : 'Sombre' }}
        </BaseButton>
      </template>
    </AdminPageHeader>

    <div class="admin-stat-grid">
      <article class="admin-stat-card">
        <span class="admin-stat-label">Composants</span>
        <strong class="admin-stat-value">{{ componentCatalogItems.length }}</strong>
      </article>
      <article class="admin-stat-card">
        <span class="admin-stat-label">Production</span>
        <strong class="admin-stat-value">{{ productionCount }}</strong>
      </article>
      <article class="admin-stat-card">
        <span class="admin-stat-label">Contrôles</span>
        <strong class="admin-stat-value">{{ componentCatalogQualityChecklist.length }}</strong>
      </article>
      <article class="admin-stat-card">
        <span class="admin-stat-label">Thème actif</span>
        <strong class="admin-stat-value capitalize">{{ activeTheme }}</strong>
      </article>
    </div>

    <div class="admin-toolbar grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto]">
      <div>
        <p class="text-sm font-semibold text-coursia-text">Prévisualisation responsive</p>
        <p class="mt-1 text-xs text-coursia-muted">
          Le cadre ci-dessous permet de contrôler mobile, tablette, desktop et thème sombre sans changer de page.
        </p>
      </div>
      <div class="flex flex-wrap gap-2">
        <BaseButton
          v-for="mode in responsivePreviewModes"
          :key="mode.id"
          type="button"
          :variant="activePreview === mode.id ? 'primary' : 'secondary'"
          size="sm"
          @click="activePreview = mode.id"
        >
          {{ mode.label }}
        </BaseButton>
      </div>
    </div>

    <div class="mx-auto w-full transition-all" :class="activePreviewClass" :data-theme="activeTheme">
      <div class="grid gap-5 rounded-3xl border border-coursia-border bg-coursia-background p-4 shadow-coursia-sm md:p-5">
        <section class="rounded-2xl border border-coursia-border bg-coursia-surface p-5 shadow-coursia-sm">
          <div class="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p class="text-xs font-semibold uppercase tracking-[0.2em] text-coursia-primary">Source de vérité</p>
              <h2 class="mt-2 text-lg font-semibold text-coursia-text">Tokens Coursia</h2>
              <p class="mt-1 text-sm text-coursia-muted">
                Couleurs, typographie, espacements, rayons et ombres lus depuis `coursiaDesignTokens`.
              </p>
            </div>
            <BaseBadge tone="neutral">{{ colorEntries.length }} couleurs</BaseBadge>
          </div>

          <div class="mt-5 grid gap-4 xl:grid-cols-[1.35fr_1fr]">
            <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              <div
                v-for="[name, value] in colorEntries"
                :key="name"
                class="rounded-2xl border border-coursia-border bg-coursia-background p-3"
              >
                <div
                  class="h-11 rounded-xl border border-coursia-border"
                  :style="{ backgroundColor: value }"
                />
                <p class="mt-2 text-sm font-semibold text-coursia-text">{{ name }}</p>
                <p class="font-mono text-xs text-coursia-muted">{{ value }}</p>
              </div>
            </div>

            <div class="grid gap-3">
              <div class="rounded-2xl border border-coursia-border bg-coursia-background p-4">
                <p class="text-xs font-semibold uppercase tracking-[0.18em] text-coursia-muted">Typographie</p>
                <p class="mt-2 text-3xl font-semibold tracking-[-0.04em] text-coursia-text">Titre display</p>
                <p class="text-sm text-coursia-muted">{{ componentCatalogTokens.typography.fontFamily }}</p>
              </div>

              <div class="grid gap-3 sm:grid-cols-3">
                <div class="rounded-2xl border border-coursia-border bg-coursia-background p-4">
                  <p class="font-semibold text-coursia-text">Espacements</p>
                  <p v-for="[name, value] in spacingEntries" :key="name" class="mt-1 text-xs text-coursia-muted">
                    {{ name }} · {{ value }}
                  </p>
                </div>
                <div class="rounded-2xl border border-coursia-border bg-coursia-background p-4">
                  <p class="font-semibold text-coursia-text">Rayons</p>
                  <p v-for="[name, value] in radiusEntries" :key="name" class="mt-1 text-xs text-coursia-muted">
                    {{ name }} · {{ value }}
                  </p>
                </div>
                <div class="rounded-2xl border border-coursia-border bg-coursia-background p-4">
                  <p class="font-semibold text-coursia-text">Ombres</p>
                  <p v-for="[name, value] in shadowEntries" :key="name" class="mt-1 truncate text-xs text-coursia-muted">
                    {{ name }} · {{ value }}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section class="grid gap-4 xl:grid-cols-2">
          <article class="rounded-2xl border border-coursia-border bg-coursia-surface p-5 shadow-coursia-sm">
            <h2 class="text-lg font-semibold text-coursia-text">Identité et navigation</h2>
            <p class="mt-1 text-sm text-coursia-muted">
              Logo, thème et pictos réels utilisés par la navigation admin.
            </p>

            <div class="mt-5 grid gap-4">
              <div class="rounded-2xl border border-coursia-border bg-coursia-background p-4">
                <BrandLogo />
              </div>

              <div class="flex flex-wrap items-center gap-3 rounded-2xl border border-coursia-border bg-coursia-background p-4">
                <ThemeToggle />
                <span class="text-sm text-coursia-muted">Contrôle réel du thème global.</span>
              </div>

              <div class="grid grid-cols-4 gap-2 sm:grid-cols-7">
                <span
                  v-for="icon in navIconExamples"
                  :key="icon"
                  class="grid h-11 w-11 place-items-center rounded-xl border border-coursia-border bg-coursia-background text-coursia-primary"
                  :title="icon"
                >
                  <NavIcon :name="icon" />
                </span>
              </div>
            </div>
          </article>

          <BaseCard>
            <h2 class="text-lg font-semibold text-coursia-text">Cartes de production</h2>
            <p class="mt-1 text-sm text-coursia-muted">
              `BaseCard` sert de conteneur stable pour formulaires, états vides et blocs de documentation.
            </p>

            <div class="mt-5 grid gap-3 sm:grid-cols-2">
              <BaseCard class="p-4">
                <p class="text-sm font-semibold text-coursia-text">Carte standard</p>
                <p class="mt-1 text-xs text-coursia-muted">Surface, bordure et ombre cohérentes.</p>
              </BaseCard>
              <BaseCard glass class="p-4">
                <p class="text-sm font-semibold text-coursia-text">Carte glass</p>
                <p class="mt-1 text-xs text-coursia-muted">À réserver aux zones premium/marketing.</p>
              </BaseCard>
            </div>
          </BaseCard>
        </section>

        <section class="grid gap-4 xl:grid-cols-2">
          <article class="rounded-2xl border border-coursia-border bg-coursia-surface p-5 shadow-coursia-sm">
            <h2 class="text-lg font-semibold text-coursia-text">Boutons et badges</h2>
            <p class="mt-1 text-sm text-coursia-muted">États normal, hover, disabled et chargement.</p>

            <div class="mt-4 flex flex-wrap gap-3">
              <BaseButton type="button">Principal</BaseButton>
              <BaseButton type="button" variant="secondary">Secondaire</BaseButton>
              <BaseButton type="button" variant="ghost">Discret</BaseButton>
              <BaseButton type="button" disabled>Désactivé</BaseButton>
              <BaseButton type="button" :disabled="loadingButton" @click="simulateLoading">
                {{ loadingButton ? 'Chargement...' : 'Simuler' }}
              </BaseButton>
            </div>

            <div class="mt-5 flex flex-wrap gap-2">
              <BaseBadge v-for="tone in tones" :key="tone" :tone="tone">
                {{ tone }}
              </BaseBadge>
            </div>
          </article>

          <article class="rounded-2xl border border-coursia-border bg-coursia-surface p-5 shadow-coursia-sm">
            <h2 class="text-lg font-semibold text-coursia-text">Champs et états</h2>
            <p class="mt-1 text-sm text-coursia-muted">Labels visibles, focus clavier et message d’erreur actionnable.</p>

            <div class="mt-4 grid gap-3">
              <label class="grid gap-1.5 text-xs font-semibold text-coursia-text">
                Recherche
                <input type="search" placeholder="Rechercher un composant...">
              </label>
              <label class="grid gap-1.5 text-xs font-semibold text-coursia-text">
                Statut
                <select>
                  <option>Normal</option>
                  <option>Focus</option>
                  <option>Erreur</option>
                </select>
              </label>
              <p role="alert" class="rounded-2xl border border-coursia-danger/20 bg-coursia-danger/10 p-3 text-sm font-medium text-coursia-danger">
                Erreur : action refusée par les permissions.
              </p>
            </div>
          </article>
        </section>

        <AdminPanel
          title="Inventaire composants"
          description="Les exemples doivent rendre les composants de production quand ils existent."
          :padded="false"
        >
          <template #actions>
            <BaseBadge tone="neutral">{{ componentCatalogItems.length }}</BaseBadge>
          </template>

          <AdminTableShell>
              <caption class="sr-only">Exemple de tableau de composants</caption>
              <thead>
                <tr>
                  <th scope="col">Composant</th>
                  <th scope="col">Variantes</th>
                  <th scope="col">Usage principal</th>
                  <th scope="col">Statut</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="item in componentCatalogItems" :key="item.id">
                  <td>
                    <span class="font-semibold text-coursia-text">{{ item.title }}</span>
                    <span v-if="item.productionComponent" class="mt-1 block font-mono text-xs text-coursia-muted">
                      {{ item.productionComponent }}
                    </span>
                  </td>
                  <td>{{ item.variants.join(', ') }}</td>
                  <td>{{ item.useCases[0] }}</td>
                  <td><BaseBadge :tone="item.productionComponent ? 'success' : 'warning'">{{ item.productionComponent ? 'Production' : 'À formaliser' }}</BaseBadge></td>
                </tr>
              </tbody>
          </AdminTableShell>
        </AdminPanel>

        <section class="grid gap-4 lg:grid-cols-2">
          <article
            v-for="item in componentCatalogItems"
            :id="item.id"
            :key="item.id"
            class="rounded-2xl border border-coursia-border bg-coursia-surface p-5 shadow-coursia-sm"
          >
            <div class="flex items-start justify-between gap-3">
              <div class="min-w-0">
                <h2 class="text-lg font-semibold text-coursia-text">{{ item.title }}</h2>
                <p v-if="item.productionComponent" class="mt-1 font-mono text-xs text-coursia-muted">
                  {{ item.productionComponent }}
                </p>
              </div>
              <BaseBadge tone="neutral">{{ item.variants.length }} variantes</BaseBadge>
            </div>

            <div class="mt-4 grid gap-4 sm:grid-cols-3">
              <div>
                <p class="text-xs font-semibold uppercase tracking-[0.14em] text-coursia-muted">Props</p>
                <p class="mt-2 text-sm leading-6 text-coursia-text">{{ item.usefulProps.join(', ') }}</p>
              </div>
              <div>
                <p class="text-xs font-semibold uppercase tracking-[0.14em] text-coursia-muted">Usage</p>
                <ul class="mt-2 grid gap-1 text-sm leading-6 text-coursia-text">
                  <li v-for="usage in item.useCases" :key="usage" class="flex gap-2">
                    <span class="text-coursia-primary" aria-hidden="true">•</span>
                    <span>{{ usage }}</span>
                  </li>
                </ul>
              </div>
              <div>
                <p class="text-xs font-semibold uppercase tracking-[0.14em] text-coursia-muted">Accessibilité</p>
                <ul class="mt-2 grid gap-1 text-sm leading-6 text-coursia-text">
                  <li v-for="rule in item.accessibility" :key="rule" class="flex gap-2">
                    <span class="text-coursia-success" aria-hidden="true">✓</span>
                    <span>{{ rule }}</span>
                  </li>
                </ul>
              </div>
            </div>
          </article>
        </section>

        <section class="rounded-2xl border border-coursia-border bg-coursia-surface p-5 shadow-coursia-sm">
          <div class="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 class="text-lg font-semibold text-coursia-text">Checklist qualité</h2>
              <p class="mt-1 text-sm text-coursia-muted">À contrôler avant d’ajouter ou modifier un composant admin.</p>
            </div>
            <BaseBadge tone="success">DoD UI</BaseBadge>
          </div>
          <ul class="mt-4 grid gap-2 text-sm text-coursia-text md:grid-cols-2">
            <li v-for="item in componentCatalogQualityChecklist" :key="item" class="flex gap-2">
              <span class="text-coursia-success" aria-hidden="true">✓</span>
              <span>{{ item }}</span>
            </li>
          </ul>
        </section>
      </div>
    </div>
  </section>
</template>
