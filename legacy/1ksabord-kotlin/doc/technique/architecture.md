# Architecture — 1000 Sabords

Le projet applique conjointement l'**architecture hexagonale**
(Ports & Adapters) et le **Domain-Driven Design (DDD)**.

## Principe

```
         ┌──────────────────────────────────────┐
         │           ADAPTATEURS PRIMAIRES       │
         │  (pilotent le domaine)                │
         │                                       │
         │   fr.ksabord.ui  (JS / Web)           │
         │   fr.ksabord.GameViewModel (Android)  │
         └───────────────┬──────────────────────┘
                         │ appels via l'API publique
                         ▼
         ┌──────────────────────────────────────┐
         │         HEXAGONE — DOMAINE PUR        │
         │       fr.ksabord.domaine              │
         │                                       │
         │  Partie  ·  LancerDes  ·  Tour        │
         │  ResultatScore  ·  calculerScore()    │
         └───────────────┬──────────────────────┘
                         │ appels sortants (persistence)
                         ▼
         ┌──────────────────────────────────────┐
         │          ADAPTATEUR SECONDAIRE        │
         │  (piloté par le domaine)              │
         │                                       │
         │   Persistence.kt  (localStorage)      │
         └──────────────────────────────────────┘
```

**Règle fondamentale :** le domaine (`fr.ksabord.domaine`) ne dépend
d'aucune plateforme. Il ne connaît ni le DOM, ni le localStorage,
ni Android. Ce sont les adaptateurs qui dépendent du domaine,
jamais l'inverse.

## Concepts DDD appliqués

| Concept DDD | Implémentation |
|---|---|
| **Langage ubiquitaire** | Terminologie française dans tout le code (`Partie`, `Tour`, `LancerDes`) |
| **Contexte borné — domaine** | `fr.ksabord.domaine` — logique métier pure, multiplateforme |
| **Contexte borné — interface** | `fr.ksabord.ui` — UI, état du tour, persistence JS |
| **Racine d'agrégat** | `Partie` — encapsule joueurs, historique et invariants |
| **Objets valeur** | `LancerDes`, `Tour`, `ResultatScore` — immuables |
| **Service domaine** | `calculerScore(dés, carte)` — pur, sans état global |

## Arbre des dépendances

```
commonMain/                      ← partagé entre toutes les cibles
  fr.ksabord.domaine/            ← ZÉRO dépendance externe
    Constantes.kt
    LancerDes.kt
    Modeles.kt
    CalculateurScore.kt
    Partie.kt

jsMain/                          ← dépend de commonMain + kotlinx.browser
  fr.ksabord.ui/
    Main.kt                      ← point d'entrée
    EtatTour.kt                  ← état UI du tour
    Actions.kt                   ← handlers utilisateur
    Rendu.kt                     ← génération HTML
    Persistence.kt               ← localStorage + export/import
    Compression.kt               ← LZW pour export
    Stats.kt                     ← statistiques

commonTest/
  ScoreCalculateurTest.kt
  EtatTest.kt
  RèglesTest.kt
```

-
