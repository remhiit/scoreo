import type { PlayerScore } from '../../domain/model/playerScore'
import type { GameType } from '../../domain/model/gameType'
import type { Player } from '../../domain/model/player'
import type { GameTypeRepository } from '../../domain/port/gameTypeRepository'
import type { MatchRepository } from '../../domain/port/matchRepository'
import type { PlayerRepository } from '../../domain/port/playerRepository'
import type { UpdateMatchUseCase } from '../../application/updateMatchUseCase'

export type ScoreDetailMode =
  | { type: 'Create' }
  | {
      type: 'Edit'
      matchId: string
      updateMatchUseCase: UpdateMatchUseCase
      matchRepository: MatchRepository
      playerRepository: PlayerRepository
      gameTypeRepository: GameTypeRepository
    }

export interface ScoreDetailState {
  gameType: GameType
  players: Player[]
  /** One entry per round: playerId -> score string (as typed by the user). */
  rounds: Record<string, string>[]
  showWinnerModal: boolean
  modalWinners: Set<string>
  error: string | undefined
  saved: boolean
  cancelled: boolean
  // Tie-break resolution fields
  showSecondaryScoreDialog: boolean
  tiedPlayerIds: string[]
  secondaryScoreInputs: Record<string, string>
  showManualSelectionDialog: boolean
  manualSelectionWinners: Set<string>
  collectedSecondaryScores: PlayerScore[]
  // Edit mode
  editingMatchId: string | undefined
  // Cancel confirm
  showCancelConfirm: boolean
}
