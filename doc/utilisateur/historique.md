# Historique

L'écran **Historique** (menu ☰ → **Historique**) liste toutes les parties enregistrées, de la plus
récente à la plus ancienne.

## La liste des parties

Chaque partie occupe une ligne sur trois niveaux :

1. le nom du jeu ;
2. le score de chaque joueur, séparés par « · », le(s) gagnant(s) en gras ;
3. la date et l'heure de la partie.

Un joueur supprimé apparaît comme « Alice (deleted) », ou « Deleted player » si son nom a été effacé
(voir [Supprimer un joueur](joueurs.md#supprimer-un-joueur)).

Une partie dont le détail des manches ne correspond pas aux scores enregistrés porte un badge
**Données incohérentes**. Elle compte avec ses scores enregistrés jusqu'à ce qu'on la modifie (voir
[Modifier une partie](saisir-une-partie.md#modifier-une-partie-déjà-enregistrée)).

En sortant d'un compteur dédié juste après avoir enregistré une partie, on arrive ici avec cette
partie mise en évidence.

## Filtrer par jeu

La liste déroulante **Filtrer par jeu** en haut de l'écran restreint la liste à un seul jeu ;
**Tous les jeux** retire le filtre. Sans aucune partie, l'écran affiche « Aucune partie pour
l'instant. » ; filtré sur un jeu sans partie, « Aucune partie pour {jeu} ».

## Les actions sur une partie

Chaque ligne a trois boutons.

### Voir le détail des manches

Le bouton œil ouvre la fenêtre **Détail des manches**, en lecture seule :

- le jeu et la date en tête ;
- une carte par manche (**Manche N**) avec le score de chaque joueur, dans l'ordre où elles ont été
  jouées ;
- la ligne **Total :** en bas, gagnant(s) en gras.

Une partie enregistrée sans le détail de ses manches (ancienne, ou importée sans détail) affiche « Le
détail des manches n'a pas été enregistré pour cette partie. » à la place des cartes. Une partie
incohérente affiche l'avertissement correspondant au-dessus des cartes.

La fenêtre se ferme avec **Fermer**, un appui en dehors, ou la touche Échap.

### Modifier la partie

Le bouton crayon rouvre la feuille de score de la partie pour la corriger (voir
[Modifier une partie déjà enregistrée](saisir-une-partie.md#modifier-une-partie-déjà-enregistrée)).

### Supprimer la partie

Le bouton corbeille ouvre la fenêtre **Supprimer la partie ?**, qui rappelle le jeu, la date et les
scores, et prévient que les données de la partie seront perdues. **Supprimer** l'efface
définitivement ; statistiques et trophées sont recalculés sans elle.
