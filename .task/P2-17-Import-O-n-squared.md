# P2-17: Import — lookup O(n²) dans `playerName()`

## Fichier
- `src/commonMain/kotlin/com/scoreo/application/ImportMatchesUseCase.kt:87`

## Problème
```kotlin
for (playerId in playerIds) {
    val expected = scores.find { it.playerId == playerId }?.score ?: 0
    val actual = game.details.sumOf { round ->
        round.scores.find { it.name == playerName(playerId, existingPlayers) }?.score ?: 0
    }
}
```

`playerName(playerId, existingPlayers)` fait un `players.find { it.id == playerId }` à chaque itération. Pour un match avec 4 joueurs et 10 rounds, c'est 40 `find()` calls. Chaque `find()` est O(n) sur `existingPlayers`.

## Correction
Construire une `Map<String, String>` une fois avant la boucle :

```kotlin
val playerNameMap = existingPlayers.associate { it.id to it.name }

// Dans la boucle de vérification :
val actual = game.details.sumOf { round ->
    round.scores.find {
        it.name == (playerNameMap[playerId] ?: playerId)
    }?.score ?: 0
}
```

## Effort
10 min.
