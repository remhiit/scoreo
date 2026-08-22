import { assertRoundsSumToRanking, type ModuleMatchResult } from '@scoreboards/module-api'
import { z } from 'zod'
import { EvenementCoupSchema, type EvenementCoup, type ResultatJoueur } from '../domain/modeles'
import { Partie } from '../domain/partie'
import { milleSabordsManifest } from '../module'
import { construireEnveloppeExport } from './exportScoreo'

/**
 * What the host stores next to the match, and hands straight back when someone
 * reopens it.
 *
 * `joueurs` holds the host's player **ids**, not display names. The domain only
 * ever needs the strings in `Partie.joueurs` to be distinct, and ids are the
 * only identity that survives a rename — or two guests genuinely called Alex.
 * Names are looked up from the host at render time and never persisted here.
 */
export interface MilleSabordsModuleData {
  readonly joueurs: readonly string[]
  readonly historique: readonly EvenementCoup[]
}

export const MilleSabordsModuleDataSchema = z.object({
  joueurs: z.array(z.string()),
  historique: z.array(EvenementCoupSchema),
})

/**
 * Rebuilds the aggregate from the event log alone.
 *
 * `dernierTour`, `numeroDernierTour` and `magiquePirate` are deliberately *not*
 * persisted: replaying the coups through `ajouterCoup` derives them exactly as
 * live play did, so a draft can never disagree with its own history.
 */
export function replayPartie(
  joueurs: readonly string[],
  historique: readonly EvenementCoup[],
): Partie {
  const partie = new Partie()
  partie.joueurs.push(...joueurs)
  partie.commencer()
  for (const coup of historique) {
    // The flag is carried by the coup itself, so the instant win survives the replay.
    if (coup.type === 'calculateur' && coup.magiquePirate) partie.terminerParMagiePirate()
    partie.ajouterCoup(coup)
  }
  return partie
}

/**
 * Final standings, highest first. `sort` is stable, so players tied on points
 * keep their seating order — the same tie-break the Kotlin app applied.
 */
export function classementFinal(partie: Partie): ResultatJoueur[] {
  return partie.joueurs
    .map((nom, index) => ({ nom, score: partie.totalJoueur(index), indexCouleur: index }))
    .sort((a, b) => b.score - a.score)
}

export interface EntreeResultat {
  readonly joueurs: readonly string[]
  readonly historique: readonly EvenementCoup[]
  /** Present only when the host reopened an existing match, which this updates. */
  readonly matchId?: string
}

/**
 * The finished game, in the shape the host stores.
 *
 * Ranking and per-round detail both come from `construireEnveloppeExport` — the
 * very function the golden test pins against the Kotlin oracle — rather than
 * from a second implementation written for the screen. That matters because the
 * rounds are deltas clamped at zero *at every coup*: any other clamping and the
 * rounds would stop summing to the totals, which `assertRoundsSumToRanking`
 * refuses. One implementation, one behaviour, checked once.
 */
export function buildModuleMatchResult({
  joueurs,
  historique,
  matchId,
}: EntreeResultat): ModuleMatchResult {
  const partie = replayPartie(joueurs, historique)
  const enveloppe = construireEnveloppeExport(
    [
      {
        // Neither identity nor timestamps reach the ranking or the rounds: the
        // host mints the match id and stamps the evening itself.
        uuid: '',
        horodatage: 0,
        classement: classementFinal(partie),
        nombreManches: partie.mancheActuelle(),
        magiquePirate: partie.magiquePirate,
        coups: historique,
      },
    ],
    0,
  )
  const jeu = enveloppe.games[0]

  const result: ModuleMatchResult = {
    ...(matchId === undefined ? {} : { matchId }),
    ranking: jeu.ranking.map((entree) => ({
      playerId: entree.name,
      score: entree.score,
      rank: entree.rank,
    })),
    ...(jeu.details === undefined
      ? {}
      : {
          rounds: jeu.details.map((manche, index) => ({
            label: `Tour ${index + 1}`,
            scores: manche.scores.map((score) => ({ playerId: score.name, score: score.score })),
          })),
        }),
    moduleData: {
      version: milleSabordsManifest.dataVersion,
      data: { joueurs, historique } satisfies MilleSabordsModuleData,
    },
  }

  // The host checks this too, but a module that hands over a contradictory
  // result should fail in its own tests, not in the host's.
  assertRoundsSumToRanking(result)
  return result
}
