# Saisir une partie

## Lancer une partie

1. Sur l'**Accueil**, sélectionnez au moins deux joueurs (un appui sur chaque ligne).
2. Appuyez sur **Nouvelle partie** : la fenêtre **Choisir un jeu** s'ouvre.
3. Choisissez le jeu dans la liste. Elle contient vos jeux, puis les jeux à compteur dédié auxquels
   vous n'avez encore jamais joué.
4. Appuyez sur **Lancer la partie**.

Pour un jeu qui n'existe pas encore, **Ajouter un nouveau jeu** ouvre un mini-formulaire (nom et
condition de victoire) ; **Ajouter le jeu** le crée et le sélectionne. Ses autres règles se
règlent ensuite depuis l'écran [Jeux](jeux.md).

**Lancer la partie** reste grisé quand le nombre de joueurs sélectionnés n'entre pas dans la
fourchette du jeu ; la fourchette est alors affichée (voir [Nombre de joueurs](jeux.md#nombre-de-joueurs)).

Un jeu ordinaire s'ouvre sur la feuille de score de Scoreo décrite ci-dessous ; un jeu à compteur
dédié s'ouvre sur sa propre feuille (voir [plus bas](#jouer-avec-un-compteur-dédié)).

## La feuille de score

### Date de la partie

En haut de l'écran, le champ **Date de la partie** est prérempli avec la date du jour. On peut
choisir un autre jour pour saisir une partie jouée plus tôt ; une date future, vide ou invalide
empêche d'enregistrer la partie. Seul le jour se choisit : l'heure enregistrée est celle de la
saisie.

### Classement et Historique

Deux onglets se partagent la même saisie ; passer de l'un à l'autre ne perd rien.

- **Classement** (par défaut) : une carte par joueur, rangée par position, avec son total et, en
  petit, ce qu'il a marqué à la dernière manche. Les joueurs en tête sont mis en avant ; les ex
  aequo partagent le même rang. Une ligne au-dessus rappelle le nombre de manches jouées et qui mène
  (le plus haut score, le plus bas score ou le plus de manches gagnées). En
  [manches gagnées](jeux.md#décompte-en-manches-gagnées), la carte affiche le nombre de manches
  gagnées et « +1 » pour le(s) gagnant(s) de la dernière manche. Cet onglet se consulte, il ne se
  modifie pas.
- **Historique** : une carte par manche (**Manche N**), avec le score de chaque joueur, modifiable
  directement. La croix d'une carte supprime la manche (impossible quand il n'en reste qu'une).
  **Ajouter une manche**, sous la liste, ouvre la saisie de manche.

### Saisir une manche

Le grand bouton **Saisir la manche N**, en bas de l'écran, ouvre un panneau **Manche N** : une ligne
par joueur avec son total actuel et un champ à 0 par défaut. **Enregistrer la manche** l'ajoute
(le classement se met à jour aussitôt) ; **Annuler**, ou un appui en dehors du panneau, n'ajoute
rien.

**Chaque saisie est enregistrée immédiatement** sur l'appareil : fermer l'onglet ou recharger la page
ne perd rien (voir [Reprendre une partie en cours](#reprendre-une-partie-en-cours)).

### Terminer la partie

**Terminer la partie** enregistre la partie et ramène à l'Accueil.

- Pour un jeu à victoire **manuelle**, une fenêtre **Sélectionner le(s) gagnant(s)** liste les
  joueurs avec leur total : désignez un ou plusieurs gagnants, puis **Confirmer**.
- En cas d'égalité en tête, la règle de départage du jeu s'applique (ci-dessous).

### Départager une égalité

Selon la [règle de départage](jeux.md#départage) du jeu :

- **aucune** : tous les ex aequo gagnent, la partie est enregistrée directement ;
- **sélection manuelle** : la fenêtre **Décision finale** propose les ex aequo ; désignez le(s)
  gagnant(s) puis **Confirmer**, ou **Garder l'égalité** pour que tous gagnent ;
- **score secondaire** : une fenêtre pose la question de départage du jeu (« Nombre de cartes ? »)
  avec un champ par ex aequo. Si les réponses désignent un gagnant, la partie est enregistrée ;
  sinon, la fenêtre **Décision finale** prend le relais.

### Abandonner la partie

**Annuler**, en bas de l'écran, quitte la partie sans l'enregistrer. Si des scores ont déjà été
saisis, la fenêtre **Abandonner les scores ?** prévient qu'ils seront perdus : **Abandonner**
confirme, **Annuler** revient à la saisie. Sans aucun score saisi, l'écran se ferme directement.

## Reprendre une partie en cours

Une partie commencée mais ni terminée ni abandonnée reste en mémoire. De retour sur l'Accueil, le
bandeau **Reprendre la partie en cours** la rouvre telle qu'elle était, manches comprises (la date
repart du jour).

Il n'y a qu'une partie en cours à la fois : lancer une nouvelle partie remplace celle qui attendait.

## Modifier une partie déjà enregistrée

Depuis l'[Historique](historique.md), le bouton crayon d'une partie rouvre sa feuille de score
(titre « Edit match »), avec ses manches telles qu'elles ont été jouées. On peut corriger un score,
ajouter ou supprimer une manche, changer la date, puis **Terminer la partie** : la partie est mise à
jour (même partie, même heure) et l'on revient à l'Historique.

- Une partie enregistrée sans le détail de ses manches (ancienne, ou importée) se rouvre avec un
  détail reconstitué qui redonne exactement ses scores : une seule manche portant les totaux en
  points, ou une manche par manche gagnée en manches gagnées.
- Une partie dont le détail des manches ne correspond pas à ses scores enregistrés se rouvre avec un
  avertissement **Données incohérentes** : la feuille affiche le détail enregistré, et à
  l'enregistrement le score est recalculé à partir de ces manches, ce qui fait disparaître
  l'avertissement.

## Jouer avec un compteur dédié

Skyjo, Flip 7, La Vallée des Torī et 1000 Sabords ont leur propre feuille de score, qui connaît les
règles du jeu et calcule les points. Ils apparaissent dans la fenêtre **Choisir un jeu** même si
vous n'y avez jamais joué ; la première partie crée le jeu dans votre liste. Un jeu de même nom créé
auparavant (par un import, par exemple) est repris par le compteur, pourvu que son historique soit
compatible avec ses règles.

- La feuille du compteur s'ouvre **en plein écran** : en haut, une fine bande porte le nom du jeu et
  une croix (**Quitter**) pour en sortir.
- Les règles (victoire, départage, nombre de joueurs) sont celles du compteur ; il départage
  lui-même les égalités.
- La partie en cours est enregistrée au fil de l'eau, comme sur la feuille de Scoreo, et le bandeau
  **Reprendre la partie en cours** de l'Accueil la rouvre sur la feuille du compteur.
- Après avoir enregistré une partie, la croix mène à l'**Historique**, où la partie qui vient d'être
  enregistrée est mise en évidence. Sans partie enregistrée, elle ramène à l'Accueil (ou à
  l'Historique quand on modifiait une partie).
- Une partie de ce jeu saisie avant le compteur, ou importée, se rouvre sur la feuille de Scoreo,
  où elle reste lisible et modifiable.

Le mode d'emploi de chaque compteur et les règles du jeu sont listés dans
[le sommaire](README.md#les-compteurs-dédiés).
