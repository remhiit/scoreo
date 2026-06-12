# P0-05: Nom vide autorisé pour Player et GameType

## Fichiers
- `src/commonMain/kotlin/com/scoreo/application/AddPlayerUseCase.kt:8`
- `src/commonMain/kotlin/com/scoreo/application/AddGameTypeUseCase.kt:9`

## Problème
```kotlin
// AddPlayerUseCase.kt:8
val player = Player(id = IdGenerator.newId(), name = name.trim())
// "  ".trim() = "" → joueur sans nom

// AddGameTypeUseCase.kt:9
val gameType = GameType(id = IdGenerator.newId(), name = name.trim(), winCondition = winCondition)
// idem → type de jeu sans nom
```

## Correction
```kotlin
// AddPlayerUseCase.kt
operator fun invoke(name: String): Player {
    val trimmed = name.trim()
    require(trimmed.isNotEmpty()) { "Player name must not be blank" }
    val player = Player(id = IdGenerator.newId(), name = trimmed)
    repository.save(player)
    return player
}
```

```kotlin
// AddGameTypeUseCase.kt
operator fun invoke(name: String, winCondition: WinCondition): GameType {
    val trimmed = name.trim()
    require(trimmed.isNotEmpty()) { "Game type name must not be blank" }
    val gameType = GameType(id = IdGenerator.newId(), name = trimmed, winCondition = winCondition)
    repository.save(gameType)
    return gameType
}
```

## Effort
5 min.

## Tests
- `AddPlayerUseCaseTest` — ajouter test avec `"  "` qui doit throw
- `AddGameTypeUseCaseTest` — idem
