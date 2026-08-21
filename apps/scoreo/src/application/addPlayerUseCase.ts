import { ValidationError } from '../domain/model/errors'
import type { Player } from '../domain/model/player'
import type { PlayerRepository } from '../domain/port/playerRepository'
import { newId } from './idGenerator'

const MAX_NAME_LENGTH = 50

export class AddPlayerUseCase {
  constructor(private readonly repository: PlayerRepository) {}

  invoke(name: string): Player {
    const trimmed = name.trim()
    if (trimmed.length === 0) {
      throw new ValidationError('name', 'Player name must not be blank')
    }
    if (trimmed.length > MAX_NAME_LENGTH) {
      throw new ValidationError('name', `Player name must be ${MAX_NAME_LENGTH} characters or less`)
    }
    const player: Player = { id: newId(), name: trimmed, active: true }
    this.repository.save(player)
    return player
  }
}
