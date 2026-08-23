# L'écran — Vue d'ensemble

`src/ui/module/` — l'écran que Scoreo affiche quand quelqu'un ouvre une partie de 1000 Sabords.

## Fichiers

| Fichier | Rôle |
|---|---|
| `milleSabordsModuleTypes.ts` | `MilleSabordsState`, `MilleSabordsAction`, et le schéma du brouillon |
| `milleSabordsModuleReducer.ts` | Le réducteur pur `(state, action) => state`, et les dérivations |
| `scoresRapides.ts` | Les raccourcis de saisie : groupes de scores fréquents, île rapide, libellés de cartes |
| `MilleSabordsModuleScreen.tsx` | Le rendu React, conforme à `ScoringModuleScreenProps` |

## Ce que l'écran reçoit et rend

```ts
export default function MilleSabordsModuleScreen({ host, playerIds, editing, onExit })
```

- `playerIds` — les joueurs choisis dans Scoreo. Leurs **noms** viennent de `host.getPlayers()` :
  le module ne stocke jamais un nom, seulement un id.
- `editing` — présent quand on rouvre une partie enregistrée ; sa charge est le brouillon que le
  module avait écrit. Rouvrir gagne toujours sur le brouillon courant : l'hôte a demandé *cette*
  partie-là.
- `host.saveDraft` à chaque transition, `host.saveMatch` à la fin, `onExit` pour rendre la main.

## Les deux onglets

| Onglet | Ce qu'il fait |
|---|---|
| **Calculateur** | Les six compteurs de dés et la carte piochée ; `calculerScore` recalcule le score du tour à chaque frappe, avec son détail |
| **Saisie rapide** | Un score tapé à la main, un multiplicateur ×2, des scores fréquents et l'île rapide — pour les tables qui comptent plus vite que l'app |

Les deux produisent le même objet : un `EvenementCoup` ajouté à l'historique. Le tableau de bord
(total par joueur, joueur courant, manche, seuil des 6000, dernier tour) est dérivé de cet
historique, jamais stocké à côté.

## Deux écrans, pas deux routes

L'écran de fin remplace l'écran de jeu quand la partie est terminée — seuil des 6000 franchi et
dernier tour joué, ou fin demandée par les joueurs. C'est une dérivation (`estFinie`), pas une
navigation : le module n'a pas de routeur, et n'en a pas besoin. Scoreo tient la route.

## L'identité visuelle

`src/styles.css` est chargé par l'écran, donc voyage dans son chunk : le module arrive stylé et ne
coûte rien tant que personne ne l'ouvre. Toutes les règles sont scopées sous
`.module-mille-sabords`, toutes les classes préfixées `ms-`. Les deux, pas l'un ou l'autre — le
scoping protège l'hôte du module, le préfixe protège le module de l'hôte. C'est vérifié par
`scripts/check-module-styles.mjs`, et photographié par `apps/scoreo/tests/visual/`.
