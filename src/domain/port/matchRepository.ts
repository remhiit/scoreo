import type { Match } from '../model/match'

export interface MatchRepository {
  getAll(): Match[]
  save(match: Match): void
  saveAll(matches: Match[]): void
  findById(id: string): Match | undefined
  delete(id: string): void
}
