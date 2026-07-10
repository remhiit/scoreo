import { ValidationError } from '../domain/model/errors'
import type { TieBreakRule, WinCondition } from '../domain/model/enums'
import type { GameType } from '../domain/model/gameType'
import type { GameTypeRepository } from '../domain/port/gameTypeRepository'
import { newId } from './idGenerator'

const MAX_NAME_LENGTH = 50

export interface AddGameTypeOptions {
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
    const gameType: GameType = {
      id: newId(),
      name: trimmed,
      winCondition,
      tieBreakRule: options.tieBreakRule ?? 'NONE',
      tieBreakCondition: options.tieBreakCondition ?? 'HIGHEST_SCORE',
      tieBreakLabel: options.tieBreakLabel ?? null,
      active: true,
    }
    this.repository.save(gameType)
    return gameType
  }
}
