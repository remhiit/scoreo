import type { Match } from '../../domain/model/match'
import type { MatchRepository } from '../../domain/port/matchRepository'

export class InMemoryMatchRepository implements MatchRepository {
  private matches: Match[] = []

  getAll(): Match[] {
    return [...this.matches]
  }

  findById(id: string): Match | undefined {
    return this.matches.find((m) => m.id === id)
  }

  save(match: Match): void {
    const idx = this.matches.findIndex((m) => m.id === match.id)
    if (idx >= 0) this.matches[idx] = match
    else this.matches.push(match)
  }

  delete(id: string): void {
    this.matches = this.matches.filter((m) => m.id !== id)
  }
}
