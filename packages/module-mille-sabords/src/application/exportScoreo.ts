import { contributionPour, type PartieTerminee } from '../domain/modeles'

/**
 * The v1.1 file contract Scoreo imports (`schemas/import/v1.1.json-schema`).
 *
 * Key order matters here, and so does omitting `details` rather than writing
 * `null`: this is the exact shape the Kotlin implementation produces, and
 * `tests/golden/` compares the two byte for byte. The Kotlin side stays the
 * oracle until the port has replaced it.
 */
export interface ScoreExport {
  readonly name: string
  readonly score: number
}

export interface RoundExport {
  readonly scores: readonly ScoreExport[]
}

export interface ExportClassement {
  readonly name: string
  readonly score: number
  /** 1-based index in `classement`, which is already sorted by score descending. */
  readonly rank: number
}

export interface ExportPartie {
  readonly id: string
  readonly date: number
  readonly ranking: readonly ExportClassement[]
  /** Absent — not null — for a game recorded before per-round history existed. */
  readonly details?: readonly RoundExport[]
}

export interface ExportSabords {
  readonly version: string
  readonly game: string
  readonly exportedAt: number
  readonly gameCount: number
  readonly winCondition: string
  readonly games: readonly ExportPartie[]
}

export const EXPORT_VERSION = '1.1'

/** The game name Scoreo creates on first import. */
export const EXPORT_GAME_NAME = '1000 Sabords'

/**
 * Per-round deltas, clamped exactly as `Partie.totalJoueurParNom` clamps: at
 * **every** coup, not on the final total.
 *
 * That is what makes the rounds sum back to the ranking whatever the Skull
 * Island penalties did — a player driven below zero restarts at zero and never
 * repays the debt. Clamping the total instead would leave the two disagreeing,
 * and Scoreo's import rejects a game whose detail contradicts its score.
 */
function construireDetails(partie: PartieTerminee): RoundExport[] | undefined {
  if (partie.coups.length === 0) return undefined

  const joueurs = partie.classement.map((j) => j.nom)
  const tailleManche = joueurs.length
  const totaux = new Map(joueurs.map((nom) => [nom, 0]))
  const manches: RoundExport[] = []

  for (let i = 0; i < partie.coups.length; i += tailleManche) {
    const avant = new Map(totaux)
    for (const coup of partie.coups.slice(i, i + tailleManche)) {
      for (const nom of joueurs) {
        totaux.set(nom, Math.max(0, (totaux.get(nom) ?? 0) + contributionPour(coup, nom)))
      }
    }
    manches.push({
      scores: joueurs.map((nom) => ({
        name: nom,
        score: (totaux.get(nom) ?? 0) - (avant.get(nom) ?? 0),
      })),
    })
  }

  return manches
}

export function construireEnveloppeExport(
  historique: readonly PartieTerminee[],
  exportedAt: number,
): ExportSabords {
  const games = historique.map((partie): ExportPartie => {
    const details = construireDetails(partie)
    return {
      id: partie.uuid,
      date: partie.horodatage,
      ranking: partie.classement.map((joueur, index) => ({
        name: joueur.nom,
        score: joueur.score,
        rank: index + 1,
      })),
      ...(details === undefined ? {} : { details }),
    }
  })

  return {
    version: EXPORT_VERSION,
    game: EXPORT_GAME_NAME,
    exportedAt,
    gameCount: games.length,
    winCondition: 'HIGHEST_SCORE',
    games,
  }
}
