import { ValidationError } from '../domain/model/errors'
import type { ScoringMode, TieBreakRule, WinCondition } from '../domain/model/enums'
import { newGameType, type GameType } from '../domain/model/gameType'
import type { GameTypeRepository } from '../domain/port/gameTypeRepository'
import { newId } from './idGenerator'

const MAX_NAME_LENGTH = 50

export interface AddGameTypeOptions {
  scoringMode?: ScoringMode
  tieBreakRule?: TieBreakRule
  tieBreakCondition?: WinCondition
  tieBreakLabel?: string | null
}

export class AddGameTypeUseCase {
  constructor(private readonly repository: GameTypeRepository) {}

  invoke(name: string, winCondition: WinCondition, options: AddGameTypeOptions = {}): GameType {
    const trimmed = name.trim()
    if (trimmed.length === 0) {
      throw new ValidationError('name', 'Game type name must not be blank')
    }
    if (trimmed.length > MAX_NAME_LENGTH) {
      throw new ValidationError('name', `Game type name must be ${MAX_NAME_LENGTH} characters or less`)
    }
    const gameType = newGameType(newId(), trimmed, winCondition, {
      scoringMode: options.scoringMode,
      tieBreakRule: options.tieBreakRule,
      tieBreakCondition: options.tieBreakCondition,
      tieBreakLabel: options.tieBreakLabel,
    })
    this.repository.save(gameType)
    return gameType
  }
}
