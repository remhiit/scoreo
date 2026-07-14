# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# Scoreo

PWA React + TypeScript de suivi de scores entre amis. MVI-style (reducer/action/state par écran, via `useReducer`). Architecture hexagonale (Ports & Adapters). 100% local-first (localStorage), sync cloud optionnelle via Google Drive.

## Langue

Toujours répondre en français dans le chat (texte adressé à l'utilisateur), y compris les messages de statut, résumés et questions. Le code, les identifiants, les commit/PR et la documentation technique restent en anglais, conformément aux conventions déjà en place dans le repo.

## Commandes

```bash
# Dev server (hot reload)
pnpm dev

# Build production (sortie: dist/)
pnpm build

# Preview d'un build de production
pnpm preview

# Tous les tests (Vitest, jsdom — pas de navigateur réel nécessaire)
pnpm test

# Un seul fichier de test
pnpm exec vitest run src/ui/scoredetail/scoreDetailReducer.test.ts

# Typecheck / lint
pnpm typecheck
pnpm lint
```

`.claude/hooks/session-start.sh` (déclaré dans `.claude/settings.json`) préchauffe `node_modules` au démarrage d'une session Claude Code sur le web (`$CLAUDE_CODE_REMOTE`), pour que `pnpm test`/`typecheck`/`lint`/`build` soient rapides dès la première commande — active le pnpm épinglé dans `package.json` (`packageManager`) via Corepack (`registry.npmjs.org`), puis `pnpm install --frozen-lockfile`.

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
| `src/domain/` | `model/` (types + schémas zod), `port/` (interfaces repository) |
| `src/application/` | Use cases (opérations métier, zéro dépendance framework) |
| `src/infrastructure/` | `localStorage/` (adapters), `google/` (sync Google Drive : OAuth, DriveClient, DriveSyncAdapter, SyncConfig), `migration/` (migration Match v1→v2), `testing/` (fakes in-memory pour les tests) |
| `src/services/` | `ServicesContext.tsx` — DI racine (`useMemo`), hook `useServices()` |
| `src/ui/*/` | Un dossier par écran : `<screen>Reducer.ts` (+ test), `<screen>Types.ts`, `<Screen>.tsx` (+ test) |
| `src/ui/shared/` | Composants React partagés (`LudoButton`, `LudoModal`, `LudoTable`, ...) |
| `src/ui/theme/` | `themeManager.ts`, `ThemeContext.tsx`, `ThemePickerDialog.tsx` |
| `src/ui/navigation/` | `screen.ts` (union `Screen`), `hash.ts` (`parseHash`/`screenToHash`), `useHashRouter.ts` |
| `public/` | `manifest.json`, `sw.js`, icônes PWA, `css/` (dont `css/tokens/`) |
| `schemas/import/` | Schémas JSON du format d'import (versionnés, `v1.0`/`v1.1`) |

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
Add archive confirmation for game types

- Add showArchiveConfirm/archiveGameType/dismissArchiveConfirm actions
- Add archiveConfirmGameTypeId to GameTypeState
- Archive button (🗑) with modal confirmation in detail view
- Updated doc/functional/features/games.md with archive flow
- ArchiveGameTypeUseCase tested
```

**Exemple mauvais commit:**
```
Update games screen
```
