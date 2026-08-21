import type { Match } from '../domain/model/match'
import type { MatchRepository } from '../domain/port/matchRepository'

export class UpdateMatchUseCase {
  constructor(private readonly matchRepository: MatchRepository) {}

  invoke(match: Match): void {
    this.matchRepository.save(match)
  }
}
