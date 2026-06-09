# Scoreo

Kotlin/JS + Compose HTML. MVI (Handler/Intent/State). Architecture hexagonale (Ports & Adapters).

## Avant d'explorer le code

Lire ces fichiers dans l'ordre. Tout le contexte nécessaire y est :

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

## Règles

- Handler dans `ui/*/`. Reçoit un `Intent` → produit un `State`.
- Use Case dans `application/`. Opération métier, zéro dépendance framework.
- Interface Repository dans `domain/port/`. Implémentation dans `jsMain/infrastructure/`.
- Tout modèle sérialisé (`Player`, `GameType`, `Match`, `PlayerScore`) doit être **backward-compatible**.
- Ajouter un champ ? Toujours fournir une valeur par défaut.
- Supprimer/renommer un champ ? Migration obligatoire dans `doc/technical/migrations.md`.
