# LancerDes — lancerDes.ts

Fichier : `src/domain/lancerDes.ts`

Objet valeur **immutable** représentant un jet de 8 dés.

## Structure

```ts
interface LancerDes {
  readonly cranes: number
  readonly diamants: number
  readonly or: number
  readonly singes: number
  readonly perroquets: number
  readonly sabres: number
)
```

Tous les champs par défaut à 0 (jet vide).

## Méthodes

| Méthode | Description |
|---|---|
| `total: Int` | Somme des 6 compteurs (getter calculé) |
| `valeur(id: String): Int` | Retourne le compteur par son ID HTML (ex : `"skulls"`) |
| `avecValeur(id: String, valeur: Int): LancerDes` | Copie avec un compteur modifié |

Note : les IDs des dés en HTML sont en anglais (`"skulls"`, `"diamonds"`,
etc.) pour le mapping avec `valeur()`.

-
