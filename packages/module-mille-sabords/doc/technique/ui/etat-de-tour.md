# L'état de tour vivant

C'est la raison d'être de `saveDraft`/`loadDraft`/`clearDraft` dans le contrat de module.

## Le bug d'origine

L'application Kotlin gardait quatre variables mutables au niveau module (`EtatTour.kt`) : les dés
saisis, l'onglet actif, le multiplicateur manuel et la carte piochée. **Aucune n'était persistée.**
La partie et l'historique l'étaient, mais un rechargement en plein tour jetait silencieusement la
main qu'un joueur venait de compter sur la table.

## Ce que fait le module

Chaque transition d'état d'une partie neuve écrit le brouillon complet :

```ts
const reouverture = editing !== undefined
useEffect(() => {
  if (!reouverture) host.saveDraft(versBrouillon(state))
}, [host, state, reouverture])
```

Une partie rouverte (`editing`) n'écrit jamais le brouillon, et « Abandonner » ne l'efface pas
(`host.clearDraft` n'est appelé que hors réouverture). Cette partie est déjà enregistrée côté hôte :
l'écrire dans le brouillon écraserait une partie neuve en cours, et quitter par le ✕ de l'hôte y
laisserait ses coups, sans `matchId`, pour la prochaine partie neuve avec les mêmes joueurs — qui
les rechargerait et créerait un doublon à l'enregistrement.

Le brouillon porte le journal d'événements **et** le tour en cours :

```ts
const MilleSabordsDraftSchema = z.object({
  version: z.literal(DRAFT_VERSION),
  joueurs: z.array(z.string()),
  historique: z.array(EvenementCoupSchema),
  tab: z.enum(['calc', 'manual']).default('calc'),
  des: LancerDesSchema.default(LANCER_DES_VIDE),
  carte: z.string().default('none'),
  scoreManuel: z.string().default('0'),
  multiplicateur: z.union([z.literal(1), z.literal(2)]).default(1),
  finDemandee: z.boolean().default(false),
})
```

L'hôte range cette charge sous sa propre clé (`scoreo_module_draft_mille-sabords`) sans jamais
regarder dedans : seul le module sait la relire.

## Les trois garde-fous

- **`version`** — un `z.literal`, pas un nombre : un brouillon écrit par une autre version échoue à
  la validation et l'écran repart d'une partie propre, plutôt que de ressusciter la moitié d'une
  forme ancienne.
- **La même table** — une charge dont les joueurs ne sont pas ceux que l'hôte vient de passer est
  ignorée. Sans ça, une partie abandonnée réapparaîtrait au milieu d'une autre. La comparaison
  dépend de l'origine (`etatInitial(playerIds, charge, origine)`) :
  - `'brouillon'` (partie neuve) — `memePlacement`, sensible à l'ordre : l'hôte passe les joueurs
    dans l'ordre où ils ont été choisis, celui avec lequel le brouillon a été écrit.
  - `'partie'` (réouverture) — `memesJoueurs`, qui compare l'**ensemble** des joueurs (même nombre,
    aucun doublon, chacun à la table). L'hôte rouvre avec les ids de `Match.playerScores`, triés par
    **classement** : une comparaison sensible à l'ordre jetterait la partie dès que le gagnant
    n'était pas le premier assis. L'état restauré garde alors l'ordre de `joueurs` de la charge —
    c'est lui qui décide qui joue quand et qui une île pénalise. Une égalité au classement ne change
    rien ; seule la composition de la table compte.
- **Rouvrir gagne** — quand `editing` est présent, c'est sa charge qui est lue, pas le brouillon :
  l'hôte a demandé *cette* partie.

## À la fin

`buildModuleMatch` construit le `ModuleMatch` : les scores finaux, les manches par joueur, le gagnant
(`manualWinners`) et la charge que l'hôte rendra à la réouverture. Le résultat doit satisfaire
`assertMatchConsistent` (`shared-domain`) — les manches d'un joueur somment à son score — sans quoi
l'hôte refuserait la partie. C'est l'invariant que le repli à zéro du domaine
(`maxOf(0, acc + contribution)` côté Kotlin) rend vrai à chaque événement.
