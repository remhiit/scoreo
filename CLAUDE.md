# Scoreo

Kotlin/JS + Compose HTML. MVI (Handler/Intent/State). Architecture hexagonale (Ports & Adapters).

## Avant d'explorer le code

Lire ces fichiers dans l'ordre. Tout le contexte nécessaire y est :

0. `doc/reference.md` — Tableaux de référence (handlers, use cases, models, navigation, tests)
1. `doc/glossary.md` — Définitions (Handler, Intent, State, Port, Adapter, Use Case)
2. `doc/technical/architecture.md` — Stack, patterns, persistence, backward compat
3. `doc/functional/features.md` — User flow complet, navigation, import
4. `doc/technical/migrations.md` — Migrations de données (si pertinent)

## Arborescence clé

| Dossier | Contenu |
|---|---|
| `src/commonMain/` | Domaine, application, handlers MVI |
| `src/jsMain/` | Écrans Compose HTML, localStorage |
| `src/commonTest/` | Tests unitaires JVM |

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
