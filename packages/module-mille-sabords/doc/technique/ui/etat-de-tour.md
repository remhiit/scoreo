# L'état de tour vivant

C'est la raison d'être de `saveDraft`/`loadDraft`/`clearDraft` dans le contrat de module.

## Le bug d'origine

L'application Kotlin gardait quatre variables mutables au niveau module (`EtatTour.kt`) : les dés
saisis, l'onglet actif, le multiplicateur manuel et la carte piochée. **Aucune n'était persistée.**
La partie et l'historique l'étaient, mais un rechargement en plein tour jetait silencieusement la
main qu'un joueur venait de compter sur la table.

## Ce que fait le module

Chaque transition d'état écrit le brouillon complet :

```ts
useEffect(() => {
  host.saveDraft(versBrouillon(state))
}, [host, state])
```

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
- **La même table** — un brouillon dont les joueurs ne sont pas ceux que l'hôte vient de passer est
  ignoré. Sans ça, une partie abandonnée réapparaîtrait au milieu d'une autre.
- **Rouvrir gagne** — quand `editing` est présent, c'est sa charge qui est lue, pas le brouillon :
  l'hôte a demandé *cette* partie.

## À la fin

`buildModuleMatchResult` construit le `ModuleMatchResult` : le classement, les manches par joueur, et
la charge que l'hôte rendra à la réouverture. Le résultat doit satisfaire
`assertRoundsSumToRanking` — les manches d'un joueur somment à son score de classement — sans quoi
l'import de Scoreo rejetterait la partie. C'est l'invariant que le repli à zéro du domaine
(`maxOf(0, acc + contribution)` côté Kotlin) rend vrai à chaque événement.
