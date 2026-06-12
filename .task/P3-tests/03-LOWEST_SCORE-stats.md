# P3-03: LOWEST_SCORE dans GetPlayerStatsUseCase

## Fichier
- `src/commonTest/kotlin/com/scoreo/application/GetPlayerStatsUseCaseTest.kt`

## Problème
Tous les tests existants utilisent HIGHEST_SCORE. LOWEST_SCORE n'est jamais testé dans le contexte des stats.

## Cas à tester
- Match avec LOWEST_SCORE → le plus PETIT score gagne
- MULTI: plusieurs joueurs avec le même score minimum → tous gagnants
- MANUAL + LOWEST_SCORE → `getWinners()` vérifie le dispatch correct

## Effort
15 min.
