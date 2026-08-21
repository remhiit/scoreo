import type { Match } from '../domain/model/match'
import type { MatchRepository } from '../domain/port/matchRepository'

export class GetMatchesUseCase {
  constructor(private readonly repository: MatchRepository) {}

  invoke(): Match[] {
    return this.repository.getAll()
  }
}
