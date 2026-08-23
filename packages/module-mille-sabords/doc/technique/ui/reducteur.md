# Le réducteur

`src/ui/module/milleSabordsModuleReducer.ts` — une fonction pure `(state, action) => state`, comme
tout écran de Scoreo (MVI).

## L'état

```ts
interface MilleSabordsState {
  readonly joueurs: readonly string[]      // ids, dans l'ordre donné par l'hôte
  readonly historique: readonly EvenementCoup[]
  readonly tab: 'calc' | 'manual'
  readonly des: LancerDes
  readonly carte: string
  readonly scoreManuel: string             // tel que tapé : un champ à moitié saisi est un état réel
  readonly multiplicateur: 1 | 2
  readonly finDemandee: boolean
  readonly confirmationAbandon: boolean
}
```

**L'agrégat `Partie` est délibérément absent de l'état.** Il est mutable : en garder un ici ferait
dépendre la sortie du réducteur de qui d'autre en détient une référence. L'état porte le **journal
d'événements**, et `partieDeLEtat(state)` rejoue ce journal quand l'agrégat est nécessaire — le même
journal que le brouillon persiste.

C'est la traduction du `val partie` global du Kotlin : ce que le singleton portait, le journal le
porte, sans le partager.

## Les actions

| Action | Effet |
|---|---|
| `selectTab` | Bascule calculateur / saisie rapide |
| `changeDie`, `selectCard` | Composent le tour en cours dans le calculateur |
| `submitCalcScore` | Valide le tour calculé : ajoute un `CoupCalculateur` et remet le tour à zéro |
| `updateManualScore`, `quickScore`, `toggleMultiplier`, `resetManualScore` | Composent le tour en saisie rapide |
| `submitManualScore` | Ajoute un `CoupManuel` |
| `quickSkullIsland` | Ajoute un `CoupIleCranes` — la pénalité frappe les adversaires, pas le joueur courant |
| `undoLast` | Retire le dernier coup. `Partie.annulerDernier()` rejoue tout l'historique pour recalculer : c'est du domaine, déjà porté et vérifié |
| `requestEnd`, `resumeGame` | Terminer la partie avant le seuil, ou revenir sur cette décision |
| `showAbandonConfirm`, `dismissAbandonConfirm` | La modale d'abandon, qui ne laisse rien derrière elle |

## Les dérivations

Aucune n'est stockée : toutes se recalculent depuis l'état.

| Fonction | Rend |
|---|---|
| `partieDeLEtat(state)` | L'agrégat, rejoué depuis le journal |
| `joueurActuel(state)` | À qui le tour, dérivé du nombre de coups |
| `estFinie(state, partie)` | Fin demandée, ou seuil franchi et dernier tour joué |
| `versBrouillon(state)` | Ce que `host.saveDraft` reçoit |
| `etatInitial(playerIds, charge)` | L'état de départ, brouillon restauré si la table correspond |
