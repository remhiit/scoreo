# 1000 Sabords — Kotlin Multiplatform

Compteur de points du jeu de dés **1000 Sabords**, écrit en **Kotlin Multiplatform (KMP)**.

- Cible active : **web** via Kotlin/JS (compilateur IR)
- Cible préparée : **Android natif** (Compose — à activer avec un Android SDK)

## Architecture

Le projet applique conjointement l'**architecture hexagonale** (Ports & Adapters) et le **Domain-Driven Design (DDD)**.

### Architecture hexagonale

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
        │  Partie  ·  LancerDés  ·  Tour        │
        │  RésultatScore  ·  calculerScore()    │
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

**Règle fondamentale :** le domaine (`fr.ksabord.domaine`) ne dépend d'aucune plateforme. Il ne connaît ni le DOM, ni le localStorage, ni Android. Ce sont les adaptateurs qui dépendent du domaine, jamais l'inverse.

### Principes DDD appliqués

| Concept DDD | Implémentation |
|---|---|
| **Langage ubiquitaire** | Terminologie française dans tout le code (`Partie`, `Tour`, `LancerDés`…) |
| **Contexte borné — domaine** | `fr.ksabord.domaine` — logique métier pure, multiplateforme |
| **Contexte borné — interface** | `fr.ksabord.ui` — UI, état du tour, persistence JS |
| **Racine d'agrégat** | `Partie` — encapsule joueurs, historique et invariants du dernier tour |
| **Objets valeur** | `LancerDés` (dés immuables), `Tour` (tour enregistré), `RésultatScore` |
| **Service domaine** | `calculerScore(dés, carte)` — pur, sans état global ni effet de bord |

## Structure des sources

```
src/
├── commonMain/kotlin/fr/ksabord/domaine/   ← domaine partagé toutes plateformes
│   ├── Constantes.kt        # COULEURS_JOUEURS, EMOJIS_RANG, BONUS_SÉRIES, TypeDé, DéfCarte
│   ├── LancerDes.kt         # LancerDés — objet valeur immutable (état des dés)
│   ├── Modeles.kt           # Tour, RésultatScore — objets valeur immuables
│   ├── CalculateurScore.kt  # calculerScore(dés, carte) — service domaine pur
│   └── Partie.kt            # Partie — racine d'agrégat + singleton `val partie`
├── commonTest/kotlin/fr/ksabord/   ← 82 tests unitaires
│   ├── ScoreCalculateurTest.kt     # Tests du service calculerScore
│   ├── EtatTest.kt                 # Tests de la Partie (totalJoueur, manches…)
│   └── RèglesTest.kt               # Tests exhaustifs des règles officielles
├── jsMain/kotlin/fr/ksabord/ui/    ← IHM web uniquement
│   ├── EtatTour.kt          # État du tour courant (dés, carte, onglet, multiplicateur)
│   ├── Persistence.kt       # Sauvegarde/restauration localStorage (partie + joueurs connus)
│   ├── Actions.kt           # Handlers d'actions utilisateur → appels sur Partie
│   ├── Rendu.kt             # Génération HTML (strings de template Kotlin)
│   └── Main.kt              # main() + délégation d'événements (data-action)
├── jsMain/resources/
│   └── index.html           # CSS complet + <div id="app"> + <script src="app.js">
└── androidMain/kotlin/fr/ksabord/  ← squelette Android (commenté, prêt à activer)
    ├── GameViewModel.kt
    └── ui/{MainActivity, SetupScreen, GameScreen}.kt
```

## Principes DDD appliqués

- **Langage ubiquitaire** — terminologie française dans tout le code (`Partie`, `Tour`, `LancerDés`, `RésultatScore`, `calculerScore`)
- **Racine d'agrégat** — `Partie` encapsule joueurs, historique et règles du dernier tour
- **Objets valeur** — `LancerDés` (immuable), `Tour` (immuable), `RésultatScore` (immuable)
- **Service domaine pur** — `calculerScore(dés, carte)` sans état global ni effet de bord
- **Séparation des contextes** — logique métier dans `commonMain`, état UI et persistence dans `jsMain`

## Prérequis

- **JDK 11+** (testé avec OpenJDK 17)
- **Connexion internet** au premier lancement (Gradle télécharge ses dépendances et le compilateur Kotlin)

## Commandes

### Tests

```bash
./gradlew jsNodeTest
```

Résultats XML dans `build/test-results/jsNodeTest/`.

### Build de production (web)

```bash
./gradlew jsBrowserDistribution
```

Les fichiers sont générés dans `build/dist/js/productionExecutable/` :
- `index.html` — la page HTML avec le CSS
- `app.js` — le bundle JS optimisé (minifié, ~70 Ko)

Servir ce répertoire avec n'importe quel serveur statique :

```bash
python3 -m http.server -d build/dist/js/productionExecutable
```

### Build de développement (sans minification)

```bash
./gradlew jsBrowserDevelopmentWebpack
```

Génère `build/dist/js/developmentExecutable/` avec les fichiers non-minifiés.

### Serveur local avec hot-reload

```bash
./gradlew jsBrowserDevelopmentRun
```

Ouvre `http://localhost:8080` dans le navigateur.

## Activer la cible Android

1. Installer le SDK Android (API 34) et définir `ANDROID_HOME`
2. Dans `build.gradle.kts`, décommenter le bloc `androidTarget()` et le bloc `android {}`
3. Dans `build.gradle.kts`, décommenter les dépendances `androidMain`
4. Dans les fichiers `src/androidMain/kotlin/`, retirer les commentaires `//`

## Gestion des événements (JS)

Le projet utilise la **délégation d'événements** : un seul listener `click` sur `document`
dispatche les actions selon l'attribut `data-action` des éléments.

```kotlin
document.addEventListener("click", EventListener { event ->
    val el = (event.target as? HTMLElement)?.closest("[data-action]") as? HTMLElement
    el?.getAttribute("data-action")?.let { gérerAction(it, el) }
})
```

### Philosophie de rendu

`render()` reconstruit entièrement le `innerHTML` de `#app` à chaque changement d'état — pas de DOM virtuel ni de mise à jour incrémentale.


## Prérequis

- **JDK 11+** (testé avec OpenJDK 17)
- **Connexion internet** au premier lancement (Gradle télécharge ses dépendances et le compilateur Kotlin)

## Commandes

### Tests

```bash
./gradlew jsNodeTest
```

Résultats XML dans `build/test-results/jsNodeTest/`.

### Build de production (web)

```bash
./gradlew jsBrowserDistribution
```

Les fichiers sont générés dans `build/dist/js/productionExecutable/` :
- `index.html` — la page HTML avec le CSS
- `app.js` — le bundle JS optimisé (minifié, ~70 Ko)

Servir ce répertoire avec n'importe quel serveur statique :

```bash
python3 -m http.server -d build/dist/js/productionExecutable
```

### Build de développement (sans minification)

```bash
./gradlew jsBrowserDevelopmentWebpack
```

Génère `build/dist/js/developmentExecutable/` avec les fichiers non-minifiés.

### Serveur local avec hot-reload

```bash
./gradlew jsBrowserDevelopmentRun
```

Ouvre `http://localhost:8080` dans le navigateur.

## Activer la cible Android

1. Installer le SDK Android (API 34) et définir `ANDROID_HOME`
2. Dans `build.gradle.kts`, décommenter le bloc `androidTarget()` et le bloc `android {}`
3. Dans `build.gradle.kts`, décommenter les dépendances `androidMain`
4. Dans les fichiers `src/androidMain/kotlin/`, retirer les commentaires `//`

## Architecture

### Gestion des événements (JS)

Le projet utilise la **délégation d'événements** : un seul listener `click` sur `document`
dispatche les actions selon l'attribut `data-action` des éléments.

```kotlin
document.addEventListener("click", EventListener { event ->
    val el = (event.target as? HTMLElement)?.closest("[data-action]") as? HTMLElement
    el?.getAttribute("data-action")?.let { handleAction(it, el) }
})
```

### Philosophie de rendu

`render()` reconstruit entièrement le `innerHTML` de `#app` à chaque changement d'état — pas de DOM virtuel ni de mise à jour incrémentale.
