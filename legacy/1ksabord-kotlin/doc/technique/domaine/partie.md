# Partie — Partie.kt

Fichier : `src/commonMain/kotlin/fr/ksabord/domaine/Partie.kt`

**Racine d'agrégat** du domaine. Gère l'état global de la partie
en cours.

## Singleton

```kotlin
val partie = Partie()
```

Instance unique partagée entre tous les composants (domaine + UI).
Les adaptateurs (Actions.kt, Persistence.kt) y accèdent directement.

## Propriétés

| Propriété | Type | Description |
|---|---|---|
| `joueurs` | `MutableList<ResultatJoueur>` | Liste des joueurs (nom, score, couleur) |
| `historique` | `MutableList<EvenementCoup>` | Tous les coups joués (event sourcing) |
| `indexJoueurActuel` | `Int` | Index du joueur en train de jouer |
| `dernierTour` | `Boolean` | Vrai si c'est le dernier tour |
| `numeroDernierTour` | `Int` | Numéro de la manche de dernier tour |
| `commencee` | `Boolean` | Vrai si la partie a démarré |
| `magiquePirate` | `Boolean` | Vrai si victoire par pirate magique |

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
