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

Le module porte l'identité de Scoreo : il n'a plus de palette à lui (l'ancienne nuit et or, `--ms-*`,
a disparu avec `src/styles.css`), et prend le flavor et l'accent choisis dans Scoreo — un changement
de thème s'y voit dès qu'on revient sur le module, sans rechargement, puisque tout passe par les
tokens sémantiques du design system. Le contrat est celui de
`doc/technical/module-contract.md` § « A module wears Scoreo's look ».

L'écran **compose `@scoreboards/design-system`** comme l'hôte : `Button`, `Select`, `NumberField`,
`Tabs` + `TabPanel`, `Text`, `Stack`, `Badge`, `StatusLine`, `Dialog` (confirmation d'abandon),
`Panel`, `StandingsGrid` + `StandingsCard` (classement final), `Score`, `Icon`, `Chip` (le ×2 du
capitaine), et pour la mise en page `WideLayout` (la colonne bornée à 1100px dans
`ImmersiveTemplate`) et `Columns` + `Column` (le tableau de bord et le tour en cours côte à côte à
partir de 900px, chacun une région nommée). Il n'écrit ni `className`, ni `style`, ni import `lucide-react` — `eslint.config.js` le
refuse, comme pour tout module.

Ce que le design system n'a pas, parce que seul ce jeu le dessine, vit dans **`src/design/`** — le
seul dossier du paquet qui écrit des classes et du CSS :

| Pièce | Rôle |
|---|---|
| `ModuleRoot` | La racine `.module-mille-sabords`, à laquelle toutes les règles sont scopées — rien d'autre : la mise en page vient du design system |
| `ScoreTable` | La grille tours × joueurs : joueur courant souligné dans l'accent, cellules teintées (zéro, perte, île), totaux (en tête, au-delà de 6000) écrits dans la couleur des titres, leur ton porté par une teinte de fond et une barre au pied — les accents de Latte, en texte, tombent sous 4,5:1 ; sa carte porte `--surface-card`, la surface de référence de l'e2e |
| `DieCounter` | Une face de dé : la face, son nom, le compteur (un `<output>`, pas un champ) entre deux `Button` du design system |
| `ScorePreview` | Ce que vaut la main en cours avant de l'enregistrer, sur une pastille teintée et bordée selon le résultat (le score reste dans la couleur des titres), avec le détail ligne à ligne de `calculerScore` |

Chaque pièce importe sa propre feuille (`src/design/*.css`), qui voyage donc dans le chunk de
l'écran : le module ne coûte rien tant que personne ne l'ouvre. Ces feuilles suivent les trois
règles du contrat — toutes les règles scopées sous `.module-mille-sabords`, toutes les classes
préfixées `ms-`, uniquement des tokens sémantiques (aucune couleur brute, aucun `--ctp-*`) —
vérifiées par `scripts/check-module-styles.mjs` et `scripts/check-design-tokens.mjs`.

Les couleurs par joueur de l'app Kotlin (`COULEURS_JOUEURS`) ne sont plus affichées : Scoreo ne
colore pas ses joueurs, et le joueur dont c'est le tour est désigné par l'accent. La constante reste
dans le domaine, hors du périmètre de cette refonte.

Ce qu'un script ne peut pas voir — une mise en page qui casse sans qu'aucun sélecteur ne collisionne,
une pièce illisible en Latte — est photographié par
`apps/scoreo/tests/visual/milleSabordsModule.visual.spec.ts`.
