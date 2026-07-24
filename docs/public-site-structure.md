# Structure éditoriale et parcours du site public

Ce cadrage couvre la phase Web-Phase-2 du site public Coursia. Il sert de référence avant développement des pages publiques détaillées.

## Audiences

| Audience | Ce qu’elle doit comprendre | Action principale |
| -------- | -------------------------- | ----------------- |
| Utilisateurs | Coursia aide à découvrir, organiser et suivre des cours depuis une expérience simple. | Découvrir les fonctionnalités disponibles puis rejoindre la liste d’attente. |
| Partenaires | Coursia prépare un canal de distribution et de collaboration autour de contenus/formations. | Demander un échange partenaire. |
| Investisseurs | Coursia construit une plateforme éducative avec socle produit, administration sécurisée et roadmap claire. | Demander le dossier ou un rendez-vous. |

## Positionnement éditorial

Message principal :

> Coursia centralise la découverte et le suivi de cours avec une base web prête pour le public et une administration sécurisée.

Principes :

- parler des capacités disponibles sans surpromettre ;
- isoler clairement la roadmap ;
- éviter les affirmations business non validées ;
- présenter la traction produit comme “socle en construction” tant que les métriques ne sont pas validées dans le business plan.

## Arborescence cible

```text
/
├─ #hero
├─ #audiences
├─ #available
├─ #roadmap
├─ #partners
├─ #investors
└─ #contact
```

Pages futures prévues :

```text
/courses        Catalogue public quand le contenu sera prêt
/partners       Parcours partenaire détaillé
/investors      Dossier investisseur protégé ou contrôlé
/legal          Mentions légales et confidentialité
```

## CTA principaux

| Zone | CTA primaire | CTA secondaire |
| ---- | ------------ | -------------- |
| Hero | Rejoindre la liste d’attente | Voir la roadmap |
| Utilisateurs | Être averti du lancement | Explorer les fonctionnalités |
| Partenaires | Proposer un partenariat | Comprendre le modèle |
| Investisseurs | Demander le dossier | Voir les jalons produit |

## Disponible vs roadmap

Disponible maintenant :

- socle web Nuxt ;
- design system initial ;
- intégration Supabase ;
- authentification SSR admin ;
- modèle rôles/permissions ;
- routes serveur sensibles ;
- journal d’audit admin ;
- CI et environnements web.

Roadmap :

- catalogue public éditorialisé ;
- parcours utilisateur complet ;
- espace partenaire ;
- métriques produit/investisseur ;
- administration avancée des contenus ;
- pages légales et conformité complète.

## Wireframe desktop

```text
┌──────────────────────────────────────────────────────────────┐
│ Header: Logo | Fonctionnalités | Roadmap | Partenaires | CTA │
├──────────────────────────────────────────────────────────────┤
│ Hero                                                         │
│ H1 + promesse                                                │
│ Texte court disponible/roadmap                               │
│ [Rejoindre la liste] [Voir la roadmap]                       │
├──────────────────────────────────────────────────────────────┤
│ 3 cartes audiences: Utilisateurs | Partenaires | Investisseurs│
├──────────────────────────────────────────────────────────────┤
│ Disponible aujourd’hui                                       │
│ Grille 2 colonnes: socle produit + sécurité/admin            │
├──────────────────────────────────────────────────────────────┤
│ Roadmap                                                      │
│ Timeline courte: catalogue → parcours → partenaires → metrics│
├──────────────────────────────────────────────────────────────┤
│ Bloc partenaires + bloc investisseurs                        │
├──────────────────────────────────────────────────────────────┤
│ Contact / liste d’attente                                    │
└──────────────────────────────────────────────────────────────┘
```

## Wireframe mobile

```text
┌──────────────────────────┐
│ Header: Logo | Menu/CTA  │
├──────────────────────────┤
│ Hero                     │
│ H1                       │
│ Texte                    │
│ [CTA principal]          │
│ [CTA secondaire]         │
├──────────────────────────┤
│ Carte utilisateur        │
│ Carte partenaire         │
│ Carte investisseur       │
├──────────────────────────┤
│ Disponible maintenant    │
│ Liste verticale          │
├──────────────────────────┤
│ Roadmap                  │
│ Étapes verticales        │
├──────────────────────────┤
│ Partenaires              │
│ Investisseurs            │
│ Contact                  │
└──────────────────────────┘
```

## Validation fondateurs

Statut : à valider avant développement détaillé des pages COUR-89 à COUR-94.

Checklist :

- [ ] audiences confirmées ;
- [ ] promesse principale validée ;
- [ ] distinction disponible/roadmap validée ;
- [ ] CTA validés ;
- [ ] wireframes desktop/mobile validés ;
- [ ] cohérence business plan confirmée par les fondateurs.
