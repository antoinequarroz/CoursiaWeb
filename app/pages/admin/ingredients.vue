<script setup lang="ts">
import {
  allergenCodeSchema,
  dietCodeSchema,
  estimateIngredientCatalogImpact,
  findIngredientCatalogConflicts,
  type CanonicalIngredientInput,
} from '#shared/validation/ingredient-catalog'

definePageMeta({
  layout: 'admin',
})

const form = reactive<CanonicalIngredientInput>({
  name: '',
  slug: '',
  status: 'active',
  synonyms: [],
  units: ['g'],
  categories: [],
  allergens: [],
  diets: [],
  sensitive: false,
})

const filters = reactive({
  search: '',
  allergen: '',
  diet: '',
  status: '',
})

const ingredients = ref<Array<Record<string, unknown>>>([])
const selectedIngredientId = ref<string | null>(null)
const mergeTargetId = ref('')
const feedback = ref('')
const synonymInput = ref('')
const categoryInput = ref('')
const impactPreview = computed(() =>
  estimateIngredientCatalogImpact(Number(ingredients.value.length), form.synonyms.length),
)
const conflictPreview = computed(() =>
  findIngredientCatalogConflicts([
    { name: form.name, slug: form.slug, synonyms: form.synonyms },
    ...ingredients.value.map((item) => ({
      name: String(item.name ?? ''),
      slug: String(item.slug ?? ''),
      synonyms: Array.isArray(item.synonyms) ? (item.synonyms as string[]) : [],
    })),
  ]),
)

const allergenOptions = allergenCodeSchema.options
const dietOptions = dietCodeSchema.options

const loadIngredients = async () => {
  const response = await $fetch<{ data: Array<Record<string, unknown>> }>('/api/admin/ingredients', {
    query: filters,
  })
  ingredients.value = response.data
}

const saveIngredient = async () => {
  if (conflictPreview.value.length > 0) {
    feedback.value = 'Conflits ou doublons détectés avant enregistrement.'
    return
  }

  const endpoint = selectedIngredientId.value
    ? `/api/admin/ingredients/${selectedIngredientId.value}`
    : '/api/admin/ingredients'
  const method = selectedIngredientId.value ? 'PUT' : 'POST'

  await $fetch(endpoint, { method, body: form })
  feedback.value = selectedIngredientId.value ? 'Ingrédient modifié.' : 'Ingrédient créé.'
  await loadIngredients()
}

const addSynonym = () => {
  if (synonymInput.value.trim()) {
    form.synonyms.push(synonymInput.value.trim())
    synonymInput.value = ''
  }
}

const addCategory = () => {
  if (categoryInput.value.trim()) {
    form.categories.push(categoryInput.value.trim())
    categoryInput.value = ''
  }
}

const archiveIngredient = async (id: string) => {
  await $fetch(`/api/admin/ingredients/${id}/archive`, { method: 'POST' })
  feedback.value = 'Ingrédient archivé après aperçu d’impact.'
  await loadIngredients()
}

const mergeIngredient = async (id: string) => {
  await $fetch(`/api/admin/ingredients/${id}/merge`, {
    method: 'POST',
    body: {
      targetId: mergeTargetId.value,
      reason: 'Fusion depuis l’administration',
    },
  })
  feedback.value = 'Fusion auditée et impact affiché.'
  await loadIngredients()
}
</script>

<template>
  <section>
    <div class="flex flex-wrap items-center justify-between gap-4">
      <div>
        <h1 class="text-3xl font-black">Référentiel ingrédients</h1>
        <p class="mt-3 text-coursia-muted">
          CRUD des ingrédients canoniques, synonymes, unités, catégories, allergènes et régimes.
        </p>
      </div>
      <BaseButton type="button" @click="loadIngredients">Rafraîchir</BaseButton>
    </div>

    <div class="mt-8 grid gap-4 rounded-[1.4rem] bg-coursia-surface p-5 md:grid-cols-4">
      <input v-model="filters.search" type="search" placeholder="Recherche" class="rounded-coursia-md border border-coursia-border bg-coursia-background px-4 py-3" />
      <select v-model="filters.allergen" class="rounded-coursia-md border border-coursia-border bg-coursia-background px-4 py-3">
        <option value="">Tous allergènes</option>
        <option v-for="allergen in allergenOptions" :key="allergen">{{ allergen }}</option>
      </select>
      <select v-model="filters.diet" class="rounded-coursia-md border border-coursia-border bg-coursia-background px-4 py-3">
        <option value="">Tous régimes</option>
        <option v-for="diet in dietOptions" :key="diet">{{ diet }}</option>
      </select>
      <select v-model="filters.status" class="rounded-coursia-md border border-coursia-border bg-coursia-background px-4 py-3">
        <option value="">Tous statuts</option>
        <option value="active">Actif</option>
        <option value="archived">Archivé</option>
      </select>
    </div>

    <p v-if="feedback" class="mt-5 rounded-2xl bg-coursia-surface-muted p-4 text-sm">{{ feedback }}</p>

    <div class="mt-8 grid gap-5 lg:grid-cols-[1fr_1fr]">
      <section class="grid gap-4">
        <article
          v-for="ingredient in ingredients"
          :key="String(ingredient.id)"
          class="rounded-[1.4rem] border border-coursia-border bg-coursia-surface p-5"
        >
          <h2 class="text-xl font-black">{{ ingredient.name }}</h2>
          <p class="mt-2 text-sm text-coursia-muted">
            {{ ingredient.slug }} · unités {{ ingredient.units }} · allergènes {{ ingredient.allergens }}
          </p>
          <div class="mt-4 flex flex-wrap gap-2">
            <BaseButton size="sm" variant="secondary" type="button" @click="archiveIngredient(String(ingredient.id))">
              Archiver avec impact
            </BaseButton>
            <BaseButton size="sm" variant="ghost" type="button" @click="mergeIngredient(String(ingredient.id))">
              Fusionner
            </BaseButton>
          </div>
        </article>
      </section>

      <form class="rounded-[1.4rem] border border-coursia-border bg-coursia-surface p-5" @submit.prevent="saveIngredient">
        <h2 class="text-2xl font-black">Créer ou modifier un ingrédient canonique</h2>
        <label class="mt-5 grid gap-2 text-sm font-bold">
          Nom
          <input v-model="form.name" required class="rounded-coursia-md border border-coursia-border bg-coursia-background px-4 py-3" />
        </label>
        <label class="mt-4 grid gap-2 text-sm font-bold">
          Slug
          <input v-model="form.slug" required class="rounded-coursia-md border border-coursia-border bg-coursia-background px-4 py-3" />
        </label>
        <fieldset class="mt-5">
          <legend class="text-sm font-bold">Unités compatibles</legend>
          <div class="mt-3 grid gap-2 md:grid-cols-3">
            <label v-for="unit in ['g', 'kg', 'ml', 'l', 'piece', 'tbsp', 'tsp']" :key="unit" class="flex gap-2 text-sm text-coursia-muted">
              <input v-model="form.units" type="checkbox" :value="unit" />
              {{ unit }}
            </label>
          </div>
        </fieldset>
        <div class="mt-5 grid gap-3 md:grid-cols-2">
          <div>
            <label class="grid gap-2 text-sm font-bold">
              Ajouter un synonyme
              <input v-model="synonymInput" class="rounded-coursia-md border border-coursia-border bg-coursia-background px-4 py-3" />
            </label>
            <BaseButton class="mt-2" type="button" size="sm" variant="secondary" @click="addSynonym">Ajouter</BaseButton>
            <p class="mt-2 text-sm text-coursia-muted">Synonymes : {{ form.synonyms.join(', ') }}</p>
          </div>
          <div>
            <label class="grid gap-2 text-sm font-bold">
              Ajouter une catégorie
              <input v-model="categoryInput" class="rounded-coursia-md border border-coursia-border bg-coursia-background px-4 py-3" />
            </label>
            <BaseButton class="mt-2" type="button" size="sm" variant="secondary" @click="addCategory">Ajouter</BaseButton>
            <p class="mt-2 text-sm text-coursia-muted">Catégories : {{ form.categories.join(', ') }}</p>
          </div>
        </div>
        <fieldset class="mt-5">
          <legend class="text-sm font-bold">Allergènes</legend>
          <div class="mt-3 grid gap-2 md:grid-cols-3">
            <label v-for="allergen in allergenOptions" :key="allergen" class="flex gap-2 text-sm text-coursia-muted">
              <input v-model="form.allergens" type="checkbox" :value="allergen" />
              {{ allergen }}
            </label>
          </div>
        </fieldset>
        <fieldset class="mt-5">
          <legend class="text-sm font-bold">Régimes compatibles</legend>
          <div class="mt-3 grid gap-2 md:grid-cols-3">
            <label v-for="diet in dietOptions" :key="diet" class="flex gap-2 text-sm text-coursia-muted">
              <input v-model="form.diets" type="checkbox" :value="diet" />
              {{ diet }}
            </label>
          </div>
        </fieldset>
        <label class="mt-5 flex gap-3 text-sm font-bold">
          <input v-model="form.sensitive" type="checkbox" />
          Donnée sensible sécurité alimentaire
        </label>
        <label class="mt-5 grid gap-2 text-sm font-bold">
          ID cible de fusion
          <input v-model="mergeTargetId" class="rounded-coursia-md border border-coursia-border bg-coursia-background px-4 py-3" />
        </label>
        <div class="mt-5 rounded-2xl bg-coursia-background p-4 text-sm text-coursia-muted">
          Impact avant fusion ou archivage : {{ impactPreview.affectedRecipes }} recettes,
          {{ impactPreview.affectedSynonyms }} synonymes, revue requise :
          {{ impactPreview.requiresReview ? 'oui' : 'non' }}.
        </div>
        <div v-if="conflictPreview.length > 0" class="mt-4 rounded-2xl bg-coursia-danger/10 p-4 text-sm text-coursia-danger">
          Conflits et doublons signalés avant enregistrement.
        </div>
        <BaseButton class="mt-6" type="submit">Enregistrer l’ingrédient</BaseButton>
      </form>
    </div>
  </section>
</template>

