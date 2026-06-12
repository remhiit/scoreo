# P1-10: `CreateMatchUseCase` — validations manquantes

## Fichier
- `src/commonMain/kotlin/com/scoreo/application/CreateMatchUseCase.kt:12-29`

## Problème
3 validations absentes :

1. **Match 0 joueur** : `playerScores` peut être vide
2. **playerId en double** : même joueur peut apparaître 2x avec des scores différents
3. **manualWinners orphelins** : IDs non présents dans `playerScores`

```kotlin
operator fun invoke(
    gameTypeId: String,
    playerScores: List<PlayerScore>,
    date: Long,
    manualWinners: List<String> = emptyList(),
): Result<Match> = runCatching {
    val gameType = gameTypeRepository.findById(gameTypeId)
        ?: error("GameType $gameTypeId not found")
    // ← PAS de validations sur playerScores ou manualWinners
    val match = Match(...)
    matchRepository.save(match)
    match
}
```

## Correction
```kotlin
operator fun invoke(
    gameTypeId: String,
    playerScores: List<PlayerScore>,
    date: Long,
    manualWinners: List<String> = emptyList(),
): Result<Match> = runCatching {
    val gameType = gameTypeRepository.findById(gameTypeId)
        ?: error("GameType $gameTypeId not found")

    require(playerScores.size >= 2) { "A match needs at least 2 players" }

    val playerIds = playerScores.map { it.playerId }
    require(playerIds.distinct().size == playerIds.size) {
        "Duplicate player IDs in match"
    }
    require(manualWinners.all { it in playerIds }) {
        "manualWinners must be a subset of playerScores"
    }

    val match = Match(
        id = IdGenerator.newId(),
        date = date,
        gameTypeId = gameTypeId,
        playerScores = playerScores,
        manualWinners = manualWinners,
    )
    matchRepository.save(match)
    match
}
```

## Effort
10 min.

## Tests
Ajouter 3 tests à `CreateMatchUseCaseTest` (ou nouveau fichier) :
- `playerScores vide → throw`
- `playerId en double → throw`
- `manualWinners hors playerScores → throw`
