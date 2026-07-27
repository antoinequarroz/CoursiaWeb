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
  <section class="admin-page grid gap-8">
    <div class="rounded-[2rem] border border-coursia-border bg-coursia-surface p-6 shadow-coursia-sm">
      <div class="flex flex-wrap items-start justify-between gap-5">
        <div class="max-w-3xl">
          <BaseBadge tone="primary">Catalogue composants</BaseBadge>
          <h1 class="mt-4 text-3xl font-black tracking-tight md:text-4xl">
            Tokens et composants Coursia en production
          </h1>
          <p class="mt-3 text-coursia-muted">
            Catalogue interne vivant des tokens, composants et états réellement utilisés par le site
            public et l’administration. Les exemples rendent les composants Vue du repo.
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

      <div class="mt-6 flex flex-wrap gap-2">
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
      <div class="grid gap-8 rounded-[2rem] border border-coursia-border bg-coursia-background p-4 md:p-6">
        <section class="grid gap-4">
          <div>
            <h2 class="text-2xl font-black">Tokens source de vérité</h2>
            <p class="mt-2 text-coursia-muted">
              Couleurs, typographies, espacements, rayons, ombres et effets proviennent de
              <code>coursiaDesignTokens</code>.
            </p>
          </div>

          <div class="grid gap-4 xl:grid-cols-2">
            <BaseCard>
              <h3 class="font-black">Couleurs — {{ activeTheme }}</h3>
              <div class="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3">
                <div
                  v-for="[name, value] in colorEntries"
                  :key="name"
                  class="rounded-coursia-md border border-coursia-border bg-coursia-surface-muted p-3"
                >
                  <div
                    class="h-10 rounded-coursia-sm border border-coursia-border"
                    :style="{ backgroundColor: value }"
                  />
                  <p class="mt-2 text-sm font-bold">{{ name }}</p>
                  <p class="font-mono text-xs text-coursia-muted">{{ value }}</p>
                </div>
              </div>
            </BaseCard>

            <BaseCard>
              <h3 class="font-black">Typographie, espacements et effets</h3>
              <div class="mt-4 grid gap-5">
                <div>
                  <p class="text-xs font-black uppercase tracking-[0.16em] text-coursia-muted">
                    Typographie
                  </p>
                  <p class="mt-2 text-4xl font-black">Titre display</p>
                  <p class="text-lg text-coursia-muted">Texte lead</p>
                  <p class="text-sm text-coursia-muted">
                    {{ componentCatalogTokens.typography.fontFamily }}
                  </p>
                </div>
                <div class="grid gap-3 md:grid-cols-3">
                  <div>
                    <p class="font-black">Espacements</p>
                    <p v-for="[name, value] in spacingEntries" :key="name" class="text-sm text-coursia-muted">
                      {{ name }}: {{ value }}
                    </p>
                  </div>
                  <div>
                    <p class="font-black">Rayons</p>
                    <p v-for="[name, value] in radiusEntries" :key="name" class="text-sm text-coursia-muted">
                      {{ name }}: {{ value }}
                    </p>
                  </div>
                  <div>
                    <p class="font-black">Ombres</p>
                    <p v-for="[name, value] in shadowEntries" :key="name" class="text-sm text-coursia-muted">
                      {{ name }}: {{ value }}
                    </p>
                  </div>
                </div>
                <BaseCard glass>
                  Effet glass : blur {{ componentCatalogTokens.effects.glassBlur }}
                </BaseCard>
              </div>
            </BaseCard>
          </div>
        </section>

        <section class="grid gap-4">
          <h2 class="text-2xl font-black">Composants rendus</h2>

          <div class="grid gap-4 xl:grid-cols-2">
            <BaseCard>
              <h3 class="font-black">Boutons</h3>
              <div class="mt-4 flex flex-wrap gap-3">
                <BaseButton type="button">Principal</BaseButton>
                <BaseButton type="button" variant="secondary">Secondaire</BaseButton>
                <BaseButton type="button" variant="ghost">Discret</BaseButton>
                <BaseButton type="button" disabled>Désactivé</BaseButton>
                <BaseButton type="button" :disabled="loadingButton" @click="simulateLoading">
                  {{ loadingButton ? 'Chargement...' : 'Simuler loading' }}
                </BaseButton>
              </div>
            </BaseCard>

            <BaseCard>
              <h3 class="font-black">Badges et alertes</h3>
              <div class="mt-4 flex flex-wrap gap-3">
                <BaseBadge v-for="tone in tones" :key="tone" :tone="tone">
                  {{ tone }}
                </BaseBadge>
              </div>
              <div class="mt-5 grid gap-3">
                <p role="status" class="rounded-coursia-md border border-coursia-success/30 bg-coursia-success/10 p-3 text-sm">
                  Confirmation : sauvegarde effectuée.
                </p>
                <p role="alert" class="rounded-coursia-md border border-coursia-danger/30 bg-coursia-danger/10 p-3 text-sm">
                  Erreur : action refusée par les permissions.
                </p>
              </div>
            </BaseCard>

            <BaseCard>
              <h3 class="font-black">Champs, sélecteurs et recherche</h3>
              <div class="mt-4 grid gap-3">
                <label>
                  <span class="text-sm font-bold text-coursia-muted">Recherche</span>
                  <input
                    type="search"
                    placeholder="Rechercher un composant..."
                    class="mt-2 w-full rounded-coursia-md border border-coursia-border bg-coursia-background px-4 py-2 text-sm"
                  />
                </label>
                <label>
                  <span class="text-sm font-bold text-coursia-muted">Sélecteur</span>
                  <select class="mt-2 w-full rounded-coursia-md border border-coursia-border bg-coursia-background px-4 py-2 text-sm">
                    <option>Normal</option>
                    <option>Survol</option>
                    <option>Focus</option>
                    <option>Erreur</option>
                  </select>
                </label>
                <label>
                  <span class="text-sm font-bold text-coursia-danger">Champ en erreur</span>
                  <input
                    aria-invalid="true"
                    value="Valeur invalide"
                    class="mt-2 w-full rounded-coursia-md border border-coursia-danger bg-coursia-background px-4 py-2 text-sm"
                  />
                </label>
              </div>
            </BaseCard>

            <BaseCard>
              <h3 class="font-black">Navigation et pagination</h3>
              <nav class="mt-4 flex flex-wrap gap-2" aria-label="Exemple navigation composant">
                <a href="#buttons" class="rounded-full bg-coursia-primary px-3 py-2 text-sm font-bold text-white">
                  Actif
                </a>
                <a href="#tables" class="rounded-full border border-coursia-border px-3 py-2 text-sm font-bold text-coursia-muted">
                  Tableaux
                </a>
                <a href="#states" class="rounded-full border border-coursia-border px-3 py-2 text-sm font-bold text-coursia-muted">
                  États
                </a>
              </nav>
              <div class="mt-5 flex items-center justify-between rounded-coursia-md border border-coursia-border p-3 text-sm">
                <span>Page 1 / 4</span>
                <div class="flex gap-2">
                  <BaseButton type="button" variant="secondary" size="sm">Précédent</BaseButton>
                  <BaseButton type="button" variant="secondary" size="sm">Suivant</BaseButton>
                </div>
              </div>
            </BaseCard>
          </div>
        </section>

        <section class="grid gap-4">
          <h2 class="text-2xl font-black">Tableaux et états</h2>
          <BaseCard>
            <div class="overflow-x-auto">
              <table class="w-full min-w-[42rem] text-left text-sm">
                <caption class="sr-only">Exemple de tableau admin</caption>
                <thead class="text-coursia-muted">
                  <tr>
                    <th scope="col" class="py-2">Composant</th>
                    <th scope="col" class="py-2">Statut</th>
                    <th scope="col" class="py-2">Usage</th>
                    <th scope="col" class="py-2">Action</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-coursia-border">
                  <tr v-for="item in componentCatalogItems.slice(0, 4)" :key="item.id">
                    <td class="py-3 font-bold">{{ item.title }}</td>
                    <td class="py-3"><BaseBadge tone="success">Production</BaseBadge></td>
                    <td class="py-3 text-coursia-muted">{{ item.useCases[0] }}</td>
                    <td class="py-3"><BaseButton type="button" size="sm" variant="ghost">Voir</BaseButton></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </BaseCard>

          <div class="grid gap-4 md:grid-cols-4">
            <BaseCard>
              <p class="font-black">Skeleton</p>
              <div class="mt-4 grid gap-2" aria-busy="true">
                <span class="h-3 rounded-full bg-coursia-surface-muted" />
                <span class="h-3 w-2/3 rounded-full bg-coursia-surface-muted" />
              </div>
            </BaseCard>
            <BaseCard>
              <p class="font-black">Vide</p>
              <p class="mt-2 text-sm text-coursia-muted">Aucun résultat pour ce filtre.</p>
            </BaseCard>
            <BaseCard>
              <p class="font-black">Erreur</p>
              <p role="alert" class="mt-2 text-sm text-coursia-danger">Impossible de charger.</p>
            </BaseCard>
            <BaseCard>
              <p class="font-black">Accès refusé</p>
              <p class="mt-2 text-sm text-coursia-muted">Rôle insuffisant pour cette action.</p>
            </BaseCard>
          </div>
        </section>

        <section class="grid gap-4">
          <h2 class="text-2xl font-black">Fiches composants</h2>
          <div class="grid gap-4">
            <article
              v-for="item in componentCatalogItems"
              :id="item.id"
              :key="item.id"
              class="rounded-coursia-xl border border-coursia-border bg-coursia-surface p-5"
            >
              <div class="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 class="text-xl font-black">{{ item.title }}</h3>
                  <p v-if="item.productionComponent" class="mt-1 text-sm text-coursia-muted">
                    Composant de production : <code>{{ item.productionComponent }}</code>
                  </p>
                </div>
                <BaseBadge tone="neutral">{{ item.variants.length }} variantes</BaseBadge>
              </div>
              <div class="mt-4 grid gap-4 md:grid-cols-3">
                <div>
                  <p class="font-black">Propriétés utiles</p>
                  <p class="mt-2 text-sm text-coursia-muted">{{ item.usefulProps.join(', ') }}</p>
                </div>
                <div>
                  <p class="font-black">Cas d’usage</p>
                  <ul class="mt-2 grid gap-1 text-sm text-coursia-muted">
                    <li v-for="usage in item.useCases" :key="usage">• {{ usage }}</li>
                  </ul>
                </div>
                <div>
                  <p class="font-black">Accessibilité</p>
                  <ul class="mt-2 grid gap-1 text-sm text-coursia-muted">
                    <li v-for="rule in item.accessibility" :key="rule">• {{ rule }}</li>
                  </ul>
                </div>
              </div>
            </article>
          </div>
        </section>

        <section class="rounded-[1.5rem] border border-coursia-border bg-coursia-surface p-5">
          <h2 class="text-2xl font-black">Checklist qualité</h2>
          <ul class="mt-4 grid gap-2 text-coursia-muted md:grid-cols-2">
            <li v-for="item in componentCatalogQualityChecklist" :key="item" class="flex gap-2">
              <span aria-hidden="true">✓</span>
              <span>{{ item }}</span>
            </li>
          </ul>
        </section>
      </div>
    </div>
  </section>
</template>
