<script setup lang="ts">
import { createSupabaseBrowserClient } from '#app-root/utils/supabase/browser'
import { adminLoginSchema } from '#shared/validation/auth'
import { sanitizeAdminRedirect } from '#shared/auth/redirect'

definePageMeta({
  layout: 'public',
})

const route = useRoute()
const redirect = computed(() => sanitizeAdminRedirect(route.query.redirect))
const email = ref('')
const password = ref('')
const isSubmitting = ref(false)
const errorMessage = ref('')

const submitLogin = async () => {
  errorMessage.value = ''
  isSubmitting.value = true

  const parsed = adminLoginSchema.safeParse({
    email: email.value,
    password: password.value,
    redirect: redirect.value,
  })

  if (!parsed.success) {
    errorMessage.value = 'Identifiants invalides.'
    isSubmitting.value = false
    return
  }

  const supabase = createSupabaseBrowserClient()
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  })

  if (error) {
    errorMessage.value = 'Connexion impossible avec ces identifiants.'
    isSubmitting.value = false
    return
  }

  await navigateTo(parsed.data.redirect)
}
</script>

<template>
  <section class="mx-auto max-w-md">
    <BaseCard>
      <BaseBadge tone="primary">Administration</BaseBadge>
      <h1 class="mt-4 text-3xl font-semibold tracking-tight">Connexion</h1>
      <p class="mt-2 text-coursia-muted">Connecte-toi pour accéder à l’administration Coursia.</p>

      <form class="mt-6 grid gap-4" @submit.prevent="submitLogin">
        <label class="grid gap-2 text-sm font-medium">
          Email
          <input
            v-model="email"
            class="ds-focus-ring rounded-coursia-md border border-coursia-border bg-coursia-surface px-3 py-2 text-coursia-foreground"
            type="email"
            autocomplete="email"
            required
          />
        </label>

        <label class="grid gap-2 text-sm font-medium">
          Mot de passe
          <input
            v-model="password"
            class="ds-focus-ring rounded-coursia-md border border-coursia-border bg-coursia-surface px-3 py-2 text-coursia-foreground"
            type="password"
            autocomplete="current-password"
            required
          />
        </label>

        <p
          v-if="errorMessage"
          class="rounded-coursia-md bg-coursia-danger/10 p-3 text-sm text-coursia-danger"
        >
          {{ errorMessage }}
        </p>

        <BaseButton type="submit" :disabled="isSubmitting">
          {{ isSubmitting ? 'Connexion…' : 'Se connecter' }}
        </BaseButton>
      </form>
    </BaseCard>
  </section>
</template>
