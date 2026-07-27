<script setup lang="ts">
import { sanitizeAdminRedirect } from '#shared/auth/redirect'
import { adminLoginSchema } from '#shared/validation/auth'

definePageMeta({
  layout: 'public',
})

useSeoMeta({
  title: 'Connexion admin — Coursia',
  description: 'Accès sécurisé à l’administration Coursia.',
  robots: 'noindex, nofollow',
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

  try {
    await $fetch('/api/auth/login', {
      method: 'POST',
      credentials: 'include',
      body: {
        email: parsed.data.email,
        password: parsed.data.password,
        redirect: parsed.data.redirect,
      },
    })

    await navigateTo(parsed.data.redirect)
  } catch (error) {
    if (import.meta.dev) {
      console.error('Admin login failed', error)
    }

    errorMessage.value = 'Connexion impossible pour le moment. Réessaie dans quelques secondes.'
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <div class="-mx-6 min-h-screen overflow-hidden bg-coursia-background px-6 py-5 text-coursia-foreground">
    <section class="relative mx-auto flex min-h-[calc(100vh-2.5rem)] max-w-7xl flex-col">
      <span class="coursia-leaf leaf-a" aria-hidden="true" />
      <span class="coursia-leaf leaf-b" aria-hidden="true" />
      <span class="coursia-leaf leaf-c" aria-hidden="true" />

      <header
        class="relative z-10 flex items-center justify-between gap-6 rounded-[1.35rem] border border-coursia-border/60 bg-coursia-background/75 px-5 py-3.5 shadow-coursia-sm backdrop-blur-xl"
      >
        <NuxtLink to="/" class="flex items-center gap-3 text-coursia-primary" aria-label="Retour à l’accueil Coursia">
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
            to="/"
            class="hidden rounded-full border border-coursia-border bg-coursia-surface px-5 py-2.5 text-sm font-black text-coursia-muted shadow-coursia-sm transition hover:-translate-y-0.5 hover:text-coursia-foreground sm:inline-flex"
          >
            Site public
          </NuxtLink>
        </div>
      </header>

      <div class="relative z-10 grid flex-1 items-center gap-10 py-12 lg:grid-cols-[0.95fr_0.8fr] lg:py-16">
        <div class="relative hidden min-h-[560px] lg:block">
          <div class="absolute left-10 top-12 h-72 w-72 rounded-full bg-coursia-secondary/25 blur-3xl" />
          <div class="absolute bottom-12 right-12 h-72 w-72 rounded-full bg-coursia-accent/15 blur-3xl" />

          <div class="phone-shell phone-left absolute left-10 top-8">
            <div class="phone-screen">
              <div class="phone-status">
                <span>9:41</span>
                <span class="phone-notch" />
                <span>5G</span>
              </div>
              <p class="text-xs font-black uppercase tracking-[0.16em] text-coursia-success">
                Admin cockpit
              </p>
              <h2 class="mt-3 text-2xl font-black">Pilotage Coursia</h2>
              <div class="mt-5 grid gap-3">
                <div class="rounded-3xl bg-coursia-surface-muted p-4">
                  <div class="flex items-center justify-between">
                    <span class="text-sm font-bold">Recettes à valider</span>
                    <strong class="text-2xl">7</strong>
                  </div>
                </div>
                <div class="rounded-3xl border border-coursia-border bg-coursia-surface p-4">
                  <p class="text-xs text-coursia-muted">Prix périmés</p>
                  <div class="mt-2 flex items-end justify-between">
                    <strong class="text-2xl text-coursia-warning">23</strong>
                    <div class="mini-chart">
                      <span /><span /><span /><span />
                    </div>
                  </div>
                </div>
                <div class="rounded-3xl border border-coursia-border bg-coursia-surface p-4">
                  <p class="text-xs text-coursia-muted">Sécurité</p>
                  <p class="mt-2 font-black text-coursia-success">RLS active</p>
                </div>
              </div>
              <div class="phone-tabbar">
                <span class="active" /><span /><span /><span />
              </div>
            </div>
          </div>

          <div
            class="absolute bottom-12 right-6 max-w-sm rounded-[2rem] border border-coursia-border bg-coursia-surface/85 p-6 shadow-coursia-glass backdrop-blur-xl"
          >
            <BaseBadge tone="success">Accès protégé</BaseBadge>
            <h2 class="mt-4 text-3xl font-black leading-tight">
              Back-office sérieux, même identité Coursia.
            </h2>
            <p class="mt-4 leading-7 text-coursia-muted">
              Connexion par Supabase Auth, vérification serveur du rôle admin et redirection propre
              vers la zone demandée.
            </p>
          </div>
        </div>

        <div class="mx-auto w-full max-w-md">
          <div class="rounded-[2rem] border border-coursia-border bg-coursia-surface/90 p-6 shadow-coursia-glass backdrop-blur-xl md:p-8">
            <div class="flex items-start justify-between gap-4">
              <div>
                <BaseBadge tone="primary">Administration</BaseBadge>
                <h1 class="mt-4 text-4xl font-black tracking-tight">Connexion</h1>
                <p class="mt-3 leading-7 text-coursia-muted">
                  Accède au tableau de bord, aux recettes, contenus, prix et outils internes.
                </p>
              </div>
              <span
                class="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-coursia-primary text-white shadow-coursia-sm"
                aria-hidden="true"
              >
                <svg viewBox="0 0 24 24" class="h-6 w-6" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M7 11V8a5 5 0 0 1 10 0v3" />
                  <rect x="5" y="11" width="14" height="10" rx="2" />
                </svg>
              </span>
            </div>

            <form class="mt-8 grid gap-5" @submit.prevent="submitLogin">
              <label class="grid gap-2 text-sm font-black">
                Email
                <input
                  v-model="email"
                  class="rounded-coursia-lg border border-coursia-border bg-coursia-background px-4 py-3 text-coursia-foreground placeholder:text-coursia-muted/70"
                  type="email"
                  autocomplete="email"
                  placeholder="admin@coursia.ch"
                  required
                />
              </label>

              <label class="grid gap-2 text-sm font-black">
                Mot de passe
                <input
                  v-model="password"
                  class="rounded-coursia-lg border border-coursia-border bg-coursia-background px-4 py-3 text-coursia-foreground placeholder:text-coursia-muted/70"
                  type="password"
                  autocomplete="current-password"
                  placeholder="••••••••••••"
                  required
                />
              </label>

              <p
                v-if="errorMessage"
                role="alert"
                class="rounded-coursia-lg border border-coursia-danger/30 bg-coursia-danger/10 p-4 text-sm font-bold text-coursia-danger"
              >
                {{ errorMessage }}
              </p>

              <BaseButton type="submit" :disabled="isSubmitting">
                {{ isSubmitting ? 'Connexion…' : 'Se connecter à l’admin' }}
              </BaseButton>

              <div class="rounded-coursia-lg bg-coursia-surface-muted p-4 text-sm text-coursia-muted">
                <p class="font-black text-coursia-foreground">Session sécurisée</p>
                <p class="mt-1">
                  Après connexion, le serveur vérifie ton rôle dans Supabase avant d’ouvrir
                  <code>{{ redirect }}</code>.
                </p>
              </div>
            </form>
          </div>

          <p class="mt-5 text-center text-sm text-coursia-muted">
            Pas d’accès ? Crée d’abord l’utilisateur dans Supabase Auth puis ajoute son rôle admin.
          </p>
        </div>
      </div>
    </section>
  </div>
</template>
