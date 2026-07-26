<script setup lang="ts">
import type { OfficialRecipeMutation } from '#shared/validation/course'
import {
  canonicalIngredients,
  findDuplicateRecipeIngredients,
  findIncompatibleIngredientUnits,
  scaleRecipeQuantity,
} from '#shared/validation/course'

definePageMeta({
  layout: 'admin',
})

const filters = reactive({
  search: '',
  status: '',
  difficulty: '',
  category: '',
})

const form = reactive<OfficialRecipeMutation>({
  title: '',
  slug: '',
  status: 'draft',
  portions: undefined,
  durationMinutes: undefined,
  difficulty: undefined,
  categories: [],
  source: '',
  ingredients: [],
  steps: [],
  nutrition: {},
})

const selectedRecipeId = ref<string | null>(null)
const feedback = ref('')
const loading = ref(false)
const recipes = ref<Array<Record<string, unknown>>>([])
const targetPortions = ref(4)
const formErrors = computed(() => {
  const duplicateIds = findDuplicateRecipeIngredients(form.ingredients)
  const incompatible = findIncompatibleIngredientUnits(form.ingredients)

  return {
    duplicateIds,
    incompatible,
    hasErrors: duplicateIds.length > 0 || incompatible.length > 0,
  }
})

const portionPreview = computed(() => {
  const fromPortions = form.portions ?? targetPortions.value

  return form.ingredients.map((ingredient) => ({
    ...ingredient,
    scaledQuantity: scaleRecipeQuantity(ingredient.quantity, fromPortions, targetPortions.value),
  }))
})

const loadRecipes = async () => {
  loading.value = true
  feedback.value = ''

  try {
    const response = await $fetch<{ data: Array<Record<string, unknown>> }>('/api/admin/recipes', {
      query: filters,
    })
    recipes.value = response.data
  } catch {
    feedback.value = 'Erreur de chargement des recettes officielles.'
  } finally {
    loading.value = false
  }
}

const saveRecipe = async () => {
  if (formErrors.value.hasErrors) {
    feedback.value = 'Corrigez les doublons ou unités incompatibles avant d’enregistrer.'
    return
  }

  const endpoint = selectedRecipeId.value
    ? `/api/admin/recipes/${selectedRecipeId.value}`
    : '/api/admin/recipes'
  const method = selectedRecipeId.value ? 'PUT' : 'POST'

  await $fetch(endpoint, {
    method,
    body: form,
  })
  feedback.value = selectedRecipeId.value ? 'Recette modifiée.' : 'Recette créée.'
  await loadRecipes()
}

const addIngredient = () => {
  const ingredient = canonicalIngredients[0]

  form.ingredients.push({
    ingredientId: ingredient.id,
    name: ingredient.name,
    quantity: 1,
    unit: ingredient.compatibleUnits[0],
    group: 'Principal',
    optional: false,
  })
}

const removeIngredient = (index: number) => {
  form.ingredients.splice(index, 1)
}

const addStep = () => {
  form.steps.push({
    order: form.steps.length + 1,
    instruction: '',
  })
}

const moveStep = (index: number, direction: -1 | 1) => {
  const targetIndex = index + direction

  if (targetIndex < 0 || targetIndex >= form.steps.length) {
    return
  }

  const [step] = form.steps.splice(index, 1)
  if (step) {
    form.steps.splice(targetIndex, 0, step)
  }

  form.steps.forEach((item, itemIndex) => {
    item.order = itemIndex + 1
  })
}

const removeStep = (index: number) => {
  form.steps.splice(index, 1)
  form.steps.forEach((item, itemIndex) => {
    item.order = itemIndex + 1
  })
}

const saveDraft = async () => {
  form.status = 'draft'
  await saveRecipe()
}

const duplicateRecipe = async (id: string) => {
  await $fetch(`/api/admin/recipes/${id}/duplicate`, { method: 'POST' })
  feedback.value = 'Recette dupliquée en brouillon.'
  await loadRecipes()
}

const archiveRecipe = async (id: string) => {
  await $fetch(`/api/admin/recipes/${id}/archive`, { method: 'POST' })
  feedback.value = 'Recette archivée.'
  await loadRecipes()
}

const deleteRecipe = async (id: string) => {
  await $fetch(`/api/admin/recipes/${id}`, { method: 'DELETE' })
  feedback.value = 'Suppression définitive effectuée.'
  await loadRecipes()
}
</script>

<template>
  <section>
    <div class="flex flex-wrap items-center justify-between gap-4">
      <div>
        <h1 class="text-3xl font-black">Recettes officielles</h1>
        <p class="mt-3 text-coursia-muted">
          Liste, recherche, filtres, création, duplication, modification et archivage du catalogue officiel.
        </p>
      </div>
      <BaseButton type="button" @click="loadRecipes">Rafraîchir</BaseButton>
    </div>

    <div class="mt-8 grid gap-4 rounded-[1.4rem] bg-coursia-surface p-5 md:grid-cols-4">
      <input v-model="filters.search" type="search" placeholder="Recherche" class="rounded-coursia-md border border-coursia-border bg-coursia-background px-4 py-3" />
      <select v-model="filters.status" class="rounded-coursia-md border border-coursia-border bg-coursia-background px-4 py-3">
        <option value="">Tous statuts</option>
        <option value="draft">Brouillon</option>
        <option value="published">Publié</option>
        <option value="archived">Archivé</option>
      </select>
      <select v-model="filters.difficulty" class="rounded-coursia-md border border-coursia-border bg-coursia-background px-4 py-3">
        <option value="">Toutes difficultés</option>
        <option value="easy">Facile</option>
        <option value="medium">Moyen</option>
        <option value="hard">Difficile</option>
      </select>
      <input v-model="filters.category" placeholder="Catégorie" class="rounded-coursia-md border border-coursia-border bg-coursia-background px-4 py-3" />
    </div>

    <p v-if="feedback" class="mt-5 rounded-2xl bg-coursia-surface-muted p-4 text-sm">{{ feedback }}</p>
    <p v-if="loading" class="mt-5 text-coursia-muted">Chargement des recettes...</p>
    <p v-else-if="recipes.length === 0" class="mt-5 text-coursia-muted">Aucune recette ne correspond aux filtres.</p>

    <div class="mt-8 grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
      <div class="grid gap-4">
        <article
          v-for="recipe in recipes"
          :key="String(recipe.id)"
          class="rounded-[1.4rem] border border-coursia-border bg-coursia-surface p-5"
        >
          <div class="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 class="text-xl font-black">{{ recipe.title }}</h2>
              <p class="mt-2 text-sm text-coursia-muted">
                {{ recipe.status }} · {{ recipe.portions ?? 'portions à compléter' }} portions ·
                {{ recipe.duration_minutes ?? 'durée à compléter' }} min
              </p>
            </div>
            <div class="flex flex-wrap gap-2">
              <BaseButton size="sm" variant="secondary" type="button" @click="duplicateRecipe(String(recipe.id))">Dupliquer</BaseButton>
              <BaseButton size="sm" variant="secondary" type="button" @click="archiveRecipe(String(recipe.id))">Archiver</BaseButton>
              <BaseButton size="sm" variant="ghost" type="button" @click="deleteRecipe(String(recipe.id))">Supprimer définitivement</BaseButton>
            </div>
          </div>
        </article>
      </div>

      <form class="rounded-[1.4rem] border border-coursia-border bg-coursia-surface p-5" @submit.prevent="saveRecipe">
        <h2 class="text-2xl font-black">Créer ou modifier</h2>
        <p class="mt-2 text-sm text-coursia-muted">
          Les brouillons incomplets sont enregistrables. La publication exige les champs complets.
        </p>

        <label class="mt-5 grid gap-2 text-sm font-bold">
          Titre
          <input v-model="form.title" required class="rounded-coursia-md border border-coursia-border bg-coursia-background px-4 py-3" />
        </label>
        <label class="mt-4 grid gap-2 text-sm font-bold">
          Slug
          <input v-model="form.slug" required class="rounded-coursia-md border border-coursia-border bg-coursia-background px-4 py-3" />
        </label>
        <div class="mt-4 grid gap-4 md:grid-cols-3">
          <label class="grid gap-2 text-sm font-bold">
            Portions
            <input v-model.number="form.portions" type="number" min="1" max="24" class="rounded-coursia-md border border-coursia-border bg-coursia-background px-4 py-3" />
          </label>
          <label class="grid gap-2 text-sm font-bold">
            Durée
            <input v-model.number="form.durationMinutes" type="number" min="1" max="1440" class="rounded-coursia-md border border-coursia-border bg-coursia-background px-4 py-3" />
          </label>
          <label class="grid gap-2 text-sm font-bold">
            Difficulté
            <select v-model="form.difficulty" class="rounded-coursia-md border border-coursia-border bg-coursia-background px-4 py-3">
              <option :value="undefined">À compléter</option>
              <option value="easy">Facile</option>
              <option value="medium">Moyen</option>
              <option value="hard">Difficile</option>
            </select>
          </label>
        </div>
        <label class="mt-4 grid gap-2 text-sm font-bold">
          Source
          <input v-model="form.source" class="rounded-coursia-md border border-coursia-border bg-coursia-background px-4 py-3" />
        </label>

        <section class="mt-6 rounded-[1.2rem] bg-coursia-background p-4">
          <div class="flex items-center justify-between gap-3">
            <h3 class="text-lg font-black">Ingrédients structurés</h3>
            <BaseButton type="button" size="sm" variant="secondary" @click="addIngredient">
              Ajouter un ingrédient
            </BaseButton>
          </div>
          <p class="mt-2 text-sm text-coursia-muted">
            Recherche et sélection d’ingrédients canoniques avec quantité, unité, groupe et optionnel.
          </p>

          <div class="mt-4 grid gap-4">
            <div
              v-for="(ingredient, index) in form.ingredients"
              :key="`${ingredient.ingredientId}-${index}`"
              class="grid gap-3 rounded-coursia-md border border-coursia-border p-3"
            >
              <label class="grid gap-2 text-sm font-bold">
                Ingrédient canonique
                <select
                  v-model="ingredient.ingredientId"
                  class="rounded-coursia-md border border-coursia-border bg-coursia-background px-4 py-3"
                >
                  <option v-for="item in canonicalIngredients" :key="item.id" :value="item.id">
                    {{ item.name }}
                  </option>
                </select>
              </label>
              <div class="grid gap-3 md:grid-cols-4">
                <label class="grid gap-2 text-sm font-bold">
                  Quantité
                  <input v-model.number="ingredient.quantity" type="number" min="0.01" step="0.01" class="rounded-coursia-md border border-coursia-border bg-coursia-background px-4 py-3" />
                </label>
                <label class="grid gap-2 text-sm font-bold">
                  Unité
                  <select v-model="ingredient.unit" class="rounded-coursia-md border border-coursia-border bg-coursia-background px-4 py-3">
                    <option value="g">g</option>
                    <option value="kg">kg</option>
                    <option value="ml">ml</option>
                    <option value="l">l</option>
                    <option value="piece">pièce</option>
                    <option value="tbsp">c. soupe</option>
                    <option value="tsp">c. café</option>
                  </select>
                </label>
                <label class="grid gap-2 text-sm font-bold">
                  Groupe
                  <input v-model="ingredient.group" class="rounded-coursia-md border border-coursia-border bg-coursia-background px-4 py-3" />
                </label>
                <label class="flex items-center gap-2 text-sm font-bold">
                  <input v-model="ingredient.optional" type="checkbox" />
                  Optionnel
                </label>
              </div>
              <BaseButton type="button" size="sm" variant="ghost" @click="removeIngredient(index)">
                Supprimer l’ingrédient
              </BaseButton>
            </div>
          </div>

          <div v-if="formErrors.hasErrors" class="mt-4 rounded-2xl bg-coursia-danger/10 p-4 text-sm text-coursia-danger">
            Doublons ou unités incompatibles détectés.
          </div>
        </section>

        <section class="mt-6 rounded-[1.2rem] bg-coursia-background p-4">
          <div class="flex items-center justify-between gap-3">
            <h3 class="text-lg font-black">Étapes triables</h3>
            <BaseButton type="button" size="sm" variant="secondary" @click="addStep">
              Ajouter une étape
            </BaseButton>
          </div>
          <div class="mt-4 grid gap-3">
            <div v-for="(step, index) in form.steps" :key="index" class="grid gap-2 rounded-coursia-md border border-coursia-border p-3">
              <label class="grid gap-2 text-sm font-bold">
                Étape {{ index + 1 }}
                <textarea v-model="step.instruction" rows="3" class="rounded-coursia-md border border-coursia-border bg-coursia-background px-4 py-3" />
              </label>
              <div class="flex flex-wrap gap-2">
                <BaseButton type="button" size="sm" variant="secondary" @click="moveStep(index, -1)">Monter</BaseButton>
                <BaseButton type="button" size="sm" variant="secondary" @click="moveStep(index, 1)">Descendre</BaseButton>
                <BaseButton type="button" size="sm" variant="ghost" @click="removeStep(index)">Supprimer l’étape</BaseButton>
              </div>
            </div>
          </div>
        </section>

        <section class="mt-6 rounded-[1.2rem] bg-coursia-background p-4">
          <h3 class="text-lg font-black">Aperçu portions</h3>
          <label class="mt-3 grid gap-2 text-sm font-bold">
            Portions cible
            <input v-model.number="targetPortions" type="number" min="1" max="24" class="rounded-coursia-md border border-coursia-border bg-coursia-background px-4 py-3" />
          </label>
          <ul class="mt-4 space-y-2 text-sm text-coursia-muted">
            <li v-for="ingredient in portionPreview" :key="`${ingredient.ingredientId}-preview`">
              {{ ingredient.name }} : {{ ingredient.scaledQuantity }} {{ ingredient.unit }}
            </li>
          </ul>
        </section>

        <div class="mt-5 flex flex-wrap gap-3">
          <BaseButton type="button" variant="secondary" @click="saveDraft">Enregistrer le brouillon incomplet</BaseButton>
          <BaseButton type="submit">Publier ou mettre à jour</BaseButton>
        </div>
      </form>
    </div>
  </section>
</template>
