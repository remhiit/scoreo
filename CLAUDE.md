# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# Scoreo

PWA React + TypeScript de suivi de scores entre amis. MVI-style (reducer/action/state par écran, via `useReducer`). Architecture hexagonale (Ports & Adapters). 100% local-first (localStorage), sync cloud optionnelle via Google Drive.

Le dépôt est un **monorepo pnpm** : Scoreo est l'application hôte (`apps/scoreo/`, la seule déployée) et les compteurs de points dédiés à un jeu deviennent des **modules** (`packages/`, chargés à la demande). Toutes les commandes se lancent depuis la racine du workspace ; voir « Arborescence clé » et `doc/technical/architecture.md` § *Repository layout*.

## Langue

Toujours répondre en français dans le chat (texte adressé à l'utilisateur), y compris les messages de statut, résumés et questions. Les commits, PR et issues sont également en français (message de commit = titre de l'issue, cf. section Workflow), conformément à la pratique déjà en place dans le repo. Le code, les identifiants et la documentation technique (`doc/`) restent en anglais.

## Commandes

```bash
# Dev server (hot reload)
pnpm dev

# Build production (sortie: apps/scoreo/dist/)
pnpm build

# Preview d'un build de production
pnpm preview

# Tous les tests (Vitest, jsdom — pas de navigateur réel nécessaire)
pnpm test

# Un seul fichier de test
pnpm --filter scoreo exec vitest run src/ui/scoredetail/scoreDetailReducer.test.ts

# Typecheck / lint
pnpm typecheck
pnpm lint
```

`.claude/hooks/session-start.sh` (déclaré dans `.claude/settings.json`) préchauffe `node_modules` au démarrage d'une session Claude Code sur le web (`$CLAUDE_CODE_REMOTE`), pour que `pnpm test`/`typecheck`/`lint`/`build` soient rapides dès la première commande — active le pnpm épinglé dans `package.json` (`packageManager`) via Corepack (`registry.npmjs.org`), puis `pnpm install --frozen-lockfile`.

Les scripts de la racine essaiment avec `pnpm -r` (ou `--filter scoreo` pour ceux qui ne concernent que l'app) ; `pnpm test` fait tourner en plus le projet Vitest racine, qui ne couvre que les tests des scripts d'automatisation (`scripts/*.test.mjs`).

Pas de dépendance Gradle/JVM : tout passe par `package.json` (pnpm). Tests unitaires colocalisés (`*.test.ts(x)`), tournant intégralement sous Vitest/jsdom — pas de suite séparée nécessitant un vrai navigateur.

## Avant d'explorer le code

Lire ces fichiers dans l'ordre. Tout le contexte nécessaire y est :

0. `doc/reference.md` — Tableaux de référence (reducers, use cases, models, ports, adapters, navigation, tests)
1. `doc/glossary.md` — Définitions (Reducer, Action, State, Port, Adapter, Use Case)
2. `doc/technical/architecture.md` — Stack, patterns, persistence, backward compat
3. `doc/functional/feature.md` — User flow complet, navigation, import (6 fichiers)
4. `doc/technical/migrations.md` — Migrations de données (si pertinent)

## Arborescence clé

| Dossier | Contenu |
|---|---|
| `apps/scoreo/` | L'app hôte : `index.html`, `public/`, `src/`, `e2e/` (Playwright, comportement), `tests/visual/` (Playwright, pixels — voir `doc/technical/visual-testing.md`), `scripts/`, ses configs Vite/Vitest/Playwright/TS et son `package.json` (React, zod, vite, vitest) |
| `packages/` | Le contrat et les modules de comptage. `module-api/` (contrat hôte ↔ module, zéro dépendance runtime) et `shared-domain/` (`Player`, `PlayerSchema`, `newId`, `Result` — une seule définition pour tout le workspace) ; puis un dossier par module : `module-tori-valley/` (absorbé depuis `remhiit/toriValleyScoreBoard`, sans coquille standalone depuis #330) ; il a son propre `CLAUDE.md`. Voir `doc/technical/module-contract.md` |
| Racine | `package.json` privé (scripts `pnpm -r`, eslint/prettier/tsc), `tsconfig.base.json`, `eslint.config.js`, `vitest.config.ts` (tests de `scripts/` uniquement), `lighthouserc.json`, `doc/`, `schemas/`, `scripts/`, `.github/`, `.claude/` |
| `apps/scoreo/src/domain/` | `model/` (types + schémas zod), `port/` (interfaces repository) |
| `apps/scoreo/src/application/` | Use cases (opérations métier, zéro dépendance framework) |
| `apps/scoreo/src/infrastructure/` | `localStorage/` (adapters), `google/` (sync Google Drive : OAuth, DriveClient, DriveSyncAdapter, SyncConfig), `migration/` (migration Match v1→v2), `testing/` (fakes in-memory pour les tests) |
| `apps/scoreo/src/modules/` | Intégration des modules côté hôte : `registry.ts` (le **seul** fichier qui nomme un module) |
| `apps/scoreo/src/services/` | `ServicesContext.tsx` — DI racine (`useMemo`), hook `useServices()` |
| `apps/scoreo/src/ui/*/` | Un dossier par écran : `<screen>Reducer.ts` (+ test), `<screen>Types.ts`, `<Screen>.tsx` (+ test) |
| `apps/scoreo/src/ui/shared/` | Composants React partagés (`LudoButton`, `LudoModal`, `LudoTable`, ...) |
| `apps/scoreo/src/ui/theme/` | `themeManager.ts`, `ThemeContext.tsx`, `ThemePickerDialog.tsx` |
| `apps/scoreo/src/ui/navigation/` | `screen.ts` (union `Screen`), `hash.ts` (`parseHash`/`screenToHash`), `useHashRouter.ts` |
| `apps/scoreo/public/` | `manifest.json`, `sw.js`, icônes PWA, `css/` (dont `css/tokens/`) |
| `schemas/import/` | Schémas JSON du format d'import (versionnés, `v1.0`/`v1.1`) |
| `packages/module-mille-sabords/` | 1000 Sabords porté du Kotlin. Son domaine est vérifié contre l'oracle `legacy/` par un test différentiel golden (`tests/golden/`), pas par relecture |
| `legacy/1ksabord-kotlin/` | **Temporaire.** L'app Kotlin/JS de 1000 Sabords absorbée avec son historique, gardée comme **oracle** du portage TypeScript : ses 107 tests tournent en CI (`kotlin-legacy.yml`) et doivent rester verts. Supprimée avec son workflow une fois le portage livré. Ne rien y développer |
| `doc/modules/` | La doc des jeux comptés par un module, recopiée depuis les dépôts satellites pour que le monorepo se suffise à lui-même : `mille-sabords/` (règles, guide, doc technique de l'app Kotlin, PDF des règles). Celle de Torī vit dans son paquet, avec ses scans de cartes et son PDF (`packages/module-tori-valley/doc/resources/`) |
| `ds_temp/` | Référence temporaire du handoff design (Ludo Design System) : tokens, composants, mapping écran→fichiers. Source de vérité visuelle pour les issues de migration à venir ; à supprimer une fois la migration terminée. Voir `ds_temp/design_handoff_scoreo_ds/README.md` |

## Workflow

- Le backlog vit dans les **Issues GitHub** (+ le GitHub Project en vue Kanban), pas dans `.task/` (supprimé — deux sources de vérité auraient fini par diverger).
- Priorité : labels `P0`…`P3` (P0 = plus urgent).
- **Plan** : je décris une feature ou un correctif → tu crées une issue (titre, critères d'acceptation, fichiers impactés) avec le label de priorité correspondant.
- **Développe** : je dis de développer → tu prends la première issue `P0` ouverte non assignée (à défaut la priorité suivante disponible), tu la réalises, tu commit, tu ouvres une PR référençant `Closes #N`, puis tu passes à la suivante.
- Un commit par issue. Message de commit = titre de l'issue.

Voir `doc/technical/automation-plan.md` pour l'architecture d'automatisation cible (labels comme bus d'événements, skills, phases de mise en autonomie).

## Règles

- Reducer dans `ui/*/`. Reçoit une `Action` → produit un `State`.
- Use Case dans `application/`. Opération métier, zéro dépendance framework.
- Interface Repository dans `domain/port/`. Implémentation dans `infrastructure/`.
- Tout modèle sérialisé (`Player`, `GameType`, `Match`, `PlayerScore`) doit être **backward-compatible**.
- Ajouter un champ ? Toujours fournir un `.default()` dans le schéma zod correspondant.
- Supprimer/renommer un champ ? Migration obligatoire dans `doc/technical/migrations.md`.
- Toute évolution du code (nouveau use case, reducer, modèle, screen, port) doit mettre à jour la documentation correspondante dans `doc/`.

## Pre-commit Checklist

Avant de committer une évolution Reducer/Action/State/UseCase/Model/Port :

- [ ] Fichier `.md` correspondant a été mis à jour (`doc/reference.md`, `doc/functional/feature.md`, `doc/functional/features/*.md`, ou `doc/technical/*.md`)
- [ ] Si nouveau champ optionnel sérialisé : entrée ajoutée à `doc/technical/migrations.md` (changelog de schéma)
- [ ] Tests modifiés/ajoutés si changement de comportement public
- [ ] Message de commit décrit clairement l'évolution (pas "Fix", "Update" vague)

**Exemple bon commit:**
```
Ajouter la confirmation d'archivage pour les types de jeu

- Ajout des actions showArchiveConfirm/archiveGameType/dismissArchiveConfirm
- Ajout de archiveConfirmGameTypeId à GameTypeState
- Bouton Archiver (🗑) avec modale de confirmation dans la vue détail
- Mise à jour de doc/functional/features/games.md avec le flow d'archivage
- ArchiveGameTypeUseCase testé
```

**Exemple mauvais commit:**
```
Update games screen
```
