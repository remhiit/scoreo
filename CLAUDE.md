# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# Scoreo

PWA Kotlin/JS de suivi de scores entre amis. Compose HTML. MVI (Handler/Intent/State). Architecture hexagonale (Ports & Adapters). 100% local-first (localStorage), sync cloud optionnelle via Google Drive.

## Commandes

```bash
# Dev server (hot reload, port 9191)
./gradlew jsBrowserDevelopmentRun --continuous

# Build production (sortie: build/kotlin-webpack/js/productionExecutable/)
./gradlew jsBrowserProductionWebpack

# Tous les tests (JVM, rapide, pas de navigateur)
./gradlew jvmTest

# Un seul fichier de test
./gradlew jvmTest --tests "com.scoreo.ui.player.PlayerHandlerTest"

# Tests jsMain (nécessitent un navigateur — GoogleDriveSyncAdapterTest, ThemeManagerTest)
./gradlew jsTest

# Valider la config Gradle (ce que fait le hook pre-push et la CI check.yml)
./gradlew help --quiet
```

`.claude/hooks/session-start.sh` (déclaré dans `.claude/settings.json`) préchauffe les dépendances Gradle/Node/npm au démarrage d'une session Claude Code sur le web (`$CLAUDE_CODE_REMOTE`), pour que `jvmTest` et le build JS soient rapides dès la première commande. `gradle/wrapper/gradle-wrapper.jar` n'est pas commité (pas de binaires en version control) : le hook utilise `./gradlew` s'il est présent, sinon le `gradle` déjà installé dans l'image de session.

**⚠️ Limitation réseau connue (sessions Claude Code sur le web) :** `dl.google.com` (dépôt Maven Google, déclaré dans `settings.gradle.kts` via `google { mavenContent { includeGroupAndSubgroups("androidx") ... } } }`) est actuellement bloqué par la politique d'egress de l'environnement. Comme Compose Multiplatform (`runtime-desktop`, `runtime-js`) dépend transitivement d'`androidx.annotation`/`androidx.collection` hébergés uniquement là-bas, **`./gradlew jvmTest`, `jsBrowserDevelopmentRun` et `jsBrowserProductionWebpack` échouent tous dans une session web tant que `dl.google.com` n'est pas autorisé** (seule la compilation, ex. `jvmTestClasses`, passe car elle n'a pas besoin du classpath runtime). Ce n'est pas un problème de configuration du projet — `google()` est correctement déclaré. À corriger côté administration de l'environnement (allowlist réseau), pas en contournant la politique.

Le hook `pre-push` (`.githooks/pre-push`, activé automatiquement au premier `./gradlew`) lance `gradle help --quiet` avant chaque push. Pas de linter configuré (pas de ktlint/detekt).

Pas de `package.json` / npm : tout passe par Gradle (Kotlin Multiplatform, cibles `jvm()` et `js(IR)`). Les tests métier vivent en `commonMain`/`commonTest` et tournent sur la JVM (`jvmTest`) — le JS n'est nécessaire que pour les adapters spécifiques au navigateur (`jsMain`/`jsTest`).

## Avant d'explorer le code

Lire ces fichiers dans l'ordre. Tout le contexte nécessaire y est :

0. `doc/reference.md` — Tableaux de référence (handlers, use cases, models, navigation, tests)
1. `doc/glossary.md` — Définitions (Handler, Intent, State, Port, Adapter, Use Case)
2. `doc/technical/architecture.md` — Stack, patterns, persistence, backward compat
3. `doc/functional/feature.md` — User flow complet, navigation, import (6 fichiers)
4. `doc/technical/migrations.md` — Migrations de données (si pertinent)

## Arborescence clé

| Dossier | Contenu |
|---|---|
| `src/commonMain/` | `domain/` (models, ports), `application/` (use cases), `ui/*/` (Handler/Intent/State par écran), `di/` (wiring conditionnel, ex. sync) |
| `src/jsMain/` | Écrans Compose HTML (`ui/*/`), `infrastructure/` (adapters localStorage), `di/`, `Main.kt` (entry point) |
| `src/jsMain/.../infrastructure/google/` | Sync Google Drive (OAuth, DriveClient, DriveSyncAdapter, SyncConfig) |
| `src/jsMain/resources/` | HTML, CSS (`theme.css`, `layout.css`, ...), assets PWA (`manifest.json`, `sw.js`, icônes) |
| `src/commonTest/` | Tests unitaires JVM (use cases, handlers, domaine, DI) |
| `src/jsTest/` | Tests nécessitant un environnement navigateur (Google Drive adapter, ThemeManager) |
| `src/ressource/schemas/import/` | Schémas JSON du format d'import (versionnés) |

## Workflow

- `.task/` contient les tickets de correction organisés par priorité (P0/P1/P2/P3).
- **Plan** : je décris une feature ou correctif → tu crées les tickets dans `.task/` avec priorisation.
- **Développe** : je dis de développer → tu prends le premier ticket P0 non fait dans `.task/`, tu le réalises, tu commit, puis tu passes au suivant.
- Un commit par ticket. Message de commit = titre du ticket.

## Règles

- Handler dans `ui/*/`. Reçoit un `Intent` → produit un `State`.
- Use Case dans `application/`. Opération métier, zéro dépendance framework.
- Interface Repository dans `domain/port/`. Implémentation dans `jsMain/infrastructure/`.
- Tout modèle sérialisé (`Player`, `GameType`, `Match`, `PlayerScore`) doit être **backward-compatible**.
- Ajouter un champ ? Toujours fournir une valeur par défaut.
- Supprimer/renommer un champ ? Migration obligatoire dans `doc/technical/migrations.md`.
- Toute évolution du code (nouveau use case, handler, modèle, screen, port) doit mettre à jour la documentation correspondante dans `doc/`.

## Pre-commit Checklist

Avant de committer une évolution Handler/Intent/State/UseCase/Model/Port :

- [ ] Fichier `.md` correspondant a été mis à jour (`doc/reference.md`, `doc/functional/feature.md`, `doc/functional/features/*.md`, ou `doc/technical/*.md`)
- [ ] Si nouveau champ optionnel sérialisé : entrée ajoutée à `doc/technical/migrations.md` (changelog de schéma)
- [ ] Tests modifiés/ajoutés si changement de comportement public
- [ ] Message de commit décrit clairement l'évolution (pas "Fix", "Update" vague)

**Exemple bon commit:**
```
Add archive confirmation for game types

- Add ShowArchiveConfirm, ArchiveGameType, DismissArchiveConfirm intents
- Add archiveConfirmGameTypeId to GameTypeState
- Archive button (🗑) with modal confirmation in detail view
- Updated doc/functional/features/games.md with archive flow
- ArchiveGameTypeUseCase tested
```

**Exemple mauvais commit:**
```
Update games screen
```
