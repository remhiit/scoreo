# Synchronisation Google Drive

Par défaut, les données de Scoreo ne quittent pas l'appareil. La synchronisation les sauvegarde sur
votre Google Drive, pour ne pas les perdre et les retrouver sur un autre appareil.

L'entrée **Synchro** du menu n'apparaît que si la version de Scoreo que vous utilisez a été
configurée pour Google Drive.

## Se connecter

1. Menu ☰ → **Synchro**.
2. **Se connecter avec Google**, puis autorisez Scoreo dans la fenêtre de Google.
3. La synchronisation démarre aussitôt et se termine sur **Synchronisation terminée**, avec le nombre
   d'éléments envoyés et reçus.

Scoreo n'accède qu'à un dossier privé qui lui est réservé sur votre Drive : il n'est pas visible
dans vos fichiers, ne compte pas dans votre espace de stockage, et Scoreo ne voit aucun autre de vos
fichiers.

À chaque ouverture de l'application, la session est restaurée sans nouvelle fenêtre de connexion
(« Restauration de la session... ») ; si Google ne le permet plus (autorisation retirée, par
exemple), le bouton **Se connecter avec Google** revient.

**Déconnecter** met fin à la session sur cet appareil ; les données locales restent en place.

## Ce qui est synchronisé

Joueurs, jeux et parties. Le thème, la langue et la partie en cours restent propres à chaque
appareil.

À la connexion, Scoreo compare l'appareil et le Drive :

| Situation | Ce qui se passe |
|---|---|
| Les deux sont vides, ou identiques | Rien à faire |
| L'appareil est vide, le Drive a des données | Les données du Drive sont récupérées |
| L'appareil a des données, le Drive est vide | Les données de l'appareil sont envoyées |
| Les deux ont des données différentes | **Conflit de synchro** : vous choisissez (ci-dessous) |

Ensuite, chaque modification (joueur, jeu ou partie ajouté, modifié ou supprimé) est envoyée
automatiquement sur le Drive quelques secondes plus tard, sans passer par l'écran Synchro.

## Résoudre un conflit

L'écran affiche côte à côte la **Version locale** et la **Version distante**, avec pour chacune le
nombre de joueurs, de types de jeu et de parties, et leur date. Deux boutons :

- **Garder la version locale** : les données de l'appareil remplacent celles du Drive ;
- **Garder la version distante** : les données du Drive remplacent celles de l'appareil.

C'est un remplacement, pas un mélange : ce qui n'existe que du côté écarté est perdu. Pour réunir
deux historiques sans rien perdre, passez plutôt par l'[import](import.md), qui ajoute sans jamais
supprimer.

## Hors connexion et limites

- Hors connexion, l'écran Synchro l'indique ; Scoreo fonctionne normalement, et les modifications
  suivantes seront envoyées une fois la connexion revenue.
- Les conflits ne sont détectés qu'à la connexion. Entre deux connexions, le dernier appareil à
  envoyer ses données l'emporte : utilisé en parallèle sur deux appareils, l'un peut écraser les
  modifications de l'autre.
