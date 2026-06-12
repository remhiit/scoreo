# P1-06: ELO cascade bug — ratings mutés intra-match

## Fichier
- `src/commonMain/kotlin/com/scoreo/application/GetHeadToHeadUseCase.kt`

## Problème
Lignes 96-105 : les ratings ELO sont mutés dans `elo` map et immédiatement relus pour la paire suivante du même match.

```kotlin
for (winner in winners) {
    for (loser in participants) {
        if (loser in winners) continue
        val rW = elo[winner] ?: 1200  // ← LIT le rating potentiellement déjà mis à jour
        val rL = elo[loser] ?: 1200
        // ...
        elo[winner] = (rW + K * (1.0 - eW)).toInt()  // ← MUTE
        elo[loser] = (rL + K * (0.0 - eL)).toInt()    // ← MUTE
    }
}
```

**Exemple concret (3 joueurs, Alice bat Bob et Charlie) :**
1. Alice vs Bob : Alice 1200 → 1216, Bob 1200 → 1184
2. Alice vs Charlie : Alice part de **1216** (post-Bob) au lieu de 1200 → ≈1231 au lieu de 1216
3. Erreur finale : Alice devrait être 1232, elle est ~1247

## Correction
Prendre un snapshot pré-match :

```kotlin
private fun computeElo(matches: List<Match>, gameTypes: Map<String, GameType>): Map<String, Int> {
    val elo = mutableMapOf<String, Int>()
    val sorted = matches.sortedBy { it.date }

    for (match in sorted) {
        val gt = gameTypes[match.gameTypeId] ?: continue
        val winners = match.getWinners(gt).toSet()
        if (winners.isEmpty()) continue
        val participants = match.playerScores.map { it.playerId }
        val preElo = elo.toMap()  // ← snapshot avant le match

        for (winner in winners) {
            for (loser in participants) {
                if (loser in winners) continue
                val rW = preElo[winner] ?: 1200  // ← utilise le snapshot
                val rL = preElo[loser] ?: 1200
                val eW = 1.0 / (1.0 + 10.0.pow((rL - rW) / 400.0))
                val eL = 1.0 / (1.0 + 10.0.pow((rW - rL) / 400.0))
                elo[winner] = (rW + K * (1.0 - eW)).toInt()
                elo[loser] = (rL + K * (0.0 - eL)).toInt()
            }
        }
    }
    return elo
}
```

## Effort
15 min (modification localisée, 3 lignes changées).

## Tests
Ajouter un test avec 3 joueurs, 1 match, 1 winner, vérifier les ELO exacts :
- Winner (1200→1216) vs Loser1 (1200→1184)
- Winner (1200→1216) vs Loser2 (1200→1184)
