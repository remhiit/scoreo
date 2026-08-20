import type { GameType } from '../model/gameType'

export interface GameTypeRepository {
  getAll(includeInactive?: boolean): GameType[]
  save(gameType: GameType): void
  saveAll(gameTypes: GameType[]): void
  findById(id: string): GameType | undefined
  /** Permanent removal, unlike the `active = false` soft-delete used by archiving. */
  hardDelete(id: string): void
  deleteAll(): void
}
