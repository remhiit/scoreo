# P1-07: ELO over-counting en multi-joueurs

## Fichier
- `src/commonMain/kotlin/com/scoreo/application/GetHeadToHeadUseCase.kt:96-104`

## Problème
Avec K=32 et (N-1) losers vs 1 winner, le winner gagne K × (N-1) ELO total. En 4 joueurs = +96 au lieu de +~32.

L'ELO standard attend un seul adversaire par match. En multi-joueurs, il faut normaliser.

## Correction
Ajouter une normalisation par `(participants.size - 1)` ET utiliser `roundToInt()` au lieu de `toInt()` :

```kotlin
import kotlin.math.roundToInt

private const val K = 32

// Dans computeElo()
val normK = K / (participants.size - 1)
for (winner in winners) {
    for (loser in participants) {
        if (loser in winners) continue
        val rW = preElo[winner] ?: 1200
        val rL = preElo[loser] ?: 1200
        val eW = 1.0 / (1.0 + 10.0.pow((rL - rW) / 400.0))
        val eL = 1.0 / (1.0 + 10.0.pow((rW - rL) / 400.0))
        elo[winner] = (rW + normK * (1.0 - eW)).roundToInt()
        elo[loser] = (rL + normK * (0.0 - eL)).roundToInt()
    }
}
```

Note : `normK` est un `Double` pour éviter la division entière.

## Effort
5 min (2 lignes changées).

## Dépendance
À faire APRÈS P1-06 (même fonction, le snapshot pré-match doit être appliqué en premier).

## Tests
- 3 joueurs, 1 match, 1 winner → vérifier winner: 1200→~1211, losers: 1200→~1189
- 4 joueurs, 1 match, 2 winners → vérifier normalisation correcte
