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

Le fichier exporte encore une instance `partie` héritée du portage, que plus rien n'utilise —
son retrait est l'objet de l'issue #358.

## Propriétés

| Propriété | Type | Description |
|---|---|---|
| `joueurs` | `ResultatJoueur[]` | Liste des joueurs (nom, score, couleur) |
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
| `reinitialiser()` | Remet la partie à zéro |
| `terminerParMagiePirate()` | Flag victoire magique |

### Requêtes (lecture seule)

| Méthode | Description |
|---|---|
| `totalJoueur(index): Int` | Score total d'un joueur par index |
| `totalJoueurParNom(nom): Int` | Score total d'un joueur par nom |
| `mancheActuelle(): Int` | Numéro de la manche en cours |
| `totalMax(): Int` | Score maximum parmi les joueurs |
| `manches(): Int` | Nombre de manches jouées |
| `estTerminee(): Boolean` | Vrai si partie finie |

## Invariants

- Un joueur ne peut pas jouer deux tours consécutifs
- Quand un joueur dépasse 6 000 pts, le dernier tour commence
- L'annulation n'est possible que pour le dernier coup joué
- La victoire par pirate magique est immédiate (pas de dernier tour)

-
