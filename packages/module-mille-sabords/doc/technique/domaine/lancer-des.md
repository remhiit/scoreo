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
}
```

`LANCER_DES_VIDE` est le jet vide (tous les compteurs à 0) ; `lancerDes({ ... })` en construit un à
partir des seuls compteurs qui changent.

## Fonctions

Le Kotlin en faisait des méthodes d'instance ; en TypeScript ce sont des fonctions libres sur une
donnée immuable.

| Fonction | Description |
|---|---|
| `totalDes(des): number` | Somme des 6 compteurs |
| `valeurDe(des, id): number` | Le compteur désigné par son id (ex : `'skulls'`) |
| `avecValeur(des, id, valeur): LancerDes` | Une **copie** avec ce compteur modifié |

Note : les ids des dés sont en anglais (`'skulls'`, `'diamonds'`, …), hérités du HTML de l'app
Kotlin et conservés par le portage — ce sont eux que le corpus golden sérialise.

-
