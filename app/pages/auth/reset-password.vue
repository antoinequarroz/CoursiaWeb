<script setup lang="ts">
import { createSupabaseBrowserClient } from '#app-root/utils/supabase/browser'
import { passwordRecoverySchema, passwordResetSchema } from '#shared/validation/auth'

definePageMeta({
  layout: 'public',
})

useSeoMeta({
  title: 'Nouveau mot de passe admin — Coursia',
  description: 'Réinitialisation sécurisée du mot de passe administrateur Coursia.',
  robots: 'noindex, nofollow',
})

const route = useRoute()
const email = ref('info@antoinequarroz.ch')
const password = ref('')
const confirmPassword = ref('')
const hasRecoverySession = ref(false)
const isCheckingSession = ref(true)
const isSubmitting = ref(false)
const isSendingEmail = ref(false)
const errorMessage = ref('')
const successMessage = ref('')

const setRecoverySessionFromUrl = async () => {
  if (import.meta.server) return

  const supabase = createSupabaseBrowserClient()
  const code = typeof route.query.code === 'string' ? route.query.code : null

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (error) {
      throw error
    }

    hasRecoverySession.value = true
    return
  }

  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''))
  const accessToken = hash.get('access_token')
  const refreshToken = hash.get('refresh_token')
  const type = hash.get('type')

  if (type === 'recovery' && accessToken && refreshToken) {
    const { error } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    })

    if (error) {
      throw error
    }

    hasRecoverySession.value = true
    window.history.replaceState({}, document.title, window.location.pathname)
    return
  }

  const { data } = await supabase.auth.getSession()
  hasRecoverySession.value = Boolean(data.session)
}

const sendRecoveryEmail = async () => {
  errorMessage.value = ''
  successMessage.value = ''
  isSendingEmail.value = true

  const parsed = passwordRecoverySchema.safeParse({ email: email.value })

  if (!parsed.success) {
    errorMessage.value = 'Email invalide.'
    isSendingEmail.value = false
    return
  }

  try {
    await $fetch('/api/auth/recover', {
      method: 'POST',
      body: parsed.data,
    })

    successMessage.value = 'Email envoyé. Ouvre le lien reçu pour définir ton nouveau mot de passe.'
  } catch (error) {
    if (import.meta.dev) {
      console.error('Password recovery failed', error)
    }

    errorMessage.value = 'Impossible d envoyer le lien pour le moment.'
  } finally {
    isSendingEmail.value = false
  }
}

const updatePassword = async () => {
  errorMessage.value = ''
  successMessage.value = ''
  isSubmitting.value = true

  const parsed = passwordResetSchema.safeParse({
    password: password.value,
    confirmPassword: confirmPassword.value,
  })

  if (!parsed.success) {
    errorMessage.value = parsed.error.issues[0]?.message ?? 'Mot de passe invalide.'
    isSubmitting.value = false
    return
  }

  try {
    const supabase = createSupabaseBrowserClient()
    const { error } = await supabase.auth.updateUser({
      password: parsed.data.password,
    })

    if (error) {
      throw error
    }

    await supabase.auth.signOut()
    successMessage.value = 'Mot de passe modifié. Tu peux maintenant te connecter à l admin.'
    password.value = ''
    confirmPassword.value = ''

    setTimeout(() => {
      void navigateTo('/auth/login?redirect=/admin&reset=done')
    }, 900)
  } catch (error) {
    if (import.meta.dev) {
      console.error('Password update failed', error)
    }

    errorMessage.value = 'Impossible de modifier le mot de passe. Le lien est peut-être expiré.'
  } finally {
    isSubmitting.value = false
  }
}

onMounted(async () => {
  try {
    await setRecoverySessionFromUrl()
  } catch (error) {
    if (import.meta.dev) {
      console.error('Recovery session setup failed', error)
    }

    errorMessage.value = 'Lien de réinitialisation invalide ou expiré. Demande un nouveau lien.'
    hasRecoverySession.value = false
  } finally {
    isCheckingSession.value = false
  }
})
</script>

<template>
  <div class="-mx-6 min-h-screen overflow-hidden bg-coursia-background px-6 py-5 text-coursia-foreground">
    <section class="relative mx-auto flex min-h-[calc(100vh-2.5rem)] max-w-6xl flex-col">
      <span class="coursia-leaf leaf-a" aria-hidden="true" />
      <span class="coursia-leaf leaf-b" aria-hidden="true" />

      <header
        class="relative z-10 flex items-center justify-between gap-6 rounded-[1.35rem] border border-coursia-border/60 bg-coursia-background/75 px-5 py-3.5 shadow-coursia-sm backdrop-blur-xl"
      >
        <NuxtLink to="/" class="flex items-center gap-3 text-coursia-primary" aria-label="Retour à l accueil Coursia">
          <span
            class="grid h-10 w-10 place-items-center rounded-2xl border border-coursia-border bg-coursia-surface text-coursia-primary shadow-coursia-sm"
            aria-hidden="true"
          >
            <svg viewBox="0 0 24 24" class="h-6 w-6" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M4 11.5 12 5l8 6.5" />
              <path d="M6.5 10.5V19h11v-8.5" />
              <path d="M9.5 19v-5h5v5" />
            </svg>
          </span>
          <span class="text-lg font-black tracking-[0.16em]">COURSIA</span>
        </NuxtLink>

        <div class="flex items-center gap-3">
          <BaseThemeToggle />
          <NuxtLink
            to="/auth/login?redirect=/admin"
            class="hidden rounded-full border border-coursia-border bg-coursia-surface px-5 py-2.5 text-sm font-black text-coursia-muted shadow-coursia-sm transition hover:-translate-y-0.5 hover:text-coursia-foreground sm:inline-flex"
          >
            Connexion
          </NuxtLink>
        </div>
      </header>

      <div class="relative z-10 grid flex-1 items-center gap-10 py-12 lg:grid-cols-[0.9fr_0.75fr] lg:py-16">
        <div class="hidden lg:block">
          <BaseBadge tone="success">Récupération sécurisée</BaseBadge>
          <h1 class="mt-5 max-w-2xl text-5xl font-black leading-[1.02] tracking-tight">
            Définis un nouveau mot de passe admin sans exposer de secret.
          </h1>
          <p class="mt-6 max-w-xl text-lg leading-8 text-coursia-muted">
            Le lien Supabase ouvre une session temporaire de récupération. Le mot de passe est modifié
            directement via Supabase Auth, puis la session est fermée.
          </p>
          <div class="mt-8 grid max-w-lg gap-3">
            <div class="rounded-3xl border border-coursia-border bg-coursia-surface/85 p-5 shadow-coursia-sm">
              <p class="font-black">1. Ouvre le lien reçu par email</p>
              <p class="mt-1 text-sm text-coursia-muted">Le lien doit pointer vers <code>/auth/reset-password</code>.</p>
            </div>
            <div class="rounded-3xl border border-coursia-border bg-coursia-surface/85 p-5 shadow-coursia-sm">
              <p class="font-black">2. Choisis un nouveau mot de passe</p>
              <p class="mt-1 text-sm text-coursia-muted">Minimum 8 caractères, non stocké dans le projet.</p>
            </div>
          </div>
        </div>

        <div class="mx-auto w-full max-w-md">
          <div class="rounded-[2rem] border border-coursia-border bg-coursia-surface/90 p-6 shadow-coursia-glass backdrop-blur-xl md:p-8">
            <BaseBadge tone="primary">Administration</BaseBadge>
            <h2 class="mt-4 text-4xl font-black tracking-tight">Nouveau mot de passe</h2>
            <p class="mt-3 leading-7 text-coursia-muted">
              Utilise le lien reçu par email ou demande un nouveau lien de récupération.
            </p>

            <p
              v-if="errorMessage"
              role="alert"
              class="mt-6 rounded-coursia-lg border border-coursia-danger/30 bg-coursia-danger/10 p-4 text-sm font-bold text-coursia-danger"
            >
              {{ errorMessage }}
            </p>
            <p
              v-if="successMessage"
              class="mt-6 rounded-coursia-lg border border-coursia-success/30 bg-coursia-success/10 p-4 text-sm font-bold text-coursia-success"
            >
              {{ successMessage }}
            </p>

            <div v-if="isCheckingSession" class="mt-8 rounded-coursia-lg bg-coursia-surface-muted p-4 text-sm text-coursia-muted">
              Vérification du lien de récupération...
            </div>

            <form v-else-if="hasRecoverySession" class="mt-8 grid gap-5" @submit.prevent="updatePassword">
              <label class="grid gap-2 text-sm font-black">
                Nouveau mot de passe
                <input
                  v-model="password"
                  class="rounded-coursia-lg border border-coursia-border bg-coursia-background px-4 py-3 text-coursia-foreground placeholder:text-coursia-muted/70"
                  type="password"
                  autocomplete="new-password"
                  placeholder="••••••••••••"
                  required
                />
              </label>

              <label class="grid gap-2 text-sm font-black">
                Confirmer le mot de passe
                <input
                  v-model="confirmPassword"
                  class="rounded-coursia-lg border border-coursia-border bg-coursia-background px-4 py-3 text-coursia-foreground placeholder:text-coursia-muted/70"
                  type="password"
                  autocomplete="new-password"
                  placeholder="••••••••••••"
                  required
                />
              </label>

              <BaseButton type="submit" :disabled="isSubmitting">
                {{ isSubmitting ? 'Modification...' : 'Modifier le mot de passe' }}
              </BaseButton>
            </form>

            <form v-else class="mt-8 grid gap-5" @submit.prevent="sendRecoveryEmail">
              <label class="grid gap-2 text-sm font-black">
                Email admin
                <input
                  v-model="email"
                  class="rounded-coursia-lg border border-coursia-border bg-coursia-background px-4 py-3 text-coursia-foreground placeholder:text-coursia-muted/70"
                  type="email"
                  autocomplete="email"
                  required
                />
              </label>

              <BaseButton type="submit" :disabled="isSendingEmail">
                {{ isSendingEmail ? 'Envoi...' : 'Recevoir un lien de récupération' }}
              </BaseButton>
            </form>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>
