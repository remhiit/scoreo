# CalculateurScore — CalculateurScore.kt

Fichier : `src/commonMain/kotlin/fr/ksabord/domaine/CalculateurScore.kt`

**Service domaine pur** : fonction sans état global ni effet de bord.

## Point d'entrée unique

```kotlin
fun calculerScore(dés: LancerDes, carte: String): ResultatScore
```

## Algorithme (simplifié)

1. **Appliquer la carte** — modifie les compteurs de dés selon la
   carte (ajout de diamants/ors/crânes, fusion animaux, etc.)
2. **Détecter le buste** — 3+ crânes → score = 0 (sauf carte Sorcière)
3. **Détecter l'Île de la Tête de Mort** — 4+ crânes avec carte ☠️
4. **Appliquer les règles de combat naval** si carte ⚔️ active
5. **Calculer les scores** :
   - Diamants/Or : 100 pts × nombre (hors non-scorants)
   - Séries : bonus selon `BONUS_SÉRIES` pour 3+ identiques
   - Carte Animaux : singes + perroquets comptés ensemble
6. **Détecter le coffre plein** — 8 dés scorants → +500 pts
7. **Détecter le pirate magique** — 9 diamants ou 9 ors
8. **Appliquer le capitaine** (×2) si la carte l'active
9. **Construire `ResultatScore`** avec score, details, flags

## Gestion des cartes

Chaque carte a un ID (voir `constantes.md`). L'effet est appliqué
avant le calcul du score.

| Carte | Effet sur le calcul |
|---|---|
| `captain` | Score final ×2 |
| `diamond` | +1 diamant (permet 9 scorants → pirate magique) |
| `gold` | +1 or (permet 9 scorants → pirate magique) |
| `animals` | Singes + perroquets fusionnés en un seul compteur |
| `witch` | Désactive le buste (les crânes ne bloquent pas) |
| `sea2/3/4` | Seuls les sabres comptent (seuil requis) |
| `skull1/2` | +1 ou +2 crânes (déclenche Île à 4+) |

-
