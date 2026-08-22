import { NotFoundError, ValidationError, type DomainError } from '../domain/model/errors'
import type { Match } from '../domain/model/match'
import type { PlayerScore } from '../domain/model/playerScore'
import type { GameTypeRepository } from '../domain/port/gameTypeRepository'
import type { MatchRepository } from '../domain/port/matchRepository'
import { err, ok, type Result } from '../domain/result'
import { newId } from './idGenerator'

export interface CreateMatchOptions {
  manualWinners?: string[]
  secondaryPlayerScores?: PlayerScore[]
  rounds?: PlayerScore[][]
}

export class CreateMatchUseCase {
  constructor(
    private readonly matchRepository: MatchRepository,
    private readonly gameTypeRepository: GameTypeRepository,
  ) {}

  invoke(
    gameTypeId: string,
    playerScores: PlayerScore[],
    date: number,
    options: CreateMatchOptions = {},
  ): Result<Match, DomainError> {
    const manualWinners = options.manualWinners ?? []
    const secondaryPlayerScores = options.secondaryPlayerScores ?? []
    const rounds = options.rounds ?? []

    const gameType = this.gameTypeRepository.findById(gameTypeId)
    if (!gameType) return err(new NotFoundError('GameType', gameTypeId))

    if (playerScores.length < 2) {
      return err(new ValidationError('playerScores', 'A match needs at least 2 players'))
    }
    const playerIds = playerScores.map((s) => s.playerId)
    if (new Set(playerIds).size !== playerIds.length) {
      return err(new ValidationError('playerScores', 'Duplicate player IDs in match'))
    }
    if (manualWinners.length > 0 && !manualWinners.every((id) => playerIds.includes(id))) {
      return err(new ValidationError('manualWinners', 'manualWinners must be a subset of playerScores'))
    }
    if (secondaryPlayerScores.length > 0) {
      const secondaryIds = secondaryPlayerScores.map((s) => s.playerId)
      if (!secondaryIds.every((id) => playerIds.includes(id))) {
        return err(
          new ValidationError('secondaryPlayerScores', 'secondaryPlayerScores must be a subset of playerScores'),
        )
      }
      if (new Set(secondaryIds).size !== secondaryIds.length) {
        return err(new ValidationError('secondaryPlayerScores', 'Duplicate player IDs in secondaryPlayerScores'))
      }
    }

    const match: Match = {
      id: newId(),
      date,
      gameTypeId,
      playerScores,
      manualWinners,
      secondaryPlayerScores,
      rounds,
      moduleData: null,
    }
    this.matchRepository.save(match)
    return ok(match)
  }
}
