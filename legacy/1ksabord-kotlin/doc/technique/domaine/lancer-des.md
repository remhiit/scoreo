# LancerDés — LancerDes.kt

Fichier : `src/commonMain/kotlin/fr/ksabord/domaine/LancerDes.kt`

Objet valeur **immutable** représentant un jet de 8 dés.

## Structure

```kotlin
@Serializable
data class LancerDés(
    val crânes: Int = 0,
    val diamants: Int = 0,
    val or: Int = 0,
    val singes: Int = 0,
    val perroquets: Int = 0,
    val sabres: Int = 0
)
```

Tous les champs par défaut à 0 (jet vide).

## Méthodes

| Méthode | Description |
|---|---|
| `total: Int` | Somme des 6 compteurs (getter calculé) |
| `valeur(id: String): Int` | Retourne le compteur par son ID HTML (ex : `"skulls"`) |
| `avecValeur(id: String, valeur: Int): LancerDés` | Copie avec un compteur modifié |

Note : les IDs des dés en HTML sont en anglais (`"skulls"`, `"diamonds"`,
etc.) pour le mapping avec `valeur()`.

-
