import { NotFoundError, ValidationError } from '../domain/model/errors'
import type { Match, PlayerResult } from '../domain/model/match'
import type { MatchRepository } from '../domain/port/matchRepository'

export class UpdateMatchUseCase {
  constructor(private readonly matchRepository: MatchRepository) {}

  invoke(matchId: string, results: PlayerResult[]): Match {
    const existing = this.matchRepository.findById(matchId)
    if (!existing) throw new NotFoundError('Match', matchId)

    const resultPlayerIds = results.map((r) => r.playerId)
    if (
      new Set(resultPlayerIds).size !== resultPlayerIds.length ||
      resultPlayerIds.length !== existing.playerIds.length
    ) {
      throw new ValidationError('results', 'There must be exactly one result per player')
    }
    if (!existing.playerIds.every((id) => resultPlayerIds.includes(id))) {
      throw new ValidationError('results', 'Results must cover every player in the match')
    }

    const updated: Match = { ...existing, results }
    this.matchRepository.save(updated)
    return updated
  }
}
