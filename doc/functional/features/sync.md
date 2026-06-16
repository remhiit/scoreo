# Sync — Sauvegarde cloud Google Drive

## Connexion

1. Aller dans l'écran Sync (menu burger ☁)
2. Cliquer « Connect with Google »
3. Popup OAuth Google — autoriser l'accès à l'App Data Folder
4. Le sync se déclenche automatiquement après connexion

## Fonctionnement

- Stockage : **App Data Folder** Google Drive (invisible pour l'utilisateur, ne compte pas dans le quota)
- Fichier unique : `scoreo-data.json`
- Scope : `drive.appdata` uniquement
- Token Model OAuth (GIS) — refresh silencieux géré par Google

## Sync automatique

Déclenché après chaque connexion :

1. Lit les données locales (players, gameTypes, matches)
2. Lit les données distantes via Drive
3. Compare :
   - Local vide + Drive vide → rien
   - Local vide + Drive a des données → pull auto
   - Local a des données + Drive vide → push auto (création du fichier)
   - Identiques → déjà synchronisé
   - Différents → **conflit** → demande à l'utilisateur

## Résolution de conflit

L'utilisateur voit les deux versions (locale et distante) avec compteurs et dates. Choix :
- **Keep local** → les données locales écrasent Drive
- **Keep remote** → les données distantes écrasent le local

## Mode offline

- `window.navigator.onLine` détecte la connectivité
- Si hors-ligne : l'écran Sync affiche un message
- Au retour online, l'utilisateur peut relancer la sync manuellement
- Pas de file d'attente offline — re-sync complet au retour
