# P2-13: `StatsScreen` — `!!` sur mutable state

## Fichier
- `src/jsMain/kotlin/com/scoreo/ui/stats/StatsScreen.kt:15-16`

## Problème
```kotlin
if (state.selectedPlayer != null) {
    PlayerDetailView(state.selectedPlayer!!, onBack = { ... })
}
```

Le `!!` est dangereux — si un jour une refactor ajoute de l'async entre la condition et l'usage, ça crashe en NPE.

## Correction
```kotlin
state.selectedPlayer?.let { detail ->
    PlayerDetailView(detail, onBack = { handler.handle(StatsIntent.BackToLeaderboard) })
}
```

## Effort
2 min.
