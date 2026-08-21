import type { GameType } from '../../domain/model/gameType'
import type { GameTypeRepository } from '../../domain/port/gameTypeRepository'

export class InMemoryGameTypeRepository implements GameTypeRepository {
  private gameTypes: GameType[] = []

  getGameTypeCount(): number {
    return this.gameTypes.length
  }

  getAllGameTypes(): GameType[] {
    return [...this.gameTypes]
  }

  getAll(includeInactive = false): GameType[] {
    return includeInactive ? [...this.gameTypes] : this.gameTypes.filter((g) => g.active)
  }

  save(gameType: GameType): void {
    const idx = this.gameTypes.findIndex((g) => g.id === gameType.id)
    if (idx >= 0) this.gameTypes[idx] = gameType
    else this.gameTypes.push(gameType)
  }

  saveAll(gameTypes: GameType[]): void {
    gameTypes.forEach((g) => this.save(g))
  }

  findById(id: string): GameType | undefined {
    return this.getAll(true).find((g) => g.id === id)
  }

  hardDelete(id: string): void {
    this.gameTypes = this.gameTypes.filter((g) => g.id !== id)
  }

  deleteAll(): void {
    this.gameTypes = []
  }
}
