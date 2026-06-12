# P3-01: ELO edge-cases

## Fichier cible
- `src/commonTest/kotlin/com/scoreo/application/` → nouveau fichier `GetHeadToHeadUseCaseEloTest.kt`

## Cas à tester

### 1. Match nul (tous ex-aequo)
- 2 joueurs, scores égaux `[10, 10]`, HIGHEST_SCORE
- `computeWinners()` retourne les 2
- Vérifier : `winners.size == 2`, ELO inchangé (1200, 1200)

### 2. 3 joueurs, 1 winner, 2 losers
- Alice=10, Bob=5, Charlie=3
- Vérifier : Alice ELO > 1200, Bob et Charlie < 1200
- Vérifier : somme des deltas ≈ 0 (conservation)

### 3. 3 joueurs, 2 winners, 1 loser
- Alice=10, Bob=10, Charlie=3
- Vérifier : Alice et Bob > 1200, Charlie < 1200
- Vérifier que le delta ELO est normalisé (P1-07)

### 4. 4 joueurs, 1 winner
- Vérifier que l'ELO du winner ne change pas 3x plus qu'en 1v1 (P1-06, P1-07)

### 5. ELO avec LOWEST_SCORE
- 3 joueurs, Alice=3 (gagnante), Bob=10, Charlie=15
- Vérifier ELO cohérent

### 6. Ordre déterministe sur date identique
- 2 matchs à la même date
- Trier par ID en secondaire → résultat déterministe

## Effort
45 min (6 cas, avec setup + assertions exactes ou relatives).
