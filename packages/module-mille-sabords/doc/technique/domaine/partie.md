# Partie — partie.ts

Fichier : `src/domain/partie.ts`

**Racine d'agrégat** du domaine. Gère l'état global de la partie
en cours.

## Une instance par état, pas un singleton

L'app Kotlin partageait un `val partie` global entre tous ses composants. Le module ne le fait pas :
l'agrégat est **mutable**, et le garder dans l'état du réducteur ferait dépendre sa sortie de qui
d'autre en détient une référence.

L'écran garde donc le **journal d'événements** et rejoue l'agrégat quand il en a besoin :

```ts
const partie = partieDeLEtat(state) // replayPartie(joueurs, historique)
```

## Propriétés

| Propriété | Type | Description |
|---|---|---|
| `joueurs` | `string[]` | Les noms, dans l'ordre du tour. Les scores n'y sont pas : ils se dérivent du journal |
| `historique` | `EvenementCoup[]` | Tous les coups joués (event sourcing) |
| `indexJoueurActuel` | `number` | Index du joueur en train de jouer |
| `dernierTour` | `boolean` | Vrai si c'est le dernier tour |
| `numeroDernierTour` | `number` | Numéro de la manche de dernier tour |
| `commencee` | `boolean` | Vrai si la partie a démarré |
| `magiquePirate` | `boolean` | Vrai si victoire par pirate magique |

## Méthodes publiques

### Commandes (mutent l'état)

| Méthode | Description |
|---|---|
| `commencer()` | Initialise la partie avec les joueurs configurés |
| `ajouterCoup(coup)` | Ajoute un coup, passe au joueur suivant |
| `annulerDernier()` | Annule le dernier coup (défait le score) |
| `terminerParMagiePirate()` | Flag victoire magique |

### Requêtes (lecture seule)

| Méthode | Description |
|---|---|
| `totalJoueur(index): number` | Score total d'un joueur, par index |
| `mancheActuelle(): number` | Numéro de la manche en cours |
| `totalMax(): number` | Score maximum parmi les joueurs |
| `manches(): EvenementCoup[][]` | Les coups **groupés par manche**, un tableau par manche |
| `estTerminee(): boolean` | Vrai si la partie est finie |

`totalJoueurParNom(nom)` est privée : c'est elle qui porte le repli à zéro à chaque événement
(`Math.max(0, acc + contribution)`), l'invariant sans lequel les manches ne somment plus au
classement.

## Invariants

- Un joueur ne peut pas jouer deux tours consécutifs
- Quand un joueur dépasse 6 000 pts, le dernier tour commence
- L'annulation n'est possible que pour le dernier coup joué
- La victoire par pirate magique est immédiate (pas de dernier tour)

-
