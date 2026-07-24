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
    icon: '🥘',
    title: 'Des recettes qui vous ressemblent',
    description: 'Trouvez l’inspiration selon vos goûts, votre temps et votre budget.',
  },
  {
    icon: '📅',
    title: 'Planning en un clin d’œil',
    description: 'Organisez vos repas de la semaine en quelques secondes.',
  },
  {
    icon: '🛒',
    title: 'Courses optimisées et économiques',
    description: 'Générez votre liste et comparez les prix des enseignes suisses.',
  },
  {
    icon: '🏷️',
    title: 'Économisez à chaque panier',
    description: 'Repérez les opportunités sans annoncer de partenaire confirmé.',
  },
  {
    icon: '🤍',
    title: 'Mangez mieux au quotidien',
    description: 'Des repas équilibrés, adaptés à toute la famille.',
  },
  {
    icon: '👥',
    title: 'Foyer & collaboration',
    description: 'Planifiez à plusieurs et partagez vos idées pour tout le foyer.',
  },
]

const stats = [
  { icon: '🌿', value: '+10 000', label: 'Objectif utilisateurs' },
  { icon: '🕒', value: '+2h30', label: 'Gain visé par semaine' },
  { icon: '🐷', value: '+45 CHF', label: 'Économies estimées' },
  { icon: '♡', value: '100%', label: 'Plaisir et sérénité' },
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
  <div class="-mx-6 -my-10 overflow-hidden bg-coursia-background px-6 py-8 text-coursia-foreground">
    <section class="mx-auto max-w-7xl">
      <div class="flex items-center justify-between gap-6">
        <NuxtLink to="/" class="flex items-center gap-3 text-coursia-primary">
          <span
            class="flex h-10 w-10 items-center justify-center rounded-2xl border-2 border-coursia-primary text-lg"
          >
            ⌂
          </span>
          <span class="text-xl font-black tracking-[0.16em]">COURSIA</span>
        </NuxtLink>

        <nav class="hidden items-center gap-10 text-sm font-bold text-coursia-foreground lg:flex">
          <a href="#features">Fonctionnalités</a>
          <a href="#app">L’app</a>
          <a href="#pricing">Tarifs</a>
          <a href="#about">À propos</a>
          <a href="#faq">Blog</a>
        </nav>

        <div class="flex items-center gap-3">
          <ThemeToggle />
          <a
            href="#contact"
            class="rounded-full bg-coursia-primary px-6 py-3 text-sm font-black text-white shadow-coursia-sm"
          >
            Télécharger l’app
          </a>
        </div>
      </div>

      <div class="grid items-center gap-12 py-16 lg:grid-cols-[0.9fr_1.1fr] lg:py-24">
        <div>
          <div class="mb-8 flex items-center gap-3 text-sm">
            <span
              class="rounded-full bg-coursia-surface-muted px-3 py-1 text-xs font-black uppercase text-coursia-success"
            >
              Maquette produit
            </span>
            <span class="text-coursia-muted">L’app tout-en-un pour vos repas</span>
          </div>

          <h1 class="max-w-xl text-6xl font-black leading-[0.98] tracking-tight md:text-7xl">
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
              href="#contact"
              class="flex min-w-40 items-center gap-3 rounded-2xl bg-coursia-primary px-5 py-3 text-white shadow-coursia-sm"
            >
              <span class="text-2xl"></span>
              <span>
                <span class="block text-xs opacity-80">Télécharger sur</span>
                <span class="block text-sm font-black">App Store</span>
              </span>
            </a>
            <a
              href="#contact"
              class="flex min-w-40 items-center gap-3 rounded-2xl border border-coursia-border bg-coursia-surface px-5 py-3 shadow-coursia-sm"
            >
              <span class="text-2xl">▶</span>
              <span>
                <span class="block text-xs text-coursia-muted">Disponible sur</span>
                <span class="block text-sm font-black">Google Play</span>
              </span>
            </a>
          </div>

          <div class="mt-7 flex items-center gap-4">
            <div class="flex -space-x-2">
              <span
                v-for="index in 5"
                :key="index"
                class="flex h-9 w-9 items-center justify-center rounded-full border-2 border-coursia-background bg-coursia-secondary text-xs font-black"
              >
                {{ index }}
              </span>
            </div>
            <div>
              <p class="text-sm text-coursia-warning">★★★★★</p>
              <p class="text-sm font-bold text-coursia-foreground">
                Avis affichés en maquette — non confirmés
              </p>
            </div>
          </div>
        </div>

        <div id="app" class="relative min-h-[620px]">
          <div
            class="absolute right-4 top-4 h-72 w-72 rounded-full bg-coursia-secondary/20 blur-3xl"
          />
          <div
            class="absolute left-20 top-28 h-20 w-20 rounded-full bg-coursia-accent/20 blur-xl"
          />

          <div
            class="absolute left-4 top-14 w-72 rotate-[-9deg] rounded-[2.3rem] border-[10px] border-coursia-foreground bg-coursia-surface p-5 shadow-coursia-glass md:left-20"
          >
            <div class="mb-5 flex items-center justify-between text-xs font-bold">
              <span>9:41</span>
              <span>⌂</span>
            </div>
            <p class="text-sm font-bold text-coursia-muted">Bonjour Julie 👋</p>
            <h2 class="mt-2 text-xl font-black">Qu’avez-vous envie de cuisiner aujourd’hui ?</h2>
            <div class="mt-4 rounded-full bg-coursia-surface-muted px-4 py-3 text-xs text-coursia-muted">
              Rechercher une recette
            </div>
            <div class="mt-4 flex gap-2 text-xs">
              <span class="rounded-full bg-coursia-primary px-3 py-1 text-white">Tout</span>
              <span class="rounded-full bg-coursia-surface-muted px-3 py-1">Végétarien</span>
              <span class="rounded-full bg-coursia-surface-muted px-3 py-1">Rapide</span>
            </div>
            <div class="mt-5 overflow-hidden rounded-[1.7rem] bg-coursia-peach">
              <div class="flex h-44 items-center justify-center text-7xl">🍝</div>
            </div>
            <h3 class="mt-4 text-xl font-black">One pot pasta aux légumes</h3>
            <div class="mt-3 grid grid-cols-3 gap-2 text-xs text-coursia-muted">
              <span>25 min</span>
              <span>Facile</span>
              <span>Éco</span>
            </div>
            <div class="mt-5 grid grid-cols-4 gap-4 border-t border-coursia-border pt-4 text-center text-xs">
              <span>⌂</span><span>♡</span><span class="text-coursia-accent">＋</span><span>☻</span>
            </div>
          </div>

          <div
            class="absolute right-0 top-6 w-72 rotate-[8deg] rounded-[2.3rem] border-[10px] border-coursia-foreground bg-coursia-surface p-5 shadow-coursia-glass md:right-16"
          >
            <div class="mb-5 flex items-center justify-between text-xs font-bold">
              <span>9:42</span>
              <span>•••</span>
            </div>
            <h2 class="text-xl font-black">Mon budget</h2>
            <div class="mt-4">
              <div class="flex justify-between text-sm font-bold">
                <span>Budget</span>
                <span>120.00 CHF</span>
              </div>
              <div class="mt-3 h-3 rounded-full bg-coursia-surface-muted">
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
            <div class="mt-5 rounded-2xl bg-coursia-surface-muted p-4">
              <p class="text-xs text-coursia-muted">Économies ce mois</p>
              <p class="mt-1 text-2xl font-black text-coursia-success">123.45 CHF</p>
              <p class="text-xs text-coursia-muted">valeur maquette</p>
            </div>
            <h3 class="mt-5 font-black">Comparateur de prix</h3>
            <div class="mt-3 grid grid-cols-4 gap-2">
              <span
                v-for="store in storeExamples"
                :key="store"
                class="rounded-xl bg-coursia-peach px-2 py-3 text-center text-xs font-black text-coursia-accent"
              >
                {{ store }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div
        id="benefits"
        class="grid gap-4 rounded-[1.7rem] border border-coursia-border bg-coursia-surface p-5 shadow-coursia-md md:grid-cols-4"
      >
        <div v-for="stat in stats" :key="stat.label" class="flex items-center gap-4 md:border-r md:border-coursia-border md:last:border-r-0">
          <span
            class="flex h-14 w-14 items-center justify-center rounded-2xl bg-coursia-surface-muted text-2xl"
          >
            {{ stat.icon }}
          </span>
          <span>
            <span class="block text-xl font-black">{{ stat.value }}</span>
            <span class="text-sm text-coursia-muted">{{ stat.label }}</span>
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
          class="rounded-[1.5rem] border border-coursia-border bg-coursia-surface p-5 shadow-coursia-sm"
        >
          <div
            class="flex h-14 w-14 items-center justify-center rounded-2xl bg-coursia-peach text-2xl"
          >
            {{ feature.icon }}
          </div>
          <h3 class="mt-5 text-base font-black">{{ feature.title }}</h3>
          <p class="mt-4 text-sm leading-6 text-coursia-muted">{{ feature.description }}</p>
        </article>
      </div>
    </section>

    <section
      id="how-it-works"
      class="mx-auto mt-20 grid max-w-7xl items-center gap-12 lg:grid-cols-[0.95fr_1.05fr]"
    >
      <div class="relative min-h-[430px]">
        <div
          class="absolute left-10 top-12 h-72 w-56 -rotate-6 rounded-[2rem] border border-coursia-border bg-coursia-surface p-4 opacity-40 shadow-coursia-sm"
        />
        <div
          class="absolute left-24 top-4 h-80 w-64 rotate-3 rounded-[2rem] border border-coursia-border bg-coursia-surface p-4 shadow-coursia-glass"
        >
          <div class="flex h-48 items-center justify-center rounded-[1.5rem] bg-coursia-peach text-7xl">
            🍛
          </div>
          <h3 class="mt-5 text-2xl font-black">Poulet teriyaki</h3>
          <p class="text-sm text-coursia-muted">riz & brocoli</p>
          <div class="mt-5 flex justify-between">
            <span
              class="flex h-14 w-14 items-center justify-center rounded-full bg-white text-2xl text-coursia-danger shadow-coursia-sm"
            >
              ×
            </span>
            <span
              class="flex h-14 w-14 items-center justify-center rounded-full bg-white text-2xl text-coursia-success shadow-coursia-sm"
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
          Dites adieu à la routine : swipez, aimez, cuisinez. Coursia s’occupe du reste.
        </p>
        <a
          href="#contact"
          class="mt-8 inline-flex rounded-full bg-coursia-primary px-6 py-3 text-sm font-black text-white"
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
        <blockquote v-for="item in testimonials" :key="item.name" class="border-r border-coursia-border pr-6 last:border-r-0">
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
      <p class="text-xs font-black uppercase tracking-[0.2em] text-coursia-warning">Tarifs</p>
      <h2 class="mt-4 text-4xl font-black">Tarification en préparation.</h2>
      <p class="mt-4 max-w-3xl leading-7 text-coursia-muted">
        Les prix seront publiés uniquement après validation. Cette section sert d’emplacement prévu
        dans la navigation publique.
      </p>
    </section>

    <section id="faq" class="mx-auto mt-20 max-w-7xl">
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
    </section>

    <section
      id="contact"
      class="mx-auto mt-20 grid max-w-7xl items-center gap-8 overflow-hidden rounded-[1.7rem] bg-coursia-primary p-8 text-white md:grid-cols-[0.8fr_1.2fr]"
    >
      <div class="flex justify-center text-8xl">🥗</div>
      <div>
        <h2 class="text-4xl font-black">Prêt à transformer vos repas du quotidien ?</h2>
        <p class="mt-4 max-w-xl opacity-90">
          Rejoignez la liste d’attente pour suivre le lancement. Gratuit, sans engagement, et encore
          en phase de validation produit.
        </p>
        <div class="mt-6 flex flex-wrap gap-4">
          <a
            href="mailto:contact@coursia.local?subject=Liste%20d%E2%80%99attente%20Coursia"
            class="rounded-2xl bg-white px-6 py-3 text-sm font-black text-coursia-primary"
          >
            Rejoindre la liste d’attente
          </a>
          <a
            href="mailto:contact@coursia.local?subject=Liste%20d%E2%80%99attente%20Coursia"
            class="rounded-2xl bg-white px-6 py-3 text-sm font-black text-coursia-primary"
          >
            Google Play — maquette
          </a>
        </div>
      </div>
    </section>

    <footer id="about" class="mx-auto mt-20 grid max-w-7xl gap-10 pb-12 md:grid-cols-[1.3fr_repeat(4,1fr)]">
      <div>
        <div class="flex items-center gap-3 text-coursia-primary">
          <span class="flex h-10 w-10 items-center justify-center rounded-2xl border-2">⌂</span>
          <span class="text-xl font-black tracking-[0.16em]">COURSIA</span>
        </div>
        <p class="mt-5 max-w-xs text-sm leading-6 text-coursia-muted">
          Votre copilote du quotidien, de la recette à la table.
        </p>
      </div>
      <div>
        <h3 class="text-sm font-black uppercase">Produit</h3>
        <ul class="mt-4 space-y-3 text-sm text-coursia-muted">
          <li><a href="#features">Fonctionnalités</a></li>
          <li><a href="#pricing">Tarifs</a></li>
          <li><a href="#faq">FAQ</a></li>
        </ul>
      </div>
      <div>
        <h3 class="text-sm font-black uppercase">À propos</h3>
        <ul class="mt-4 space-y-3 text-sm text-coursia-muted">
          <li><a href="#about">Qui sommes-nous ?</a></li>
          <li><a href="#contact">Contact</a></li>
        </ul>
      </div>
      <div>
        <h3 class="text-sm font-black uppercase">Ressources</h3>
        <ul class="mt-4 space-y-3 text-sm text-coursia-muted">
          <li><a href="#how-it-works">Blog</a></li>
          <li><a href="#features">Recettes</a></li>
        </ul>
      </div>
      <div>
        <h3 class="text-sm font-black uppercase">Légal</h3>
        <ul class="mt-4 space-y-3 text-sm text-coursia-muted">
          <li><NuxtLink to="/legal">Mentions légales</NuxtLink></li>
          <li><NuxtLink to="/legal">Confidentialité</NuxtLink></li>
        </ul>
      </div>
    </footer>
  </div>
</template>
