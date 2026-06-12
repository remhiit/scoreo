# P3 — Tests manquants

## Organisation

| Ticket | Description | Dépendances |
|---|---|---|
| `01-ELO-edge-cases.md` | ELO: matchs nuls, 3+ joueurs, négatif, LOWEST_SCORE | P1-06, P1-07 |
| `02-LocalStorage-repos.md` | Tests production des 3 repos localStorage | P0-03, P0-04 |
| `03-LOWEST_SCORE-stats.md` | LOWEST_SCORE dans GetPlayerStatsUseCase | — |
| `04-Backward-compat-serialization.md` | Désérialisation anciens formats | — |
| `05-Migration-edge-cases.md` | Migration: uppercase hex, dates invalides, idempotence | P1-09 |

Tous les tests sont à écrire dans `src/commonTest/kotlin/com/scoreo/` en utilisant les InMemoryRepositories existants.

Pour les tests LocalStorage (P3-02), il faudra un mock de `localStorage` — voir si un framework de mock JS est disponible ou créer un wrapper simple.
