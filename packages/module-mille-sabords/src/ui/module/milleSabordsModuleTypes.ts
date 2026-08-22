import { z } from 'zod'
import { EvenementCoupSchema, type EvenementCoup } from '../../domain/modeles'
import { LancerDesSchema, LANCER_DES_VIDE, type LancerDes } from '../../domain/lancerDes'

export type MilleSabordsTab = 'calc' | 'manual'

export type Multiplicateur = 1 | 2

/**
 * Everything the screen needs to redraw itself, and nothing else.
 *
 * The game aggregate is absent on purpose: `Partie` is mutable, so keeping one
 * in the state would make the reducer's output depend on who else held a
 * reference. The state carries the event log instead and `replayPartie` derives
 * the aggregate whenever it is needed — the same log the draft persists.
 */
export interface MilleSabordsState {
  /** Host player ids, in the order the host handed them over. */
  readonly joueurs: readonly string[]
  readonly historique: readonly EvenementCoup[]
  readonly tab: MilleSabordsTab
  readonly des: LancerDes
  /** Id of the drawn card, among `CARTES`. */
  readonly carte: string
  /** Kept as typed, not as a number: an empty or half-typed field is a real state. */
  readonly scoreManuel: string
  readonly multiplicateur: Multiplicateur
  /** The players called it a night before anyone crossed 6000. */
  readonly finDemandee: boolean
  readonly confirmationAbandon: boolean
}

export type MilleSabordsAction =
  | { type: 'selectTab'; tab: MilleSabordsTab }
  | { type: 'changeDie'; de: string; delta: number }
  | { type: 'selectCard'; carte: string }
  | { type: 'submitCalcScore' }
  | { type: 'updateManualScore'; value: string }
  | { type: 'quickScore'; points: number }
  | { type: 'toggleMultiplier' }
  | { type: 'resetManualScore' }
  | { type: 'submitManualScore' }
  | { type: 'quickSkullIsland'; cranes: number }
  | { type: 'undoLast' }
  | { type: 'requestEnd' }
  | { type: 'resumeGame' }
  | { type: 'showAbandonConfirm' }
  | { type: 'dismissAbandonConfirm' }

/**
 * Bumped only when a payload stops being readable by this code. A draft written
 * by another version fails the literal below, and the screen starts a clean game
 * rather than reviving half of an older shape.
 */
export const DRAFT_VERSION = 1

/**
 * The turn state the Kotlin app never persisted.
 *
 * Its dice, tab, card and multiplier lived in four module-level `var`s
 * (`EtatTour.kt`), so a reload silently emptied the dice a player had just
 * counted out. They are part of the draft here, next to the event log that
 * rebuilds the game itself.
 */
export const MilleSabordsDraftSchema = z.object({
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

export type MilleSabordsDraft = z.infer<typeof MilleSabordsDraftSchema>
