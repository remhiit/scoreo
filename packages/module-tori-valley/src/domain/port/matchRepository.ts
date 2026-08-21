import type { Match } from '../model/match'

export interface MatchRepository {
  getAll(): Match[]
  findById(id: string): Match | undefined
  save(match: Match): void
  delete(id: string): void
}
