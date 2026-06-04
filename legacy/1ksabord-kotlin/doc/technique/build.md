# Build — Commandes et configuration

Toutes les commandes s'exécutent depuis le répertoire `kotlin/`.

## Commandes

| Commande | Description |
|---|---|
| `./gradlew jsNodeTest` | Exécute les tests unitaires (Node.js) |
| `./gradlew jsBrowserDistribution --no-daemon -q` | Build de production (web) |
| `./gradlew jsBrowserDevelopmentRun` | Serveur local avec hot-reload (→ localhost:8080) |
| `./gradlew jsBrowserDevelopmentWebpack` | Build de développement (non minifié) |

## Structure Gradle

- **Kotlin 2.0.21** avec plugin multiplatform et serialization
- **Cible JS** (compilateur IR) avec browser + nodejs
- **Cible Android** commentée (nécessite SDK Android)
- Dépendance : `kotlinx-serialization-json:1.7.3`

## Configuration

### gradle.properties

```properties
# Utiliser npm au lieu de yarn
kotlin.js.yarn=false
```

`kotlin.js.yarn=false` force l'utilisation de npm (yarn est incompatible
avec ce projet).

## Fichiers de build

| Fichier | Rôle |
|---|---|
| `build.gradle.kts` | Configuration KMP : JS target, dépendances, plugins |
| `settings.gradle.kts` | Nom du projet : `1ksabord` |
| `gradle.properties` | Propriétés Gradle (proxy, npm forcé) |
| `gradle/wrapper/gradle-wrapper.properties` | Version de Gradle |
| `gradlew` / `gradlew.bat` | Scripts d'exécution du wrapper |

## Build de production

```bash
./gradlew jsBrowserDistribution --no-daemon -q
```

Génère dans `build/dist/js/productionExecutable/` :
- `index.html` — page HTML avec CSS inline
- `app.js` — bundle JS optimisé (~70 Ko, minifié)

Le déploiement GitHub Actions exécute cette commande automatiquement.

## Tests

```bash
./gradlew jsNodeTest
```

82 tests unitaires répartis en 3 fichiers de test (domaine pur).
Résultats XML dans `build/test-results/jsNodeTest/`.

-
