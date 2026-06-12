# P2-15: Inconsistent `remember` key pattern dans App.kt

## Fichier
- `src/jsMain/kotlin/com/scoreo/App.kt:108,119`

## Problème
```kotlin
// History (L108) : a un key
val historyHandler = remember(navigator.current) { HistoryHandler(...) }

// Stats (L119) : pas de key
val statsHandler = remember { StatsHandler(...) }
```

`remember(navigator.current)` est un anti-pattern ici : le handler est recréé à chaque navigation vers l'écran, inutilement.

## Correction
Uniformiser les deux en `remember {}` (le refresh est déjà fait par `LaunchedEffect`).

```kotlin
// L108
val historyHandler = remember {
    HistoryHandler(
        getMatches = GetMatchesUseCase(matchRepository),
        getPlayers = GetPlayersUseCase(playerRepository),
        getGameTypes = GetGameTypesUseCase(gameTypeRepository),
    )
}
```

Et supprimer le `remember(navigator.current)` pour le laisser en `remember {}`.

## Effort
5 min.
