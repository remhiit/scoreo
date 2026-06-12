# P1-08: Match ignoré silencieusement quand GameType manquant

## Fichiers
- `src/commonMain/kotlin/com/scoreo/application/GetHeadToHeadUseCase.kt:28`
- `src/commonMain/kotlin/com/scoreo/application/GetPlayerStatsUseCase.kt:20`

## Problème
```kotlin
// GetHeadToHeadUseCase.kt:28
val gameType = gameTypes[match.gameTypeId] ?: return@forEach

// GetPlayerStatsUseCase.kt:20
val gameType = gameTypeRepository.findById(match.gameTypeId) ?: return@forEach
```

Si un GameType est supprimé mais que des matchs le référencent :
- Le match est **silencieusement ignoré**
- Le joueur voit des stats incomplètes sans aucun message
- Les joueurs concernés (0 wins + 0 losses) sont exclus du leaderboard

## Correction

**Option A — Exposer un compteur de matchs orphelins**

Ajouter un champ dans le résultat pour que l'UI puisse l'afficher :

```kotlin
data class HeadToHeadResult(
    val leaderboard: List<PlayerDetail>,
    val orphanedMatches: Int,
)
```

**Option B (minimale) — Logger dans la console**

Ajouter un compteur interne et logger :

```kotlin
var orphanedCount = 0
allMatches.forEach { match ->
    val gameType = gameTypes[match.gameTypeId]
    if (gameType == null) {
        orphanedCount++
        return@forEach
    }
    // ...
}
if (orphanedCount > 0) {
    println("[Scoreo] Warning: $orphanedCount matches reference non-existent game types")
}
```

**Option C (recommandée) — Les deux**

Exposer `orphanedMatches` et logger.

Pour `GetPlayerStatsUseCase` : idem — ajouter un champ `orphanedMatches` à la classe `PlayerStats` ou retourner un wrapper.

## Effort
30 min (2 fichiers use case + mise à jour UI StatsScreen pour afficher le warning).

## Dépendance
P0-04 (error handling JSON) peut aider à détecter si la corruption localStorage cause la perte du GameType.
