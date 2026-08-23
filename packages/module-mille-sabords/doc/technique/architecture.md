# Architecture — 1000 Sabords

Ce paquet est un **module de comptage** que Scoreo charge à la demande. Il n'est pas une
application : il n'a ni build, ni déploiement, ni stockage. Ce qu'il possède, c'est le jeu.

## Les trois couches

```
         ┌────────────────────────────────────────────────┐
         │  L'HÔTE — Scoreo                               │
         │  joueurs · historique · statistiques · export  │
         │  thème · persistance                           │
         └───────────────┬────────────────────────────────┘
                         │  ScoringModuleScreenProps
                         │  (host, playerIds, editing, onExit)
                         ▼
         ┌────────────────────────────────────────────────┐
         │  L'ÉCRAN — src/ui/module/                      │
         │  réducteur MVI, état de tour, rendu React      │
         └───────────────┬────────────────────────────────┘
                         │  appels purs
                         ▼
         ┌────────────────────────────────────────────────┐
         │  LE DOMAINE — src/domain/                      │
         │  calculerScore · Partie · LancerDes · Modeles  │
         │  zéro dépendance : ni React, ni stockage       │
         └────────────────────────────────────────────────┘
```

**La règle tient en une phrase** : le domaine ne connaît rien, l'écran ne connaît que le domaine et
le contrat, et l'hôte n'est joignable qu'à travers `ModuleHost`. Rien ici ne touche `localStorage` —
voir [`module-contract.md`](../../../../doc/technical/module-contract.md) du workspace.

## Ce que le module ne fait plus

L'application Kotlin dont ce module est le portage faisait 1553 lignes d'UI. La plus grande partie
n'a pas été portée, parce que l'hôte la fournit déjà :

| Ce que faisait le Kotlin | Qui s'en charge |
|---|---|
| Gestion des joueurs, joueurs connus | Scoreo, via `host.getPlayers()` |
| Historique des parties | L'historique de Scoreo |
| Statistiques (`Stats.kt`) | L'écran Stats et le Hall of Fame de Scoreo |
| Export v1.1, import, compression LZW | L'import/export de Scoreo — le module lui rend un `ModuleMatchResult` en processus |
| Thème (`basculerTheme`) | Le thème de Scoreo ; le module garde sa propre identité visuelle, scopée |
| Persistance de la partie (`Persistence.kt`) | `host.saveDraft` / `host.saveMatch` |

Reste le cœur du jeu : saisir un tour, voir le score courant, annuler, terminer.

## L'arbre des fichiers

```
src/
├── index.ts                  # n'exporte QUE le manifeste et le module
├── module.ts                 # manifeste + import dynamique de l'écran
├── styles.css                # scopé .module-mille-sabords, classes préfixées ms-
├── domain/                   # le noyau, sans aucune dépendance de plateforme
│   ├── constantes.ts
│   ├── lancerDes.ts
│   ├── modeles.ts
│   ├── calculateurScore.ts
│   └── partie.ts
├── application/
│   ├── moduleResult.ts       # ce que le module rend à l'hôte
│   └── exportScoreo.ts       # l'enveloppe v1.1, vérifiée contre l'oracle Kotlin
└── ui/module/                # l'écran et son réducteur
    ├── milleSabordsModuleTypes.ts
    ├── milleSabordsModuleReducer.ts
    ├── scoresRapides.ts
    └── MilleSabordsModuleScreen.tsx
```

`index.ts` n'exporte que le manifeste et le module : le registre de Scoreo l'importe de façon
*eager*, donc tout ce qu'il ré-exporterait voyagerait dans le bundle principal de l'hôte. Le domaine
se rejoint par chemin relatif.

## Le portage, et sa preuve

Le domaine est une transposition ligne à ligne du Kotlin, pas une réécriture. C'est vérifié, pas
relu : `tests/golden/` rejoue un corpus de parties terminées des deux côtés et compare l'enveloppe
v1.1 **octet pour octet** (`GoldenExportTest` côté Kotlin, `exportScoreo.golden.test.ts` côté
TypeScript). Aucun des deux ne peut dériver sans que l'autre passe au rouge.

L'oracle vit dans `legacy/1ksabord-kotlin/` et ses 107 tests tournent en CI. Il disparaîtra une fois
les dépôts satellites retirés ; les fixtures golden, elles, restent et continuent de garder le
portage.
