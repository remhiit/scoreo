# Import

L'écran **Importer** (menu ☰ → **Importer**) ajoute à Scoreo des parties décrites dans un fichier
JSON — par exemple l'historique d'une autre application de scores. L'import **ajoute** des parties :
il ne supprime ni ne modifie jamais ce qui existe déjà.

## Importer un fichier

1. Appuyez sur la zone **Sélectionnez un fichier JSON à importer** et choisissez un fichier `.json`.
2. Scoreo affiche un aperçu : le **Jeu** concerné et le nombre de **Parties à importer**.
3. Appuyez sur **Importer**.
4. Le bilan s'affiche, partie par partie :
   - **importées** ;
   - **ignorées (ID en double)** : la partie existe déjà, par exemple parce que le fichier a déjà été
     importé — réimporter un fichier est donc sans danger ;
   - **échouées** : la partie est refusée (son identifiant est listé), par exemple quand le détail de
     ses manches ne correspond pas à son score final.
5. **Terminé** ramène à l'Accueil.

Si le fichier ne peut pas être lu, un message d'erreur s'affiche sous la zone de sélection ; il
suffit d'en choisir un autre.

## Ce que l'import crée

- Un jeu inconnu est créé, avec la condition de victoire du fichier et un décompte en points.
- Un joueur inconnu (comparé par son nom) est créé.
- Quand le fichier donne le détail des manches, il est conservé : la partie s'affiche dans
  l'[Historique](historique.md) comme une partie saisie dans Scoreo.

Si l'import a créé des doublons (« Jean Luc » à côté de « Jean-Luc », « belote » à côté de
« Belote »), la fusion les réunit : voir [Fusionner des joueurs](joueurs.md#fusionner-des-doublons)
et [Fusionner des jeux](jeux.md#fusionner-des-doublons).

Le fichier porte toujours des points. Importées dans un jeu existant qui compte en
[manches gagnées](jeux.md#décompte-en-manches-gagnées), les parties y sont converties : le score
devient le nombre de manches gagnées, calculé à partir du détail (une partie sans détail compte comme
une manche unique).

## Le format du fichier

Un fichier décrit les parties d'un seul jeu :

```json
{
  "version": "1.1",
  "game": "Belote",
  "winCondition": "HIGHEST_SCORE",
  "games": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "date": 1767225600000,
      "ranking": [
        { "name": "Alice", "score": 25, "rank": 1 },
        { "name": "Bob", "score": 18, "rank": 2 }
      ],
      "details": [
        { "scores": [{ "name": "Alice", "score": 10 }, { "name": "Bob", "score": 5 }] },
        { "scores": [{ "name": "Alice", "score": 15 }, { "name": "Bob", "score": 13 }] }
      ]
    }
  ]
}
```

| Champ | Obligatoire | Description |
|---|---|---|
| `version` | non | `"1.0"` ou `"1.1"` ; `"1.0"` par défaut |
| `game` | oui | Nom du jeu (créé s'il n'existe pas) |
| `winCondition` | non | `HIGHEST_SCORE`, `LOWEST_SCORE` ou `MANUAL` (par défaut `MANUAL`) |
| `games[]` | oui | Les parties |
| `games[].id` | oui | Identifiant unique de la partie (sert à repérer les doublons) |
| `games[].date` | non | Date en millisecondes depuis 1970 ; date de l'import par défaut |
| `games[].ranking` | oui | Au moins deux joueurs, chacun avec `name`, `score` et `rank` |
| `games[].details` | non | Le détail manche par manche (version 1.1) ; la somme des manches de chaque joueur doit égaler son score |

Les schémas JSON complets sont dans [`schemas/import/`](../../schemas/import/).
