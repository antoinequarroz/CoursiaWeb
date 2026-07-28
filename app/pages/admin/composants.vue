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

const simulateLoading = () => {
  loadingButton.value = true
  window.setTimeout(() => {
    loadingButton.value = false
  }, 700)
}
</script>

<template>
  <section class="admin-page grid gap-6">
    <div class="admin-hero">
      <div>
        <p class="admin-kicker">COUR-114 · Design system</p>
        <h1 class="admin-title">Catalogue composants</h1>
        <p class="admin-subtitle">
          Tokens, états et composants réellement utilisés par le site public et l’administration.
        </p>
      </div>

      <div class="flex flex-wrap gap-2">
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
      </div>
    </div>

    <div class="admin-stat-grid">
      <article class="admin-stat-card">
        <span class="admin-stat-label">Composants</span>
        <strong class="admin-stat-value">{{ componentCatalogItems.length }}</strong>
      </article>
      <article class="admin-stat-card">
        <span class="admin-stat-label">Couleurs</span>
        <strong class="admin-stat-value">{{ colorEntries.length }}</strong>
      </article>
      <article class="admin-stat-card">
        <span class="admin-stat-label">Contrôles qualité</span>
        <strong class="admin-stat-value">{{ componentCatalogQualityChecklist.length }}</strong>
      </article>
      <article class="admin-stat-card">
        <span class="admin-stat-label">Thème actif</span>
        <strong class="admin-stat-value capitalize">{{ activeTheme }}</strong>
      </article>
    </div>

    <div class="admin-toolbar">
      <div>
        <p class="text-sm font-semibold text-[#101828] dark:text-white">Prévisualisation responsive</p>
        <p class="text-xs text-[#667085] dark:text-[#9ca3af]">
          Vérifie les composants dans un cadre mobile, tablette ou desktop.
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

    <div
      class="mx-auto w-full transition-all"
      :class="activePreviewClass"
      :data-theme="activeTheme"
    >
      <div class="grid gap-5 rounded-3xl border border-[#e6e1d8] bg-[#fbf8f2] p-4 shadow-sm dark:border-[#24342f] dark:bg-[#071915] md:p-5">
        <section class="admin-card">
          <div class="admin-section-heading">
            <div>
              <h2>Tokens source de vérité</h2>
              <p>Couleurs, typographies, espacements, rayons et ombres issus de `coursiaDesignTokens`.</p>
            </div>
          </div>

          <div class="mt-4 grid gap-4 xl:grid-cols-[1.4fr_1fr]">
            <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              <div
                v-for="[name, value] in colorEntries"
                :key="name"
                class="rounded-2xl border border-[#e6e1d8] bg-white p-3 dark:border-[#24342f] dark:bg-[#0b1f1a]"
              >
                <div
                  class="h-11 rounded-xl border border-black/5"
                  :style="{ backgroundColor: value }"
                />
                <p class="mt-2 text-sm font-semibold text-[#101828] dark:text-white">{{ name }}</p>
                <p class="font-mono text-xs text-[#667085] dark:text-[#9ca3af]">{{ value }}</p>
              </div>
            </div>

            <div class="grid gap-3">
              <div class="rounded-2xl border border-[#e6e1d8] bg-white p-4 dark:border-[#24342f] dark:bg-[#0b1f1a]">
                <p class="text-xs font-semibold uppercase tracking-[0.18em] text-[#667085] dark:text-[#9ca3af]">
                  Typographie
                </p>
                <p class="mt-2 text-3xl font-semibold text-[#101828] dark:text-white">Titre display</p>
                <p class="text-sm text-[#667085] dark:text-[#9ca3af]">
                  {{ componentCatalogTokens.typography.fontFamily }}
                </p>
              </div>

              <div class="grid gap-3 sm:grid-cols-3">
                <div class="rounded-2xl border border-[#e6e1d8] bg-white p-4 dark:border-[#24342f] dark:bg-[#0b1f1a]">
                  <p class="font-semibold text-[#101828] dark:text-white">Espacements</p>
                  <p v-for="[name, value] in spacingEntries" :key="name" class="mt-1 text-xs text-[#667085] dark:text-[#9ca3af]">
                    {{ name }} · {{ value }}
                  </p>
                </div>
                <div class="rounded-2xl border border-[#e6e1d8] bg-white p-4 dark:border-[#24342f] dark:bg-[#0b1f1a]">
                  <p class="font-semibold text-[#101828] dark:text-white">Rayons</p>
                  <p v-for="[name, value] in radiusEntries" :key="name" class="mt-1 text-xs text-[#667085] dark:text-[#9ca3af]">
                    {{ name }} · {{ value }}
                  </p>
                </div>
                <div class="rounded-2xl border border-[#e6e1d8] bg-white p-4 dark:border-[#24342f] dark:bg-[#0b1f1a]">
                  <p class="font-semibold text-[#101828] dark:text-white">Ombres</p>
                  <p v-for="[name, value] in shadowEntries" :key="name" class="mt-1 truncate text-xs text-[#667085] dark:text-[#9ca3af]">
                    {{ name }} · {{ value }}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section class="grid gap-4 xl:grid-cols-2">
          <article class="admin-card">
            <div class="admin-section-heading">
              <h2>Boutons et badges</h2>
            </div>
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

          <article class="admin-card">
            <div class="admin-section-heading">
              <h2>Champs et états</h2>
            </div>
            <div class="mt-4 grid gap-3">
              <label>
                <span class="text-xs font-semibold text-[#667085] dark:text-[#9ca3af]">Recherche</span>
                <input
                  type="search"
                  placeholder="Rechercher un composant..."
                  class="mt-1 w-full rounded-2xl border border-[#e6e1d8] bg-white px-4 py-2.5 text-sm text-[#101828] outline-none transition focus:border-[#0f2d27] dark:border-[#24342f] dark:bg-[#071915] dark:text-white"
                >
              </label>
              <label>
                <span class="text-xs font-semibold text-[#667085] dark:text-[#9ca3af]">Statut</span>
                <select class="mt-1 w-full rounded-2xl border border-[#e6e1d8] bg-white px-4 py-2.5 text-sm text-[#101828] outline-none dark:border-[#24342f] dark:bg-[#071915] dark:text-white">
                  <option>Normal</option>
                  <option>Focus</option>
                  <option>Erreur</option>
                </select>
              </label>
              <p role="alert" class="rounded-2xl border border-[#ef4444]/25 bg-[#ef4444]/10 p-3 text-sm text-[#b42318] dark:text-[#fecaca]">
                Erreur : action refusée par les permissions.
              </p>
            </div>
          </article>
        </section>

        <section class="admin-card">
          <div class="admin-section-heading">
            <h2>Tableaux</h2>
          </div>
          <div class="mt-4 overflow-x-auto">
            <table class="admin-table min-w-[44rem]">
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
                    <span class="font-semibold text-[#101828] dark:text-white">{{ item.title }}</span>
                    <span v-if="item.productionComponent" class="mt-1 block font-mono text-xs text-[#667085] dark:text-[#9ca3af]">
                      {{ item.productionComponent }}
                    </span>
                  </td>
                  <td>{{ item.variants.join(', ') }}</td>
                  <td>{{ item.useCases[0] }}</td>
                  <td><BaseBadge tone="success">Production</BaseBadge></td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section class="grid gap-4 lg:grid-cols-2">
          <article
            v-for="item in componentCatalogItems"
            :id="item.id"
            :key="item.id"
            class="admin-card"
          >
            <div class="flex items-start justify-between gap-3">
              <div>
                <h2>{{ item.title }}</h2>
                <p v-if="item.productionComponent" class="mt-1 font-mono text-xs text-[#667085] dark:text-[#9ca3af]">
                  {{ item.productionComponent }}
                </p>
              </div>
              <BaseBadge tone="neutral">{{ item.variants.length }} variantes</BaseBadge>
            </div>

            <div class="mt-4 grid gap-4 sm:grid-cols-3">
              <div>
                <p class="text-xs font-semibold uppercase tracking-[0.14em] text-[#667085] dark:text-[#9ca3af]">
                  Props
                </p>
                <p class="mt-2 text-sm text-[#344054] dark:text-[#d1d5db]">{{ item.usefulProps.join(', ') }}</p>
              </div>
              <div>
                <p class="text-xs font-semibold uppercase tracking-[0.14em] text-[#667085] dark:text-[#9ca3af]">
                  Usage
                </p>
                <ul class="mt-2 grid gap-1 text-sm text-[#344054] dark:text-[#d1d5db]">
                  <li v-for="usage in item.useCases" :key="usage">• {{ usage }}</li>
                </ul>
              </div>
              <div>
                <p class="text-xs font-semibold uppercase tracking-[0.14em] text-[#667085] dark:text-[#9ca3af]">
                  Accessibilité
                </p>
                <ul class="mt-2 grid gap-1 text-sm text-[#344054] dark:text-[#d1d5db]">
                  <li v-for="rule in item.accessibility" :key="rule">• {{ rule }}</li>
                </ul>
              </div>
            </div>
          </article>
        </section>

        <section class="admin-card">
          <div class="admin-section-heading">
            <h2>Checklist qualité</h2>
          </div>
          <ul class="mt-4 grid gap-2 text-sm text-[#344054] dark:text-[#d1d5db] md:grid-cols-2">
            <li v-for="item in componentCatalogQualityChecklist" :key="item" class="flex gap-2">
              <span aria-hidden="true" class="text-[#22c55e]">✓</span>
              <span>{{ item }}</span>
            </li>
          </ul>
        </section>
      </div>
    </div>
  </section>
</template>
