# Jeux et règles

Chaque partie se joue à un **type de jeu** : Belote, Tarot, Skyjo… Le type de jeu porte les règles
qui décident du gagnant. On les gère depuis l'écran **Jeux** (menu ☰ → **Jeux**) ; on peut aussi
créer un jeu à la volée au moment de lancer une partie (voir
[Saisir une partie](saisir-une-partie.md#lancer-une-partie)).

## La liste des jeux

Les jeux s'affichent dans leur ordre de création, avec leur condition de victoire. Chaque ligne a
trois boutons :

- **voir** : ouvre la fiche du jeu ;
- **modifier** : ouvre le formulaire du jeu (absent pour un jeu à compteur dédié, voir plus bas) ;
- **archiver**.

Le formulaire de création, terminé par le bouton **Ajouter un type de jeu**, se trouve au-dessus de
la liste.

## Les règles d'un jeu

| Réglage | Choix | Effet |
|---|---|---|
| Nom du jeu | texte libre | Le nom affiché partout |
| Condition de victoire | Highest score / Lowest score / Manual | Le plus haut total gagne, le plus bas total gagne, ou les joueurs désignent eux-mêmes le(s) gagnant(s) à la fin |
| Décompte | Total des points / Manches gagnées | Additionner les points de toutes les manches, ou compter les manches gagnées (voir plus bas). Masqué quand la victoire est manuelle |
| Règle de départage | No tie-break / Manual selection / Secondary score | Que faire quand plusieurs joueurs sont à égalité en tête (voir plus bas) |
| Joueurs min. / Joueurs max. | nombre entier, ou vide pour « aucune limite » | Empêche de lancer une partie avec trop peu ou trop de joueurs |

### Décompte en manches gagnées

On saisit toujours les points de chaque manche. En « Manches gagnées », chaque manche est gagnée par
le meilleur score de la manche (le plus haut ou le plus bas selon la condition de victoire ; tous les
ex aequo la gagnent), et le score final d'un joueur est le nombre de manches qu'il a gagnées. Le
gagnant de la partie est celui qui a gagné le plus de manches.

### Départage

- **No tie-break** : l'égalité est conservée, tous les joueurs à égalité en tête gagnent.
- **Manual selection** : à la fin de la partie, Scoreo demande de désigner le(s) gagnant(s) parmi
  les ex aequo.
- **Secondary score** : Scoreo pose une question de départage (« Nombre de cartes », par exemple),
  saisie pour chaque ex aequo ; la **condition de départage** dit si la plus haute ou la plus basse
  réponse l'emporte. Si l'égalité persiste, on désigne le gagnant à la main.

Le déroulé côté partie est décrit dans [Départager une égalité](saisir-une-partie.md#départager-une-égalité).

### Nombre de joueurs

Avec un minimum et/ou un maximum, **Lancer la partie** est grisé quand le nombre de joueurs
sélectionnés n'entre pas dans la fourchette, qui est alors affichée (« 2 à 4 joueurs », « 3
joueurs minimum », « 6 joueurs maximum »). Un minimum supérieur au maximum est refusé ; deux bornes
égales fixent un nombre exact de joueurs. Les parties déjà enregistrées hors de la fourchette restent
valables.

## Modifier un jeu

Depuis la fiche (**Modifier**) ou le bouton crayon de la liste, la fenêtre **Modifier {nom}**
reprend le formulaire ; **Enregistrer les modifications** valide.

**Les règles valent pour tout l'historique du jeu.** Changer le décompte (points ↔ manches gagnées),
ou la condition de victoire d'un jeu en manches gagnées, recalcule le score de toutes les parties
déjà jouées à ce jeu ; gagnants, statistiques, Elo et trophées suivent. Le formulaire prévient avant
d'enregistrer quand c'est le cas. Une partie enregistrée sans le détail de ses manches devient, en
passant aux manches gagnées, une manche unique portant ses scores.

## Archiver un jeu

Le bouton corbeille (ou **Archiver** sur la fiche) ouvre la fenêtre **Archiver {nom} ?** : le jeu
n'apparaîtra plus dans la sélection de jeu. Ses parties restent dans l'historique et les
statistiques.

## Fusionner des doublons

Un import peut créer « Belote », « Belote  » et « belote ». Le bouton **Fusionner**, sous la liste,
apparaît dès qu'il existe au moins deux jeux (archivés compris) et ouvre **Fusionner des jeux** :

1. choisissez le **Jeu à conserver** ;
2. cochez un ou plusieurs **Doublons à supprimer** ;
3. la fenêtre indique combien de parties seront transférées ;
4. **Fusionner** transfère les parties des doublons au jeu conservé, puis supprime définitivement
   les doublons (contrairement à l'archivage).

Les jeux archivés figurent dans ces listes, marqués « (archivé) ». Si le jeu conservé était archivé
et qu'un doublon ne l'était pas, il est désarchivé. Une partie en cours sur un doublon est
abandonnée.

Si les jeux sélectionnés n'ont pas les mêmes règles de score, la fenêtre prévient que celles du jeu
conservé s'appliqueront aux parties transférées, ce qui peut en changer les gagnants — la fusion
reste possible : choisir le jeu conservé, c'est choisir ses règles.

Un jeu à compteur dédié n'accepte que les doublons du même compteur et des parties compatibles avec
ses règles ; sinon la fenêtre affiche **Fusion impossible** et rien n'est modifié.

## Les jeux à compteur dédié

Skyjo, Flip 7, La Vallée des Torī et 1000 Sabords ont leur propre feuille de score dans Scoreo. Un
tel jeu apparaît dans la liste des jeux après sa première partie (avant, il est seulement proposé au
lancement d'une partie).

Ses règles sont celles du compteur : sa fiche, en lecture seule, montre la condition de victoire, le
départage (« Décidé par le compteur de points ») et le nombre de joueurs, et rappelle que ces règles
ne se modifient pas. Seuls **Retour** et **Archiver** sont proposés. Il compte toujours en points.

Voir [Jouer avec un compteur dédié](saisir-une-partie.md#jouer-avec-un-compteur-dédié).
