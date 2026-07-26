<script setup lang="ts">
definePageMeta({
  layout: 'public',
})

useSeoMeta({
  title: 'Coursia — Votre copilote du quotidien',
  description:
    'Coursia accompagne les foyers suisses pour planifier les repas, créer les courses et comparer plusieurs enseignes. Page de lancement avec visuels signalés comme maquettes.',
  ogTitle: 'Coursia — De la recette à la table',
  ogDescription:
    'Planifiez vos repas, créez vos courses et économisez du temps avec Coursia.',
  ogType: 'website',
  twitterCard: 'summary_large_image',
})

const features = [
  {
    mark: 'R',
    title: 'Recettes personnalisées',
    description: 'Des idées adaptées au foyer, au temps disponible et au budget de la semaine.',
  },
  {
    mark: 'P',
    title: 'Planning intelligent',
    description: 'Un calendrier repas lisible, conçu pour éviter les décisions de dernière minute.',
  },
  {
    mark: 'C',
    title: 'Courses optimisées',
    description: 'Une liste claire avec comparaison des prix entre enseignes suisses.',
  },
  {
    mark: 'CHF',
    title: 'Budget maîtrisé',
    description: 'Des repères simples pour suivre les dépenses et arbitrer sans friction.',
  },
  {
    mark: 'EQ',
    title: 'Équilibre familial',
    description: 'Des repas variés qui restent pratiques pour les enfants comme les parents.',
  },
  {
    mark: 'F',
    title: 'Foyer synchronisé',
    description: 'Un espace partagé pour organiser les repas, les envies et les courses.',
  },
]

const stats = [
  { value: '+10 000', label: 'Objectif utilisateurs', note: 'maquette' },
  { value: '+2h30', label: 'Gain visé par semaine', note: 'estimation' },
  { value: '+45 CHF', label: 'Économies estimées', note: 'simulation' },
  { value: '100%', label: 'Plaisir et sérénité', note: 'positionnement' },
]

const testimonials = [
  {
    quote:
      'Enfin une app qui me fait gagner du temps et de l’argent. Les recettes sont top !',
    name: 'Camille D.',
    role: 'Maman de 2 enfants',
  },
  {
    quote:
      'Le comparateur de prix est une pépite, je ne fais plus mes courses comme avant.',
    name: 'Thomas L.',
    role: 'Étudiant',
  },
  {
    quote:
      'Simple, intuitive et super jolie. Coursia est devenue indispensable à la maison.',
    name: 'Sophie M.',
    role: 'Diététicienne',
  },
]

const faq = [
  {
    question: 'Coursia est-il déjà disponible ?',
    answer:
      'Cette page prépare le lancement. Les boutons de téléchargement et chiffres affichés sont des éléments de maquette.',
  },
  {
    question: 'Les enseignes affichées sont-elles partenaires ?',
    answer:
      'Non. Elles illustrent la comparaison multi-enseignes en Suisse et ne sont pas présentées comme des partenaires confirmés.',
  },
  {
    question: 'Comment rejoindre la liste d’attente ?',
    answer:
      'Le CTA ouvre un contact email pour cette phase. Le formulaire final sera branché dans un ticket dédié.',
  },
]

const pressPlaceholders = ['RTS', '24 heures', 'LE TEMPS', 'Bilan', 'PME', 'Forbes']
const storeExamples = ['COOP', 'MIGROS', 'ALDI', 'LIDL']
</script>

<template>
  <div class="-mx-6 -mb-10 overflow-hidden bg-coursia-background px-6 pb-8 pt-4 text-coursia-foreground md:pt-5">
    <section class="relative mx-auto max-w-7xl">
      <span class="coursia-leaf leaf-a" aria-hidden="true" />
      <span class="coursia-leaf leaf-b" aria-hidden="true" />
      <span class="coursia-leaf leaf-c" aria-hidden="true" />

      <div
        class="relative z-10 flex items-center justify-between gap-6 rounded-[1.35rem] border border-coursia-border/60 bg-coursia-background/75 px-5 py-3.5 shadow-coursia-sm backdrop-blur-xl"
      >
        <NuxtLink to="/" class="flex items-center gap-3 text-coursia-primary">
          <span
            class="flex h-10 w-10 items-center justify-center rounded-2xl text-coursia-primary"
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

        <nav class="hidden items-center gap-9 text-sm font-bold text-coursia-foreground lg:flex">
          <NuxtLink to="/fonctionnalites">Fonctionnalités</NuxtLink>
          <a href="#app">L’app</a>
          <NuxtLink to="/comment-ca-marche">Comment ça marche</NuxtLink>
          <NuxtLink to="/tarifs">Tarifs</NuxtLink>
          <NuxtLink to="/faq">FAQ</NuxtLink>
          <a href="#about">À propos</a>
        </nav>

        <div class="flex items-center gap-3">
          <ThemeToggle />
          <a
            href="/liste-attente"
            class="rounded-full bg-coursia-primary px-6 py-3 text-sm font-black text-white shadow-coursia-sm transition hover:-translate-y-0.5 hover:bg-coursia-foreground"
          >
            Télécharger l’app
          </a>
        </div>
      </div>

      <div class="relative z-10 grid items-center gap-12 py-16 lg:grid-cols-[0.9fr_1.1fr] lg:py-24">
        <div>
          <div class="mb-8 flex items-center gap-3 text-sm">
            <span
              class="rounded-full bg-coursia-surface-muted px-3 py-1 text-xs font-black uppercase tracking-wide text-coursia-success"
            >
              Maquette produit
            </span>
            <span class="text-coursia-muted">L’app tout-en-un pour vos repas</span>
          </div>

          <h1 class="max-w-xl text-6xl font-black leading-[0.96] tracking-tight md:text-7xl">
            Votre copilote du quotidien,
            <span class="block text-coursia-accent">De la recette</span>
            à la table.
          </h1>

          <p class="mt-8 max-w-md text-lg leading-8 text-coursia-muted">
            Planifiez vos repas, créez vos courses et économisez du temps et de l’argent, sans
            compromis sur le plaisir.
          </p>

          <div class="mt-8 flex flex-wrap gap-4">
            <a
              href="/liste-attente"
              class="flex min-w-44 items-center gap-3 rounded-2xl bg-coursia-primary px-5 py-3 text-white shadow-coursia-sm transition hover:-translate-y-1"
            >
              <svg viewBox="0 0 24 24" class="h-7 w-7" fill="currentColor" aria-hidden="true">
                <path d="M17.2 13.1c0-2.3 1.9-3.4 2-3.5-1.1-1.6-2.7-1.8-3.3-1.8-1.4-.1-2.7.8-3.4.8s-1.8-.8-3-.8c-1.5 0-2.9.9-3.7 2.2-1.6 2.8-.4 7 1.2 9.3.8 1.1 1.7 2.4 2.9 2.3 1.2 0 1.6-.7 3-.7s1.8.7 3 .7 2.1-1.1 2.8-2.2c.9-1.3 1.2-2.5 1.2-2.6 0-.1-2.6-1-2.7-3.7ZM15 6.4c.6-.7 1-1.7.9-2.7-.9 0-1.9.6-2.5 1.3-.6.7-1.1 1.7-.9 2.6 1 .1 1.9-.5 2.5-1.2Z" />
              </svg>
              <span>
                <span class="block text-xs opacity-80">Télécharger sur</span>
                <span class="block text-sm font-black">App Store</span>
              </span>
            </a>
            <a
              href="/liste-attente"
              class="flex min-w-44 items-center gap-3 rounded-2xl border border-coursia-border bg-coursia-surface px-5 py-3 shadow-coursia-sm transition hover:-translate-y-1"
            >
              <svg viewBox="0 0 24 24" class="h-7 w-7 text-coursia-accent" fill="currentColor" aria-hidden="true">
                <path d="m5 3.9 9.8 7.8L5 19.5V3.9Z" />
                <path d="m16.1 12.8 2.3 1.8c.8.6.8 1.8 0 2.4L7.3 22l8.8-9.2Z" opacity=".55" />
                <path d="m16.1 10.6 2.3-1.8c.8-.6.8-1.8 0-2.4L7.3 1.3l8.8 9.3Z" opacity=".75" />
              </svg>
              <span>
                <span class="block text-xs text-coursia-muted">Disponible sur</span>
                <span class="block text-sm font-black">Google Play</span>
              </span>
            </a>
          </div>

          <div class="mt-8 flex items-center gap-4">
            <div class="flex -space-x-2">
              <span
                v-for="index in 5"
                :key="index"
                class="h-9 w-9 rounded-full border-2 border-coursia-background bg-gradient-to-br from-coursia-secondary to-coursia-surface-muted"
              />
            </div>
            <div>
              <p class="text-sm text-coursia-warning">★★★★★</p>
              <p class="text-sm font-bold text-coursia-foreground">
                Avis affichés en maquette — non confirmés
              </p>
            </div>
          </div>
        </div>

        <div id="app" class="relative min-h-[660px]">
          <div class="absolute right-3 top-0 h-80 w-80 rounded-full bg-coursia-secondary/20 blur-3xl" />
          <div class="absolute left-8 top-28 h-56 w-56 rounded-full bg-coursia-accent/15 blur-3xl" />
          <span class="coursia-leaf leaf-d" aria-hidden="true" />
          <span class="coursia-leaf leaf-e" aria-hidden="true" />

          <div class="phone-shell phone-left absolute left-2 top-14 md:left-20">
            <div class="phone-screen">
              <div class="phone-status">
                <span>9:41</span>
                <span class="phone-notch" />
                <span>5G</span>
              </div>
              <div class="flex items-center justify-between">
                <div>
                  <p class="text-xs font-bold text-coursia-muted">Bonjour Julie</p>
                  <h2 class="mt-1 text-xl font-black">Que cuisine-t-on ce soir ?</h2>
                </div>
                <div class="grid h-9 w-9 place-items-center rounded-full bg-coursia-surface-muted text-coursia-primary">
                  <svg viewBox="0 0 24 24" class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M4 11.5 12 5l8 6.5" />
                    <path d="M6.5 10.5V19h11v-8.5" />
                  </svg>
                </div>
              </div>
              <div class="mt-4 rounded-full bg-coursia-surface-muted px-4 py-3 text-xs text-coursia-muted">
                Rechercher une recette
              </div>
              <div class="mt-4 flex gap-2 text-xs font-bold">
                <span class="rounded-full bg-coursia-primary px-3 py-1 text-white">Tout</span>
                <span class="rounded-full bg-coursia-surface-muted px-3 py-1">Végétarien</span>
                <span class="rounded-full bg-coursia-surface-muted px-3 py-1">Rapide</span>
              </div>
              <div class="meal-photo mt-5">
                <div class="meal-photo-surface" />
              </div>
              <h3 class="mt-4 text-xl font-black">One pot pasta aux légumes</h3>
              <div class="mt-3 grid grid-cols-3 gap-2 text-xs text-coursia-muted">
                <span>25 min</span>
                <span>Facile</span>
                <span>Éco</span>
              </div>
              <div class="phone-tabbar">
                <span class="active" /><span /><span /><span />
              </div>
            </div>
          </div>

          <div class="phone-shell phone-right absolute right-0 top-6 md:right-16">
            <div class="phone-screen">
              <div class="phone-status">
                <span>9:42</span>
                <span class="phone-notch" />
                <span>100%</span>
              </div>
              <h2 class="text-xl font-black">Mon budget</h2>
              <div class="mt-4 rounded-3xl bg-coursia-surface-muted p-4">
                <div class="flex justify-between text-sm font-bold">
                  <span>Budget</span>
                  <span>120.00 CHF</span>
                </div>
                <div class="mt-3 h-3 rounded-full bg-white/70 dark:bg-white/10">
                  <div class="h-3 w-2/3 rounded-full bg-coursia-success" />
                </div>
                <div class="mt-4 space-y-3 text-sm">
                  <div class="flex justify-between">
                    <span class="text-coursia-muted">Dépensé</span><strong>78.40 CHF</strong>
                  </div>
                  <div class="flex justify-between">
                    <span class="text-coursia-muted">Restant</span><strong>41.60 CHF</strong>
                  </div>
                </div>
              </div>
              <div class="mt-4 rounded-3xl border border-coursia-border bg-coursia-surface p-4">
                <p class="text-xs text-coursia-muted">Économies ce mois</p>
                <div class="mt-2 flex items-end justify-between">
                  <p class="text-2xl font-black text-coursia-success">123.45 CHF</p>
                  <div class="mini-chart">
                    <span /><span /><span /><span />
                  </div>
                </div>
                <p class="mt-1 text-xs text-coursia-muted">valeur maquette</p>
              </div>
              <h3 class="mt-5 font-black">Comparateur de prix</h3>
              <div class="mt-3 grid grid-cols-4 gap-2">
                <span
                  v-for="store in storeExamples"
                  :key="store"
                  class="rounded-xl bg-coursia-peach/80 px-2 py-3 text-center text-xs font-black text-coursia-accent"
                >
                  {{ store }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div
        id="benefits"
        class="relative z-10 grid gap-4 rounded-[1.7rem] border border-coursia-border bg-coursia-surface/85 p-5 shadow-coursia-md backdrop-blur-xl md:grid-cols-4"
      >
        <div
          v-for="stat in stats"
          :key="stat.label"
          class="flex items-center gap-4 md:border-r md:border-coursia-border md:last:border-r-0"
        >
          <span class="grid h-14 w-14 place-items-center rounded-2xl bg-coursia-surface-muted">
            <svg viewBox="0 0 24 24" class="h-6 w-6 text-coursia-primary" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M4 17c4-8 8-10 16-10" />
              <path d="M6 17c3 2 8 2 12-2" />
            </svg>
          </span>
          <span>
            <span class="block text-xl font-black">{{ stat.value }}</span>
            <span class="block text-sm text-coursia-muted">{{ stat.label }}</span>
            <span class="text-xs uppercase tracking-wide text-coursia-muted/70">{{ stat.note }}</span>
          </span>
        </div>
      </div>
    </section>

    <section id="features" class="mx-auto mt-20 max-w-7xl">
      <p class="text-xs font-black uppercase tracking-[0.2em] text-coursia-success">
        Fonctionnalités
      </p>
      <h2 class="mt-4 max-w-xl text-4xl font-black leading-tight md:text-5xl">
        Tout ce qu’il vous faut, dans
        <span class="text-coursia-accent">une seule app.</span>
      </h2>
      <div class="mt-10 grid gap-5 md:grid-cols-3 lg:grid-cols-6">
        <article
          v-for="feature in features"
          :key="feature.title"
          class="group rounded-[1.5rem] border border-coursia-border bg-coursia-surface p-5 shadow-coursia-sm transition duration-300 hover:-translate-y-1 hover:shadow-coursia-md"
        >
          <div
            class="grid h-14 w-14 place-items-center rounded-2xl bg-coursia-surface-muted text-sm font-black text-coursia-primary ring-1 ring-coursia-border transition group-hover:bg-coursia-primary group-hover:text-white"
          >
            {{ feature.mark }}
          </div>
          <h3 class="mt-5 text-base font-black">{{ feature.title }}</h3>
          <p class="mt-4 text-sm leading-6 text-coursia-muted">{{ feature.description }}</p>
        </article>
      </div>
    </section>

    <section
      id="how-it-works"
      class="relative mx-auto mt-20 grid max-w-7xl items-center gap-12 lg:grid-cols-[0.95fr_1.05fr]"
    >
      <span class="coursia-leaf leaf-f" aria-hidden="true" />
      <div class="relative min-h-[430px]">
        <div class="recipe-stack stack-back" />
        <div class="recipe-stack stack-mid" />
        <div class="recipe-card-premium">
          <div class="meal-photo h-52">
            <div class="meal-photo-surface" />
          </div>
          <h3 class="mt-5 text-2xl font-black">Poulet teriyaki</h3>
          <p class="text-sm text-coursia-muted">riz, brocoli, sauce légère</p>
          <div class="mt-5 flex justify-between">
            <span
              class="grid h-14 w-14 place-items-center rounded-full bg-white text-2xl text-coursia-danger shadow-coursia-sm dark:bg-coursia-surface"
            >
              ×
            </span>
            <span
              class="grid h-14 w-14 place-items-center rounded-full bg-white text-2xl text-coursia-success shadow-coursia-sm dark:bg-coursia-surface"
            >
              ♥
            </span>
          </div>
        </div>
      </div>

      <div>
        <p class="text-xs font-black uppercase tracking-[0.2em] text-coursia-success">Découvrez</p>
        <h2 class="mt-4 max-w-lg text-4xl font-black leading-tight md:text-5xl">
          Le swipe qui change vos repas.
        </h2>
        <p class="mt-6 max-w-md text-lg leading-8 text-coursia-muted">
          Dites adieu à la routine : swipez, aimez, cuisinez. Coursia s’occupe du reste avec une
          expérience simple pour les familles et assez précise pour une app tech.
        </p>
        <a
          href="/comment-ca-marche"
          class="mt-8 inline-flex rounded-full bg-coursia-primary px-6 py-3 text-sm font-black text-white transition hover:-translate-y-0.5"
        >
          Voir comment ça marche →
        </a>
        <div class="mt-10 flex flex-wrap gap-4">
          <span
            v-for="store in storeExamples"
            :key="store"
            class="rounded-full bg-coursia-surface px-5 py-4 text-sm font-black text-coursia-accent shadow-coursia-sm"
          >
            {{ store }}
          </span>
        </div>
      </div>
    </section>

    <section id="problem" class="mx-auto mt-20 max-w-7xl">
      <div class="rounded-[1.7rem] bg-coursia-surface-muted p-8">
        <p class="text-xs font-black uppercase tracking-[0.2em] text-coursia-muted">
          Problème & solution
        </p>
        <div class="mt-6 grid gap-6 md:grid-cols-2">
          <div>
            <h2 class="text-3xl font-black">Planifier les repas reste trop fragmenté.</h2>
            <p class="mt-4 leading-7 text-coursia-muted">
              Recettes, planning, budget et comparaison multi-enseignes vivent souvent dans des
              outils séparés.
            </p>
          </div>
          <div id="solution">
            <h2 class="text-3xl font-black">Coursia relie tout le parcours.</h2>
            <p class="mt-4 leading-7 text-coursia-muted">
              La landing distingue les fonctionnalités disponibles, les maquettes et la roadmap pour
              éviter toute promesse non confirmée.
            </p>
          </div>
        </div>
        <p class="mt-6 text-sm text-coursia-muted">
          Aucun chiffre de traction ni partenariat n’est présenté comme confirmé. Les logos, avis et
          métriques visibles ici sont des placeholders de maquette.
        </p>
      </div>
    </section>

    <section class="mx-auto mt-20 max-w-7xl rounded-[1.7rem] bg-coursia-surface-muted p-8">
      <p class="text-xs font-black uppercase tracking-[0.2em] text-coursia-muted">
        Ils nous font confiance — maquette
      </p>
      <div class="mt-8 grid gap-8 md:grid-cols-3">
        <blockquote
          v-for="item in testimonials"
          :key="item.name"
          class="border-r border-coursia-border pr-6 last:border-r-0"
        >
          <p class="text-coursia-warning">★★★★★</p>
          <p class="mt-4 font-bold leading-7">“{{ item.quote }}”</p>
          <p class="mt-5 text-sm font-black">{{ item.name }}</p>
          <p class="text-sm text-coursia-muted">{{ item.role }}</p>
        </blockquote>
      </div>

      <p class="mt-12 text-xs font-black uppercase tracking-[0.2em] text-coursia-muted">
        Ils parlent de nous — placeholders
      </p>
      <div class="mt-6 flex flex-wrap items-center justify-between gap-6 text-2xl font-black text-coursia-muted/55">
        <span v-for="name in pressPlaceholders" :key="name">{{ name }}</span>
      </div>
    </section>

    <section
      id="pricing"
      class="mx-auto mt-20 max-w-7xl rounded-[1.7rem] border border-coursia-border bg-coursia-surface p-8"
    >
      <a href="#pricing" class="sr-only">Accéder à la section tarifs</a>
      <p class="text-xs font-black uppercase tracking-[0.2em] text-coursia-warning">Tarifs</p>
      <h2 class="mt-4 text-4xl font-black">Tarification en préparation.</h2>
      <p class="mt-4 max-w-3xl leading-7 text-coursia-muted">
        Les prix seront publiés uniquement après validation. Cette section sert d’emplacement prévu
        dans la navigation publique.
      </p>
      <NuxtLink
        to="/tarifs"
        class="mt-6 inline-flex rounded-full bg-coursia-primary px-6 py-3 text-sm font-black text-white"
      >
        Comparer les abonnements
      </NuxtLink>
    </section>

     <section id="faq" class="mx-auto mt-20 max-w-7xl">
      <a href="#faq" class="sr-only">Accéder à la FAQ</a>
      <p class="text-xs font-black uppercase tracking-[0.2em] text-coursia-success">FAQ</p>
      <h2 class="mt-4 text-4xl font-black">Questions fréquentes.</h2>
      <div class="mt-8 grid gap-5 md:grid-cols-3">
        <article
          v-for="item in faq"
          :key="item.question"
          class="rounded-[1.5rem] border border-coursia-border bg-coursia-surface p-6 shadow-coursia-sm"
        >
          <h3 class="font-black">{{ item.question }}</h3>
          <p class="mt-4 text-sm leading-6 text-coursia-muted">{{ item.answer }}</p>
        </article>
      </div>
      <NuxtLink to="/faq" class="mt-8 inline-flex rounded-full bg-coursia-primary px-6 py-3 text-sm font-black text-white">
        Voir toute la FAQ
      </NuxtLink>
    </section>

    <section
      id="contact"
      class="relative mx-auto mt-20 grid max-w-7xl items-center gap-8 overflow-hidden rounded-[1.7rem] bg-coursia-primary p-8 text-white md:grid-cols-[0.8fr_1.2fr]"
    >
      <a href="#contact" class="sr-only">Accéder au contact</a>
      <span class="coursia-leaf leaf-g" aria-hidden="true" />
      <div class="hidden justify-center md:flex">
        <div class="cta-device-card" aria-hidden="true">
          <div class="h-2 w-24 rounded-full bg-white/35" />
          <div class="mt-6 h-24 rounded-[1.4rem] bg-white/90" />
          <div class="mt-5 grid gap-2">
            <span class="h-3 rounded-full bg-white/50" />
            <span class="h-3 w-2/3 rounded-full bg-white/35" />
          </div>
        </div>
      </div>
      <div>
        <h2 class="text-4xl font-black">Prêt à transformer vos repas du quotidien ?</h2>
        <p class="mt-4 max-w-xl opacity-90">
          Rejoignez la liste d’attente pour suivre le lancement. Gratuit, sans engagement, et encore
          en phase de validation produit.
        </p>
        <div class="mt-6 flex flex-wrap gap-4">
          <a
            href="/liste-attente"
            class="rounded-2xl bg-white px-6 py-3 text-sm font-black text-coursia-primary"
          >
            Rejoindre la liste d’attente
          </a>
          <a
            href="/liste-attente"
            class="rounded-2xl bg-white/15 px-6 py-3 text-sm font-black text-white ring-1 ring-white/25"
          >
            Google Play — maquette
          </a>
        </div>
      </div>
    </section>

    <footer id="about" class="mx-auto mt-20 grid max-w-7xl gap-10 pb-12 md:grid-cols-[1.3fr_repeat(4,1fr)]">
      <div>
        <div class="flex items-center gap-3 text-coursia-primary">
          <span class="grid h-10 w-10 place-items-center rounded-2xl border-2">
            <svg viewBox="0 0 24 24" class="h-6 w-6" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M4 11.5 12 5l8 6.5" />
              <path d="M6.5 10.5V19h11v-8.5" />
            </svg>
          </span>
          <span class="text-xl font-black tracking-[0.16em]">COURSIA</span>
        </div>
        <p class="mt-5 max-w-xs text-sm leading-6 text-coursia-muted">
          Votre copilote du quotidien, de la recette à la table.
        </p>
      </div>
      <div>
        <h3 class="text-sm font-black uppercase">Produit</h3>
        <ul class="mt-4 space-y-3 text-sm text-coursia-muted">
          <li><NuxtLink to="/fonctionnalites">Fonctionnalités</NuxtLink></li>
          <li><NuxtLink to="/comment-ca-marche">Comment ça marche</NuxtLink></li>
          <li><NuxtLink to="/tarifs">Tarifs</NuxtLink></li>
          <li><NuxtLink to="/faq">FAQ</NuxtLink></li>
        </ul>
      </div>
      <div>
        <h3 class="text-sm font-black uppercase">À propos</h3>
        <ul class="mt-4 space-y-3 text-sm text-coursia-muted">
          <li><a href="#about">Qui sommes-nous ?</a></li>
          <li><NuxtLink to="/contact">Contact</NuxtLink></li>
          <li><NuxtLink to="/support">Support</NuxtLink></li>
        </ul>
      </div>
      <div>
        <h3 class="text-sm font-black uppercase">Ressources</h3>
        <ul class="mt-4 space-y-3 text-sm text-coursia-muted">
          <li><NuxtLink to="/comment-ca-marche">Parcours</NuxtLink></li>
          <li><NuxtLink to="/fonctionnalites">Recettes</NuxtLink></li>
        </ul>
      </div>
      <div>
        <h3 class="text-sm font-black uppercase">Légal</h3>
        <ul class="mt-4 space-y-3 text-sm text-coursia-muted">
          <li><NuxtLink to="/legal/cgu">CGU</NuxtLink></li>
          <li><NuxtLink to="/legal/confidentialite">Confidentialité</NuxtLink></li>
          <li><NuxtLink to="/legal/cookies">Cookies</NuxtLink></li>
        </ul>
      </div>
    </footer>
  </div>
</template>
