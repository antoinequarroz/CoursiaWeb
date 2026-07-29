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
    <AdminPageHeader
      eyebrow="COUR-98 · sécurité alimentaire"
      title="Allergènes et régimes"
      description="Vue de contrôle du référentiel alimentaire réel. Les liens ouvrent le catalogue ingrédients avec les filtres branchés sur Supabase."
    >
      <template #actions>
        <NuxtLink to="/admin/ingredients" class="ds-focus-ring inline-flex cursor-pointer items-center justify-center rounded-coursia-md border border-coursia-border bg-coursia-surface px-4 py-2.5 text-sm font-semibold text-coursia-text transition hover:border-coursia-primary/45 hover:bg-coursia-primary/10">
          Ingrédients
        </NuxtLink>
        <BaseButton type="button" :disabled="isLoading" @click="loadFoodSafety">
          {{ isLoading ? 'Chargement...' : 'Rafraîchir' }}
        </BaseButton>
      </template>
    </AdminPageHeader>

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
      <AdminPanel
        title="Allergènes"
        description="Filtrage direct vers les ingrédients concernés."
        :padded="false"
      >
        <template #actions>
          <BaseBadge tone="neutral">{{ allergens.length }}</BaseBadge>
        </template>

        <div v-if="isLoading" class="p-5 text-sm text-coursia-muted">Chargement...</div>
        <AdminEmptyState
          v-else-if="allergens.length <= 0"
          icon="ingredients"
          title="Aucun allergène trouvé"
          description="Le référentiel allergènes apparaîtra ici une fois chargé."
        />

        <div v-else class="grid gap-3 p-5 md:grid-cols-2 xl:grid-cols-3">
          <NuxtLink
            v-for="allergen in allergens"
            :key="allergen.id"
            :to="`/admin/ingredients?allergen=${allergen.code}`"
            class="admin-card-action group rounded-2xl border p-4"
          >
            <div class="flex items-start justify-between gap-3">
              <div>
                <p class="font-semibold text-coursia-text">{{ allergen.label }}</p>
                <p class="mt-1 font-mono text-xs text-coursia-muted">{{ allergen.code }}</p>
              </div>
              <BaseBadge :tone="toneForUsage(allergen.usageCount)">
                {{ allergen.usageCount }}
              </BaseBadge>
            </div>
            <p class="mt-3 text-sm leading-6 text-coursia-muted">
              {{ allergen.usageCount }} ingrédient{{ allergen.usageCount > 1 ? 's' : '' }} lié{{ allergen.usageCount > 1 ? 's' : '' }}.
            </p>
          </NuxtLink>
        </div>
      </AdminPanel>

      <AdminPanel title="Allergènes les plus liés" description="À surveiller">
        <div class="mt-5 grid gap-3">
          <div
            v-for="item in topAllergens"
            :key="item.id"
            class="flex items-center justify-between rounded-2xl bg-coursia-surface-muted px-4 py-3"
          >
            <span class="text-sm font-semibold text-coursia-text">{{ item.label }}</span>
            <BaseBadge :tone="toneForUsage(item.usageCount)">{{ item.usageCount }}</BaseBadge>
          </div>
          <p v-if="topAllergens.length <= 0" class="text-sm text-coursia-muted">
            Aucun lien chargé.
          </p>
        </div>
      </AdminPanel>
    </div>

    <div class="grid gap-5 xl:grid-cols-[minmax(0,1fr)_22rem]">
      <AdminPanel
        title="Régimes"
        description="Compatibilités utilisées par les recettes et les filtres de l’app."
        :padded="false"
      >
        <template #actions>
          <BaseBadge tone="neutral">{{ diets.length }}</BaseBadge>
        </template>

        <div v-if="isLoading" class="p-5 text-sm text-coursia-muted">Chargement...</div>
        <AdminEmptyState
          v-else-if="diets.length <= 0"
          icon="ingredients"
          title="Aucun régime trouvé"
          description="Le référentiel régimes apparaîtra ici une fois chargé."
        />

        <div v-else class="grid gap-3 p-5 md:grid-cols-2 xl:grid-cols-3">
          <article
            v-for="diet in diets"
            :key="diet.id"
            class="rounded-2xl border border-coursia-border bg-coursia-surface-muted p-4"
          >
            <div class="flex items-start justify-between gap-3">
              <div>
                <p class="font-semibold text-coursia-text">{{ diet.label }}</p>
                <p class="mt-1 font-mono text-xs text-coursia-muted">{{ diet.code }}</p>
              </div>
              <BaseBadge tone="primary">{{ diet.usageCount }}</BaseBadge>
            </div>
            <p class="mt-3 text-sm leading-6 text-coursia-muted">
              {{ diet.usageCount }} recette{{ diet.usageCount > 1 ? 's' : '' }} liée{{ diet.usageCount > 1 ? 's' : '' }}.
            </p>
          </article>
        </div>
      </AdminPanel>

      <AdminPanel title="Régimes les plus utilisés" description="Usage recettes">
        <div class="mt-5 grid gap-3">
          <div
            v-for="item in topDiets"
            :key="item.id"
            class="flex items-center justify-between rounded-2xl bg-coursia-surface-muted px-4 py-3"
          >
            <span class="text-sm font-semibold text-coursia-text">{{ item.label }}</span>
            <BaseBadge tone="primary">{{ item.usageCount }}</BaseBadge>
          </div>
          <p v-if="topDiets.length <= 0" class="text-sm text-coursia-muted">
            Aucun lien chargé.
          </p>
        </div>
      </AdminPanel>
    </div>
  </section>
</template>
