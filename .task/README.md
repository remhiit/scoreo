# Plan de correction Scoreo

## Déjà corrigé
| Ticket | Fix |
|---|---|
| `StatsScreen empty CSS class` | `classes()` avec chaîne vide → crash `DOMTokenList.add`. Fix: conditional `if (cond) classes("active")`. Commit `cf27cd8`. |

## Organisation

| Priorité | Description | Tickets |
|---|---|---|
| **P0** | Crash ou perte de données — à corriger immédiatement | 5 tickets |
| **P1** | Résultats faux ou incohérents | 7 tickets |
| **P2** | Robustesse et qualité | 5 tickets |
| **P3** | Tests manquants | 5 tickets |

## Dépendances

```
P0-01 ─┐
P0-02 ─┤
P0-03 ─┤
P0-04 ─┤
P0-05 ─┤
        ├──→ P1-08 (silent skip lié à P0-04 error handling)
P1-06 ─┤
P1-07 ─┤
P1-09 ─┤
P1-10 ─┤
P1-11 ─┤
P1-12 ─┤
        ├──→ P2-13..17 (indépendants)
        └──→ P3-tests (indépendants, peut commencer en parallèle)
```

## Effort estimé total : ~3-5 sessions

| S session | Tickets | Focus |
|---|---|---|
| 1 | P0-01 à P0-05 | Crash fixes, validation |
| 2 | P1-06, P1-07 | ELO (algorithmique, le plus impactant) |
| 3 | P1-08 à P1-12 | Silent skip, import, validation |
| 4 | P2-13 à P2-17 | Robustesse |
| 5 | P3-tests | Couverture de tests |
