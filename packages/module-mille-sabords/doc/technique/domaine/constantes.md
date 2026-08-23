# Constantes — constantes.ts

Fichier : `src/domain/constantes.ts`

Contient toutes les constantes du domaine. Pas de logique, que des
déclarations.

## Couleurs des joueurs

```ts
const COULEURS_JOUEURS = ['#e74c3c', '#3498db', '#2ecc71', ...]
```

8 couleurs correspondant aux variables CSS `--c0` à `--c7`.

## Types de dés

```ts
interface TypeDe {
  readonly id: string
  readonly icone: string
  readonly label: string
}
```

6 types : crânes, diamants, or, singes, perroquets, sabres.

## Cartes

```ts
interface DefCarte {
  readonly id: string
  readonly label: string
}
```

10 cartes :

| ID | Label |
|---|---|
| `none` | Aucune |
| `captain` | Capitaine (×2) |
| `diamond` | Diamant +1 |
| `gold` | Or +1 |
| `animals` | Animaux |
| `witch` | Sorcière |
| `sea2` | Combat naval (2 sabres) |
| `sea3` | Combat naval (3 sabres) |
| `sea4` | Combat naval (4 sabres) |
| `skull1` | Tête de mort +1 |
| `skull2` | Tête de mort +2 |

## Bonus de séries

```ts
const BONUS_SERIES: ReadonlyMap<number, number> = new Map([
  [3, 100], [4, 200], [5, 500], [6, 1000], [7, 2000], [8, 4000], [9, 4000],
])
```

-
