import type { MatchRepository } from '../domain/port/matchRepository'

export class DeleteMatchUseCase {
  constructor(private readonly matchRepository: MatchRepository) {}

  invoke(matchId: string): void {
    this.matchRepository.delete(matchId)
  }
}
