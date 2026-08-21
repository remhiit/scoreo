import { NotFoundError, ValidationError } from '../domain/model/errors'
import type { PlayerRepository } from '../domain/port/playerRepository'

const MAX_NAME_LENGTH = 50

export class RenamePlayerUseCase {
  constructor(private readonly repository: PlayerRepository) {}

  invoke(playerId: string, newName: string): void {
    const player = this.repository.getAll(true).find((p) => p.id === playerId)
    if (!player) throw new NotFoundError('Player', playerId, 'errors.notFound.player')

    const trimmed = newName.trim()
    if (trimmed.length === 0) {
      throw new ValidationError('name', 'Player name must not be blank', 'errors.playerName.blank')
    }
    if (trimmed.length > MAX_NAME_LENGTH) {
      throw new ValidationError(
        'name',
        `Player name must be ${MAX_NAME_LENGTH} characters or less`,
        'errors.playerName.tooLong',
        { max: MAX_NAME_LENGTH },
      )
    }

    this.repository.save({ ...player, name: trimmed })
  }
}
