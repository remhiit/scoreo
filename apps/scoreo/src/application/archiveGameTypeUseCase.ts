import { NotFoundError } from '../domain/model/errors'
import type { GameTypeRepository } from '../domain/port/gameTypeRepository'

export class ArchiveGameTypeUseCase {
  constructor(private readonly gameTypeRepository: GameTypeRepository) {}

  invoke(gameTypeId: string): void {
    const gameType = this.gameTypeRepository.findById(gameTypeId)
    if (!gameType) throw new NotFoundError('GameType', gameTypeId)

    this.gameTypeRepository.save({ ...gameType, active: false })
  }
}
