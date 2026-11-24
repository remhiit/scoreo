import type { PieceModule } from '../shell/types'
import { MILLE_SABORDS_PIECES } from './milleSabords'
import { SKYJO_PIECES } from './skyjo'
import { TORI_VALLEY_PIECES } from './toriValley'

/**
 * The game pieces of each module that has some, by game name. A module whose
 * `src/design/` exports only its `ModuleRoot` (Flip 7) has no entry.
 */
export const MODULE_PIECES: PieceModule[] = [MILLE_SABORDS_PIECES, SKYJO_PIECES, TORI_VALLEY_PIECES]
