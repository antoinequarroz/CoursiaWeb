<script setup lang="ts">
definePageMeta({
  layout: 'admin',
})

type SafetyReference = {
  id: string
  code: string
  label: string
  usageCount: number
}

type FoodSafetyResponse = {
  data: {
    allergens: SafetyReference[]
    diets: SafetyReference[]
    counts: {
      allergens: number
      diets: number
      linkedIngredients: number
      linkedRecipes: number
    }
  }
}

const allergens = ref<SafetyReference[]>([])
const diets = ref<SafetyReference[]>([])
const counts = ref<FoodSafetyResponse['data']['counts']>({
  allergens: 0,
  diets: 0,
  linkedIngredients: 0,
  linkedRecipes: 0,
})
const isLoading = ref(false)
const errorMessage = ref('')

const topAllergens = computed(() =>
  [...allergens.value].sort((a, b) => b.usageCount - a.usageCount).slice(0, 4),
)

const topDiets = computed(() =>
  [...diets.value].sort((a, b) => b.usageCount - a.usageCount).slice(0, 4),
)

function toneForUsage(usageCount: number) {
  if (usageCount >= 10) return 'danger'
  if (usageCount > 0) return 'warning'
  return 'neutral'
}

async function loadFoodSafety(): Promise<void> {
  isLoading.value = true
  errorMessage.value = ''

  try {
    const response = await $fetch<FoodSafetyResponse>('/api/admin/food-safety')
    allergens.value = response.data.allergens
    diets.value = response.data.diets
    counts.value = response.data.counts
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Impossible de charger le référentiel alimentaire.'
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  void loadFoodSafety()
})
</script>

<template>
  <section class="admin-page">
    <div class="flex flex-wrap items-end justify-between gap-4">
      <div>
        <p class="text-xs font-semibold uppercase tracking-[0.24em] text-coursia-primary">
          COUR-98 · sécurité alimentaire
        </p>
        <h1 class="mt-2 text-2xl font-semibold tracking-[-0.03em] text-[#101828] dark:text-[#f7fbf8]">
          Allergènes et régimes
        </h1>
        <p class="mt-2 max-w-3xl text-sm leading-6 text-[#667085] dark:text-[#a8b8ad]">
          Vue de contrôle du référentiel alimentaire réel. Les liens ouvrent le catalogue ingrédients avec les
          filtres branchés sur Supabase.
        </p>
      </div>

      <div class="flex flex-wrap gap-2">
        <NuxtLink to="/admin/ingredients" class="inline-flex cursor-pointer items-center justify-center rounded-coursia-md border border-[#e6e1d8] bg-coursia-surface px-4 py-2.5 text-sm font-semibold text-[#344054] transition hover:bg-[#f7f4ed] dark:border-white/10 dark:bg-white/5 dark:text-[#dbe7df] dark:hover:bg-white/10">
          Ingrédients
        </NuxtLink>
        <BaseButton type="button" :disabled="isLoading" @click="loadFoodSafety">
          {{ isLoading ? 'Chargement...' : 'Rafraîchir' }}
        </BaseButton>
      </div>
    </div>

    <p
      v-if="errorMessage"
      class="rounded-2xl border border-coursia-danger/20 bg-coursia-danger/10 p-3 text-sm font-medium text-coursia-danger"
    >
      {{ errorMessage }}
    </p>

    <div class="grid gap-4 md:grid-cols-4">
      <article class="admin-stat-card">
        <p class="admin-stat-label">Allergènes</p>
        <p class="admin-stat-value">{{ counts.allergens }}</p>
        <p class="admin-stat-caption">référentiel actif</p>
      </article>
      <article class="admin-stat-card">
        <p class="admin-stat-label">Régimes</p>
        <p class="admin-stat-value">{{ counts.diets }}</p>
        <p class="admin-stat-caption">compatibilités recette</p>
      </article>
      <article class="admin-stat-card">
        <p class="admin-stat-label">Liens ingrédients</p>
        <p class="admin-stat-value">{{ counts.linkedIngredients }}</p>
        <p class="admin-stat-caption">relations allergènes</p>
      </article>
      <article class="admin-stat-card">
        <p class="admin-stat-label">Liens recettes</p>
        <p class="admin-stat-value">{{ counts.linkedRecipes }}</p>
        <p class="admin-stat-caption">relations régimes</p>
      </article>
    </div>

    <div class="grid gap-5 xl:grid-cols-[minmax(0,1fr)_22rem]">
      <section class="overflow-hidden rounded-3xl border border-[#e6e1d8] bg-coursia-surface dark:border-white/10 dark:bg-[#111827]">
        <div class="flex flex-wrap items-center justify-between gap-3 border-b border-[#ece6dc] px-5 py-4 dark:border-white/10">
          <div>
            <h2 class="text-sm font-semibold text-[#101828] dark:text-[#f7fbf8]">Allergènes</h2>
            <p class="mt-1 text-xs text-[#667085] dark:text-[#a8b8ad]">
              Filtrage direct vers les ingrédients concernés.
            </p>
          </div>
          <BaseBadge tone="neutral">{{ allergens.length }}</BaseBadge>
        </div>

        <div v-if="isLoading" class="p-5 text-sm text-[#667085] dark:text-[#a8b8ad]">Chargement...</div>
        <div v-else-if="allergens.length <= 0" class="p-5 text-sm text-[#667085] dark:text-[#a8b8ad]">Aucun allergène trouvé.</div>

        <div v-else class="grid gap-3 p-5 md:grid-cols-2 xl:grid-cols-3">
          <NuxtLink
            v-for="allergen in allergens"
            :key="allergen.id"
            :to="`/admin/ingredients?allergen=${allergen.code}`"
            class="group cursor-pointer rounded-2xl border border-[#e6e1d8] bg-[#fbf8f1] p-4 transition hover:-translate-y-0.5 hover:border-coursia-primary/35 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
          >
            <div class="flex items-start justify-between gap-3">
              <div>
                <p class="font-semibold text-[#101828] dark:text-[#f7fbf8]">{{ allergen.label }}</p>
                <p class="mt-1 font-mono text-xs text-[#667085] dark:text-[#a8b8ad]">{{ allergen.code }}</p>
              </div>
              <BaseBadge :tone="toneForUsage(allergen.usageCount)">
                {{ allergen.usageCount }}
              </BaseBadge>
            </div>
            <p class="mt-3 text-sm leading-6 text-[#667085] dark:text-[#a8b8ad]">
              {{ allergen.usageCount }} ingrédient{{ allergen.usageCount > 1 ? 's' : '' }} lié{{ allergen.usageCount > 1 ? 's' : '' }}.
            </p>
          </NuxtLink>
        </div>
      </section>

      <aside class="rounded-3xl border border-[#e6e1d8] bg-coursia-surface p-5 dark:border-white/10 dark:bg-[#111827]">
        <p class="text-xs font-semibold uppercase tracking-[0.2em] text-coursia-primary">À surveiller</p>
        <h2 class="mt-2 text-lg font-semibold text-[#101828] dark:text-[#f7fbf8]">Allergènes les plus liés</h2>
        <div class="mt-5 grid gap-3">
          <div
            v-for="item in topAllergens"
            :key="item.id"
            class="flex items-center justify-between rounded-2xl bg-[#fbf8f1] px-4 py-3 dark:bg-white/5"
          >
            <span class="text-sm font-semibold text-[#101828] dark:text-[#f7fbf8]">{{ item.label }}</span>
            <BaseBadge :tone="toneForUsage(item.usageCount)">{{ item.usageCount }}</BaseBadge>
          </div>
          <p v-if="topAllergens.length <= 0" class="text-sm text-[#667085] dark:text-[#a8b8ad]">
            Aucun lien chargé.
          </p>
        </div>
      </aside>
    </div>

    <div class="grid gap-5 xl:grid-cols-[minmax(0,1fr)_22rem]">
      <section class="overflow-hidden rounded-3xl border border-[#e6e1d8] bg-coursia-surface dark:border-white/10 dark:bg-[#111827]">
        <div class="flex flex-wrap items-center justify-between gap-3 border-b border-[#ece6dc] px-5 py-4 dark:border-white/10">
          <div>
            <h2 class="text-sm font-semibold text-[#101828] dark:text-[#f7fbf8]">Régimes</h2>
            <p class="mt-1 text-xs text-[#667085] dark:text-[#a8b8ad]">
              Compatibilités utilisées par les recettes et les filtres de l’app.
            </p>
          </div>
          <BaseBadge tone="neutral">{{ diets.length }}</BaseBadge>
        </div>

        <div v-if="isLoading" class="p-5 text-sm text-[#667085] dark:text-[#a8b8ad]">Chargement...</div>
        <div v-else-if="diets.length <= 0" class="p-5 text-sm text-[#667085] dark:text-[#a8b8ad]">Aucun régime trouvé.</div>

        <div v-else class="grid gap-3 p-5 md:grid-cols-2 xl:grid-cols-3">
          <article
            v-for="diet in diets"
            :key="diet.id"
            class="rounded-2xl border border-[#e6e1d8] bg-[#fbf8f1] p-4 dark:border-white/10 dark:bg-white/5"
          >
            <div class="flex items-start justify-between gap-3">
              <div>
                <p class="font-semibold text-[#101828] dark:text-[#f7fbf8]">{{ diet.label }}</p>
                <p class="mt-1 font-mono text-xs text-[#667085] dark:text-[#a8b8ad]">{{ diet.code }}</p>
              </div>
              <BaseBadge tone="primary">{{ diet.usageCount }}</BaseBadge>
            </div>
            <p class="mt-3 text-sm leading-6 text-[#667085] dark:text-[#a8b8ad]">
              {{ diet.usageCount }} recette{{ diet.usageCount > 1 ? 's' : '' }} liée{{ diet.usageCount > 1 ? 's' : '' }}.
            </p>
          </article>
        </div>
      </section>

      <aside class="rounded-3xl border border-[#e6e1d8] bg-coursia-surface p-5 dark:border-white/10 dark:bg-[#111827]">
        <p class="text-xs font-semibold uppercase tracking-[0.2em] text-coursia-primary">Usage recettes</p>
        <h2 class="mt-2 text-lg font-semibold text-[#101828] dark:text-[#f7fbf8]">Régimes les plus utilisés</h2>
        <div class="mt-5 grid gap-3">
          <div
            v-for="item in topDiets"
            :key="item.id"
            class="flex items-center justify-between rounded-2xl bg-[#fbf8f1] px-4 py-3 dark:bg-white/5"
          >
            <span class="text-sm font-semibold text-[#101828] dark:text-[#f7fbf8]">{{ item.label }}</span>
            <BaseBadge tone="primary">{{ item.usageCount }}</BaseBadge>
          </div>
          <p v-if="topDiets.length <= 0" class="text-sm text-[#667085] dark:text-[#a8b8ad]">
            Aucun lien chargé.
          </p>
        </div>
      </aside>
    </div>
  </section>
</template>
